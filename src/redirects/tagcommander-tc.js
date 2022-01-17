/* eslint-disable func-names */
import { hit, noopFunc, noopArray } from '../helpers';

/**
 * @redirect tagcommander-tc
 *
 * @description
 * Mocks TagCommander analytics.
 * https://www.commandersact.com/en/solutions/tagcommander/
 *
 * **Example**
 * ```
 * ||cdn.tagcommander.com/4183/tc_TF1_26.js$script,redirect=tagcommander-tc
 * ```
 */
export function TagcommanderTc(source) {
    const OPTIN_CATEGORIES = [
        '4',
        '10001',
        '10003',
        '10004',
        '10005',
        '10006',
        '10007',
        '10008',
        '10009',
        '10010',
        '10011',
        '10012',
        '10013',
        '10014',
        '10015',
        '10016',
        '10017',
        '10018',
        '10019',
        '10020',
        '13001',
        '13002',
    ];
    window.tC = {
        privacy: {
            // Explicit values are given to avoid antiadblock on tf1.fr
            // https://github.com/AdguardTeam/AdguardFilters/issues/102818
            getOptinCategories: () => OPTIN_CATEGORIES,
            cookieData: noopArray,
        },
        addConsentChangeListener: noopFunc,
        removeConsentChangeListener: noopFunc,
        container: {
            reload: noopFunc,
        },
    };

    window.tc_events_global = noopFunc;

    hit(source);
}

TagcommanderTc.names = [
    'tagcommander-tc',
];

TagcommanderTc.injections = [hit, noopFunc, noopArray];
