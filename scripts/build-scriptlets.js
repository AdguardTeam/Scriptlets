import { rollupStandard } from './rollup-runners';
import {
    scriptletsIIFEConfig,
    scriptletsUMDConfig,
    scriptletsListConfig,
} from '../rollup.config';

const buildScriptletsIIFE = async () => rollupStandard(scriptletsIIFEConfig);

const buildScriptletsUMD = async () => rollupStandard(scriptletsUMDConfig);

export const buildScriptletsList = async () => rollupStandard(scriptletsListConfig);

export const buildScriptlets = async () => {
    await Promise.all([
        buildScriptletsUMD(),
        buildScriptletsIIFE(),
    ]);
};
