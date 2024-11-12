import { logMessage } from './log-message';
import { hit } from './hit';
import { type Source } from '../scriptlets';

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

/**
 * Parsed attribute data type.
 */
export type ParsedAttributePair = {
    /**
     * Attribute name.
     */
    name: string;

    /**
     * Attribute value.
     */
    value: string;
};

/**
 * Parses attribute pairs string into an array of objects with name and value properties.
 *
 * @param input Attribute pairs string.
 *
 * @returns Array of objects with name and value properties.
 * @throws Error if input is invalid.
 */
export const parseAttributePairs = (input: string): ParsedAttributePair[] => {
    if (!input) {
        return [];
    }

    const NAME_VALUE_SEPARATOR = '=';
    const PAIRS_SEPARATOR = ' ';
    const SINGLE_QUOTE = "'";
    const DOUBLE_QUOTE = '"';
    const BACKSLASH = '\\';

    const pairs = [];

    for (let i = 0; i < input.length; i += 1) {
        let name = '';
        let value = '';

        // collect the name
        while (i < input.length
            && input[i] !== NAME_VALUE_SEPARATOR
            && input[i] !== PAIRS_SEPARATOR) {
            name += input[i];
            i += 1;
        }

        if (i < input.length && input[i] === NAME_VALUE_SEPARATOR) {
            // skip the '='
            i += 1;

            let quote = null;
            if (input[i] === SINGLE_QUOTE || input[i] === DOUBLE_QUOTE) {
                quote = input[i];
                // Skip the opening quote
                i += 1;
                for (; i < input.length; i += 1) {
                    if (input[i] === quote) {
                        if (input[i - 1] === BACKSLASH) {
                            // remove the backslash and save the quote to the value
                            value = `${value.slice(0, -1)}${quote}`;
                        } else {
                            // Skip the closing quote
                            i += 1;
                            quote = null;
                            break;
                        }
                    } else {
                        value += input[i];
                    }
                }
                if (quote !== null) {
                    throw new Error(`Unbalanced quote for attribute value: '${input}'`);
                }
            } else {
                throw new Error(`Attribute value should be quoted: "${input.slice(i)}"`);
            }
        }

        name = name.trim();
        value = value.trim();

        if (!name) {
            if (!value) {
                // skip multiple spaces between pairs, e.g.
                // 'name1="value1"  name2="value2"'
                continue;
            }
            throw new Error(`Attribute name before '=' should be specified: '${input}'`);
        }

        pairs.push({
            name,
            value,
        });

        if (input[i] && input[i] !== PAIRS_SEPARATOR) {
            throw new Error(`No space before attribute: '${input.slice(i)}'`);
        }
    }

    return pairs;
};
