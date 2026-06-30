import { rolldownStandard } from './bundle-runners';
import {
    scriptletsListConfig,
    coreConfig,
    toolsConfig,
    typesConfig,
} from '../rolldown.config';

export const buildScriptletsList = async () => rolldownStandard(scriptletsListConfig);

export const buildScriptlets = async () => {
    await rolldownStandard([coreConfig, toolsConfig]);
    await rolldownStandard(typesConfig);
};
