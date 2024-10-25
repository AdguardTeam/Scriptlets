import {
    isAbpSnippetRule,
    isAdgScriptletRule,
    isRedirectResourceCompatibleWithAdg,
    isUboScriptletRule,
    isValidScriptletName,
    isValidScriptletRule,
} from './validator';

export const validators = {
    isValidScriptletName,
    isValidScriptletRule,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    isRedirectResourceCompatibleWithAdg,
};
