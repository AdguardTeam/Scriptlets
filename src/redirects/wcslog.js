/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers';

/**
 * @redirect wcslog
 *
 * @description
 * Mocks wcslog.js of Naver Analytics.
 *
 * **Example**
 * ```
 * ||wcs.naver.net/wcslog.js$script,redirect=wcslog
 * ```
 */

export function Wcslog(source) {
    window.wcs_add = {};
    window.wcs_do = noopFunc;
    window.wcs = {
        inflow: noopFunc,
    };

    hit(source);
}

Wcslog.names = ['wcslog'];

Wcslog.injections = [hit, noopFunc];
