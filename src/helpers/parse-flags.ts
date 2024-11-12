/**
 * Interface representing the structure of flags data.
 */
export interface FlagsData {
    /**
     * Represents the 'asap' flag, indicating immediate action.
     */
    ASAP: string;

    /**
     * Represents the 'complete' flag, indicating action upon completion.
     */
    COMPLETE: string;

    /**
     * Represents the 'stay' flag, indicating persistent action.
     */
    STAY: string;

    /**
     * Checks if a specific flag is present.
     * @param flag The flag to check for.
     * @returns True if the flag is present, otherwise false.
     */
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
