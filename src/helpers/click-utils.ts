/**
 * Clicks an element using React's internal event handlers if available,
 * otherwise falls back to native click.
 *
 * Some React applications don't respond to native click events,
 * so we need to trigger React's synthetic event handlers directly.
 *
 * @param element HTML element to click.
 */
export const clickElement = (element: HTMLElement): void => {
    const REACT_PROPS_KEY_PREFIX = '__reactProps$';

    // Find React internal props key on the element
    const reactPropsKey = Object.keys(element).find((key) => key.startsWith(REACT_PROPS_KEY_PREFIX));

    // If React props are found, try to use React's handlers
    if (reactPropsKey) {
        const reactProps = (element as unknown as Record<string, unknown>)[reactPropsKey] as {
            onFocus?: () => void;
            onClick?: () => void;
        } | undefined;

        if (reactProps && typeof reactProps.onClick === 'function') {
            // Call onFocus first if available, as some React components require it
            if (typeof reactProps.onFocus === 'function') {
                reactProps.onFocus();
            }
            reactProps.onClick();
            return;
        }
    }

    // Fallback to native click
    element.click();
};
