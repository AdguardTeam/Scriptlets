import { rolldownStandard } from './rollup-runners';
import { scriptletsListConfig, scriptletsConfig, typesConfig } from '../rollup.config';

export const buildScriptletsList = async () => rolldownStandard(scriptletsListConfig);

export const buildScriptlets = async () => {
    await rolldownStandard(scriptletsConfig);
    await rolldownStandard(typesConfig);
};
