/**
 * @typedef {Object} FlagsData object that holds info about valid flags
 * and provides method for easy access
 * @property {string} ASAP asap flag string
 * @property {string} COMPLETE complete flag string
 * @property {string} STAY stay flag string
 * @property {Function} hasFlag to check if given flag is present
 */

/**
 * Behaviour flags string parser
 *
 * @param {string} flags required, 'applying' argument string
 * @returns {FlagsData} object with parsed flags
 */
export const parseFlags = (flags) => {
    const FLAGS_DIVIDER = ' ';
    const ASAP_FLAG = 'asap';
    const COMPLETE_FLAG = 'complete';
    const STAY_FLAG = 'stay';
    const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];

    const passedFlags = flags.trim()
        .split(FLAGS_DIVIDER)
        .filter((f) => VALID_FLAGS.includes(f));

    return {
        ASAP: ASAP_FLAG,
        COMPLETE: COMPLETE_FLAG,
        STAY: STAY_FLAG,
        hasFlag(flag) {
            return passedFlags.includes(flag);
        },
    };
};
