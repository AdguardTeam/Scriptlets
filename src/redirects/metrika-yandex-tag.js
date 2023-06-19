import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect metrika-yandex-tag
 *
 * @description
 * Mocks Yandex Metrika API.
 * https://yandex.ru/support/metrica/objects/method-reference.html
 *
 * ### Examples
 *
 * ```adblock
 * ||mc.yandex.ru/metrika/tag.js$script,redirect=metrika-yandex-tag
 * ```
 *
 * @added v1.0.10.
 */
export function metrikaYandexTag(source) {
    const asyncCallbackFromOptions = (id, param, options = {}) => {
        let { callback } = options;
        const { ctx } = options;
        if (typeof callback === 'function') {
            callback = ctx !== undefined ? callback.bind(ctx) : callback;
            setTimeout(() => callback());
        }
    };

    /**
     * https://yandex.ru/support/metrica/objects/addfileextension.html
     */
    const addFileExtension = noopFunc;

    /**
     * https://yandex.ru/support/metrica/objects/extlink.html
     */
    const extLink = asyncCallbackFromOptions;

    /**
     * https://yandex.ru/support/metrica/objects/file.html
     */
    const file = asyncCallbackFromOptions;

    /**
     * https://yandex.ru/support/metrica/objects/get-client-id.html
     *
     * @param {string} id
     * @param {Function} cb
     */
    const getClientID = (id, cb) => {
        if (!cb) {
            return;
        }
        setTimeout(cb(null));
    };

    /**
     * https://yandex.ru/support/metrica/objects/hit.html
     */
    const hitFunc = asyncCallbackFromOptions;

    /**
     * https://yandex.ru/support/metrica/objects/notbounce.html
     */
    const notBounce = asyncCallbackFromOptions;

    /**
     * https://yandex.ru/support/metrica/objects/params-method.html
     */
    const params = noopFunc;

    /**
     * https://yandex.ru/support/metrica/objects/reachgoal.html
     *
     * @param {string} id
     * @param {string} target
     * @param {object} params
     * @param {Function} callback
     * @param {any} ctx
     */
    const reachGoal = (id, target, params, callback, ctx) => {
        asyncCallbackFromOptions(null, null, { callback, ctx });
    };

    /**
     * https://yandex.ru/support/metrica/objects/set-user-id.html
     */
    const setUserID = noopFunc;

    /**
     * https://yandex.ru/support/metrica/objects/user-params.html
     */
    const userParams = noopFunc;

    // https://github.com/AdguardTeam/Scriptlets/issues/198
    const destruct = noopFunc;

    const api = {
        addFileExtension,
        extLink,
        file,
        getClientID,
        hit: hitFunc,
        notBounce,
        params,
        reachGoal,
        setUserID,
        userParams,
        destruct,
    };

    function ym(id, funcName, ...args) {
        return api[funcName] && api[funcName](id, ...args);
    }

    function init(id) {
        // yaCounter object should provide api
        window[`yaCounter${id}`] = api;
        document.dispatchEvent(new Event(`yacounter${id}inited`));
    }

    if (typeof window.ym === 'undefined') {
        window.ym = ym;
        ym.a = [];
    } else if (window.ym && window.ym.a) {
        // Keep initial counters array intact
        ym.a = window.ym.a;
        window.ym = ym;

        window.ym.a.forEach((params) => {
            const id = params[0];
            init(id);
        });
    }
    hit(source);
}

metrikaYandexTag.names = [
    'metrika-yandex-tag',
];

metrikaYandexTag.injections = [hit, noopFunc];
