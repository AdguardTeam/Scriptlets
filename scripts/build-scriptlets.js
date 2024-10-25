import { rollupStandard } from './rollup-runners';
import {
    scriptletsCjsAndEsm,
    // FIXME remove
    // scriptletsIIFEConfig,
    // FIXME remove
    // scriptletsUMDConfig,
    scriptletsListConfig,
} from '../rollup.config';

// FIXME remove IIFE config
// const buildScriptletsIIFE = async () => rollupStandard(scriptletsIIFEConfig);

// FIXME remove umd config
// const buildScriptletsUMD = async () => rollupStandard(scriptletsUMDConfig);

export const buildScriptletsList = async () => rollupStandard(scriptletsListConfig);

export const buildScriptlets = async () => rollupStandard(scriptletsCjsAndEsm);
