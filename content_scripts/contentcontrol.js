(function () {
	const VCE_PORT = browser.runtime.connect({ name: "vce-from-cs" });
	const contentDocuments = [globalThis.document];
	const audioElements = [];
	const videoElements = [];
	setUpPortListener();

	/**
	 * Sets up a listener to listen to volume adjustment messages and change the volume.
	 */
	function setUpPortListener() {
		VCE_PORT.onMessage.addListener((m) => {
			if (m.type === "audio") {
				let element = audioElements[m.documentId][m.id];
				element.volume = m.volume;
			}
			else if (m.type === "video") {
				let element = videoElements[m.documentId][m.id];
				console.log("video", element);
				element.volume = m.volume;
			}
			else if (m.type === "status") {
				sendCurrentMediaStatus();
				if (m.checkIFrame) {
					sendCurrentIFrameStatus();
				}
				VCE_PORT.postMessage({ type: "render" });
			}
		});
	}

	/**
	 * Checks if the I-Frame is protected by security reasons (e. g. cross origin content).
	 * @param {HTMLIFrameElement} iframe The I-Frame to check.
	 */
	function canAccessIFrame(iframe) {
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
		if (!iframe) {
			return;
		}

		if (document === globalThis.document) {
			//reset array
			contentDocuments.length = 0;
			contentDocuments.push(globalThis.document);
		}

		for (let e of iframe) {
			if (!canAccessIFrame(e)) {
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
	function getPortMessage(element, index) {
		return {
			src: element.currentSrc,
			volume: element.volume,
			id: index,
			type: element.nodeName.toLowerCase(),
		};
	}

	/**
	 * Collects the current media status and sends on the dataport.
	 * @param {HTMLDocument} document Set if you want to not use globalThis.document.
	 */
	function sendCurrentMediaStatus(document = globalThis.document, documentId = 0) {
		audioElements[documentId] = document.getElementsByTagName("audio");
		videoElements[documentId] = document.getElementsByTagName("video");

		let message = {
			audio: Array.prototype.map.call(audioElements[documentId], getPortMessage),
			video: Array.prototype.map.call(videoElements[documentId], getPortMessage),
			documentId: documentId,
		}

		VCE_PORT.postMessage(message);
	}
})();