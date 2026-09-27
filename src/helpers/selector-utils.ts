/**
 * Checks whether the given string is a valid CSS selector.
 * Selector is matched against an empty document fragment,
 * so the check does not traverse the page DOM.
 *
 * @param selector CSS selector to check.
 *
 * @returns True if the selector is valid, false otherwise.
 */
export const isValidSelector = (selector: string): boolean => {
    try {
        document.createDocumentFragment().querySelector(selector);
        return true;
    } catch {
        return false;
    }
};
