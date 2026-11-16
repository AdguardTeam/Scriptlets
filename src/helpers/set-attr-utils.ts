import { logMessage } from './log-message';
import { isValidAttributeName, defaultAttributeSetter, setAttributeBySelector } from './attribute-utils';
import { isValidSelector } from './selector-utils';
import { observeDOMChanges } from './observer';
import { nativeIsNaN } from './number-utils';
import { parseUboOptions } from './ubo-utils';
import { runAtReadyState } from './ready-state-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `setAttrBySettings()`, which are parsed from the arguments of `set-attr` or `trusted-set-attr` once,
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
     * Value of the attribute, or `[name]` of the attribute to copy the value from, see `copiedAttr`.
     */
    value: string;

    /**
     * Name of the attribute of the same element whose value is copied, e.g. `data-src` of `[data-src]`
     * of `set-attr`, or `null` to set `value`.
     */
    copiedAttr: string | null;

    /**
     * Value which is set if the element has no attribute to copy the value from: `null` as text in AdGuard syntax,
     * as before, or an empty one, as in uBO.
     */
    missingCopiedValue: string;

    /**
     * Ready state of the document when the attribute is set, see `runAtReadyState()`,
     * or `undefined` to set it immediately.
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
 * Parses the arguments of AdGuard `set-attr` or `trusted-set-attr` as before: the selector and the name
 * of the attribute are required and validated, and the attribute is set immediately, and again on any change
 * of the DOM. The value of `set-attr` has to be empty, `true` or `false` in any case, an integer
 * from 0 to 32767, as `parseInt()` parses it, or `[name]` of a valid attribute to copy the value from,
 * which is `null` as text if the element has no such attribute.
 * The named option `runAt, value` may follow the value, to set the attribute when the document has
 * the ready state, see `runAtReadyState()`.
 *
 * Requires `logMessage`, `isValidSelector`, `isValidAttributeName`, `nativeIsNaN` and `parseUboOptions`
 * in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param selector CSS selector of the elements.
 * @param attr Name of the attribute.
 * @param value Value of the attribute.
 * @param args Named options which follow the value, e.g. `['runAt', 'interactive']`.
 * @param isTrusted If true, as for `trusted-set-attr`, the value is set as is.
 *
 * @returns Settings of the attribute, or `null` if an argument is missing or invalid, which is logged.
 */
export const getAdgAttrSettings = (
    source: Source,
    selector: string,
    attr: string,
    value: string,
    args: unknown[],
    isTrusted: boolean,
): AttrSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const ALLOWED_VALUES = ['true', 'false'];
    const MAX_VALUE = 32767;

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

    let copiedAttr: string | null = null;
    if (!isTrusted) {
        // Name of the attribute to copy the value from is validated once as well, since `getAttribute()`
        // returns null for an invalid name, so it would be taken as missing on each matched element
        const shouldCopyValue = value.startsWith('[')
            && value.endsWith(']')
            && isValidAttributeName(value.slice(1, -1));

        const number = parseInt(value, 10);
        const isValidValue = value.length === 0
            || (!nativeIsNaN(number) && number >= 0 && number <= MAX_VALUE)
            || ALLOWED_VALUES.includes(value.toLowerCase());

        if (!shouldCopyValue && !isValidValue) {
            logMessage(source, `Invalid attribute value provided: '${value}'`);
            return null;
        }

        if (shouldCopyValue) {
            copiedAttr = value.slice(1, -1);
        }
    }

    return {
        selector,
        attr,
        value,
        copiedAttr,
        missingCopiedValue: 'null',
        runAt: parseUboOptions(args).runAt,
        shouldObserveAttributes: true,
        isEventHandlerSkipped: false,
    };
};

