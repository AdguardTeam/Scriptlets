import { hit, noopFunc, noopArray } from '../helpers/index';

/**
 * @redirect metrika-yandex-watch
 *
 * @description
 * Mocks the old Yandex Metrika API.
 * https://yandex.ru/support/metrica/objects/_method-reference.html
 *
 * ### Examples
 *
 * ```adblock
 * ||mc.yandex.ru/metrika/watch.js$script,redirect=metrika-yandex-watch
 * ```
 *
 * @added v1.0.10.
 */
export function metrikaYandexWatch(source) {
    const cbName = 'yandex_metrika_callbacks';

    /**
     * Gets callback and its context from options and call it in async way
     *
     * @param {object} options Yandex Metrika API options
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
    Metrika.counters = noopArray;
    // Methods without options
    Metrika.prototype.addFileExtension = noopFunc;
    Metrika.prototype.getClientID = noopFunc;
    Metrika.prototype.setUserID = noopFunc;
    Metrika.prototype.userParams = noopFunc;
    Metrika.prototype.params = noopFunc;
    Metrika.prototype.counters = noopArray;

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

metrikaYandexWatch.injections = [hit, noopFunc, noopArray];
