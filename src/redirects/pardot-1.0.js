/* eslint-disable func-names */
import {
    hit,
    noopFunc,
    noopStr,
    noopNull,
} from '../helpers/index';

/**
 * @redirect pardot-1.0
 *
 * @description
 * Mocks the pd.js file of Salesforce.
 * https://pi.pardot.com/pd.js
 * https://developer.salesforce.com/docs/marketing/pardot/overview
 *
 * ### Examples
 *
 * ```adblock
 * ||pi.pardot.com/pd.js$script,redirect=pardot
 * ||pacedg.com.au/pd.js$redirect=pardot
 * ```
 *
 * @added v1.6.55.
 */

export function Pardot(source) {
    window.piVersion = '1.0.2';
    window.piScriptNum = 0;
    window.piScriptObj = [];

    window.checkNamespace = noopFunc;
    window.getPardotUrl = noopStr;
    window.piGetParameter = noopNull;
    window.piSetCookie = noopFunc;
    window.piGetCookie = noopStr;

    function piTracker() {
        window.pi = {
            tracker: {
                visitor_id: '',
                visitor_id_sign: '',
                pi_opt_in: '',
                campaign_id: '',
            },
        };

        window.piScriptNum += 1;
    }

    window.piResponse = noopFunc;
    window.piTracker = piTracker;
    piTracker();

    hit(source);
}

Pardot.names = ['pardot-1.0'];

Pardot.injections = [
    hit,
    noopFunc,
    noopStr,
    noopNull,
];
