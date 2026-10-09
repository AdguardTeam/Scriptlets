import { type ArbitraryObject } from '../../types/types';

/**
 * Checks whether the obj is an empty object
 *
 * @param obj arbitrary object
 * @returns if object is empty
 */
export const isEmptyObject = (obj: Record<string, unknown>): boolean => {
    return Object.keys(obj).length === 0 && !obj.prototype;
};

/**
 * Safely retrieve property descriptor
 *
 * @param obj target object
 * @param  prop target property
 * @returns descriptor or null if it's not available or non-configurable
 */
export const safeGetDescriptor = (obj: PropertyDescriptorMap, prop: string): PropertyDescriptor | null => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (descriptor && descriptor.configurable) {
        return descriptor;
    }
    return null;
};

/**
 * Set getter and setter to property if it's configurable
 *
 * @param  object target object with property
 * @param property property name
 * @param descriptor contains getter and setter functions
 * @returns is operation successful
 */
export function setPropertyAccess(
    object: ArbitraryObject,
    property: string,
    descriptor: PropertyDescriptor,
): boolean {
    const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
    if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
    }
    Object.defineProperty(object, property, descriptor);
    return true;
}

/**
 * Checks whether the value is an arbitrary object
 *
 * @param value arbitrary value
 * @returns true, if value is an arbitrary object
 */
export function isArbitraryObject(value: unknown): value is ArbitraryObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof RegExp);
}

/**
 * Checks whether the value is a native promise, i.e. an instance of the native `Promise` constructor
 * or of its subclass, e.g. the one returned by `Response.prototype.json()` or by an async function.
 * Native APIs and async functions return such promises even if the page has replaced `window.Promise`.
 *
 * Promises of other implementations, e.g. of a polyfill or a library which replaces `window.Promise`,
 * like `ZoneAwarePromise` of zone.js, and other thenables, i.e. objects with a `then()` method,
 * are not detected, and the `then` property is not read, as it may be a getter of the page.
 *
 * Note that only the prototype chain is checked, so native promises of other realms, e.g. of an iframe,
 * are not detected, while an object which only inherits from `Promise.prototype` is,
 * so a native method of `Promise.prototype` called on the value may still throw.
 *
 * @param value arbitrary value
 * @param NativePromise native `Promise` constructor saved when the scriptlet runs,
 * i.e. before the page could replace `window.Promise`
 * @returns true, if value is a native promise
 */
export function isNativePromise(
    value: unknown,
    NativePromise: PromiseConstructor,
): value is Promise<unknown> {
    try {
        return value instanceof NativePromise;
    } catch {
        // e.g. a proxy which throws in its 'getPrototypeOf' trap
        return false;
    }
}

/**
 * Returns the object in which a method of `base` should be replaced to intercept the method.
 *
 * It is `base` itself, except for a storage, i.e. `localStorage` or `sessionStorage`, as assigning a property
 * of a storage stores an item in Firefox, even if the property is a method, e.g. `localStorage.setItem`,
 * so the method is not replaced, but the storage of the page is changed.
 * For a storage, `Storage.prototype` is returned, so the method is replaced for all storages,
 * and its wrapper should process only the calls whose `this` is `base`, i.e. when the returned object is not `base`.
 *
 * @param base object which has the method, e.g. `localStorage` for `localStorage.setItem`
 * @returns object in which the method should be replaced
 */
export function getMethodOwner(base: Record<string, unknown>): Record<string, unknown> {
    try {
        if (typeof Storage !== 'undefined' && base instanceof Storage) {
            return Storage.prototype as unknown as Record<string, unknown>;
        }
    } catch {
        // e.g. a proxy which throws in its 'getPrototypeOf' trap
    }

    return base;
}
