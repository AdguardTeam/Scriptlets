import {
    isStringMatched,
    isObjectMatched,
    isArrayMatched,
    isValueMatched,
    noopFunc,
} from '../../src/helpers';

describe('isStringMatched', () => {
    const STR = 'Hello, World!';

    test('matching with a substring', () => {
        expect(isStringMatched(STR, 'Hello')).toBeTruthy();
        expect(isStringMatched(STR, 'World')).toBeTruthy();
        expect(isStringMatched(STR, 'lo, W')).toBeTruthy();

        expect(isStringMatched(STR, 'hello')).toBeFalsy();
        expect(isStringMatched(STR, 'world')).toBeFalsy();
        expect(isStringMatched(STR, 'lo, w')).toBeFalsy();

        expect(isStringMatched(STR, null)).toBeFalsy();
        expect(isStringMatched(STR, undefined)).toBeFalsy();
        expect(isStringMatched(STR, { test: 1 })).toBeFalsy();

        // Empty string matcher is a special case
        expect(isStringMatched('', '')).toBeTruthy();
        expect(isStringMatched(STR, '')).toBeFalsy();
    });

    test('matching with regexp pattern', () => {
        expect(isStringMatched(STR, /Hello/)).toBeTruthy();
        expect(isStringMatched(STR, /World/)).toBeTruthy();
        expect(isStringMatched(STR, /lo, W/)).toBeTruthy();

        expect(isStringMatched(STR, /hello/)).toBeFalsy();
        expect(isStringMatched(STR, /world/)).toBeFalsy();
        expect(isStringMatched(STR, /lo, w/)).toBeFalsy();

        // More complex regexp patterns
        expect(isStringMatched(STR, /^Hello/)).toBeTruthy();
        expect(isStringMatched(STR, /World!$/)).toBeTruthy();
        expect(isStringMatched(STR, /Hello, World!/)).toBeTruthy();
        expect(isStringMatched(STR, /[a-zA-Z]+, [a-zA-Z]+!/)).toBeTruthy();

        expect(isStringMatched(STR, /hello/)).toBeFalsy();
        expect(isStringMatched(STR, /World$/)).toBeFalsy();
        expect(isStringMatched(STR, /Hello, World$/)).toBeFalsy();
    });
});

describe('isObjectMatched', () => {
    const OBJ = {
        str: 'Hello, World!',
        num: 42,
        bool: true,
        nil: null,
        undef: undefined,
        obj: { test: 1 },
        arr: [1, 2, 3],

        // Special cases
        empty: {},
        emptyStr: '',
        emptyArr: [],

    };

    test('simple exact matches', () => {
        expect(isObjectMatched(OBJ, { str: 'Hello, World!' })).toBeTruthy();
        expect(isObjectMatched(OBJ, { num: 42 })).toBeTruthy();
        expect(isObjectMatched(OBJ, { bool: true })).toBeTruthy();
        expect(isObjectMatched(OBJ, { nil: null })).toBeTruthy();
        expect(isObjectMatched(OBJ, { undef: undefined })).toBeTruthy();
    });

    test('simple non-matches', () => {
        expect(isObjectMatched(OBJ, { str: 'not-a-substring' })).toBeFalsy();
        expect(isObjectMatched(OBJ, { num: 43 })).toBeFalsy();
        expect(isObjectMatched(OBJ, { bool: false })).toBeFalsy();
        expect(isObjectMatched(OBJ, { nil: undefined })).toBeFalsy();
        expect(isObjectMatched(OBJ, { undef: null })).toBeFalsy();
    });

    test('test matching string values with regexp patterns', () => {
        expect(isObjectMatched(OBJ, { str: /[a-zA-Z]+, [a-zA-Z]+!/ })).toBeTruthy();
        expect(isObjectMatched(OBJ, { str: /hello/ })).toBeFalsy();
    });

    test('matching with object values', () => {
        expect(isObjectMatched(OBJ, { obj: { test: 1 } })).toBeTruthy();
        expect(isObjectMatched(OBJ, { arr: [1] })).toBeTruthy();
    });

    test('matching special cases', () => {
        expect(isObjectMatched(OBJ, { empty: {} })).toBeTruthy();
        expect(isObjectMatched(OBJ, { emptyStr: '' })).toBeTruthy();
        expect(isObjectMatched(OBJ, { emptyArr: [] })).toBeTruthy();
    });
});

