import randomId from '../helpers/random-id';
import setPropertyAccess from '../helpers/set-property-access';
import getPropertyInChain from '../helpers/get-property-in-chain';

const abortCurrentInlineScript = (source, property, search = null) => {
    // TODO remove later
    /**
     * Escapes string
     * @param {string} str
     * @returns {*|void|string|never}
     */
    const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // TODO remove
    /**
     * Converts search string to the regexp
     * @param {string} str search string
     */
    const toRegExp = (str) => {
        if (str[0] === '/' && str[str.length - 1] === '/') {
            return new RegExp(str.slice(1, -1));
        }
        return new RegExp(escapeRegExp(str));
    };

    const regex = search ? toRegExp(search) : null;
    const rid = randomId();

    const ourScript = document.currentScript;

    const abort = () => {
        const scriptEl = document.currentScript;
        if (scriptEl instanceof HTMLScriptElement
            && scriptEl.src === ''
            && scriptEl !== ourScript
            && (!regex || regex.test(scriptEl.textContent))) {
            if (source.hit) {
                source.hit();
            }
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

        setPropertyAccess(base, prop, {
            set: (value) => {
                abort();
                base = value;
            },
            get: () => {
                abort();
                return base;
            },
        });
    };

    setChainPropAccess(window, property);
};

abortCurrentInlineScript.names = [
    'abort-current-inline-script',
    'ubo-abort-current-inline-script.js',
    'abp-abort-current-inline-script',
];

abortCurrentInlineScript.injections = [randomId, setPropertyAccess, getPropertyInChain];

export default abortCurrentInlineScript;
