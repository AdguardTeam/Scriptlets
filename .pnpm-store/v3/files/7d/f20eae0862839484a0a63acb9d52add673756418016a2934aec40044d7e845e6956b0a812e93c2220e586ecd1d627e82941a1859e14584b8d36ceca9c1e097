/**
 * Step 1) Entry point of plugin. Exports itself for eslint to use
 * @author Amila Welihinda
 */
import type { Linter } from "eslint";
declare const configs: {
    "flat/recommended": Linter.FlatConfig;
    recommended: Linter.Config;
};
declare const _default: {
    /**
     * @deprecated Use `.configs` instead. This will be removed in the next major release.
     */
    config: {
        "flat/recommended": Linter.FlatConfig;
        recommended: Linter.Config;
    };
    meta: {
        name: string;
        version: string;
    };
    configs: typeof configs;
    rules: {
        compat: import("eslint").Rule.RuleModule;
    };
};
export = _default;