/**
 * Parses the arguments of uBO `set-attr.js` or `trusted-set-attr.js`, converted to AdGuard syntax,
 * as uBO `setAttr()`, `trustedSetAttr()` and `setAttrFn()` do:
 * - the selector and the name of the attribute are required, and the value is empty if it is omitted;
 * - the value of `set-attr` has to be empty, `true` or `false` in any case, which are set as they are,
 *   digits of a number less than 32768, which is set without leading zeros, e.g. `007` as `7`,
 *   or `[name]` of an attribute to copy the value from, which is empty if the element has no such attribute;
 * - named options follow the value: `runAt, value` sets the attribute when the document has the ready state,
 *   see `runAtReadyState()`, by default when it is complete, i.e. `idle`;
 * - the attribute is set again only when nodes are added, not when the page changes an attribute;
 * - an attribute of an event handler of the element, e.g. `onclick`, is not set to a non-empty value.
 *
 * As in AdGuard syntax, an invalid selector, name of the attribute or value is logged, while uBO stops silently.
 *
 * Requires `logMessage`, `isValidSelector`, `isValidAttributeName` and `parseUboOptions` in the injections
 * of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param selector CSS selector of the elements.
 * @param attr Name of the attribute.
 * @param value Value of the attribute.
 * @param args Named options which follow the value, e.g. `['runAt', 'interactive']`.
 * @param isTrusted If true, as for `trusted-set-attr.js`, the value is set as is.
 *
 * @returns Settings of the attribute, or `null` if an argument is missing or invalid, which is logged.
 */
export const getUboAttrSettings = (
    source: Source,
    selector: unknown,
    attr: unknown,
    value: unknown,
    args: unknown[],
    isTrusted: boolean,
): AttrSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const DEFAULT_RUN_AT = 'idle';
    const ALLOWED_VALUES = ['', 'false', 'true'];
    const DIGITS_REGEXP = /^\d+$/;
    const COPIED_ATTR_REGEXP = /^\[.+\]$/;
    const MAX_VALUE = 32767;

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

    let attrValue = typeof value === 'string' ? value : '';
    let copiedAttr: string | null = null;
    if (!isTrusted) {
        if (DIGITS_REGEXP.test(attrValue)) {
            const number = parseInt(attrValue, 10);
            if (number > MAX_VALUE) {
                logMessage(source, `Invalid attribute value provided: '${attrValue}'`);
                return null;
            }
            attrValue = `${number}`;
        } else if (COPIED_ATTR_REGEXP.test(attrValue)) {
            // As in uBO, the name is not validated, as `getAttribute()` returns null for an invalid one
            copiedAttr = attrValue.slice(1, -1);
        } else if (!ALLOWED_VALUES.includes(attrValue.toLowerCase())) {
            logMessage(source, `Invalid attribute value provided: '${attrValue}'`);
            return null;
        }
    }

    const options = parseUboOptions(args);

    return {
        selector,
        attr,
        value: attrValue,
        copiedAttr,
        missingCopiedValue: '',
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
 * Requires `setAttributeBySelector`, `defaultAttributeSetter`, `observeDOMChanges`, `runAtReadyState`
 * and `logMessage`, with their dependencies, in the injections of the scriptlet.
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
        copiedAttr,
        missingCopiedValue,
        runAt,
        shouldObserveAttributes,
        isEventHandlerSkipped,
    } = settings;

    /**
     * Elements whose missing attribute to copy the value from has been logged,
     * so it is not logged on each DOM change, but again only after the attribute has been found.
     */
    const loggedMissingSourceElems = new WeakSet<Element>();

    /**
     * Returns the value of the attribute for the element, i.e. the value of the settings
     * or the copied one.
     *
     * @param elem Element to set the attribute of.
     * @returns Value of the attribute.
     */
    const getValue = (elem: Element): string => {
        if (copiedAttr === null) {
            return value;
        }
        const valueToCopy = elem.getAttribute(copiedAttr);
        // Logged on missing attribute rather than on actual change,
        // since the target may already hold the value, e.g. if the element is a copy of a processed one
        if (valueToCopy === null) {
            if (!loggedMissingSourceElems.has(elem)) {
                loggedMissingSourceElems.add(elem);
                logMessage(source, `No element attribute found to copy value from: ${value}`);
            }
            return missingCopiedValue;
        }
        loggedMissingSourceElems.delete(elem);
        return valueToCopy;
    };

    /**
     * Sets the attribute, unless it is an event handler which is skipped.
     *
     * @param elem Element to set the attribute of.
     * @param name Name of the attribute.
     * @returns True if the attribute has been changed.
     */
    const attributeSetter = (elem: Element, name: string): boolean => {
        const attrValue = getValue(elem);
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

    runAtReadyState(() => {
        applyAttr();
        observeDOMChanges(applyAttr, shouldObserveAttributes);
    }, runAt);
};
