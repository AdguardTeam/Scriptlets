/* eslint-disable max-classes-per-file */

/**
 * Content of this file is copied from `content-script` repository to match typings for APIs.
 */

/**
 * Isomorphic trusted value type, if browser supports Trusted Types API it will be one of the
 * `TrustedHTML`, `TrustedScript` or `TrustedScriptURL`, otherwise will fallback into regular string.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScript}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScriptURL}
 */
export type TrustedValue = string | TrustedHTML | TrustedScript | TrustedScriptURL;

/**
 * Enum representation of return values of `getAttributeType` and
 * `getPropertyType` methods of native Trusted Types API.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getAttributeType}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getPropertyType}
 */
export const enum TrustedType {
    HTML = 'TrustedHTML',
    Script = 'TrustedScript',
    ScriptURL = 'TrustedScriptURL',
}

declare global {
    /**
     * Trusted HTML.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML}
     */
    class TrustedHTML {
        /**
         * Trusted HTML constructor.
         */
        private constructor();

        /**
         * Extracts JSON representation of stored data.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML/toJSON}
         *
         * @returns JSON representation of the stored data.
         */
        public toJSON(): string;

        /**
         * Extracts sanitized HTML.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML/toString}
         *
         * @returns String containing the sanitized HTML.
         */
        public toString(): string;
    }

    /**
     * Trusted Script.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScript}
     */
    class TrustedScript {
        /**
         * Trusted HTML constructor.
         */
        private constructor();

        /**
         * Extracts JSON representation of stored data.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScript/toJSON}
         *
         * @returns JSON representation of the stored data.
         */
        public toJSON(): string;

        /**
         * Extracts sanitized HTML.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScript/toString}
         *
         * @returns String containing the sanitized script.
         */
        public toString(): string;
    }

    /**
     * Trusted Script URL.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScriptURL}
     */
    class TrustedScriptURL {
        /**
         * Trusted HTML constructor.
         */
        private constructor();

        /**
         * Extracts JSON representation of stored data.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScriptURL/toJSON}
         *
         * @returns JSON representation of the stored data.
         */
        public toJSON(): string;

        /**
         * Extracts sanitized HTML.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedScriptURL/toString}
         *
         * @returns String containing the sanitized URL.
         */
        public toString(): string;
    }

    /**
     * Trusted Type Policy.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy}
     */
    class TrustedTypePolicy {
        /**
         * Name of the Trusted Type Policy.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/name}
         */
        public readonly name: string;

        /**
         * Trusted Type Policy constructor.
         */
        private constructor();

        /**
         * Creates a `TrustedHTML` object using a policy created by `TrustedTypePolicyFactory.createPolicy()`.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createHTML}
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns TrustedHTML object.
         *
         * @throws `TypeError` if TrustedTypePolicy does not contain a function to run on the input.
         */
        public createHTML(input: string, ...args: unknown[]): TrustedHTML;

        /**
         * Creates a `TrustedScript` object using a policy created by `TrustedTypePolicyFactory.createPolicy()`.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createScript}
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns TrustedScript object.
         *
         * @throws `TypeError` if TrustedTypePolicy does not contain a function to run on the input.
         */
        public createScript(input: string, ...args: unknown[]): TrustedScript;

        /**
         * Creates a `TrustedScriptURL` object using a policy created by `TrustedTypePolicyFactory.createPolicy()`.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createScriptURL}
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns TrustedScriptURL object.
         *
         * @throws `TypeError` if TrustedTypePolicy does not contain a function to run on the input.
         */
        public createScriptURL(input: string, ...args: unknown[]): TrustedScriptURL;
    }

    /**
     * Used as options for `TrustedTypePolicyFactory.createPolicy()` method.
     */
    interface TrustedTypePolicyOptions {
        /**
         * Sanitizes provided input HTML string.
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns Sanitized HTML string.
         */
        createHTML?: (input: string, ...args: unknown[]) => string;

        /**
         * Sanitizes provided input script string.
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns Sanitized script string.
         */
        createScript?: (input: string, ...args: unknown[]) => string;

        /**
         * Sanitizes provided input script URL string.
         *
         * @param input String to be sanitized by the policy.
         * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
         * @returns Sanitized script URL string.
         */
        createScriptURL?: (input: string, ...args: unknown[]) => string;
    }

    /**
     * Used as return type of `TrustedTypePolicyFactory.getAttributeType()` and
     * `TrustedTypePolicyFactory.getPropertyType()`.
     */
    type RequiredTrustedType = `${TrustedType}` | null;

    /**
     * Trusted Type Policy Factory.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory}
     */
    class TrustedTypePolicyFactory {
        /**
         * `TrustedHTML` object containing an empty string.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/emptyHTML}
         */
        public readonly emptyHTML: TrustedHTML;

        /**
         * `TrustedScript` object containing an empty string.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/emptyHTML}
         */
        public readonly emptyScript: TrustedScript;

        /**
         * Default `TrustedTypePolicy` or `null` if this is empty.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/emptyHTML}
         */
        public readonly defaultPolicy: TrustedTypePolicy | null;

        /**
         * Trusted Type Policy Factory constructor.
         */
        private constructor();

        /**
         * Creates a `TrustedTypePolicy` object that implements the rules passed as `policyOptions`.
         *
         * In Chrome a policy with a name of "default" creates a special policy that will be
         * used if a string (rather than a Trusted Type object) is passed to an injection sink.
         * This can be used in a transitional phase while moving from an application that
         * inserted strings into injection sinks.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/createPolicy}
         *
         * @param policyName Name of the policy.
         * @param policyOptions User-defined functions for converting strings into trusted values.
         * @returns TrustedTypePolicy object.
         *
         * @throws `TypeError` if policy names are restricted by the Content Security Policy
         * trusted-types directive and this name is not on the allowlist.
         *
         * @throws `TypeError` if the name is a duplicate and the Content Security Policy
         * trusted-types directive is not using allow-duplicates.
         */
        public createPolicy(policyName: string, policyOptions?: TrustedTypePolicyOptions): TrustedTypePolicy;

        /**
         * Allows web developers to check if a Trusted Type is required
         * for an element, and if so which Trusted Type is used.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getAttributeType}
         *
         * @example
         * console.log(trustedTypes.getAttributeType("script", "src")); // "TrustedScriptURL"
         *
         * @param tagName Name of an HTML tag.
         * @param attribute Attribute.
         * @param elementNS Element namespace, if empty defaults to the HTML namespace.
         * @param attrNS Attribute namespace, if empty defaults to null.
         * @returns One of the `"TrustedHTML"`, `"TrustedScript"`, `"TrustedScriptURL"` or `null`.
         */
        public getAttributeType(
            tagName: string,
            attribute: string,
            elementNS?: string,
            attrNS?: string,
        ): RequiredTrustedType;

        /**
         * Allows web developers to check if a Trusted Type is required for an element's property.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getPropertyType}
         *
         * @example
         * console.log(trustedTypes.getPropertyType("div", "innerHTML")); // "TrustedHTML"
         *
         * @param tagName Name of an HTML tag.
         * @param property Property.
         * @param elementNS Element namespace, if empty defaults to the HTML namespace.
         * @returns One of the `"TrustedHTML"`, `"TrustedScript"`, `"TrustedScriptURL"` or `null`.
         */
        public getPropertyType(
            tagName: string,
            property: string,
            elementNS?: string,
        ): RequiredTrustedType;

        /**
         * Checks if value is valid `TrustedHTML` object.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isHTML}
         *
         * @param value Value to check.
         * @returns True if object is valid.
         */
        public isHTML(value: unknown): boolean;

        /**
         * Checks if value is valid `TrustedScript` object.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isScript}
         *
         * @param value Value to check.
         * @returns True if object is valid.
         */
        public isScript(value: unknown): boolean;

        /**
         * Checks if value is valid `TrustedScriptURL` object.
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isScriptURL}
         *
         * @param value Value to check.
         * @returns True if object is valid.
         */
        public isScriptURL(value: unknown): boolean;
    }

    /**
     * Add Trusted Types API to Window.
     */
    interface Window {
        /**
         * `trustedTypes` is left intentionally optional to make sure that
         * people handle the case when their code is running in a browser not
         * supporting trustedTypes.
         */
        trustedTypes?: TrustedTypePolicyFactory;
    }
}

