interface FlagsData {
    ASAP: 'asap';
    COMPLETE: 'complete';
    STAY: 'stay';
    hasFlag(flag: string): boolean;
}

/**
 * Behaviour flags string parser
 *
 * @param flags required, 'applying' argument string
 * @returns object with parsed flags
 */
export const parseFlags = (flags: string): FlagsData => {
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