describe('isArrayMatched', () => {
    const ARR = [1, '2', null, undefined, { test: 1 }, [1, 2, 3]];

    test('simple exact matches', () => {
        expect(isArrayMatched(ARR, [1, '2', null, undefined, { test: 1 }, [1, 2, 3]])).toBeTruthy();
    });

    test('simple non-matches', () => {
        expect(isArrayMatched(ARR, [])).toBeFalsy();
        expect(isArrayMatched(ARR, ['not-present-in-arr', '2', null])).toBeFalsy();
    });

    test('test matching string values with regexp patterns', () => {
        expect(isArrayMatched(ARR, [1, /2/])).toBeTruthy();
        expect(isArrayMatched(ARR, [{ test: 1 }, /3/])).toBeFalsy();
    });

    test('matching with object values', () => {
        expect(isArrayMatched(ARR, [{ test: 1 }])).toBeTruthy();
        expect(isArrayMatched(ARR, [[1, 2, 3]])).toBeTruthy();
    });

    test('matching special cases', () => {
        expect(isArrayMatched(ARR, [])).toBeFalsy();
    });
});

describe('isValueMatched', () => {
    test('matching simple values', () => {
        expect(isValueMatched('Hello, World!', 'Hello')).toBeTruthy();
        expect(isValueMatched('Hello, World!', /Hello/)).toBeTruthy();
        expect(isValueMatched(42, 42)).toBeTruthy();
        expect(isValueMatched(true, true)).toBeTruthy();
        expect(isValueMatched(null, null)).toBeTruthy();
        expect(isValueMatched(undefined, undefined)).toBeTruthy();
        expect(isValueMatched(NaN, NaN)).toBeTruthy();

        expect(isValueMatched('Hello, World!', 'hello')).toBeFalsy();
        expect(isValueMatched('Hello, World!', /hello/)).toBeFalsy();
        expect(isValueMatched(42, 43)).toBeFalsy();
        expect(isValueMatched(true, false)).toBeFalsy();
        expect(isValueMatched(null, undefined)).toBeFalsy();
        expect(isValueMatched(undefined, null)).toBeFalsy();
        expect(isValueMatched(NaN, 123)).toBeFalsy();
        expect(isValueMatched(13, NaN)).toBeFalsy();

        // Function matching is not supported
        expect(isValueMatched(noopFunc, noopFunc)).toBeFalsy();
    });

    test('matching with objects', () => {
        const obj = {
            num: 1,
            str: 'Hello, World!',
            array: [1, 2, { test: 'str' }],
            nil: null,
            undef: undefined,
            obj: { test: 1 },
        };

        expect(isValueMatched(obj, { num: 1 })).toBeTruthy();
        expect(isValueMatched(obj, { str: /Hello/ })).toBeTruthy();
        expect(isValueMatched(obj, { nil: null })).toBeTruthy();
        expect(isValueMatched(obj, { array: [1, { test: 'str' }] })).toBeTruthy();
        expect(isValueMatched(obj, { undef: undefined })).toBeTruthy();
        expect(isValueMatched(obj, { obj: { test: 1 } })).toBeTruthy();

        expect(isValueMatched(obj, { num: 2 })).toBeFalsy();
        expect(isValueMatched(obj, { str: /hello/ })).toBeFalsy();
        expect(isValueMatched(obj, { array: [1, 2, 3] })).toBeFalsy();
        expect(isValueMatched(obj, { nil: undefined })).toBeFalsy();
        expect(isValueMatched(obj, { undef: null })).toBeFalsy();
        expect(isValueMatched(obj, { obj: { test: 2 } })).toBeFalsy();

        expect(isValueMatched({}, {})).toBeTruthy();
        expect(isValueMatched({}, { test: 1 })).toBeFalsy();
    });

    test('matching with arrays', () => {
        const arr = [400, undefined, { test: 1 }, null, false, 'not-the-string'];

        expect(isValueMatched(arr, [400, { test: 1 }, null, false, 'not-the-string'])).toBeTruthy();
        expect(isValueMatched(arr, [400, undefined, { test: 1 }, undefined, 'the-string', false])).toBeTruthy();
        expect(isValueMatched(arr, [400, undefined, { test: 1 }, null])).toBeTruthy();
        expect(isValueMatched(arr, [{ test: 1 }, null, false])).toBeTruthy();
        expect(isValueMatched(arr, [{ test: 1 }, undefined, /not/])).toBeTruthy();

        expect(isValueMatched(arr, [123, 'not-the-string', false, null, { test: 1 }, undefined, 400])).toBeFalsy();
        expect(isValueMatched(arr, [true, 'not-the-string', null, { test: 1 }, undefined, 400])).toBeFalsy();
        expect(isValueMatched(arr, [/the/, false, null, { test: 'another' }, undefined, 400])).toBeFalsy();

        expect(isValueMatched([], [])).toBeTruthy();
        expect(isValueMatched([], [1])).toBeFalsy();
    });
});
