import { logMessage } from './log-message';
import { isValidAttributeName, defaultAttributeSetter, setAttributeBySelector } from './attribute-utils';
import { isValidSelector } from './selector-utils';
import { observeDOMChanges } from './observer';
import { parseUboOptions, runAtUboReadyState } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `setAttrBySettings()`, which are parsed from the arguments of `trusted-set-attr` once,
 * by `getAdgAttrSettings()` or `getUboAttrSettings()`.
 */
export interface AttrSettings {
    /**
     * CSS selector of the elements, validated by `isValidSelector()`.
     */
    selector: string;

    /**
     * Name of the attribute, validated by `isValidAttributeName()`.
     */
    attr: string;

    /**
     * Value of the attribute.
     */
    value: string;

    /**
     * Ready state of the document when the attribute is set, see `runAtUboReadyState()`,
     * or `null` to set it immediately, as in AdGuard syntax.
     */
    runAt: unknown;

    /**
     * If true, as in AdGuard syntax, the attribute is set again also when the page changes an attribute,
     * otherwise, as in uBO, only when nodes are added.
     */
    shouldObserveAttributes: boolean;

    /**
     * If true, as in uBO, an attribute of an event handler of the element, e.g. `onclick`, is not set
     * to a non-empty value.
     */
    isEventHandlerSkipped: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-set-attr` as before: the selector and the name of the attribute
 * are required and validated, and the attribute is set immediately, and again on any change of the DOM.
 *
 * Requires `logMessage`, `isValidSelector` and `isValidAttributeName` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param selector CSS selector of the elements.
 * @param attr Name of the attribute.
 * @param value Value of the attribute.
 *
 * @returns Settings of the attribute, or `null` if an argument is missing or invalid, which is logged.
 */
export const getAdgAttrSettings = (
    source: Source,
    selector: string,
    attr: string,
    value: string,
): AttrSettings | null => {
    if (!selector || !attr) {
        return null;
    }

    // Selector and attribute name are validated once, otherwise the error would be logged on each DOM change
    if (!isValidSelector(selector)) {
        logMessage(source, `Invalid selector arg: '${selector}'`);
        return null;
    }
    if (!isValidAttributeName(attr)) {
        logMessage(source, `Invalid attribute name: '${attr}'`);
        return null;
    }

    return {
        selector,
        attr,
        value,
        runAt: null,
        shouldObserveAttributes: true,
        isEventHandlerSkipped: false,
    };
};

/**
 * Parses the arguments of uBO `trusted-set-attr.js`, converted to AdGuard syntax, as uBO `setAttrFn()` does
 * for trusted rules:
 * - the selector and the name of the attribute are required, and the value is empty if it is omitted;
 * - named options follow the value: `runAt, value` sets the attribute when the document has the ready state,
 *   see `runAtUboReadyState()`, by default when it is complete, i.e. `idle`;
 * - the attribute is set again only when nodes are added, not when the page changes an attribute;
 * - an attribute of an event handler of the element, e.g. `onclick`, is not set to a non-empty value.
 *
 * As in AdGuard syntax, an invalid selector or name of the attribute is logged, while uBO stops silently.
 *
 * Requires `logMessage`, `isValidSelector`, `isValidAttributeName` and `parseUboOptions` in the injections
 * of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param selector CSS selector of the elements.
 * @param attr Name of the attribute.
 * @param value Value of the attribute.
 * @param args Named options which follow the value, e.g. `['runAt', 'interactive']`.
 *
 * @returns Settings of the attribute, or `null` if an argument is missing or invalid, which is logged.
 */
export const getUboAttrSettings = (
    source: Source,
    selector: unknown,
    attr: unknown,
    value: unknown,
    args: unknown[],
): AttrSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const DEFAULT_RUN_AT = 'idle';

    if (typeof selector !== 'string' || selector === '' || typeof attr !== 'string' || attr === '') {
        return null;
    }

    if (!isValidSelector(selector)) {
        logMessage(source, `Invalid selector arg: '${selector}'`);
        return null;
    }
    if (!isValidAttributeName(attr)) {
        logMessage(source, `Invalid attribute name: '${attr}'`);
        return null;
    }

    const options = parseUboOptions(args);

    return {
        selector,
        attr,
        value: typeof value === 'string' ? value : '',
        // As in uBO, an empty `runAt` or `0` is the default one
        runAt: options.runAt || DEFAULT_RUN_AT,
        shouldObserveAttributes: false,
        isEventHandlerSkipped: true,
    };
};

/**
 * Sets the attribute of the elements by the settings parsed by `getAdgAttrSettings()` or `getUboAttrSettings()`,
 * when the document has the ready state of the settings, and again on changes of the DOM.
 * The attribute is written only if it has another value, and `hit()` is called only then.
 *
 * Requires `setAttributeBySelector`, `defaultAttributeSetter`, `observeDOMChanges` and `runAtUboReadyState`,
 * with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the attribute.
 */
export const setAttrBySettings = (source: Source, settings: AttrSettings): void => {
    // !IMPORTANT: Do not move constants outside of this function
    const EVENT_HANDLER_ATTR_REGEXP = /^on/i;

    const {
        selector,
        attr,
        value,
        runAt,
        shouldObserveAttributes,
        isEventHandlerSkipped,
    } = settings;

    /**
     * Sets the attribute, unless it is an event handler which is skipped.
     *
     * @param elem Element to set the attribute of.
     * @param name Name of the attribute.
     * @param attrValue Value of the attribute.
     * @returns True if the attribute has been changed.
     */
    const attributeSetter = (elem: Element, name: string, attrValue: string): boolean => {
        if (
            isEventHandlerSkipped
            && attrValue !== ''
            && EVENT_HANDLER_ATTR_REGEXP.test(name)
            && name.toLowerCase() in elem
        ) {
            return false;
        }
        return defaultAttributeSetter(elem, name, attrValue);
    };

    /**
     * Elements whose error has been logged, so it is not logged on each DOM change.
     */
    const loggedFailedElems = new WeakSet<Element>();
    const applyAttr = () => {
        setAttributeBySelector(source, selector, attr, value, attributeSetter, loggedFailedElems);
    };

    const start = () => {
        applyAttr();
        observeDOMChanges(applyAttr, shouldObserveAttributes);
    };

    if (runAt === null) {
        start();
    } else {
        runAtUboReadyState(start, runAt);
    }
};
