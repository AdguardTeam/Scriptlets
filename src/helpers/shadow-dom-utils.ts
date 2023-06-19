/**
 * Makes arbitrary operations on shadow root element,
 * to be passed as callback to hijackAttachShadow
 */
type AttachShadowCallback = (shadowRoot: ShadowRoot) => void;

type AttachShadow = (init: ShadowRootInit) => ShadowRoot;

/**
 * Overrides attachShadow method of Element API on a given context
 * to pass retrieved shadowRoots to callback
 *
 * @param context e.g global window object or contentWindow of an iframe
 * @param hostSelector selector to determine if callback should be called on current shadow subtree
 * @param callback callback to call on shadow root
 */
export const hijackAttachShadow = (
    context: typeof globalThis,
    hostSelector: string,
    callback: AttachShadowCallback,
): void => {
    const handlerWrapper = (target: AttachShadow, thisArg: Element, args: unknown[]): ShadowRoot => {
        const shadowRoot: ShadowRoot = Reflect.apply(target, thisArg, args);

        if (thisArg && thisArg.matches(hostSelector || '*')) {
            callback(shadowRoot);
        }

        return shadowRoot;
    };

    const attachShadowHandler: ProxyHandler<AttachShadow> = {
        apply: handlerWrapper,
    };

    context.Element.prototype.attachShadow = new Proxy<AttachShadow>(
        context.Element.prototype.attachShadow,
        attachShadowHandler,
    );
};
