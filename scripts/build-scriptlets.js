import { rollupStandard } from './rollup-runners';
import { scriptletsCjsAndEsm, scriptletsListConfig } from '../rollup.config';

export const buildScriptletsList = async () => rollupStandard(scriptletsListConfig);

export const buildScriptlets = async () => rollupStandard(scriptletsCjsAndEsm);
