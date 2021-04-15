import {
    hit,
    noopFunc,
} from '../helpers';

/**
 * @scriptlet no-floc
 *
 * @description
 * Prevents using Google Chrome tracking feature called Federated Learning of Cohorts (aka "FLoC")
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-flocjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('no-floc')
 * ```
 */
export function noFloc(source) {
    const FLOC_PROPERTY_NAME = 'interestCohort';

    if (Document instanceof Object === false) {
        return;
    }
    if (!Object.prototype.hasOwnProperty.call(Document.prototype, FLOC_PROPERTY_NAME)
        || Document.prototype[FLOC_PROPERTY_NAME] instanceof Function === false) {
        return;
    }

    const undef = noopFunc();
    Document.prototype[FLOC_PROPERTY_NAME] = undef;
    hit(source);
}

noFloc.names = [
    'no-floc',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-floc.js',
    'ubo-no-floc.js',
    'ubo-no-floc',
];

noFloc.injections = [
    hit,
    noopFunc,
];