/**
 * Polyfill for Trusted Types Policy API.
 */
export interface PolicyApi {
    /**
     * Name of the policy.
     */
    readonly name: string;

    /**
     * Is Trusted Types API supported.
     */
    readonly isSupported: boolean;

    /**
     * TrustedType enum attached to PolicyApi.
     *
     * Reason why we attach it to instance because inside
     * of script and scriptlet we can't import and to not
     * pollute global env with custom variables.
     *
     * @example
     * api.policy.TrustedType.HTML // "TrustedHTML"
     */
    readonly TrustedType: typeof TrustedType;

    /**
     * Polyfill to `TrustedTypePolicy.createHTML()` method.
     * Returns input back if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createHTML}
     *
     * @param input String to be sanitized by the policy.
     * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns `TrustedHTML` if supported, `string` otherwise.
     */
    createHTML(input: string, ...args: unknown[]): string | TrustedHTML;

    /**
     * Polyfill to `TrustedTypePolicy.createScript()` method.
     * Returns input back if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createScript}
     *
     * @param input String to be sanitized by the policy.
     * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns `TrustedScript` if supported, `string` otherwise.
     */
    createScript(input: string, ...args: unknown[]): string | TrustedScript;

    /**
     * Polyfill to `TrustedTypePolicy.createScriptURL()` method.
     * Returns input back if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy/createScriptURL}
     *
     * @param input String to be sanitized by the policy.
     * @param args Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns `TrustedScriptURL` if supported, `string` otherwise.
     */
    createScriptURL(input: string, ...args: unknown[]): string | TrustedScriptURL;

