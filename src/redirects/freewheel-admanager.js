import { hit, noopFunc, noopThis } from '../helpers';

/**
 * @redirect freewheel-admanager
 *
 * @description
 * Mocks the FreeWheel Ad Manager.
 *
 * ### Examples
 *
 * ```adblock
 * ||mssl.fwmrm.net/libs/adm/6.55.0/AdManager.js$script,redirect=freewheel-admanager
 * ```
 *
 * @added v2.3.0.
 */

export function FreewheelAdManager(source) {
    const eventsMap = new Map();
    const adManagerFunc = noopFunc;
    // eslint-disable-next-line func-names
    adManagerFunc.prototype.addEventListener = function (type, callback) {
        if (type) {
            eventsMap.set(type, callback);
        }
    };
    adManagerFunc.prototype.addKeyValue = noopFunc;
    adManagerFunc.prototype.addTemporalSlot = noopFunc;
    adManagerFunc.prototype.dispose = noopFunc;
    adManagerFunc.prototype.newContext = noopThis;
    adManagerFunc.prototype.registerCustomPlayer = noopFunc;
    adManagerFunc.prototype.registerVideoDisplayBase = noopFunc;
    adManagerFunc.prototype.removeEventListener = noopFunc;
    adManagerFunc.prototype.resize = noopFunc;
    adManagerFunc.prototype.setCapability = noopFunc;
    adManagerFunc.prototype.setContentVideoElement = noopFunc;
    adManagerFunc.prototype.setLogLevel = noopFunc;
    adManagerFunc.prototype.setNetwork = noopFunc;
    adManagerFunc.prototype.setParameter = noopFunc;
    adManagerFunc.prototype.setProfile = noopFunc;
    adManagerFunc.prototype.setServer = noopFunc;
    adManagerFunc.prototype.setSiteSection = noopFunc;
    adManagerFunc.prototype.setVideoAsset = noopFunc;
    adManagerFunc.prototype.setVideoDisplaySize = noopFunc;
    adManagerFunc.prototype.submitRequest = () => {
        const event = {
            type: window.tv.freewheel.SDK.EVENT_SLOT_ENDED,
        };
        const callbackFunc = eventsMap.get('EVENT_SLOT_ENDED');
        if (callbackFunc && typeof callbackFunc === 'function') {
            setTimeout(() => {
                try {
                    callbackFunc(event);
                } catch (ex) {
                    // Silently catch errors
                }
            }, 1);
        }
    };

    window.tv = {
        freewheel: {
            SDK: {
                _instanceQueue: {},
                Ad: noopFunc,
                AdListener: noopFunc,
                AdManager: adManagerFunc,
                EVENT_SLOT_ENDED: 'EVENT_SLOT_ENDED',
                setLogLevel: noopFunc,
            },
        },
    };

    hit(source);
}

export const FreewheelAdManagerNames = [
    'freewheel-admanager',
];

// eslint-disable-next-line prefer-destructuring
FreewheelAdManager.primaryName = FreewheelAdManagerNames[0];

FreewheelAdManager.injections = [hit, noopFunc, noopThis];
