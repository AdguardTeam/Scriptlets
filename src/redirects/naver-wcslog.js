/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect naver-wcslog
 *
 * @description
 * Mocks wcslog.js of Naver Analytics.
 *
 * ### Examples
 *
 * ```adblock
 * ||wcs.naver.net/wcslog.js$script,redirect=naver-wcslog
 * ```
 *
 * @added v1.6.2.
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
