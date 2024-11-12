import { type Source } from '../src/scriptlets';

export type ArbitraryObject = { [key: string | symbol | number]: unknown };
export type ArbitraryFunction = (...args: any[]) => unknown;
export type NoopFunc = () => void;
export type TrueFunc = () => true;

interface PageFunction {
    names: string[];
    injections?: Helper[];
}

export interface Scriptlet extends PageFunction {
    (source: Source, ...args: any[]): void;
}

export interface Redirect extends PageFunction {
    (source: Source): void;
}

export type ChainBase = {
    [key: string]: ChainBase;
};

export type ChainInfo = {
    base: ChainBase;
    prop: string;
    chain?: string;
};

export type StorageItemValue = string | number | undefined | boolean;
