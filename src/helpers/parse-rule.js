/**
 * Iterate over iterable argument and evaluate current state with transitions
 * @param {string} init first transition name
 * @param {Array|Collection|string} iterable
 * @param {Object} transitions transtion functions
 * @param {any} args arguments which should be passed to transition functions
 */
function iterateWithTransitions(iterable, transitions, init, args) {
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
 */
const wordSaver = () => {
    let str = '';
    const strs = [];
    const saveSymb = (s) => {
        str += s;
        return str;
    };
    const saveStr = () => {
        strs.push(str);
        str = '';
    };
    const getAll = () => [...strs];

    return { saveSymb, saveStr, getAll };
};

const substringAfter = (str, separator) => {
    if (!str) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? '' : str.substring(index + separator.length);
};

/**
 * Parse and validate scriptlet rule
 * @param {*} ruleText
 * @returns {{name: string, args: Array<string>}}
 */
const parseRule = (ruleText) => {
    ruleText = substringAfter(ruleText, ADG_SCRIPTLET_MASK);
    /**
     * Transition names
     */
    const TRANSITION = {
        OPENED: 'opened',
        PARAM: 'param',
        CLOSED: 'closed',
    };

    /**
     * Transition function: the current index position in start, end or between params
     * @param {string} rule
     * @param {number} index
     * @param {Object} Object
     * @property {Object} Object.sep contains prop symb with current separator char
     */
    const opened = (rule, index, { sep }) => {
        const char = rule[index];
        let transition;
        switch (char) {
        case ' ':
        case '(':
        case ',': {
            transition = TRANSITION.OPENED;
            break;
        }
        case '\'':
        case '"': {
            sep.symb = char;
            transition = TRANSITION.PARAM;
            break;
        }
        case ')': {
            transition = index === rule.length - 1
                ? TRANSITION.CLOSED
                : TRANSITION.OPENED;
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
     * @param {string} rule
     * @param {number} index
     * @param {Object} Object
     * @property {Object} Object.sep contains prop `symb` with current separator char
     * @property {Object} Object.saver helper which allow to save strings by car by char
     */
    const param = (rule, index, { saver, sep }) => {
        const char = rule[index];
        switch (char) {
        case '\'':
        case '"': {
            const preIndex = index - 1;
            const before = rule[preIndex];
            if (char === sep.symb && before !== '\\') {
                sep.symb = null;
                saver.saveStr();
                return TRANSITION.OPENED;
            }
        }
        // eslint-disable-next-line no-fallthrough
        default: {
            saver.saveSymb(char);
            return TRANSITION.PARAM;
        }
        }
    };
    const transitions = {
        [TRANSITION.OPENED]: opened,
        [TRANSITION.PARAM]: param,
        [TRANSITION.CLOSED]: () => { },
    };
    const sep = { symb: null };
    const saver = wordSaver();
    const state = iterateWithTransitions(ruleText, transitions, TRANSITION.OPENED, { sep, saver });

    if (state !== 'closed') {
        throw new Error(`Invalid scriptlet rule ${ruleText}`);
    }

    const args = saver.getAll();
    return {
        name: args[0],
        args: args.slice(1),
    };
};

export default parseRule;
