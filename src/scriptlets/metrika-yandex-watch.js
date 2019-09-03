import { hit } from '../helpers/hit';
import { noop } from '../helpers/noop';

/**
 * Mocks old Yandex Metrika API
 *
 * @param {Source} source
 */
export function metrikaYandexWatch(source) {
    const cbName = 'yandex_metrika_callbacks';

    function Metrika() { } // constructor
    Metrika.prototype.addFileExtension = noop;
    Metrika.prototype.extLink = noop;
    Metrika.prototype.file = noop;
    Metrika.prototype.getClientID = noop;
    Metrika.prototype.hit = noop;
    Metrika.prototype.notBounce = noop;
    Metrika.prototype.reachGoal = noop;
    Metrika.prototype.setUserID = noop;
    Metrika.prototype.userParams = noop;

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
