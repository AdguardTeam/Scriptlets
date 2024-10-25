import {
    convertAbpSnippetToAdg,
    convertAdgScriptletToUbo,
    convertScriptletToAdg,
    convertUboScriptletToAdg,
} from '../helpers/converter';

export const converters = {
    convertUboToAdg: convertUboScriptletToAdg,
    convertAbpToAdg: convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgToUbo: convertAdgScriptletToUbo,
};
