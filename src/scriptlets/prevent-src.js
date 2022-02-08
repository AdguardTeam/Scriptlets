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
    let instance;
    if (tagName === 'script') {
        instance = HTMLScriptElement;
    } else if (tagName === 'img') {
        instance = HTMLImageElement;
    } else if (tagName === 'iframe') {
        instance = HTMLIFrameElement;
    } else {
        return;
    }

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
        if (attr !== 'src' || !isMatch || !isTargetElement || !srcMockData[nodeName]) {
            return Reflect.apply(target, thisArg, args);
        }

        hit(source);
        // Forward the URI that corresponds with element's MIME type
        return Reflect.apply(target, thisArg, [attr, srcMockData[nodeName]]);
    };

    const setAttributeHandler = {
        apply: setAttributeWrapper,
    };
    // eslint-disable-next-line max-len
    instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);

    Object.defineProperty(instance.prototype, 'src', {
        enumerable: true,
        configurable: true,
        get() {
            if (this.getAttribute('src')) {
                return this.getAttribute('src');
            }
            return '';
        },
        set(src) {
            const nodeName = this.nodeName.toLowerCase();
            const isTargetElement = tagName.toLowerCase() === nodeName;
            const isMatch = searchRegexp.test(src);
            if (!isMatch || !isTargetElement || !srcMockData[nodeName]) {
                this.setAttribute('src', src);
                return;
            }
            // For websites that use Trusted Types
            // https://w3c.github.io/webappsec-trusted-types/dist/spec/
            const hasTrustedTypes = !(window.trustedTypes && window.trustedTypes.createPolicy);
            // eslint-disable-next-line no-undef
            if (hasTrustedTypes && src instanceof TrustedScriptURL) {
                const policy = window.trustedTypes.createPolicy('mock', {
                    createScriptURL: (arg) => arg,
                });
                this.setAttribute('src', policy.createScriptURL(src));
                return;
            }
            hit(source);
            this.setAttribute('src', srcMockData[nodeName]);
        },
    });
}

preventSrc.names = [
    'prevent-src',
];

preventSrc.injections = [
    hit,
    toRegExp,
];
