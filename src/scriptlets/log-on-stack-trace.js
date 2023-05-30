import {
    getPropertyInChain,
    setPropertyAccess,
    hit,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isEmptyObject,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet log-on-stack-trace
 *
 * @description
 * This scriptlet is basically the same as [abort-on-stack-trace](#abort-on-stack-trace),
 * but instead of aborting it logs:
 *
 * - function and source script names pairs that access the given property
 * - was that get or set attempt
 * - script being injected or inline
 *
 * ### Syntax
 *
 * ```text
 * example.com#%#//scriptlet('log-on-stack-trace', 'property')
 * ```
 *
 * - `property` — required, path to a property. The property must be attached to window.
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function logOnStacktrace(source, property) {
    if (!property) {
        return;
    }

    const refineStackTrace = (stackString) => {
        // Split stack trace string by lines and remove first two elements ('Error' and getter call)
        // Remove '    at ' at the start of each string
        const stackSteps = stackString.split('\n').slice(2).map((line) => line.replace(/ {4}at /, ''));
        // Trim each line extracting funcName : fullPath pair
        const logInfoArray = stackSteps.map((line) => {
            let funcName;
            let funcFullPath;
            /* eslint-disable-next-line no-useless-escape */
            const reg = /\(([^\)]+)\)/;
            const regFirefox = /(.*?@)(\S+)(:\d+):\d+\)?$/;
            if (line.match(reg)) {
                funcName = line.split(' ').slice(0, -1).join(' ');
                /* eslint-disable-next-line prefer-destructuring */
                funcFullPath = line.match(reg)[1];
            } else if (line.match(regFirefox)) {
                funcName = line.split('@').slice(0, -1).join(' ');
                /* eslint-disable-next-line prefer-destructuring */
                funcFullPath = line.match(regFirefox)[2];
            } else {
                // For when func name is not available
                funcName = 'function name is not available';
                funcFullPath = line;
            }
            return [funcName, funcFullPath];
        });
        // Convert array into object for better display using console.table
        const logInfoObject = {};
        logInfoArray.forEach((pair) => {
            /* eslint-disable-next-line prefer-destructuring */
            logInfoObject[pair[0]] = pair[1];
        });
        return logInfoObject;
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        let { base } = chainInfo;
        const { prop, chain } = chainInfo;
        if (chain) {
            const setter = (a) => {
                base = a;
                if (a instanceof Object) {
                    setChainPropAccess(a, chain);
                }
            };
            Object.defineProperty(owner, prop, {
                get: () => base,
                set: setter,
            });
            return;
        }

        let value = base[prop];
        /* eslint-disable no-console */
        setPropertyAccess(base, prop, {
            get() {
                hit(source);
                logMessage(source, `Get ${prop}`, true);
                console.table(refineStackTrace(new Error().stack));
                return value;
            },
            set(newValue) {
                hit(source);
                logMessage(source, `Set ${prop}`, true);
                console.table(refineStackTrace(new Error().stack));
                value = newValue;
            },
        });
        /* eslint-enable no-console */
    };

    setChainPropAccess(window, property);
}

logOnStacktrace.names = [
    'log-on-stack-trace',
];
logOnStacktrace.injections = [
    getPropertyInChain,
    setPropertyAccess,
    hit,
    logMessage,
    isEmptyObject,
];
