# VolumeControlEverywhere

Modern websites seem to hate to give you control over audio and video volume, so this is apparently needed.

This addon will detect HTML5 audio/video components in the current tab and provide a quick way to change the volume.

Note that not every sound coming out of your browser is a HTML5 audio or video element, so this addon might not solve all your problems.


### Why does this addon ask me to give it more permissions?

Websites sometimes display content with the help of an [iframe](https://developer.mozilla.org/de/docs/Web/HTML/Element/iframe) which you can think of as a website inside a website. If that website is on the same origin as the website the iframe is used in, this addon can discover the media elements inside the iframe. If the inner content of the iframe is instead on a different origin, that process is forbidden by [same origin policy](https://en.wikipedia.org/wiki/Same-origin_policy). This addon can get around that restriction, by you allowing it to access every website/URL/origin not just the one that is currently in you address bar.
