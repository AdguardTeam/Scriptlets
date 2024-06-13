(function(source, args) {
    function Fingerprintjs2(source) {
        var browserId = "";
        for (var i = 0; i < 8; i += 1) {
            browserId += (Math.random() * 65536 + 4096).toString(16).slice(-4);
        }
        var Fingerprint2 = function Fingerprint2() {};
        Fingerprint2.get = function(options, callback) {
            if (!callback) {
                callback = options;
            }
            setTimeout((function() {
                if (callback) {
                    callback(browserId, []);
                }
            }), 1);
        };
        Fingerprint2.prototype = {
            get: Fingerprint2.get
        };
        window.Fingerprint2 = Fingerprint2;
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
        Fingerprintjs2.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
})({
    name: "fingerprintjs2",
    args: []
}, []);