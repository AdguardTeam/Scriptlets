import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect ati-smarttag
 *
 * @description
 * Mocks AT Internat SmartTag.
 * https://developers.atinternet-solutions.com/as2-tagging-en/javascript-en/getting-started-javascript-en/tracker-initialisation-javascript-en/
 *
 * ### Examples
 *
 * ```adblock
 * ||example.com/assets/scripts/smarttag.js$script,redirect=ati-smarttag
 * ```
 *
 * @added v1.5.0.
 */
export function ATInternetSmartTag(source) {
    const setNoopFuncWrapper = {
        set: noopFunc,
    };
    const sendNoopFuncWrapper = {
        send: noopFunc,
    };

    const ecommerceWrapper = {
        displayCart: {
            products: setNoopFuncWrapper,
            cart: setNoopFuncWrapper,
        },
        updateCart: {
            cart: setNoopFuncWrapper,
        },
        displayProduct: {
            products: setNoopFuncWrapper,
        },
        displayPageProduct: {
            products: setNoopFuncWrapper,
        },
        addProduct: {
            products: setNoopFuncWrapper,
        },
        removeProduct: {
            products: setNoopFuncWrapper,
        },
    };

    // eslint-disable-next-line new-cap, func-names
    const tag = function () {};
    tag.prototype = {
        setConfig: noopFunc,
        setParam: noopFunc,
        dispatch: noopFunc,

        customVars: setNoopFuncWrapper,
        publisher: setNoopFuncWrapper,
        order: setNoopFuncWrapper,

        click: sendNoopFuncWrapper,
        clickListener: sendNoopFuncWrapper,
        internalSearch: {
            set: noopFunc,
            send: noopFunc,
        },

        ecommerce: ecommerceWrapper,

        identifiedVisitor: {
            unset: noopFunc,
        },
        page: {
            set: noopFunc,
            send: noopFunc,
        },
        selfPromotion: {
            add: noopFunc,
            send: noopFunc,
        },
        privacy: {
            setVisitorMode: noopFunc,
            getVisitorMode: noopFunc,
            hit: noopFunc,
        },
        richMedia: {
            add: noopFunc,
            send: noopFunc,
            remove: noopFunc,
            removeAll: noopFunc,
        },
    };

    const smartTagWrapper = {
        Tracker: {
            Tag: tag,
        },
    };

    window.ATInternet = smartTagWrapper;

    hit(source);
}

ATInternetSmartTag.names = [
    'ati-smarttag',
];

ATInternetSmartTag.injections = [hit, noopFunc];
