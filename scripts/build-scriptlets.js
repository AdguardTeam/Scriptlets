import { rollupStandard } from './rollup-runners';
import { scriptlets, scriptletsListConfig } from '../rollup.config';

export const buildScriptletsList = async () => rollupStandard(scriptletsListConfig);

export const buildScriptlets = async () => rollupStandard(scriptlets);
