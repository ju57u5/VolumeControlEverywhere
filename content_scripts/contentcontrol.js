(function () {
	//only execute once
	if (globalThis.VCE_PORT !== undefined) {
		return;
	}
	const dataSetKey = "addonVolumeControlEverywhere";
	const dataString = "data-addon-volume-control-everywhere";
	const VCE_PORT = browser.runtime.connect({ name: "port-from-cs" });

	/**
	 * Sets up a listener to listen to volume adjustment messages and change the volume.
	 */
	function setUpPortListener() {
		VCE_PORT.onMessage.addListener((m) => {
			if (m.type === "audio") {
				let audioElements = document.querySelector(`audio[${dataString}='${m.id}']`);
				audioElements.volume = m.volume;
			}
			else if (m.type === "video") {
				let videoElements = document.querySelector(`video[${dataString}='${m.id}']`);
				videoElements.volume = m.volume;
			}
			else if (m.type === "status") {
				sendCurrentMediaStatus();
			}
		});
	}

	/**
	 * Converts the state of a marked audio- or video-element, into a message for the dataport. 
	 * @param {HTMLAudioElement|HTMLVideoElement} element audio or video-element marked with {@link markElements}.
	 * @see {@link markElements}
	 */
	function getPortMessage(element) {
		return {
			src: element.currentSrc,
			volume: element.volume,
			id: element.dataset[dataSetKey]
		};
	}

	/**
	 * Collects the current media status and sends on the dataport.
	 */
	function sendCurrentMediaStatus() {
		let audioElements = document.getElementsByTagName("audio");
		let videoElements = document.getElementsByTagName("video");

		markElements(audioElements);
		markElements(videoElements);

		let message = {
			audio: Array.prototype.map.call(
				audioElements, e => getPortMessage(e)
			),
			video: Array.prototype.map.call(
				videoElements, e => getPortMessage(e)
			),
		}

		VCE_PORT.postMessage(message);
	}

	/**
	 * Marks DOM-Elemens with an id in the data attribute, to identify them later.
	 * The key for the data-attribute is determined by the following scheme: data-addon-volume-control-everywhere-n, where n is an integer count of the elements starting at 1.
	 *
	 * @param {HTMLAudioElement|HTMLVideoElement} elements DOM-Elements to mark.
	 */
	function markElements(elements) {
		let id = 1;
		for (let e of elements) {
			if (!(dataSetKey in e.dataset)) {
				e.dataset[dataSetKey] = id++;
			}
		}
	}

	setUpPortListener();
})();