    /**
     * Creates Trusted Type depending on `type`:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `value` if none of them applicable.
     *
     * @example
     * divElement.innerHTML = api.policy.create(api.policy.TrustedType.HTML, '<div></div>');
     *
     * @param type Trusted Type.
     * @param value Value from which creates Trusted Type.
     * @param createArgs Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns Created value.
     */
    create(type: TrustedType, value: string, ...createArgs: unknown[]): TrustedValue;

    /**
     * Polyfill to `window.trustedTypes.getAttributeType()` method.
     * Returns `null` if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getAttributeType}
     *
     * @example
     * console.log(api.policy.getAttributeType("script", "src")); // "TrustedScriptURL"
     *
     * @param tagName Name of an HTML tag.
     * @param attribute Attribute.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @param attrNS Attribute namespace, if empty defaults to null.
     * @returns One of the `"TrustedHTML"`, `"TrustedScript"`, `"TrustedScriptURL"` or `null`.
     */
    getAttributeType(
        tagName: string,
        attribute: string,
        elementNS?: string,
        attrNS?: string,
    ): RequiredTrustedType;

    /**
     * Converts `value` of `attribute` into one of the Trusted Types:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `value` if none of them applicable (`null`).
     *
     * @example
     * const trustedScriptURL = api.policy.convertAttributeToTrusted("script", "src", 'SOME_URL');
     * scriptElement.setAttribute("src", trustedScriptURL);
     *
     * @param tagName Name of an HTML tag.
     * @param attribute Attribute.
     * @param value Value of attribute that needs to be converted.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @param attrNS Attribute namespace, if empty defaults to null.
     * @param createArgs Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns Converted value.
     */
    convertAttributeToTrusted(
        tagName: string,
        attribute: string,
        value: string,
        elementNS?: string,
        attrNS?: string,
        ...createArgs: unknown[]
    ): TrustedValue;

    /**
     * Polyfill to `window.trustedTypes.getPropertyType()` method.
     * Returns `null` if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getPropertyType}
     *
     * @example
     * console.log(api.policy.getPropertyType("div", "innerHTML")); // "TrustedHTML"
     *
     * @param tagName Name of an HTML tag.
     * @param property Property.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @returns One of the `"TrustedHTML"`, `"TrustedScript"`, `"TrustedScriptURL"` or `null`.
     */
    getPropertyType(tagName: string, property: string, elementNS?: string): RequiredTrustedType;

    /**
     * Converts `value` of `property` into one of the Trusted Types:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `value` if none of them applicable (`null`).
     *
     * @example
     * divElement.innerHTML = api.policy.convertPropertyToTrusted("div", "innerHTML", "<div></div>");
     *
     * @param tagName Name of an HTML tag.
     * @param property Property.
     * @param value Value or property.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @param createArgs Additional arguments to be passed to the function represented by `TrustedTypePolicy`.
     * @returns Converted value.
     */
    convertPropertyToTrusted(
        tagName: string,
        property: string,
        value: string,
        elementNS?: string,
        ...createArgs: unknown[]
    ): TrustedValue;

    /**
     * Polyfill to `window.trustedTypes.isHTML()` method.
     * Returns `false` if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isHTML}
     *
     * @param value Value to check.
     * @returns True if object is valid.
     */
    isHTML(value: unknown): boolean;

    /**
     * Polyfill to `window.trustedTypes.isScript()` method.
     * Returns `false` if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isScript}
     *
     * @param value Value to check.
     * @returns True if object is valid.
     */
    isScript(value: unknown): boolean;

    /**
     * Polyfill to `window.trustedTypes.isScriptURL()` method.
     * Returns `false` if trusted types not supported.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/isScriptURL}
     *
     * @param value Value to check.
     * @returns True if object is valid.
     */
    isScriptURL(value: unknown): boolean;
}

/**
 * API for script rules.
 */
export interface Api {
    /**
     * Polyfill for Trusted Types Policy API.
     */
    policyApi: PolicyApi;

    /**
     * Shared state between different script and scriptlet rules.
     *
     * This object acts as a centralized repository for shared data.
     * - Keys represent the unique identifiers or names of the shared data.
     * - Values can be of any type and should correspond to the specific data shared across script rules.
     *
     * Example:.
     * ```adguard
     * ! Modify in one script rule
     * #%#api.shared.testKey = 'testValue'
     *
     * ! Access in another (logs 'testValue')
     * #%#console.log(api.shared.testKey)
     * ```
     */
    shared: Record<string, unknown>;
}
