import {
    noopFunc,
    trueFunc,
} from './noop-utils';
import {
    substringBefore,
    substringAfter,
} from './string-utils';

export const handleOldReplacement = (replacement) => {
    let result;
    // defaults to return noopFunc instead of window.open
    if (!replacement) {
        result = noopFunc;
    } else if (replacement === 'trueFunc') {
        result = trueFunc;
    } else if (replacement.includes('=')) {
        // We should return noopFunc instead of window.open
        // but with some property if website checks it (examples 5, 6)
        // https://github.com/AdguardTeam/Scriptlets/issues/71
        const isProp = replacement.startsWith('{') && replacement.endsWith('}');
        if (isProp) {
            const propertyPart = replacement.slice(1, -1);
            const propertyName = substringBefore(propertyPart, '=');
            const propertyValue = substringAfter(propertyPart, '=');
            if (propertyValue === 'noopFunc') {
                result = { };
                result[propertyName] = noopFunc;
            }
        }
    }
    return result;
};

export const createDecoy = (args) => {
    const OBJECT_TAG_NAME = 'object';
    const OBJECT_URL_PROP_NAME = 'data';
    const IFRAME_TAG_NAME = 'iframe';
    const IFRAME_URL_PROP_NAME = 'src';

    const { replacement, url, delay } = args;
    let tag;
    let urlProp;
    if (replacement === 'obj') {
        tag = OBJECT_TAG_NAME;
        urlProp = OBJECT_URL_PROP_NAME;
    } else {
        tag = IFRAME_TAG_NAME;
        urlProp = IFRAME_URL_PROP_NAME;
    }

    const decoy = document.createElement(tag);
    decoy[urlProp] = url;
    decoy.style.setProperty('height', '1px', 'important');
    decoy.style.setProperty('position', 'fixed', 'important');
    decoy.style.setProperty('top', '-1px', 'important');
    decoy.style.setProperty('width', '1px', 'important');
    document.body.appendChild(decoy);
    setTimeout(() => decoy.remove(), delay * 1000);
    return decoy;
};

export const getPreventGetter = (nativeGetter) => {
    const preventGetter = (target, prop) => {
        if (prop && prop === 'closed') {
            return false;
        }
        if (typeof nativeGetter === 'function') {
            return noopFunc;
        }
        return prop && target[prop];
    };
    return preventGetter;
};
