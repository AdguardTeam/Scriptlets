(function(source, args) {
    function ATInternetSmartTag(source) {
        var setNoopFuncWrapper = {
            set: noopFunc
        };
        var sendNoopFuncWrapper = {
            send: noopFunc
        };
        var ecommerceWrapper = {
            displayCart: {
                products: setNoopFuncWrapper,
                cart: setNoopFuncWrapper
            },
            updateCart: {
                cart: setNoopFuncWrapper
            },
            displayProduct: {
                products: setNoopFuncWrapper
            },
            displayPageProduct: {
                products: setNoopFuncWrapper
            },
            addProduct: {
                products: setNoopFuncWrapper
            },
            removeProduct: {
                products: setNoopFuncWrapper
            }
        };
        var tag = function tag() {};
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
                send: noopFunc
            },
            ecommerce: ecommerceWrapper,
            identifiedVisitor: {
                unset: noopFunc
            },
            page: {
                set: noopFunc,
                send: noopFunc
            },
            selfPromotion: {
                add: noopFunc,
                send: noopFunc
            },
            privacy: {
                setVisitorMode: noopFunc,
                getVisitorMode: noopFunc,
                hit: noopFunc
            },
            richMedia: {
                add: noopFunc,
                send: noopFunc,
                remove: noopFunc,
                removeAll: noopFunc
            }
        };
        var smartTagWrapper = {
            Tracker: {
                Tag: tag
            }
        };
        window.ATInternet = smartTagWrapper;
        hit(source);
    }
    function hit(source) {
        if (source.verbose !== true) {
            return;
        }
        try {
            var log = console.log.bind(console);
            var trace = console.trace.bind(console);
            var prefix = "";
            if (source.domainName) {
                prefix += "".concat(source.domainName);
            }
            prefix += "#%#//scriptlet('".concat(source.name, "', '").concat(source.args.join(", "), "')");
            log("".concat(prefix, " trace start"));
            if (trace) {
                trace();
            }
            log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
            window.__debug(source);
        }
    }
    function noopFunc() {}
    const updatedArgs = args ? [].concat(source).concat(args) : [ source ];
    try {
        ATInternetSmartTag.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
})({
    name: "ati-smarttag",
    args: []
}, []);