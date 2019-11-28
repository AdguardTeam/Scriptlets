import { hit } from '../helpers/hit';
import { noop } from '../helpers/noop';

/**
 * @scriptlet metrika-yandex-tag
 *
 * @description
 * Mocks Yandex Metrika API
 * https://yandex.ru/support/metrica/objects/method-reference.html
 *
 * It is mostly used for `$redirect` rules.
 * See [redirect description](#scorecardresearch-beacon-redirect).
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("metrika-yandex-tag")
 * ```
 */
export function metrikaYandexTag(source) {
    const asyncCallbackFromOptions = (param, options = {}) => {
        let { callback } = options;
        const { ctx } = options;
        if (typeof callback === 'function') {
            callback = ctx !== undefined ? callback.bind(ctx) : callback;
            setTimeout(() => callback());
        }
    };

    const init = noop;

    /**
     * https://yandex.ru/support/metrica/objects/addfileextension.html
     */
    const addFileExtension = noop;

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
     * @param {Function} cb
     */
    const getClientID = (cb) => {
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
    const params = noop;

    /**
     * https://yandex.ru/support/metrica/objects/reachgoal.html
     * @param {string} target
     * @param {Object} params
     * @param {Function} callback
     * @param {any} ctx
     */
    const reachGoal = (target, params, callback, ctx) => {
        asyncCallbackFromOptions(null, { callback, ctx });
    };

    /**
     * https://yandex.ru/support/metrica/objects/set-user-id.html
     */
    const setUserID = noop;

    /**
     * https://yandex.ru/support/metrica/objects/user-params.html
     */
    const userParams = noop;

    const api = {
        init,
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
    };

    function ym(id, funcName, ...args) {
        return api[funcName] && api[funcName](...args);
    }

    window.ym = ym;

    hit(source);
}

metrikaYandexTag.names = [
    'metrika-yandex-tag',
];

metrikaYandexTag.injections = [hit, noop];
