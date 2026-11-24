import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect chartbeat
 *
 * @description
 * Mocks `chartbeat.js` and `chartbeat_mab.js` of Chartbeat, e.g. `static.chartbeat.com/js/chartbeat.js`.
 * See the API: https://docs.chartbeat.com/cbp/tracking/standard-websites/single-page-apps
 *
 * Should be used if a rule blocks Chartbeat and the page waits for it: a page which uses the headline
 * or image testing of Chartbeat with its flicker control hides the whole page, i.e.
 * `body { visibility: hidden !important; }` in a `style` element with the id `chartbeat-flicker-control-style`,
 * or its headlines and images, until `chartbeat_mab.js` shows them, or until the timeout of the page,
 * e.g. 1 second. See the flicker control:
 * https://docs.chartbeat.com/cbp/feature-integrations/testing/flicker-and-flicker-control
 * The styles of the flicker control, i.e. `chartbeat-flicker-control-style`, `chartbeat-body-hider`,
 * `chartbeat-flicker-control-style-ht` of headlines and `chartbeat-flicker-control-style-it` of images,
 * and the class `cb-it-hide`, which the snippet of image testing adds to images, are removed at once,
 * and also if the page adds them later, until the page is loaded.
 *
 * `pSUPERFLY` is defined, as by `chartbeat.js`, with `virtualPage()`, `activity()` and `endTracking()`,
 * which do nothing, and so is `pSUPERFLY_mab`. The functions queued in `_cba` are called, and the ones pushed
 * later are called at once, as by `chartbeat.js` with the publisher module of Chartbeat, i.e. `pSUPERFLY_pub`,
 * while the commands of `_cbq`, e.g. the account of the page, are ignored. No requests are sent, and no cookies
 * or storage items are set.
 * If `pSUPERFLY` is already on the page, e.g. as the real `chartbeat.js` is loaded, it is kept,
 * and only the styles of the flicker control are removed.
 *
 * ### Examples
 *
 * ```adblock
 * ||static.chartbeat.com/js/chartbeat.js$script,redirect=chartbeat
 * ||static.chartbeat.com/js/chartbeat_mab.js$script,redirect=chartbeat
 * ```
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

export function Chartbeat(source: Source) {
    const w = window as unknown as AnyRecord;
    const doc = w.document;
    const isObject = (value: unknown): value is AnyRecord => !!value && typeof value === 'object';

    const HIDER_IDS = [
        'chartbeat-flicker-control-style',
        'chartbeat-flicker-control-style-ht',
        'chartbeat-flicker-control-style-it',
        'chartbeat-body-hider',
    ];
    // class of the images hidden by the snippet of image testing at `DOMContentLoaded`
    const HIDDEN_IMAGE_CLASS = 'cb-it-hide';

    /**
     * Removes the styles of the flicker control of Chartbeat, which hide the page, its headlines or images,
     * and the class which hides images.
     *
     * @returns True if a style or a class has been removed.
     */
    const removeHiders = (): boolean => {
        let isRemoved = false;
        HIDER_IDS.forEach((id) => {
            const hider = doc.getElementById(id);
            if (hider && hider.parentNode) {
                hider.parentNode.removeChild(hider);
                isRemoved = true;
            }
        });
        const hiddenImages = Array.prototype.slice.call(doc.getElementsByClassName(HIDDEN_IMAGE_CLASS));
        hiddenImages.forEach((image: Element) => {
            image.classList.remove(HIDDEN_IMAGE_CLASS);
            isRemoved = true;
        });
        return isRemoved;
    };

    /**
     * Calls the functions queued in a global queue of the page, and replaces the queue with an object
     * whose `push()` handles each item at once, i.e. only its first argument, as `Xb()` of `chartbeat.js` does.
     * `chartbeat.js` does it for `_cbq` always, but for `_cba` only with its publisher module, i.e. if
     * `pSUPERFLY_pub` is defined, while the functions of `_cba` are always called here, as they only wait
     * for Chartbeat.
     * An error of the queue of the page, e.g. a frozen array, does not stop the resource, so that the styles
     * of the flicker control are still removed.
     *
     * @param name Name of the queue, e.g. `_cba`.
     * @param handle Function which handles an item of the queue.
     */
    const takeOverQueue = (name: string, handle: (item: unknown) => void) => {
        try {
            const queue = w[name];
            if (queue && typeof queue.length === 'number' && typeof queue.shift === 'function') {
                while (queue.length > 0) {
                    handle(queue.shift());
                }
            }
            w[name] = { push: handle };
        } catch (e) {
            // e.g. a frozen array or a non-writable property of the page
        }
    };

    // `pSUPERFLY` of the real script, e.g. if only `chartbeat_mab.js` is redirected, or of the mock
    const isInstalled = !isObject(w.pSUPERFLY);
    if (isInstalled) {
        w.pSUPERFLY = {
            virtualPage: noopFunc,
            activity: noopFunc,
            endTracking: noopFunc,
        };
        if (!isObject(w.pSUPERFLY_mab)) {
            w.pSUPERFLY_mab = {
                evps: noopFunc,
                svps: noopFunc,
            };
        }
        takeOverQueue('_cba', (callback: unknown) => runProtected(callback, []));
        takeOverQueue('_cbq', noopFunc);
    }

    let isHitCalled = false;
    const callHit = () => {
        if (!isHitCalled) {
            isHitCalled = true;
            hit(source);
        }
    };

    // as by `chartbeat_mab.js`, also if `pSUPERFLY` is of the real script
    const isRemoved = removeHiders();
    // the scriptlet is run before the styles are in the page, and the redirect resource may be run
    // before the class is added to images
    if (doc.readyState !== 'complete' && typeof w.MutationObserver === 'function') {
        // also counted if `pSUPERFLY` is of the real script and the styles are added later
        const observer = new w.MutationObserver(() => {
            if (removeHiders()) {
                callHit();
            }
        });
        observer.observe(doc, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });
        w.addEventListener('load', () => {
            observer.disconnect();
            if (removeHiders()) {
                callHit();
            }
        }, { once: true });
    }

    if (isInstalled || isRemoved) {
        callHit();
    }
}

export const ChartbeatNames = [
    'chartbeat',
    'ubo-chartbeat.js',
    'chartbeat.js',
];

// eslint-disable-next-line prefer-destructuring
Chartbeat.primaryName = ChartbeatNames[0];

Chartbeat.injections = [
    hit,
    noopFunc,
    runProtected,
];
