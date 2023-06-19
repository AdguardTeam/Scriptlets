/**
 * Modifies passed keyword value according to its purpose.
 * Returns initial value if it's not a keyword.
 *
 * Supported keywords:
 *   - '$now$' - returns current time in ms, e.g 1667915146503
 *   - '$currentDate$' - returns current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 *
 * @param rawValue keyword
 * @returns parsed value
 */
export const parseKeywordValue = (rawValue: string): string => {
    const NOW_VALUE_KEYWORD = '$now$';
    const CURRENT_DATE_KEYWORD = '$currentDate$';

    let parsedValue = rawValue;

    if (rawValue === NOW_VALUE_KEYWORD) {
        // Set to current time in ms, e.g 1667915146503
        parsedValue = Date.now().toString();
    } else if (rawValue === CURRENT_DATE_KEYWORD) {
        // Set to current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
        parsedValue = Date();
    }

    return parsedValue;
};
