import { hit } from '../helpers/hit';
import { noop } from '../helpers/noop';

/**
 * @redirect metrika-yandex-watch
 *
 * @description
 * Mocks the old Yandex Metrika API.
 * https://yandex.ru/support/metrica/objects/_method-reference.html
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=metrika-yandex-watch
 * ```
 */
export function metrikaYandexWatch(source) {
    const cbName = 'yandex_metrika_callbacks';

    /**
     * Gets callback and its context from options and call it in async way
     * @param {Object} options Yandex Metrika API options
     */
    const asyncCallbackFromOptions = (options = {}) => {
        let { callback } = options;
        const { ctx } = options;
        if (typeof callback === 'function') {
            callback = ctx !== undefined ? callback.bind(ctx) : callback;
            setTimeout(() => callback());
        }
    };

    function Metrika() { } // constructor

    // Methods without options
    Metrika.prototype.addFileExtension = noop;
    Metrika.prototype.getClientID = noop;
    Metrika.prototype.setUserID = noop;
    Metrika.prototype.userParams = noop;

    // Methods with options
    // The order of arguments should be kept in according to API
    Metrika.prototype.extLink = (url, options) => {
        asyncCallbackFromOptions(options);
    };
    Metrika.prototype.file = (url, options) => {
        asyncCallbackFromOptions(options);
    };
    Metrika.prototype.hit = (url, options) => {
        asyncCallbackFromOptions(options);
    };
    Metrika.prototype.reachGoal = (target, params, cb, ctx) => {
        asyncCallbackFromOptions({ callback: cb, ctx });
    };
    Metrika.prototype.notBounce = asyncCallbackFromOptions;

    if (window.Ya) {
        window.Ya.Metrika = Metrika;
    } else {
        window.Ya = { Metrika };
    }

    if (window[cbName] && Array.isArray(window[cbName])) {
        window[cbName].forEach((func) => {
            if (typeof func === 'function') {
                func();
            }
        });
    }

    hit(source);
}

metrikaYandexWatch.names = [
    'metrika-yandex-watch',
];

metrikaYandexWatch.injections = [hit, noop];
