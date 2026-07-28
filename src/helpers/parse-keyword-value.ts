/**
 * Modifies passed value according to the purpose of the keywords it contains.
 * Keywords may be used as a whole value or as a part of it,
 * and there may be more than one keyword in the value,
 * e.g. '{"count":1,"firstTime":$now$,"date":$currentDate$}'.
 * Returns initial value if it contains no keywords.
 *
 * Supported keywords:
 *   - '$now$' - returns current time in ms, e.g 1667915146503
 *   - '$currentDate$' - returns current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 *   - '$currentISODate$' - returns current date in ISO format e.g '2022-11-08T13:53:19.650Z'
 *
 * @param rawValue value which may contain keywords
 * @returns parsed value
 */
export const parseKeywordValue = (rawValue: string): string => {
    // !IMPORTANT: Do not move constants outside of this function
    // Remember to add new keywords to "isCookieSetWithValue" function in "cookie-utils", if required
    // https://github.com/AdguardTeam/Scriptlets/issues/489
    const NOW_VALUE_KEYWORD = '$now$';
    const CURRENT_DATE_KEYWORD = '$currentDate$';
    const CURRENT_ISO_DATE_KEYWORD = '$currentISODate$';

    // Keywords are supported in any part of the value, not as a standalone value only
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    // !IMPORTANT: keep the alternation in sync with the keywords above,
    // longer keywords should be listed first
    const KEYWORDS_REGEXP = /\$(?:currentISODate|currentDate|now)\$/g;

    // Value is not always a string. Scriptlet args are passed to the scriptlet as is
    // by "passSourceAndProps", i.e. they are not coerced to strings,
    // so the value may be e.g. a number if the scriptlet is invoked programmatically
    // and not by a rule where args are always strings.
    // There is nothing to parse in such a case and the value should be returned as is,
    // otherwise "replace()" below throws for non-strings
    if (typeof rawValue !== 'string') {
        return rawValue;
    }

    // Same date is used for all the keywords in the value
    // so multiple keywords are replaced with the very same time
    const date = new Date();

    // Callback is used as a replacement to avoid special treatment
    // of '$' patterns in the replacement string
    return rawValue.replace(KEYWORDS_REGEXP, (keyword) => {
        switch (keyword) {
            case NOW_VALUE_KEYWORD:
                // Set to current time in ms, e.g 1667915146503
                return date.getTime().toString();
            case CURRENT_DATE_KEYWORD:
                // Set to current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
                return date.toString();
            case CURRENT_ISO_DATE_KEYWORD:
                // Set to current date e.g '2022-11-08T13:53:19.650Z'
                return date.toISOString();
            default:
                return keyword;
        }
    });
};
