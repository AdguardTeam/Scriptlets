/**
 * Device of WURFL.js Lite, i.e. its `WURFL` object.
 */
export type WurflDevice = {
    /**
     * Name of the device or of the browser, e.g. `Apple iPhone` or `Google Chrome`, or an empty string.
     */
    complete_device_name: string;

    /**
     * Form factor, e.g. `Desktop`, `Smartphone`, `Tablet`, `Smart-TV` or `Robot`.
     */
    form_factor: string;

    /**
     * Whether the device is a mobile one, i.e. a smartphone or a tablet.
     */
    is_mobile: boolean;
};

/**
 * Returns the device which WURFL.js Lite (`wurfl.io/wurfl.js`) returns for the browser, but detected locally
 * from the User-Agent, without the device database of WURFL: the form factor is detected coarsely, and the name
 * only for desktop browsers and Apple devices, as the service names them, e.g. `Google Chrome` or `Apple iPhone`,
 * and it is empty otherwise.
 *
 * See the properties: https://docs.scientiamobile.com/documentation/wurfl-js/wurflDotjs-lite-getting-started-guide
 *
 * @param userAgent User-Agent of the browser.
 * @param maxTouchPoints `navigator.maxTouchPoints`, which tells an iPad with a desktop User-Agent from a Mac.
 * @param isMobileHint `navigator.userAgentData.mobile`, if the browser has it.
 * @returns Device.
 */
export function getWurflDevice(userAgent: unknown, maxTouchPoints?: unknown, isMobileHint?: unknown): WurflDevice {
    const ROBOT_REGEXP = /bot\b|bot\/|crawl|spider|slurp|mediapartners|headless|lighthouse|pingdom|curl\/|wget\//i;
    const SMART_TV_REGEXP = new RegExp([
        'smart-?tv', '\\btv\\b.*safari', 'hbbtv', 'netcast', 'web0s', 'webos.*tv', 'tizen.*tv', 'bravia', 'aquos',
        'viera', '\\baft[a-z]{1,4}\\b', 'crkey', 'roku', 'apple ?tv', 'googletv', 'android tv',
    ].join('|'), 'i');
    const TABLET_REGEXP = /ipad|tablet|kindle|silk\/|playbook|nexus (7|9|10)\b|sm-[tpx]\d/i;
    const PHONE_REGEXP = /iphone|ipod|windows phone|iemobile|blackberry|bb10|opera mini|mobile|mobi\b/i;

    const ua = typeof userAgent === 'string' ? userAgent : '';
    const touchPoints = typeof maxTouchPoints === 'number' ? maxTouchPoints : 0;

    const device: WurflDevice = { complete_device_name: '', form_factor: 'Desktop', is_mobile: false };

    if (ROBOT_REGEXP.test(ua)) {
        device.form_factor = 'Robot';
        return device;
    }
    if (SMART_TV_REGEXP.test(ua)) {
        device.form_factor = 'Smart-TV';
        return device;
    }

    const isIpad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1);
    const isAndroid = /android/i.test(ua);
    if (isIpad || TABLET_REGEXP.test(ua) || (isAndroid && !/mobile/i.test(ua))) {
        device.form_factor = 'Tablet';
        device.is_mobile = true;
    } else if (PHONE_REGEXP.test(ua) || isMobileHint === true) {
        device.form_factor = 'Smartphone';
        device.is_mobile = true;
    }

    if (isIpad) {
        device.complete_device_name = 'Apple iPad';
    } else if (/iphone/i.test(ua)) {
        device.complete_device_name = 'Apple iPhone';
    } else if (/ipod/i.test(ua)) {
        device.complete_device_name = 'Apple iPod Touch';
    } else if (device.form_factor === 'Desktop') {
        // the order matters, as e.g. Edge and Opera are named Chrome, and Chrome Safari, in the User-Agent
        if (/edg\//i.test(ua)) {
            device.complete_device_name = 'Microsoft Edge';
        } else if (/opr\/|opera/i.test(ua)) {
            device.complete_device_name = 'Opera';
        } else if (/firefox\//i.test(ua)) {
            device.complete_device_name = 'Mozilla Firefox';
        } else if (/chrome\/|chromium\//i.test(ua)) {
            device.complete_device_name = 'Google Chrome';
        } else if (/safari\//i.test(ua) && /macintosh/i.test(ua)) {
            device.complete_device_name = 'Apple Safari';
        }
    }
    return device;
}
