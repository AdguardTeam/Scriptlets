/**
 * @file Compatibility tables types.
 */
/**
 * Map with shared storage.
 * The idea is to avoid storing the same value multiple times in the map,
 * so the value is stored in the `shared` array and the map refers to the index in the `shared` array.
 *
 * @template K Type of the map keys.
 * @template V Type of the map values.
 */
interface MapWithSharedStorage<K extends string | number | symbol, V> {
    /**
     * Shared storage.
     */
    shared: V[];
    /**
     * Map of the values where the value is a pointer to the shared storage (refers to the index in the `shared` array).
     */
    map: Record<K, number>;
}
/**
 * Compatibility table row.
 *
 * @template T Type of the compatibility data.
 */
export type CompatibilityTableRow<T> = MapWithSharedStorage<number, T>;
/**
 * Compatibility table.
 *
 * @template T Type of the compatibility data.
 */
export type CompatibilityTable<T> = MapWithSharedStorage<string, CompatibilityTableRow<T>>;
export {};
