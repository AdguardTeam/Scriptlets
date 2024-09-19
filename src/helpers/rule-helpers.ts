import { type AnyRule, defaultParserOptions, RuleParser } from '@adguard/agtree';

/**
 * Get rule node from string or rule node
 *
 * @param rule Rule in string or rule node format
 * @returns Rule node
 *
 * @throws If the rule is in string format and cannot be parsed
 */
export const getRuleNode = (rule: string | AnyRule): AnyRule => {
    return typeof rule === 'string'
        // Note: AGTree does not support legacy script:inject syntax
        ? RuleParser.parse(rule, {
            ...defaultParserOptions,
            includeRaws: false,
            isLocIncluded: false,
        })
        : rule;
};

/**
 * Get rule text from string or rule node
 *
 * @param rule Rule in string or rule node format
 * @returns Rule text
 */
export const getRuleText = (rule: string | AnyRule): string => {
    return typeof rule === 'string'
        ? rule
        : RuleParser.generate(rule);
};
