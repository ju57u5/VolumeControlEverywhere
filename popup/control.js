let executionResult = browser.tabs.executeScript(null, {
	file: "/content_scripts/contentcontrol.js"
});

let portFromCS;
let controlOutlet = document.querySelector('#control-outlet');

/**
 * Connects to the dataport.
 * @param {*} p 
 */
function connected(p) {
	portFromCS = p;
	portFromCS.onMessage.addListener(handleMessage);
	portFromCS.postMessage({type: "status"});
}

/**
 * Handle a message from the dataport.
 * @param {*} m Message
 */
function handleMessage(m) {
	let html = "";

	audioHTML = m.audio.map(e => generateSlider(e)).join("");
	videoHTML = m.video.map(e => generateSlider(e)).join("");

	if (audioHTML) {
		html += `<h3>Audio</h3>${audioHTML}`;
	}
	if (videoHTML) {
		html += `<h3>Video</h3>${videoHTML}`;
	}
	if (!html) {
		html = "<p>No Audio or Video Elements on this page.</p>";
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
	portFromCS.postMessage({
		type: this.dataset.type,
		id: this.dataset.volumecontrolid,
		volume: this.value / 100,
	});
}

/**
 * Generate a slider representing the media status inside a message.
 * @param {*} m Message from the contententscript about the current media status.
 */
function generateSlider(m) {
	return `<label for="${m.id}">
	    		<a href="${m.src}">${decodeURIComponent(m.src)}</a>
	    	</label>
	    	<input id="${m.id}" class="slider" type="range" min="0" max="100" value="${m.volume * 100}" data-type="audio" data-volumecontrolid="${m.id}">
    	`;
}

executionResult.catch(
	(error) => {
		console.error(error);
		controlOutlet.innerHTML = `<h3>Error executing addon.</h3>${error}`;
		if (error.message === "Missing host permission for the tab") {
			controlOutlet.innerHTML += "<p>This is probably caused because you are on a internal site (e.g. about:blank) or on one of the <a href='https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts'>here mentioned domains</a> (e.g. addons.mozilla.com).</p>"
		}
	}
);
browser.runtime.onConnect.addListener(connected);

