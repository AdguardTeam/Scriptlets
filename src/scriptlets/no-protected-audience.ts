import {
    hit,
    noopStr,
    noopFunc,
    noopResolveVoid,
    noopResolveNull,
} from '../helpers/index';

/**
 * @scriptlet no-protected-audience
 *
 * @description
 * Prevents using the Protected Audience API.
 * https://wicg.github.io/turtledove/
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('no-protected-audience')
 * ```
 *
 * v1.10.25.
 */
export function noProtectedAudience(source: Source) {
    // Prevent XMLDocuments from being tampered with generic scriptlet rule
    if (Document instanceof Object === false) {
        return;
    }

    // This is not a complete list of methods, but rather a minimal set to suppress the API
    const protectedAudienceMethods = {
        joinAdInterestGroup: noopResolveVoid,
        runAdAuction: noopResolveNull,
        leaveAdInterestGroup: noopResolveVoid,
        clearOriginJoinedAdInterestGroups: noopResolveVoid,
        createAuctionNonce: noopStr,
        updateAdInterestGroups: noopFunc,
    };

    for (const key of Object.keys(protectedAudienceMethods)) {
        /**
         * TODO Remove type castings when Protected Audience API types become available on DOM definitions.
         * https://github.com/WICG/turtledove/issues/759
         */
        const methodName = key as keyof typeof protectedAudienceMethods;
        const prototype = Navigator.prototype as unknown as Record<keyof typeof protectedAudienceMethods, Function>;

        if (!Object.prototype.hasOwnProperty.call(prototype, methodName)
            || prototype[methodName] instanceof Function === false) {
            continue;
        }

        prototype[methodName] = protectedAudienceMethods[methodName];
    }

    hit(source);
}

noProtectedAudience.names = [
    'no-protected-audience',
];

noProtectedAudience.injections = [
    hit,
    noopStr,
    noopFunc,
    noopResolveVoid,
    noopResolveNull,
];
