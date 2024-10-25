// FIXME consider moving any rule from the main module to utils
import { type AnyRule } from '@adguard/agtree';
import { RuleParser, defaultParserOptions } from '@adguard/agtree/parser';
import { RuleGenerator } from '@adguard/agtree/generator';

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
        : RuleGenerator.generate(rule);
};
