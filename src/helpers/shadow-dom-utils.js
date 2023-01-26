/**
 * Makes arbitrary operations on shadow root element,
 * to be passed as callback to hijackAttachShadow
 *
 * @callback attachShadowCallback
 * @param {HTMLElement} shadowRoot
 * @returns {void}
 */

/**
 * Overrides attachShadow method of Element API on a given context
 * to pass retrieved shadowRoots to callback
 *
 * @param {Object} context e.g global window object or contentWindow of an iframe
 * @param {string} hostSelector selector to determine if callback should be called on current shadow subtree
 * @param {attachShadowCallback} callback callback to call on shadow root
 */
export const hijackAttachShadow = (context, hostSelector, callback) => {
    const handlerWrapper = (target, thisArg, args) => {
        const shadowRoot = Reflect.apply(target, thisArg, args);

        if (thisArg && thisArg.matches(hostSelector || '*')) {
            callback(shadowRoot);
        }

        return shadowRoot;
    };

    const attachShadowHandler = {
        apply: handlerWrapper,
    };

    context.Element.prototype.attachShadow = new Proxy(context.Element.prototype.attachShadow, attachShadowHandler);
};
