import { ArbitraryObject } from '../../types/types';

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
