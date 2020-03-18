declare module 'scriptlets' {

    /**
     * Scriptlet properties
     */
    interface IConfiguration {
        /**
         * Scriptlet name
         */
        name: string;

        /**
         * Arguments for scriptlet function
         */
        args: [string];

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
         * Source rule text is used for debugging purposes
         */
        ruleText: string;
    }

    class Scriptlets {

        /**
         * Returns scriptlet code by param
         *
         * @param source
         * @returns js code string
         */
        public static invoke(source: IConfiguration): string | null;

        /**
         * Converts scriptlet rule to AdGuard one
         *
         * @param ruleText
         * @returns array of AdGuard scriptlet rules
         */
        public static convertScriptletToAdg(ruleText: string): [string];
    }
}
