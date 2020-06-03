(function () {
	//only execute once
	if (globalThis.VCE_PORT !== undefined) {
		return;
	}
	const dataSetKey = "addonVolumeControlEverywhere";
	const dataString = "data-addon-volume-control-everywhere";
	const VCE_PORT = browser.runtime.connect({ name: "port-from-cs" });
	const contentDocuments = [globalThis.document];

	/**
	 * Sets up a listener to listen to volume adjustment messages and change the volume.
	 */
	function setUpPortListener() {
		VCE_PORT.onMessage.addListener((m) => {
			if (m.type === "audio") {
				let audioElement = contentDocuments[m.documentId].querySelector(`audio[${dataString}='${m.id}']`);
				audioElement.volume = m.volume;
			}
			else if (m.type === "video") {
				let videoElement = contentDocuments[m.documentId].querySelector(`video[${dataString}='${m.id}']`);
				videoElement.volume = m.volume;
			}
			else if (m.type === "status") {
				sendCurrentMediaStatus();
				if (m.checkIFrame) {
					sendCurrentIFrameStatus();
				}
			}
		});
	}

	/**
	 * Checks if the I-Frame is protected by security reasons (e. g. cross origin content).
	 * @param {HTMLIFrameElement} iframe The I-Frame to check.
	 */
	function canAccessIframe(iframe) {
		try {
			return Boolean(iframe.contentDocument);
		}
		catch (e) {
			return false;
		}
	}

	/**
	 * Sends a message over the dataport, to indicate whether there are protected iframes.
	 * This function calls itself recursively to also process I-Frames inside I-Frames.
	 * This function should only be called, if <all_urls> isn't allowed, because otherwise we can just inject a contentscript. 
	 * @param {HTMLDocument} document Set if you want to not use globalThis.document.
	 */
	function sendCurrentIFrameStatus(document = globalThis.document) {
		let iframe = document.querySelectorAll("iframe");
		if(!iframe) {
			return;
		}

		if (document === globalThis.document) {
			//reset array
			contentDocuments.length = 0;
			contentDocuments.push(globalThis.document);
		}

		for (let e of iframe) {
			if (!canAccessIframe(e)) {
				VCE_PORT.postMessage({ type: "iframe-status", iframe: true });
			} else {
				let length = contentDocuments.push(e.contentDocument);
				sendCurrentMediaStatus(e.contentDocument, length - 1);
				sendCurrentIFrameStatus(e.contentDocument);
			}
		}
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
			id: element.dataset[dataSetKey],
			type: element.nodeName.toLowerCase()
		};
	}

	/**
	 * Collects the current media status and sends on the dataport.
	 * @param {HTMLDocument} document Set if you want to not use globalThis.document.
	 */
	function sendCurrentMediaStatus(document = globalThis.document, documentId = 0) {
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
			documentId: documentId,
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
			e.dataset[dataSetKey] = id++;
		}
	}

	setUpPortListener();
})();