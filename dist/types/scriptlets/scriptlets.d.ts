/**
 * Scriptlet properties
 */
interface Source {
    /**
     * Scriptlet name
     */
    name: string;
    /**
     * Arguments for scriptlet function
     */
    args: string[];
    /**
     * {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
     */
    engine: string;
    /**
     * Version
     */
    version: string;
    /**
     * flag to enable printing to console debug information
     */
    verbose: boolean;
    /**
     * Source rule text is used for debugging purposes.
     *
     * @deprecated since it is not used in the code anymore.
     */
    ruleText?: string;
    /**
     * Domain name, used to improve logging
     */
    domainName?: string;
    /**
     * Optional unique identifier for a scriptlet instance.
     *
     * This identifier is used to prevent multiple executions of the same scriptlet on the page.
     * If provided, this `uniqueId` will be combined with the scriptlet's `name` and `args`
     * to create a unique identifier for the scriptlet call. This identifier is
     * stored in the `Window.prototype.toString` object to ensure the scriptlet
     * is not executed more than once in the same context.
     *
     * By avoiding multiple executions, it helps in reducing redundant operations and
     * potential side effects that might occur if the same scriptlet is called multiple times.
     *
     * If `uniqueId` is not specified, no such unique identifier is created, and the
     * scriptlet can be called multiple times.
     */
    uniqueId?: string;
}
/**
 * Returns scriptlet code by `source`.
 *
 * @param source Scriptlet properties.
 *
 * @returns Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
declare function getScriptletCode(source: Source): string;
declare const scriptlets: {
    invoke: typeof getScriptletCode;
    getScriptletFunction: (name: any) => any;
};

export { type Source, scriptlets };
