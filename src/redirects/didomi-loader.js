/* eslint-disable func-names, no-underscore-dangle */
import {
    hit,
    noopFunc,
    noopArray,
    trueFunc,
    falseFunc,
} from '../helpers/index';

/**
 * @redirect didomi-loader
 *
 * @description
 * Mocks Didomi's CMP loader script.
 * https://developers.didomi.io/
 *
 * **Example**
 * ```
 * ||sdk.privacy-center.org/fbf86806f86e/loader.js$script,redirect=didomi-loader
 * ```
 */
export function DidomiLoader(source) {
    function UserConsentStatusForVendorSubscribe() { }
    UserConsentStatusForVendorSubscribe.prototype.filter = function () {
        return new UserConsentStatusForVendorSubscribe();
    };
    UserConsentStatusForVendorSubscribe.prototype.subscribe = noopFunc;
    function UserConsentStatusForVendor() { }
    UserConsentStatusForVendor.prototype.first = function () {
        return new UserConsentStatusForVendorSubscribe();
    };
    UserConsentStatusForVendor.prototype.filter = function () {
        return new UserConsentStatusForVendorSubscribe();
    };
    UserConsentStatusForVendor.prototype.subscribe = noopFunc;

    const DidomiWrapper = {
        isConsentRequired: falseFunc,
        getUserConsentStatusForPurpose: trueFunc,
        getUserConsentStatus: trueFunc,
        getUserStatus: noopFunc,
        getRequiredPurposes: noopArray,
        getUserConsentStatusForVendor: trueFunc,
        Purposes: {
            Cookies: 'cookies',
        },
        notice: {
            configure: noopFunc,
            hide: noopFunc,
            isVisible: falseFunc,
            show: noopFunc,
            showDataProcessing: trueFunc,
        },
        isUserConsentStatusPartial: falseFunc,
        on() {
            return {
                actions: {},
                emitter: {},
                services: {},
                store: {},
            };
        },
        shouldConsentBeCollected: falseFunc,
        getUserConsentStatusForAll: noopFunc,
        getObservableOnUserConsentStatusForVendor() {
            return new UserConsentStatusForVendor();
        },
    };

    window.Didomi = DidomiWrapper;

    const didomiStateWrapper = {
        didomiExperimentId: '',
        didomiExperimentUserGroup: '',
        didomiGDPRApplies: 1,
        didomiIABConsent: '',
        didomiPurposesConsent: '',
        didomiPurposesConsentDenied: '',
        didomiPurposesConsentUnknown: '',
        didomiVendorsConsent: '',
        didomiVendorsConsentDenied: '',
        didomiVendorsConsentUnknown: '',
        didomiVendorsRawConsent: '',
        didomiVendorsRawConsentDenied: '',
        didomiVendorsRawConsentUnknown: '',
    };
    window.didomiState = didomiStateWrapper;

    const tcData = {
        eventStatus: 'tcloaded',
        gdprApplies: false,
        listenerId: noopFunc,
        vendor: {
            consents: [],
        },
        purpose: {
            consents: [],
        },
    };
    const __tcfapiWrapper = function (...args) {
        // eslint-disable-next-line no-restricted-syntax
        for (const arg of args) {
            if (typeof arg === 'function') {
                try {
                    setTimeout(arg(tcData, true));
                } catch (ex) {
                    /* empty */
                }
            }
        }
    };
    window.__tcfapi = __tcfapiWrapper;

    const didomiEventListenersWrapper = {
        stub: true,
        push: noopFunc,
    };

    window.didomiEventListeners = didomiEventListenersWrapper;

    const didomiOnReadyWrapper = {
        stub: true,
        push(arg) {
            if (typeof arg !== 'function') {
                return;
            }

            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    setTimeout(arg(window.Didomi));
                });
            } else {
                setTimeout(arg(window.Didomi));
            }
        },
    };
    window.didomiOnReady = window.didomiOnReady || didomiOnReadyWrapper;

    if (Array.isArray(window.didomiOnReady)) {
        window.didomiOnReady.forEach((arg) => {
            if (typeof arg === 'function') {
                try {
                    setTimeout(arg(window.Didomi));
                } catch (e) {
                    /* empty */
                }
            }
        });
    }

    hit(source);
}

DidomiLoader.names = [
    'didomi-loader',
];

DidomiLoader.injections = [
    hit,
    noopFunc,
    noopArray,
    trueFunc,
    falseFunc,
];
