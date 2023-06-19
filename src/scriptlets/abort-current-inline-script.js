import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler,
    hit,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isEmptyObject,
    getDescriptorAddon,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet abort-current-inline-script
 *
 * @description
 * Aborts an inline script when it attempts to **read** or **write to** the specified property
 * AND when the contents of the `<script>` element contains the specified
 * text or matches the regular expression.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-current-inline-script.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('abort-current-inline-script', property[, search])
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`
 * - `search` — optional, string or regular expression that must match the inline script content.
 *   Defaults to abort all scripts which are trying to access the specified property.
 *   Invalid regular expression will cause exit and rule will not work.
 *
 * > Note please that to abort the inline script with addEventListener in it,
 * > `property` should be set as `EventTarget.prototype.addEventListener`, not just `addEventListener`.
 *
 * ### Examples
 *
 * 1. Aborts all inline scripts trying to access `window.alert`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-current-inline-script', 'alert')
 *     ```
 *
 * 1. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-current-inline-script', 'alert', 'Hello, world')
 *     ```
 *
 *     For instance, the following script will be aborted:
 *
 *     ```html
 *     <script>alert("Hello, world");</script>
 *     ```
 *
 * 1. Aborts inline scripts which are trying to access `window.alert` and match regexp `/Hello.+world/`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-current-inline-script', 'alert', '/Hello.+world/')
 *     ```
 *
 *     For instance, the following scripts will be aborted:
 *
 *     ```html
 *     <script>alert("Hello, big world");</script>
 *     ```
 *
 *     ```html
 *     <script>alert("Hello, little world");</script>
 *     ```
 *
 *     And this script will not be aborted:
 *
 *     ```html
 *     <script>alert("Hi, little world");</script>
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function abortCurrentInlineScript(source, property, search) {
    const searchRegexp = toRegExp(search);
    const rid = randomId();

    const SRC_DATA_MARKER = 'data:text/javascript;base64,';

    const getCurrentScript = () => {
        if ('currentScript' in document) {
            return document.currentScript;
        }
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    };

    const ourScript = getCurrentScript();

    const abort = () => {
        const scriptEl = getCurrentScript();
        if (!scriptEl) {
            return;
        }
        let content = scriptEl.textContent;

        // We are using Node.prototype.textContent property descriptor
        // to get the real script content
        // even when document.currentScript.textContent is replaced.
        // https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-593638991
        try {
            const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
            content = textContentGetter.call(scriptEl);
        } catch (e) { } // eslint-disable-line no-empty

        // https://github.com/AdguardTeam/Scriptlets/issues/130
        if (content.length === 0
            && typeof scriptEl.src !== 'undefined'
            && scriptEl.src?.startsWith(SRC_DATA_MARKER)) {
            const encodedContent = scriptEl.src.slice(SRC_DATA_MARKER.length);
            content = window.atob(encodedContent);
        }

        if (scriptEl instanceof HTMLScriptElement
            && content.length > 0
            && scriptEl !== ourScript
            && searchRegexp.test(content)) {
            hit(source);
            throw new ReferenceError(rid);
        }
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        let { base } = chainInfo;
        const { prop, chain } = chainInfo;

        // The scriptlet might be executed before the chain property has been created
        // (for instance, document.body before the HTML body was loaded).
        // In this case we're checking whether the base element exists or not
        // and if not, we simply exit without overriding anything.
        // e.g. https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-575841092
        if (base instanceof Object === false && base === null) {
            const props = property.split('.');
            const propIndex = props.indexOf(prop);
            const baseName = props[propIndex - 1];

            const message = `The scriptlet had been executed before the ${baseName} was loaded.`;
            logMessage(source, message);
            return;
        }

        if (chain) {
            const setter = (a) => {
                base = a;
                if (a instanceof Object) {
                    setChainPropAccess(a, chain);
                }
            };
            Object.defineProperty(owner, prop, {
                get: () => base,
                set: setter,
            });
            return;
        }

        let currentValue = base[prop];
        let origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        if (origDescriptor instanceof Object === false
            || origDescriptor.get instanceof Function === false) {
            currentValue = base[prop];
            origDescriptor = undefined;
        }

        const descriptorWrapper = Object.assign(getDescriptorAddon(), {
            currentValue,
            get() {
                if (!this.isAbortingSuspended) {
                    this.isolateCallback(abort);
                }
                if (origDescriptor instanceof Object) {
                    return origDescriptor.get.call(base);
                }
                return this.currentValue;
            },
            set(newValue) {
                if (!this.isAbortingSuspended) {
                    this.isolateCallback(abort);
                }
                if (origDescriptor instanceof Object) {
                    origDescriptor.set.call(base, newValue);
                } else {
                    this.currentValue = newValue;
                }
            },
        });

        setPropertyAccess(base, prop, {
            // Call wrapped getter and setter to keep isAbortingSuspended & isolateCallback values
            get() {
                return descriptorWrapper.get.call(descriptorWrapper);
            },
            set(newValue) {
                descriptorWrapper.set.call(descriptorWrapper, newValue);
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

abortCurrentInlineScript.names = [
    'abort-current-inline-script',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-current-script.js',
    'ubo-abort-current-script.js',
    'acs.js',
    'ubo-acs.js',
    // "ubo"-aliases with no "js"-ending
    'ubo-abort-current-script',
    'ubo-acs',
    // obsolete but supported aliases
    'abort-current-inline-script.js',
    'ubo-abort-current-inline-script.js',
    'acis.js',
    'ubo-acis.js',
    'ubo-abort-current-inline-script',
    'ubo-acis',
    'abp-abort-current-inline-script',
];

abortCurrentInlineScript.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler,
    hit,
    logMessage,
    isEmptyObject,
    getDescriptorAddon,
];
