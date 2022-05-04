/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect naver-wcslog
 *
 * @description
 * Mocks wcslog.js of Naver Analytics.
 *
 * **Example**
 * ```
 * ||wcs.naver.net/wcslog.js$script,redirect=naver-wcslog
 * ```
 */

export function NaverWcslog(source) {
    window.wcs_add = {};
    window.wcs_do = noopFunc;
    window.wcs = {
        inflow: noopFunc,
    };

    hit(source);
}

NaverWcslog.names = ['naver-wcslog'];

NaverWcslog.injections = [hit, noopFunc];
