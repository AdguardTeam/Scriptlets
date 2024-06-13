(function(source, args) {
    function Prebid(source) {
        var pushFunction = function pushFunction(arg) {
            if (typeof arg === "function") {
                try {
                    arg.call();
                } catch (ex) {}
            }
        };
        var pbjsWrapper = {
            addAdUnits() {},
            adServers: {
                dfp: {
                    buildVideoUrl: noopStr
                }
            },
            adUnits: [],
            aliasBidder() {},
            cmd: [],
            enableAnalytics() {},
            getHighestCpmBids: noopArray,
            libLoaded: true,
            que: [],
            requestBids(arg) {
                if (arg instanceof Object && arg.bidsBackHandler) {
                    try {
                        arg.bidsBackHandler.call();
                    } catch (ex) {}
                }
            },
            removeAdUnit() {},
            setBidderConfig() {},
            setConfig() {},
            setTargetingForGPTAsync() {}
        };
        pbjsWrapper.cmd.push = pushFunction;
        pbjsWrapper.que.push = pushFunction;
        window.pbjs = pbjsWrapper;
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
    function noopStr() {
        return "";
    }
    function noopArray() {
        return [];
    }
    const updatedArgs = args ? [].concat(source).concat(args) : [ source ];
    try {
        Prebid.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
})({
    name: "prebid",
    args: []
}, []);