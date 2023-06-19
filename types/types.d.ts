interface Source {
    name: string;
    args: string[];
    engine: string;
    version: string;
    verbose: boolean;
    ruleText: string;
    domainName?: string;
}

type ArbitraryObject = { [key: string | symbol | number]: unknown };
type ArbitraryFunction = (...args: unknown[]) => unknown;
type NoopFunc = () => void;
type TrueFunc = () => true;
type Helper = ArbitraryFunction;

interface PageFunction {
    names: string[];
    injections?: Helper[];
}

interface Scriptlet extends PageFunction {
    (source: Source, ...args: Array<string | number>): void;
}

interface Redirect extends PageFunction {
    (source: Source): void;
}

type ScriptletstList = Record<string, Scriptlet>;

type ChainBase = {
    [key: string]: ChainBase;
};

type ChainInfo = {
    base: ChainBase;
    prop: string;
    chain?: string;
};

type StorageItemValue = string | number | undefined | boolean;

/* Redirects converting types */
type AdgUboRedirectRuleMarker = 'redirect-rule=';
type AdgUboRedirectMarker = 'redirect=';
type AbpRedirectMarker = 'rewrite=abp-resource:';
type RedirectMarker = AdgUboRedirectMarker | AbpRedirectMarker | AdgUboRedirectRuleMarker;
type RedirectsData = {
    redirectMarker: AdgUboRedirectMarker | AbpRedirectMarker;
    compatibility: Record<string, string | undefined>;
    redirectRuleMarker?: AdgUboRedirectRuleMarker;
};
type MarkerData = {
    index: number;
    marker: RedirectMarker;
};

interface RedirectCompatibilityMap {
    adg: string;
    ubo?: string;
    abp?: string;
}
