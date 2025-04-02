import { type TrustedTypesWindow, type TrustedTypePolicyFactory, type TrustedTypePolicy } from 'trusted-types/lib';

import { type Source } from '../scriptlets';
import { type ChangeMethodReturnType } from '../../types/types';

/**
 * Type representation of return values of `getAttributeType` and
 * `getPropertyType` methods of native Trusted Types API.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getAttributeType}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/getPropertyType}
 */
export type TrustedType = 'TrustedHTML' | 'TrustedScript' | 'TrustedScriptURL';

/**
 * Type representation of Trusted Types enum.
 *
 * NOTE: This is intentionally interface not enum to prevent
 * overlapping with actual enum provided by CoreLibs.
 *
 * @see {@link TrustedType} for more information.
 */
export interface TrustedTypeEnum {
    HTML: 'TrustedHTML';
    Script: 'TrustedScript';
    ScriptURL: 'TrustedScriptURL';
}

/**
 * Get Trusted Types Policy API utility object. It performs the following steps:
 * - If `source` object provided and it has `api.policy` object, it simply returns it,
 *   because it means that API is already provided by the content script.
 * - If Trusted Types API is not supported, it returns stub object
 *   with polyfilled methods and properties.
 * - If Trusted Types API is supported, it creates policy and helpers.
 *
 * This helper useful whenever you need to deal with Trusted Types API related operations.
 *
 * @see {@link PolicyApi} for more in-depth information what methods are available.
 *
 * @param source Scriptlet source properties.
 * @returns Trusted Types Policy API utility object.
 */
export const getTrustedTypesApi = (source?: Source): PolicyApi => {
    // if API exists in the source object, return it
    const policyApi = source?.api?.policy;
    if (policyApi) {
        return policyApi;
    }

    /**
     * The name for the trusted-types policy should only be 'AGPolicy', because corelibs can
     * allow our policy if the server has restricted the creation of a trusted-types policy with
     * the directive 'Content-Security-Policy: trusted-types <policyName>;`.
     * If such a header is presented in the server response, corelibs adds permission to create
     * the 'AGPolicy' policy with the 'allow-duplicates' option to prevent errors.
     * See AG-18204 for details.
     */
    const POLICY_NAME = 'AGPolicy';

    /**
     * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/trusted-types#library-usage}
     */
    const trustedTypesWindow = window as unknown as TrustedTypesWindow;
    const trustedTypes = trustedTypesWindow.trustedTypes;
    const isSupported = !!trustedTypes;

    /**
     * In case if API doesn't exist, we should provide enum by ourselves.
     */
    const TrustedTypeEnum = {
        HTML: 'TrustedHTML',
        Script: 'TrustedScript',
        ScriptURL: 'TrustedScriptURL',
    } as const;

    // If Trusted Types API is not supported, return stub object
    if (!isSupported) {
        return {
            name: POLICY_NAME,
            isSupported,
            TrustedType: TrustedTypeEnum,
            createHTML: (input: string) => input,
            createScript: (input: string) => input,
            createScriptURL: (input: string) => input,
            create: (type: TrustedType, input: string) => input,
            getAttributeType: () => null,
            convertAttributeToTrusted: (tagName: string, attribute: string, value: string) => value,
            getPropertyType: () => null,
            convertPropertyToTrusted: (tagName: string, property: string, value: string) => value,
            isHTML: () => false,
            isScript: () => false,
            isScriptURL: () => false,
        };
    }

    // If Trusted Types API is supported, create policy and helpers
    const policy = trustedTypes.createPolicy(POLICY_NAME, {
        createHTML: (input: string) => input,
        createScript: (input: string) => input,
        createScriptURL: (input: string) => input,
    });

    // Input to Trusted Types helpers
    const createHTML = (input: string) => policy.createHTML(input) as unknown as string;
    const createScript = (input: string) => policy.createScript(input) as unknown as string;
    const createScriptURL = (input: string) => policy.createScriptURL(input) as unknown as string;
    const create = (type: TrustedType, input: string) => {
        switch (type) {
            case TrustedTypeEnum.HTML:
                return createHTML(input);
            case TrustedTypeEnum.Script:
                return createScript(input);
            case TrustedTypeEnum.ScriptURL:
                return createScriptURL(input);
            default:
                return input;
        }
    };

    // Attribute to Trusted Types helpers
    const getAttributeType = trustedTypes.getAttributeType.bind(trustedTypes);
    const convertAttributeToTrusted = (
        tagName: string,
        attribute: string,
        value: string,
        elementNS?: string,
        attrNS?: string,
    ) => {
        const type = getAttributeType(tagName, attribute, elementNS, attrNS);
        return type ? create(type as TrustedType, value) : value;
    };

    // Property to Trusted Types helpers
    const getPropertyType = trustedTypes.getPropertyType.bind(trustedTypes);
    const convertPropertyToTrusted = (
        tagName: string,
        property: string,
        value: string,
        elementNS?: string,
    ) => {
        const type = getPropertyType(tagName, property, elementNS);
        return type ? create(type as TrustedType, value) : value;
    };

    // Is value Trusted Types helpers
    const isHTML = trustedTypes.isHTML.bind(trustedTypes);
    const isScript = trustedTypes.isScript.bind(trustedTypes);
    const isScriptURL = trustedTypes.isScriptURL.bind(trustedTypes);

    return {
        name: POLICY_NAME,
        isSupported,
        TrustedType: TrustedTypeEnum,
        createHTML,
        createScript,
        createScriptURL,
        create,
        getAttributeType,
        convertAttributeToTrusted,
        getPropertyType,
        convertPropertyToTrusted,
        isHTML,
        isScript,
        isScriptURL,
    };
};

