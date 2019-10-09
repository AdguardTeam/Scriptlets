import {hit} from '../helpers';

/**
 * Removes properties from the results of JSON.parse call
 * @param {Source} source
 * @param {string} propsToRemove list of space-separated properties to remove
 * @param {string} [obligatoryProps] list of space-separated properties
 * which must be all present for the pruning to occur
 */

export function jsonPrune(source, propsToRemove, obligatoryProps) {
    const prunePaths = propsToRemove !== undefined && propsToRemove !== ''
        ? propsToRemove.split(/ +/)
        : [];
    const needlePaths = obligatoryProps !== undefined && obligatoryProps !== ''
        ? obligatoryProps.split(/ +/)
        : [];
    const findOwner = function (root, path) {
        let owner = root;
        let chain = path;
        for (; ;) {
            if (owner instanceof Object === false) {
                return;
            }
            const pos = chain.indexOf('.');
            if (pos === -1) {
                // eslint-disable-next-line no-prototype-builtins,consistent-return
                return owner.hasOwnProperty(chain)
                    ? [owner, chain]
                    : undefined;
            }
            const prop = chain.slice(0, pos);
            // eslint-disable-next-line no-prototype-builtins
            if (owner.hasOwnProperty(prop) === false) {
                return;
            }
            owner = owner[prop];
            chain = chain.slice(pos + 1);
        }
    };
    const mustProcess = function (root) {
        if (needlePaths.some(needlePath => findOwner(root, needlePath) === undefined)) return false;
        return true;
    };
    const nativeParse = JSON.parse;

    const parseWrapper = (...args) => {
        const r = nativeParse.apply(window, args);
        if (prunePaths.length === 0) {
            console.log(window.location.hostname, r);
            return r;
        }
        if (mustProcess(r) === false) {
            return r;
        }
        prunePaths.forEach((path) => {
            if (findOwner(r, path) !== undefined) {
                delete findOwner(r, path)[0][findOwner(r, path)[1]];
            }
        });
        return r;
    };
    JSON.parse = parseWrapper;
}

jsonPrune.names = [
    'json-prune',
];
jsonPrune.injections = [hit];
