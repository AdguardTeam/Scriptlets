import {
    isAbpSnippetRule,
    isAdgScriptletRule,
    isRedirectResourceCompatibleWithAdg,
    isUboScriptletRule,
    isValidAdgRedirectRule,
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
    isValidAdgRedirectRule,
};
