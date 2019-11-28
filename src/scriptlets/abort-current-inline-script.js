/* eslint-disable no-new-func */
import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { toRegExp } from '../helpers/string-utils';
import { hit, createOnErrorHandler } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet abort-current-inline-script
 *
 * @description
 * Aborts an inline script when it attempts to **read** the specified property
 * AND when the contents of the `<script>` element contains the specified
 * text or matches the regular expression.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-
 *
 * Related ABP source:
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L928
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("abort-current-inline-script", <property> [, <search>])
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `search` (optional) string or regular expression that must match the inline script contents. If not set, abort all inline scripts which are trying to access the specified property.
 *
 * **Examples**
 * 1. Aborts all inline scripts trying to access `window.alert`
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert")
 *     ```
 *
 * 2. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`.
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert", "Hello, world")
 *     ```
 *
 *     For instance, the following script will be aborted
 *     ```html
 *     <script>alert("Hello, world");</script>
 *     ```
 *
 * 3. Aborts inline scripts which are trying to access `window.alert` and match this regexp: `/Hello.+world/`.
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert", "/Hello.+world/")
 *     ```
 *
 *     For instance, the following scripts will be aborted:
 *     ```html
 *     <script>alert("Hello, big world");</script>
 *     ```
 *     ```html
 *     <script>alert("Hello, little world");</script>
 *     ```
 *
 *     This script will not be aborted:
 *     ```html
 *     <script>alert("Hi, little world");</script>
 *     ```
 */
/* eslint-enable max-len */
export function abortCurrentInlineScript(source, property, search = null) {
    const regex = search ? toRegExp(search) : null;
    const rid = randomId();

    const getCurrentScript = () => {
        if (!document.currentScript) { // eslint-disable-line compat/compat
            const scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        }
        return document.currentScript; // eslint-disable-line compat/compat
    };

    const ourScript = getCurrentScript();

    const abort = () => {
        const scriptEl = getCurrentScript();
        let content = scriptEl.textContent;

        try {
            const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
            content = textContentGetter.call(scriptEl);
            // eslint-disable-next-line no-empty
        } catch (e) { }


        if (scriptEl instanceof HTMLScriptElement
            && content.length > 0
            && scriptEl !== ourScript
            && (!regex || regex.test(scriptEl.textContent))) {
            hit(source);
            throw new ReferenceError(rid);
        }
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        let { base } = chainInfo;
        const { prop, chain } = chainInfo;
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
        setPropertyAccess(base, prop, {
            set: (value) => {
                abort();
                currentValue = value;
            },
            get: () => {
                abort();
                return currentValue;
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid)
        .bind();
}

abortCurrentInlineScript.names = [
    'abort-current-inline-script',
    'abort-current-inline-script.js',
    'ubo-abort-current-inline-script.js',
    'abp-abort-current-inline-script',
];

abortCurrentInlineScript.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler,
    hit,
];
