import { logMessage } from './log-message';
import { hit } from './hit';

/**
 * Sets attribute with given value to given element.
 *
 * @param elem Element to set attribute to.
 * @param attribute Attribute name to set.
 * @param value Attribute value to set.
 */
export const defaultAttributeSetter = (
    elem: Element,
    attribute: string,
    value: string,
): void => elem.setAttribute(attribute, value);

/**
 * Sets attribute with given value to all elements matching given selector
 *
 * @param source source
 * @param selector CSS selector
 * @param attribute attribute name to set
 * @param value attribute value to set
 * @param attributeSetter function to apply to each element,
 * defaults to native .setAttribute
 */
export const setAttributeBySelector = (
    source: Source,
    selector: string,
    attribute: string,
    value: string,
    attributeSetter = defaultAttributeSetter,
): void => {
    let elements;
    try {
        elements = document.querySelectorAll(selector);
    } catch {
        logMessage(source, `Failed to find elements matching selector "${selector}"`);
        return;
    }

    if (!elements || elements.length === 0) {
        return;
    }

    try {
        elements.forEach((elem) => attributeSetter(elem, attribute, value));
        hit(source);
    } catch {
        logMessage(source, `Failed to set [${attribute}="${value}"] to each of selected elements.`);
    }
};
