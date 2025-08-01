import {
    hit,
    toRegExp,
    safeGetDescriptor,
    noopFunc,
    getTrustedTypesApi,
} from '../helpers';

/* eslint-disable max-len, consistent-return */
/**
 * @scriptlet prevent-element-src-loading
 *
 * @description
 * Prevents target element source loading without triggering 'onerror' listeners and not breaking 'onload' ones.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-element-src-loading', tagName, match)
 * ```
 *
 * - `tagName` — required, case-insensitive target element tagName
 *   which `src` property resource loading will be silently prevented; possible values:
 *     - `script`
 *     - `img`
 *     - `iframe`
 *     - `link`
 * - `match` — required, string or regular expression for matching the element's URL;
 *
 * ### Examples
 *
 * 1. Prevent script source loading
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-element-src-loading', 'script', 'adsbygoogle')
 *     ```
 *
 * @added v1.6.2.
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
        // Empty data
        link: 'data:text/plain;base64,',
    };

    let instance;
    if (tagName === 'script') {
        instance = HTMLScriptElement;
    } else if (tagName === 'img') {
        instance = HTMLImageElement;
    } else if (tagName === 'iframe') {
        instance = HTMLIFrameElement;
    } else if (tagName === 'link') {
        instance = HTMLLinkElement;
    } else {
        return;
    }

    // For websites that use Trusted Types
    // https://w3c.github.io/webappsec-trusted-types/dist/spec/
    const policy = getTrustedTypesApi(source);

    const SOURCE_PROPERTY_NAME = tagName === 'link' ? 'href' : 'src';
    const ONERROR_PROPERTY_NAME = 'onerror';
    const searchRegexp = toRegExp(match);

    // This will be needed to silent error events on matched element,
    // as url wont be available
    const setMatchedAttribute = (elem) => elem.setAttribute(source.name, 'matched');

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
        setMatchedAttribute(thisArg);
        // Forward the URI that corresponds with element's MIME type
        return Reflect.apply(target, thisArg, [attrName, srcMockData[nodeName]]);
    };

    const setAttributeHandler = {
        apply: setAttributeWrapper,
    };
    // eslint-disable-next-line max-len
    instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);

    const origSrcDescriptor = safeGetDescriptor(instance.prototype, SOURCE_PROPERTY_NAME);
    if (!origSrcDescriptor) {
        return;
    }
    Object.defineProperty(instance.prototype, SOURCE_PROPERTY_NAME, {
        enumerable: true,
        configurable: true,
        get() {
            return origSrcDescriptor.get.call(this);
        },
        set(urlValue) {
            const nodeName = this.nodeName.toLowerCase();
            const isMatched = tagName.toLowerCase() === nodeName
                && srcMockData[nodeName]
                && searchRegexp.test(urlValue);

            if (!isMatched) {
                origSrcDescriptor.set.call(this, urlValue);
                // eslint-disable-next-line no-setter-return
                return true;
            }

            let mockData = srcMockData[nodeName];

            // If setting value is TrustedScriptURL - we also should set TrustedScriptURL to not violate trusted types
            if (
                typeof TrustedScriptURL !== 'undefined'
                && policy?.isSupported
                // eslint-disable-next-line no-undef
                && urlValue instanceof TrustedScriptURL
            ) {
                mockData = policy.createScriptURL(mockData);
            }

            setMatchedAttribute(this);
            origSrcDescriptor.set.call(this, mockData);
            hit(source);
        },
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/228
    // Prevent error event being triggered by other sources
    const origOnerrorDescriptor = safeGetDescriptor(HTMLElement.prototype, ONERROR_PROPERTY_NAME);
    if (!origOnerrorDescriptor) {
        return;
    }

    Object.defineProperty(HTMLElement.prototype, ONERROR_PROPERTY_NAME, {
        enumerable: true,
        configurable: true,
        get() {
            return origOnerrorDescriptor.get.call(this);
        },
        set(cb) {
            const isMatched = this.getAttribute(source.name) === 'matched';

            if (!isMatched) {
                origOnerrorDescriptor.set.call(this, cb);
                // eslint-disable-next-line no-setter-return
                return true;
            }

            origOnerrorDescriptor.set.call(this, noopFunc);
            // eslint-disable-next-line no-setter-return
            return true;
        },
    });

    const addEventListenerWrapper = (target, thisArg, args) => {
        // Check if arguments are present
        if (!args[0] || !args[1] || !thisArg) {
            return Reflect.apply(target, thisArg, args);
        }

        const eventName = args[0];
        const isMatched = typeof thisArg.getAttribute === 'function'
            && thisArg.getAttribute(source.name) === 'matched'
            && eventName === 'error';

        if (isMatched) {
            return Reflect.apply(target, thisArg, [eventName, noopFunc]);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const addEventListenerHandler = {
        apply: addEventListenerWrapper,
    };
    // eslint-disable-next-line max-len
    EventTarget.prototype.addEventListener = new Proxy(EventTarget.prototype.addEventListener, addEventListenerHandler);

    const preventInlineOnerror = (tagName, src) => {
        window.addEventListener('error', (event) => {
            if (
                !event.target
                || !event.target.nodeName
                || event.target.nodeName.toLowerCase() !== tagName
                || !event.target.src
                || !src.test(event.target.src)
            ) {
                return;
            }
            hit(source);
            if (typeof event.target.onload === 'function') {
                event.target.onerror = event.target.onload;
                return;
            }
            event.target.onerror = noopFunc;
        }, true);
    };
    preventInlineOnerror(tagName, searchRegexp);
}

export const preventElementSrcLoadingNames = [
    'prevent-element-src-loading',
];

// eslint-disable-next-line prefer-destructuring
preventElementSrcLoading.primaryName = preventElementSrcLoadingNames[0];

preventElementSrcLoading.injections = [
    hit,
    toRegExp,
    safeGetDescriptor,
    noopFunc,
    getTrustedTypesApi,
];
