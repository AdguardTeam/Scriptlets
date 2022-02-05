import {
    hit,
    toRegExp,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-src
 *
 * @description
 * Blocks loading of script, img and iframe tags preventing 'onerror' listeners and not breaking 'onload' ones.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-src', search, tagName)
 * ```
 *
 * - `search` - optional, string or regular expression for matching the element's URL;
 * - `tagName` - string, nodeName of target element, src of which should be silently blocked, case-insensitive.
 *
 *
 * **Examples**
 * 1. Prevent script source from loading:
 * ```
 *     example.org#%#//scriptlet('prevent-src', 'adsbygoogle', 'script')
 * ```
 */
/* eslint-enable max-len */
export function preventSrc(source, search, tagName) {
    const searchRegexp = toRegExp(search);
    const srcMockData = {
        // "KCk9Pnt9" = "()=>{}"
        script: 'data:text/javascript;base64,KCk9Pnt9',
        // Empty 1x1 image
        img: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        image: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        input: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        // Empty h1 tag
        iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4=',
        // Empty audio
        audio: 'data:audio/wav;base64, UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==',
        // Empty video
        video: 'data:video/mp4;base64, UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==',
        // Empty text
        text: 'data:text/plain;base64, IA==',
        track: 'data:text/plain;base64, IA==',
    };

    const setAttributeWrapper = (target, thisArg, args) => {
        debugger;

        const element = thisArg;
        const nodeName = element.nodeName.toLowerCase();
        const attr = args[0].toLowerCase();
        const value = args[1]
        // Check if arguments are present
        if (!attr || !value) {
            console.log('NO_ARGS');
            return;
        }

        const isTargetElement = tagName.toLowerCase() === nodeName;
        const isMatch = searchRegexp.test(value);
        // Pass all calls if attribute is not src or the element or value isn't matched
        if (attr !== 'src' || !isMatch || !isTargetElement) {
            console.log('NOT_SRC_ATTR || NO_MATCH');
            return Reflect.apply(target, thisArg, args);
        }

        // source and embed tags can be of any media types
        if ((nodeName === 'source' || nodeName === 'embed')) {
            if (!element.type) {
                // Return if node is invalid source/embed tag
                return;
            }
            const mediaType = element.type.split('/')[0];
            if (srcMockData[mediaType]) {
                // Forward the URI that corresponds with element's MIME type
                hit(source);
                return Reflect.apply(target, thisArg, [attr, srcMockData[mediaType]]);
            } else {
                // Return if there is no mock resource for this MIME type
                return;
            }
        }
        // Forward the URI that corresponds with element's MIME type
        hit(source);
        return Reflect.apply(target, thisArg, [attr, srcMockData[nodeName]]);
    };


    const setAttributeHandler = {
        apply: setAttributeWrapper
    };
    Element.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);
}

preventSrc.names = [
    'prevent-src',
];

preventSrc.injections = [
    hit,
    toRegExp,
];
