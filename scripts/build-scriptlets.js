import { rolldownStandard } from './bundle-runners';
import { scriptletsListConfig, scriptletsConfig, typesConfig } from '../rolldown.config';

export const buildScriptletsList = async () => rolldownStandard(scriptletsListConfig);

export const buildScriptlets = async () => {
    await rolldownStandard(scriptletsConfig);
    await rolldownStandard(typesConfig);
};
