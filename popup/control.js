let controlOutlet = document.getElementById('control-outlet');
let warningOutlet = document.getElementById('warning-outlet');
let errorOutlet = document.getElementById('error-outlet');
let sliderTemplate = document.getElementById('slider-template');
let masterTemplate = document.getElementById('master-template');
let iframeWarningTemplate = document.getElementById('iframe-warning-template');
let permissionWarningTemplate = document.getElementById('permission-warning-template');

let frameDataMap = new Map();
let framePortMap = new Map();

runContentScript();
browser.runtime.onConnect.addListener(connected);

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
			renderError(error);
		}
	);
}

/**
 * Render the error message inside errorOutlet.
 * @param {Error} error 
 */
function renderError(error) {
	let fragment = document.createDocumentFragment();
	fragment.appendChild(h3("Error executing addon"));
	fragment.appendChild(paragraph(error.toString()));
	if (error.message === "Missing host permission for the tab" || error.message === "Missing host permission for the tab, and any iframes") {
		fragment.appendChild(permissionWarningTemplate.content);
	}
	controlOutlet.textContent = "";
	errorOutlet.appendChild(fragment);
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
	port.postMessage({ type: "status", checkIFrame: !await hasAllUrlPermission() });
}

/**
 * Handle a message from the dataport.
 * @param {*} m Message that was sent.
 * @param {*} port Port this message was sent from.
 */
function handleMessage(m, port) {
	console.debug("Message", m);
	if (m.type === "iframe-status" && m.iframe) {
		renderIFrameWarning();
		return;
	} else if (m.type === "render") {
		renderHTML();
		return;
	}
	let frameId = port.sender.frameId;

	let audioHTML = document.createDocumentFragment();
	let videoHTML = document.createDocumentFragment();

	let mapper = e => generateSlider(e, frameId, m.documentId);
	m.audio.map(mapper).forEach(e => audioHTML.append(e));
	m.video.map(mapper).forEach(e => videoHTML.append(e));

	let frameData = { audioHTML: audioHTML, videoHTML: videoHTML };
	let frameDataArray = frameDataMap.get(frameId);
	if (frameDataArray === undefined) {
		frameDataArray = [];
		frameDataMap.set(frameId, frameDataArray);
	}
	frameDataArray[m.documentId] = frameData;
}

/**
 * Render the HTML of the Addon-Popup if no media was found.
 */
function renderEmptyPage() {
	let p = document.createElement("p");
	p.textContent = "No audio or video elements on this page.";
	return document.createDocumentFragment().appendChild(p);
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
		//Don't render warning if we have permission to look into the iframe anyway.
		return;
	}
	if (warningOutlet.children.length) {
		//Don't render if we already rendered.
		return;
	}

	warningOutlet.appendChild(iframeWarningTemplate.content);

	document.getElementById("permission-request").addEventListener("click", () => {
		const permissionsToRequest = {
			origins: ["<all_urls>"],
		}
		browser.permissions.request(permissionsToRequest).then((permissionGranted) => {
			if (permissionGranted) {
				runContentScript();
			}
		});
	});
}

/**
 * Render the HTML of the Addon-Popup based on the data inside sortedFrameData.
 */
function renderHTML() {
	let audioHTML = document.createDocumentFragment();
	let videoHTML = document.createDocumentFragment();
	let sortedFrameEntries = [...frameDataMap.entries()].sort();

	for (let [key, value] of sortedFrameEntries) {
		for (e of value) {
			audioHTML.append(e.audioHTML.cloneNode(true));
			videoHTML.append(e.videoHTML.cloneNode(true));
		}
	}

	let html = document.createDocumentFragment();
	if (audioHTML.children.length) {
		html.append(audioHTML);
	}
	if (videoHTML.children.length) {
		html.append(videoHTML);
	}
	if (!html.children.length) {
		//Render empty page and die.
		html = renderEmptyPage();
		controlOutlet.textContent = "";
		errorOutlet.appendChild(html);
		return;
	} else {
		let newHtml = document.createDocumentFragment();
		newHtml.append(masterTemplate.content);
		newHtml.append(html);
		html = newHtml;
	}

	errorOutlet.textContent = "";
	controlOutlet.textContent = "";
	controlOutlet.appendChild(html);

	let sliders = document.getElementsByClassName("slider channel");
	Array.from(sliders).forEach(slider => {
		slider.addEventListener("input", sendAdjustedVolume);
	});

	let master = document.getElementById("master");
	let max = Math.max(...Array.prototype.map.call(sliders, s => s.value));
	master.addEventListener("input", changeMasterVolume);
	master.value = max;
}

/**
 * Creates a h3 element.
 * @param {string} text 
 */
function h3(text) {
	let h3 = document.createElement('h3');
	h3.textContent = text;
	return h3;
}

/**
 * Creates a p element.
 * @param {string} text
 */
function paragraph(text) {
	let p = document.createElement('p');
	p.textContent = text;
	return p;
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
		id: this.dataset.volumecontrolId,
		volume: this.value / 100,
		documentId: documentId,
	});
}

/**
 * Changes the volume for all sliders based on the master volume.
 */
function changeMasterVolume() {
	let volume = this.value;
	let sliders = document.getElementsByClassName("slider channel");

	Array.from(sliders).forEach(slider => {
		slider.value = volume;
		sendAdjustedVolume.bind(slider)();
	});
}

/**
 * Generate a slider representing the media status inside a message.
 * @param {*} m Message from the contententscript about the current media status.
 * @param {number} frameId ID of the frame this slider was generated for. Will be used to send the volume commands to the appropriate frame.  
 */
function generateSlider(m, frameId, documentId) {
	const content = sliderTemplate.content;

	const label = content.querySelector("label");
	label.for = m.id;

	const typeIndicator = content.querySelector(".media-type-indicator");
	if (m.type === "audio") {
		typeIndicator.textContent = "Audio at ";
	} else if (m.type === "video") {
		typeIndicator.textContent = "Video at ";
	}

	const anchor = content.querySelector("a");
	anchor.href = m.src;
	anchor.textContent = decodeURIComponent(m.src);

	const input = content.querySelector("input");
	input.id = m.id;
	input.value = m.volume * 100;
	input.dataset.type = m.type;
	input.dataset.volumecontrolId = m.id
	input.dataset.frameId = frameId;
	input.dataset.documentId = documentId

	return document.importNode(content, true);
}