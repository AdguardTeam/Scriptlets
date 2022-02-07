import {
    hit,
    toRegExp,
} from '../helpers';

/* eslint-disable max-len, consistent-return */
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
        // Empty h1 tag
        iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4=',
    };

    const setAttributeWrapper = (target, thisArg, args) => {
        const element = thisArg;
        const nodeName = element.nodeName.toLowerCase();
        const attr = args[0].toLowerCase();
        const value = args[1];
        // Check if arguments are present
        if (!attr || !value) {
            return;
        }

        const isTargetElement = tagName.toLowerCase() === nodeName;
        const isMatch = searchRegexp.test(value);
        // Pass all calls if attribute is not src or the element or value isn't matched
        if (attr !== 'src' || !isMatch || !isTargetElement) {
            return Reflect.apply(target, thisArg, args);
        }

        // Forward the URI that corresponds with element's MIME type
        hit(source);
        return Reflect.apply(target, thisArg, [attr, srcMockData[nodeName]]);
    };

    const setAttributeHandler = {
        apply: setAttributeWrapper,
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
