(function(source, args) {
    function prebidAds(source) {
        window.canRunAds = true;
        window.isAdBlockActive = false;
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
    const updatedArgs = args ? [].concat(source).concat(args) : [ source ];
    try {
        prebidAds.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
})({
    name: "prebid-ads",
    args: []
}, []);