/**
 * Behaviour flags string parser
 * @param {string} flags required, 'applying' argument string
 * @return {Object}
 */
export const parseFlags = (flags) => {
    const FLAGS_DIVIDER = ' ';
    const ASAP_FLAG = 'asap';
    const COMPLETE_FLAG = 'complete';
    const STAY_FLAG = 'stay';
    const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];

    const passedFlags = flags.trim()
        .split(FLAGS_DIVIDER)
        .filter((f) => VALID_FLAGS.indexOf(f) !== -1);

    return {
        ASAP: ASAP_FLAG,
        COMPLETE: COMPLETE_FLAG,
        STAY: STAY_FLAG,
        hasFlag(flag) {
            return passedFlags.indexOf(flag) !== -1;
        },
    };
};
