import { type PolicyApi } from '../content-script-api';
import { type Source } from '../scriptlets';

/**
 * Extracts `PolicyApi` from `source`,
 * if fails -> creates Trusted Types Policy,
 * if fails -> returns `null`
 *
 * @param source Scriptlet source.
 * @returns Policy or `null` if can't be extracted or created.
 */
export const extractOrCreatePolicy = (
    source: Source,
): TrustedTypePolicy | PolicyApi | null => {
    if (source.api) {
        return source.api.policyApi;
    }

    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        // The name for the trusted-types policy should only be 'AGPolicy',because corelibs can
        // allow our policy if the server has restricted the creation of a trusted-types policy with
        // the directive 'Content-Security-Policy: trusted-types <policyName>;`.
        // If such a header is presented in the server response, corelibs adds permission to create
        // the 'AGPolicy' policy with the 'allow-duplicates' option to prevent errors.
        // See AG-18204 for details.
        return window.trustedTypes.createPolicy('AGPolicy', {
            createHTML: (input) => input,
            createScript: (input) => input,
            createScriptURL: (input) => input,
        });
    }

    return null;
};

/**
 * Converts `html` string to `TrustedHTML` if supported.
 *
 * @param source Scriptlet source.
 * @param html HTML string.
 * @returns `TrustedHTML` if supported, or returns back `html`.
 */
export const createTrustedHTML = (
    source: Source,
    html: string,
): string => {
    const policy = extractOrCreatePolicy(source);
    if (policy) {
        // Casting to `string` because TrustedTypesAPI is not supported yet by `lib.dom.d.ts`.
        return policy.createHTML(html) as string;
    }

    return html;
};

/**
 * Converts `code` string to `TrustedScript` if supported.
 *
 * @param source Scriptlet source.
 * @param code Script code.
 * @returns `TrustedScript` if supported, or returns back `code`.
 */
export const createTrustedScript = (
    source: Source,
    code: string,
): string => {
    const policy = extractOrCreatePolicy(source);
    if (policy) {
        // Casting to `string` because TrustedTypesAPI is not supported yet by `lib.dom.d.ts`.
        return policy.createScript(code) as string;
    }

    return code;
};

/**
 * Converts script `url` string to `TrustedScriptURL` if supported.
 *
 * @param source Scriptlet source.
 * @param url Script URL.
 * @returns `TrustedScriptURL` if supported, or returns back `url`.
 */
export const createTrustedScriptURL = (
    source: Source,
    url: string,
): string => {
    const policy = extractOrCreatePolicy(source);
    if (policy) {
        // Casting to `string` because TrustedTypesAPI is not supported yet by `lib.dom.d.ts`.
        return policy.createScriptURL(url) as string;
    }

    return url;
};
