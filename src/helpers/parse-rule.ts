interface WordSaver {
    saveSymb(s: string): string;
    saveStr(): void;
    getAll(): string[];
}

interface TransitionHelper {
    sep: {
        symb: string | null;
    };
    saver: WordSaver;
}

type ParsedRule = {
    name: string;
    args: string[];
};

/**
 * Transition names
 */
const enum Transition {
    Opened = 'opened',
    Param = 'param',
    Closed = 'closed',
}

type OpenedTransition = (
    rule: string,
    index: number,
    { sep }: TransitionHelper
) => Transition;

type ParamTransition = (
    rule: string,
    index: number,
    { saver, sep }: TransitionHelper,
) => Transition;

type ClosedTransition = () => Transition;

interface TransitionsObj {
    [Transition.Opened]: OpenedTransition;
    [Transition.Param]: ParamTransition;
    [Transition.Closed]: ClosedTransition;
}

/**
 * Iterate over iterable argument and evaluate current state with transitions
 *
 * @param iterable rule or list or rules
 * @param transitions helper object with transition functions
 * @param init first transition name
 * @param args arguments which should be passed to transition functions
 * @returns state
 */
function iterateWithTransitions(
    iterable: string,
    transitions: TransitionsObj,
    init: Transition,
    args: TransitionHelper,
): Transition {
    let state = init || Object.keys(transitions)[0];
    for (let i = 0; i < iterable.length; i += 1) {
        state = transitions[state](iterable, i, args);
    }
    return state;
}

/**
 * AdGuard scriptlet rule mask
 */
export const ADG_SCRIPTLET_MASK = '#//scriptlet';

/**
 * Helper to accumulate an array of strings char by char
 *
 * @returns object with helper methods
 */
const wordSaver = (): WordSaver => {
    let str = '';
    const strings: string[] = [];
    const saveSymb = (s: string) => {
        str += s;
        return str;
    };
    const saveStr = () => {
        strings.push(str);
        str = '';
    };
    const getAll = () => [...strings];

    return { saveSymb, saveStr, getAll };
};

const substringAfter = (str: string, separator: string) => {
    if (!str) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? '' : str.substring(index + separator.length);
};

/**
 * Parses scriptlet rule and validates its syntax.
 *
 * @param ruleText Rule string
 *
 * @returns Parsed rule data.
 * @throws An error on invalid rule syntax.
 */
export const parseRule = (ruleText: string): ParsedRule => {
    ruleText = substringAfter(ruleText, ADG_SCRIPTLET_MASK);
    /**
     * Transition function: the current index position in start, end or between params
     *
     * @param rule rule string
     * @param index index
     * @param Object helper object that contains prop symb with current separator char
     * @param Object.sep contains prop `symb` with current separator char
     * @throws throws if given rule is not a scriptlet
     * @returns transition
     */
    const opened = (rule: string, index: number, { sep }: TransitionHelper): Transition => {
        const char = rule[index];
        let transition;
        switch (char) {
            case ' ':
            case '(':
            case ',': {
                transition = Transition.Opened;
                break;
            }
            case '\'':
            case '"': {
                sep.symb = char;
                transition = Transition.Param;
                break;
            }
            case ')': {
                transition = index === rule.length - 1
                    ? Transition.Closed
                    : Transition.Opened;
                break;
            }
            default: {
                throw new Error('The rule is not a scriptlet');
            }
        }

        return transition;
    };

    /**
     * Transition function: the current index position inside param
     *
     * @param rule rule string
     * @param index index
     * @param Object helper object
     * @param Object.sep contains prop `symb` with current separator char
     * @param Object.saver helper which allow to save strings by car by cha
     * @returns transition
     */
    const param = (
        rule: string,
        index: number,
        { saver, sep }: TransitionHelper,
    ): Transition.Opened | Transition.Param => {
        const char = rule[index];
        switch (char) {
            case '\'':
            case '"': {
                const preIndex = index - 1;
                const before = rule[preIndex];
                if (char === sep.symb && before !== '\\') {
                    sep.symb = null;
                    saver.saveStr();
                    return Transition.Opened;
                }
            }
            // eslint-disable-next-line no-fallthrough
            default: {
                saver.saveSymb(char);
                return Transition.Param;
            }
        }
    };
    const transitions: TransitionsObj = {
        [Transition.Opened]: opened,
        [Transition.Param]: param,
        [Transition.Closed]: (() => {}) as ClosedTransition,
    };
    const sep = { symb: null };
    const saver = wordSaver();
    const state = iterateWithTransitions(ruleText, transitions, Transition.Opened, { sep, saver });

    if (state !== Transition.Closed) {
        throw new Error(`Invalid scriptlet rule ${ruleText}`);
    }

    const args = saver.getAll();
    return {
        name: args[0],
        args: args.slice(1),
    };
};