/**
 * Trusted Types Policy API utilities.
 *
 * This interface extends the native `TrustedTypePolicy` and `TrustedTypePolicyFactory`
 * to provide a more user-friendly API for working with Trusted Types. In case if
 * environment doesn't support Trusted Types API, it provides polyfilled methods
 * and properties to ensure compatibility.
 */
export interface PolicyApi extends RemappedTrustedTypePolicy, FactoryStaticMethods {
    /**
     * Is Trusted Types API supported.
     */
    isSupported: boolean;

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
    TrustedType: TrustedTypeEnum;

    /**
     * Creates Trusted Type depending on `type`:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `input` if none of them applicable.
     *
     * @example
     * divElement.innerHTML = api.policy.create(api.policy.TrustedType.HTML, '<div></div>');
     *
     * @param type Trusted Type.
     * @param input Input from which creates Trusted Type.
     * @returns Created value.
     */
    create(type: TrustedType, input: string): string;

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
     * @returns Converted value.
     */
    convertAttributeToTrusted(
        tagName: string,
        attribute: string,
        value: string,
        elementNS?: string,
        attrNS?: string,
    ): string;

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
     * @returns Converted value.
     */
    convertPropertyToTrusted(
        tagName: string,
        property: string,
        value: string,
        elementNS?: string,
    ): string;
}

/**
 * Names of "is" methods of native `TrustedTypePolicyFactory`.
 */
type IsMethodNames = 'isHTML' | 'isScript' | 'isScriptURL';

/**
 * Remapped `TrustedTypePolicyFactory` by changing return type of "is" methods to `boolean`:
 * `(value: unknown) => value is TrustedSomething` -> `(value: unknown) => boolean`.
 *
 * This is needed because Trusted Types are not supported in `lib.dom.d.ts` types.
 * For example: `TrustedScript` is not declared globally, so `isScript` method
 * will return `boolean` instead of `value is TrustedScript`.
 */
type RemappedTrustedTypePolicyFactory = ChangeMethodReturnType<TrustedTypePolicyFactory, IsMethodNames, boolean>;

/**
 * Names of static methods of native `TrustedTypePolicyFactory`.
 */
type StaticMethodNames = 'getAttributeType' | 'getPropertyType' | IsMethodNames;

/**
 * Picked static methods of native `TrustedTypePolicyFactory`.
 */
type FactoryStaticMethods = Pick<RemappedTrustedTypePolicyFactory, StaticMethodNames>;

/**
 * Names of "create" methods of native `TrustedTypePolicy`.
 */
type CreateMethodNames = 'createHTML' | 'createScript' | 'createScriptURL';

/**
 * Remapped `TrustedTypePolicy` by changing return type of "create" methods to `string`:
 * `(input: string) => TrustedSomething` -> `(input: string) => string`.
 *
 * This is needed because Trusted Types are not supported in `lib.dom.d.ts` types.
 * For example: If browser supports Trusted Types, then `eval` can
 * accept `string` or `TrustedScript`, but in `lib.dom.d.ts` types it accepts only `string`.
 */
type RemappedTrustedTypePolicy = ChangeMethodReturnType<TrustedTypePolicy, CreateMethodNames, string>;
