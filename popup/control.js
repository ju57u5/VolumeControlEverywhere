let controlOutlet = document.querySelector('#control-outlet');
let warningOutlet = document.querySelector('#warning-outlet');
let frameDataMap = new Map();
let framePortMap = new Map();

/**
 * Run the content script in all available frames and show possible error messages in the popup.
 */
function runContentScript() {
	let executionResult = browser.tabs.executeScript(null, {
		file: "/content_scripts/contentcontrol.js",
		allFrames: true
	});
	executionResult.catch(
		(error) => {
			console.error(error);
			controlOutlet.innerHTML = `<h3>Error executing addon.</h3>${error}`;
			if (error.message === "Missing host permission for the tab") {
				controlOutlet.innerHTML += "<p>This is probably caused because you are on a internal site (e.g. about:blank) or on one of the <a href='https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts'>here mentioned domains</a> (e.g. addons.mozilla.com).</p>"
			}
		}
	);
}

/**
 * Connects to the dataport.
 * @param {*} port 
 */
async function connected(port) {
	let frameId = port.sender.frameId;
	framePortMap.set(frameId, port);
	port.onMessage.addListener(handleMessage);

	//Request the media data from the contentscript.
	port.postMessage({ type: "status", checkIFrame: !await hasAllUrlPermission()});
}

/**
 * Handle a message from the dataport.
 * @param {*} m Message that was sent.
 * @param {*} port Port this message was sent from.
 */
function handleMessage(m, port) {
	if (m.type === "iframe-status" && m.iframe) {
		renderIFrameWarning();
		return;
	}
	let frameId = port.sender.frameId;

	audioHTML = m.audio.map(e => generateSlider(e, frameId, m.documentId)).join("");
	videoHTML = m.video.map(e => generateSlider(e, frameId, m.documentId)).join("");

	frameDataMap.set(frameId, { audioHTML: audioHTML, videoHTML: videoHTML });
	renderHTML();
}

/**
 * Render the HTML of the Addon-Popup if no media was found.
 */
function renderEmptyPage() {
	let html = "<p>No Audio or Video Elements on this page.</p>";
	controlOutlet.innerHTML = html;
}

/**
 * Returns if the addon has the <all_urls> permission.
 */
async function hasAllUrlPermission() {
    let response = await browser.permissions.getAll();
    return response.origins.includes('<all_urls>');
}

/**
 * Renders a permissions warning if an I-Frame is present.
 */
async function renderIFrameWarning() {
	if (await hasAllUrlPermission()) {
		return;
	}
	let html = `<p>There seems to be an I-Frame on this page. If the media is inside a Frame/I-Frame this addon might not be able to access it, unless you give it <a href='#' id='permissionrequest'>permissions to all urls<a/>.</p>`;
	warningOutlet.innerHTML = html;

	function onResponse(response) {
		if (response) {
			runContentScript();
		}
	}
	document.querySelector("#permissionrequest").addEventListener("click", () => {
		const permissionsToRequest = {
			origins: ["<all_urls>"],
		}
		browser.permissions.request(permissionsToRequest).then(onResponse);
	});
}

/**
 * Render the HTML of the Addon-Popup based on the data inside sortedFrameData.
 */
function renderHTML() {
	let audioHTML = "";
	let videoHTML = "";
	let sortedFrameEntries = [...frameDataMap.entries()].sort();

	for (let [key, value] of sortedFrameEntries) {
		audioHTML += value.audioHTML || "";
		videoHTML += value.videoHTML || "";
	}

	let html = "";
	if (audioHTML) {
		html += `<h3>Audio</h3>${audioHTML}`;
	}
	if (videoHTML) {
		html += `<h3>Video</h3>${videoHTML}`;
	}
	if (!html) {
		renderEmptyPage();
		return;
	}

	controlOutlet.innerHTML = html;

	let sliders = document.querySelectorAll("input[type='range']");
	sliders.forEach(slider => {
		slider.addEventListener("input", sendAdjustedVolume);
	});
}

/**
 * Reads the volume from the slider and sends it over the dataport.
 * @this HTMLInputElement Slider in the event context.
 */
function sendAdjustedVolume() {
	let frameId = parseInt(this.dataset.frameId);
	let documentId = parseInt(this.dataset.documentId);
	framePortMap.get(frameId).postMessage({
		type: this.dataset.type,
		id: this.dataset.volumecontrolid,
		volume: this.value / 100,
		documentId: documentId,
	});
}

/**
 * Generate a slider representing the media status inside a message.
 * @param {*} m Message from the contententscript about the current media status.
 * @param {number} frameId ID of the frame this slider was generated for. Will be used to send the volume commands to the appropriate frame.  
 */
function generateSlider(m, frameId, documentId) {
	return `<label for="${m.id}">
	    		<a href="${m.src}">${decodeURIComponent(m.src)}</a>
	    	</label>
	    	<input id="${m.id}" class="slider" type="range" min="0" max="100" value="${m.volume * 100}" data-type="${m.type}" data-volumecontrolid="${m.id}" data-frame-id="${frameId}" data-document-id="${documentId}">
    	`;
}

runContentScript();
browser.runtime.onConnect.addListener(connected);

