import {
    hit,
    toRegExp,
    safeGetDescriptor,
} from '../helpers/index';

/* eslint-disable max-len, consistent-return */
/**
 * @scriptlet prevent-element-src-loading
 *
 * @description
 * Prevents target element source loading without triggering 'onerror' listeners and not breaking 'onload' ones.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-src', tagName, match)
 * ```
 *
 * - `tagName` - required, case-insensitive target element tagName which `src` property resource loading will be silently prevented; possible values:
 *     - `script`
 *     - `img`
 *     - `iframe`
 * - `match` - required, string or regular expression for matching the element's URL;
 *
 * **Examples**
 * 1. Prevent script source loading:
 * ```
 *     example.org#%#//scriptlet('prevent-element-src-loading', 'script' ,'adsbygoogle')
 * ```
 */
/* eslint-enable max-len */
export function preventElementSrcLoading(source, tagName, match) {
    // do nothing if browser does not support Proxy or Reflect
    if (typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
        return;
    }
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
    // For websites that use Trusted Types
    // https://w3c.github.io/webappsec-trusted-types/dist/spec/
    const hasTrustedTypes = window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function';
    let policy;
    if (hasTrustedTypes) {
        policy = window.trustedTypes.createPolicy('mock', {
            createScriptURL: (arg) => arg,
        });
    }
    const SOURCE_PROPERTY_NAME = 'src';
    const searchRegexp = toRegExp(match);

    const setAttributeWrapper = (target, thisArg, args) => {
        // Check if arguments are present
        if (!args[0] || !args[1]) {
            return Reflect.apply(target, thisArg, args);
        }
        const nodeName = thisArg.nodeName.toLowerCase();
        const attrName = args[0].toLowerCase();
        const attrValue = args[1];
        const isMatched = attrName === SOURCE_PROPERTY_NAME
            && tagName.toLowerCase() === nodeName
            && srcMockData[nodeName]
            && searchRegexp.test(attrValue);

        if (!isMatched) {
            return Reflect.apply(target, thisArg, args);
        }

        hit(source);
        // Forward the URI that corresponds with element's MIME type
        return Reflect.apply(target, thisArg, [attrName, srcMockData[nodeName]]);
    };

    const setAttributeHandler = {
        apply: setAttributeWrapper,
    };
    // eslint-disable-next-line max-len
    instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);

    const origDescriptor = safeGetDescriptor(instance.prototype, SOURCE_PROPERTY_NAME);
    if (!origDescriptor) {
        return;
    }
    Object.defineProperty(instance.prototype, SOURCE_PROPERTY_NAME, {
        enumerable: true,
        configurable: true,
        get() {
            return origDescriptor.get.call(this);
        },
        set(urlValue) {
            const nodeName = this.nodeName.toLowerCase();
            const isMatched = tagName.toLowerCase() === nodeName
                && srcMockData[nodeName]
                && searchRegexp.test(urlValue);

            if (!isMatched) {
                origDescriptor.set.call(this, urlValue);
                return;
            }

            // eslint-disable-next-line no-undef
            if (policy && urlValue instanceof TrustedScriptURL) {
                const trustedSrc = policy.createScriptURL(urlValue);
                origDescriptor.set.call(this, trustedSrc);
                hit(source);
                return;
            }
            origDescriptor.set.call(this, srcMockData[nodeName]);
            hit(source);
        },
    });
}

preventElementSrcLoading.names = [
    'prevent-element-src-loading',
];

preventElementSrcLoading.injections = [
    hit,
    toRegExp,
    safeGetDescriptor,
];
