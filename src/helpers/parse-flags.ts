interface FlagsData {
    ASAP: string;
    COMPLETE: string;
    STAY: string;
    hasFlag(flag: string): boolean;
}

/**
 * Behaviour flags string parser
 *
 * @param flags required, 'applying' argument string
 * @returns object with parsed flags
 */
export const parseFlags = (flags: string): FlagsData => {
    // !IMPORTANT: Do not move constants outside of this function
    const FLAGS_DIVIDER = ' ';
    const ASAP_FLAG = 'asap';
    const COMPLETE_FLAG = 'complete';
    const STAY_FLAG = 'stay';
    const VALID_FLAGS = new Set([ASAP_FLAG, COMPLETE_FLAG, STAY_FLAG]);

    const passedFlags = new Set(
        flags
            .trim()
            .split(FLAGS_DIVIDER)
            .filter((flag) => VALID_FLAGS.has(flag)),
    );

    return {
        ASAP: ASAP_FLAG,
        COMPLETE: COMPLETE_FLAG,
        STAY: STAY_FLAG,
        hasFlag: (flag: string): boolean => passedFlags.has(flag),
    };
};
