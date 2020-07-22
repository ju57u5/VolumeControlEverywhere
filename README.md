# VolumeControlEverywhere

Modern websites seem to hate to give you control over audio and video volume, so this is apparently needed.

This addon will detect HTML5 audio/video components in the current tab and provide a quick way to change the volume.

![Screenshot of the addon](screenshot.png)

Note that not every sound coming out of your browser is a HTML5 audio or video element, so this addon might not solve all your problems.

## FAQ

### Why does this addon ask me to give it more permissions?

Websites sometimes display content with the help of an [iframe](https://developer.mozilla.org/docs/Web/HTML/Element/iframe) which you can think of as a website inside a website.

If that website is on the same origin as the website the iframe is used in, this addon can discover the media elements inside the iframe. If the inner content of the iframe is instead on a different origin, that process is forbidden by [same origin policy](https://en.wikipedia.org/wiki/Same-origin_policy).

This addon can get around that restriction, by you allowing it to access every website/URL/origin not just the one that is currently in you address bar.

### What's the difference between this and [SoundFixer](https://github.com/myfreeweb/soundfixer)?

This web extension isn't here to fix problems with the actual audio. It just exposes the volume control of audio/video elements, which is usefull if they don't have one themselfes.

Because of this it also doesn't use the WebAudio API, so it can be used with cross domain media. This addon also works with audio/video inside of iframes, which SoundFixer does not.

If you on the other hand need to amplify audio above the max. volume or fix mono/stereo issues, SoundFixer should be your choice.
