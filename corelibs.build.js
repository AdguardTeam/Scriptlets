import * as scriptletsSrc from './src/scriptlets';
import { getScriptletCode } from './src/injector';

const ARGUMENT_PLACEHOLDER = '${args}';
const sNames = Object.values(scriptletsSrc).map(s => s.sName);

const res = getScriptletCode({
    name: 'abort-on-property-read',
    args: ARGUMENT_PLACEHOLDER
})

console.log(res);

