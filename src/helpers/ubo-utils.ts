/**
 * Parses named options of a uBO scriptlet, which follow its positional arguments
 * as key-value pairs, e.g. `reload, 1, domain, example.org` of `trusted-set-cookie`.
 * As in uBO, a value which consists of digits only is converted to a number,
 * so e.g. `reload, 0` disables the option, and a key without a value is ignored.
 *
 * @param args Arguments of the scriptlet after its positional ones.
 *
 * @returns Options by their keys, without a prototype, so a key cannot change it.
 */
export const parseUboOptions = (args: unknown[]): Record<string, unknown> => {
    const options: Record<string, unknown> = Object.create(null);

    for (let i = 0; i + 1 < args.length; i += 2) {
        const key = args[i];
        const rawValue = args[i + 1];
        if (typeof key !== 'string' || key === '') {
            continue;
        }
        options[key] = typeof rawValue === 'string' && /^\d+$/.test(rawValue)
            ? parseInt(rawValue, 10)
            : rawValue;
    }

    return options;
};
