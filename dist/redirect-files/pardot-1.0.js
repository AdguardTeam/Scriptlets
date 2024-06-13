(function(source, args) {
    function Pardot(source) {
        window.piVersion = "1.0.2";
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
                    visitor_id: "",
                    visitor_id_sign: "",
                    pi_opt_in: "",
                    campaign_id: ""
                }
            };
            window.piScriptNum += 1;
        }
        window.piResponse = noopFunc;
        window.piTracker = piTracker;
        piTracker();
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
    function noopNull() {
        return null;
    }
    const updatedArgs = args ? [].concat(source).concat(args) : [ source ];
    try {
        Pardot.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
})({
    name: "pardot-1.0",
    args: []
}, []);