import {
    noopFunc,
    trueFunc,
} from './noop-utils';
import {
    substringBefore,
    substringAfter,
} from './string-utils';

type ReplacementResult = NoopFunc | TrueFunc | { [key: string]: NoopFunc } | undefined;

export const handleOldReplacement = (replacement: string | undefined): ReplacementResult => {
    let result: ReplacementResult;
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

type CreateDecoyArgs = {
    replacement: string;
    url: string;
    delay: number;
};

/**
 * Creates a decoy HTML element with a specified URL and delay before removal
 *
 * @param args an object with `replacement`, `url`, and `delay` properties
 * @returns the decoy element that was created and added to the document body
 */
export const createDecoy = (args: CreateDecoyArgs): HTMLObjectElement | HTMLIFrameElement => {
    const enum TagName {
        Object = 'object',
        Iframe = 'iframe',
    }

    enum UrlPropNameOf {
        Object = 'data',
        Iframe = 'src',
    }

    const { replacement, url, delay } = args;
    let tag: TagName;
    if (replacement === 'obj') {
        tag = TagName.Object;
    } else {
        tag = TagName.Iframe;
    }

    const decoy = document.createElement(tag);

    if (decoy instanceof HTMLObjectElement) {
        decoy[UrlPropNameOf.Object] = url;
    } else if (decoy instanceof HTMLIFrameElement) {
        decoy[UrlPropNameOf.Iframe] = url;
    }

    decoy.style.setProperty('height', '1px', 'important');
    decoy.style.setProperty('position', 'fixed', 'important');
    decoy.style.setProperty('top', '-1px', 'important');
    decoy.style.setProperty('width', '1px', 'important');

    document.body.appendChild(decoy);
    setTimeout(() => decoy.remove(), delay * 1000);
    return decoy;
};

type PreventGetter = (target: ArbitraryObject, prop: string) => boolean | NoopFunc | unknown;

export const getPreventGetter = (nativeGetter: () => unknown) => {
    const preventGetter: PreventGetter = (target, prop) => {
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
