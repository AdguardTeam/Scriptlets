import {
    afterEach,
    describe,
    expect,
    test,
} from 'vitest';

import { jsonPath } from '../../src/helpers/json-path-utils';

const nativeObjects = { nativeParse: JSON.parse, nativeStringify: JSON.stringify };

/**
 * Applies a query with a name of the scriptlet, and returns the result as JSON.
 *
 * @param name Name of the scriptlet, e.g. `ubo-trusted-json-edit`.
 * @param query JSONPath query.
 * @param doc Document, which is copied.
 * @returns Result as JSON.
 */
const run = (name: string, query: string, doc: any): string => {
    const source: any = { name, args: [], verbose: false };
    return JSON.stringify(jsonPath(source, structuredClone(doc), [query], nativeObjects));
};

type FilterCase = {
    query: string;
    doc: any;
    // result of uBO's own JSONPath class, which a rule with a uBO name gets
    ubo: string;
    // result of a rule with an AdGuard name, which is not changed
    adguard: string;
};

/**
 * Filters of uBO rules, i.e. of `ubo-trusted-json-edit*` names, are evaluated as by uBO, see `#getMatchesFromExpr()`
 * of https://github.com/gorhill/uBlock/blob/master/src/js/jsonpath.js, while AdGuard rules are evaluated as before.
 * Expected values of uBO are the results of its own JSONPath class.
 */
describe('filters of uBO rules are evaluated as by uBO', () => {
    const check = (filterCase: FilterCase) => {
        expect(run('ubo-trusted-json-edit', filterCase.query, filterCase.doc)).toBe(filterCase.ubo);
        expect(run('trusted-json-set', filterCase.query, filterCase.doc)).toBe(filterCase.adguard);
    };

    // A leading filter is a step on the root, i.e. it selects the matching items of an array root,
    // and tests an object root itself, while it is a guard of the root of AdGuard rules
    test.each<FilterCase>([
        // chatgpt.com##+js(trusted-json-edit, [?.type=="ads"].visibility.status="hidden")
        {
            query: '[?.type=="ads"].visibility',
            doc: [{ type: 'ads', visibility: 1 }, { type: 'post', visibility: 2 }],
            ubo: '[{"type":"ads"},{"type":"post","visibility":2}]',
            adguard: '[{"type":"ads","visibility":1},{"type":"post","visibility":2}]',
        },
        {
            query: '[?.type=="ads"]="SET"',
            doc: [{ type: 'ads' }, { type: 'post' }],
            ubo: '["SET",{"type":"post"}]',
            adguard: '"\\"SET\\""',
        },
        {
            query: '[?.type=="ads"].x=1',
            doc: { type: 'ads', x: 0 },
            ubo: '{"type":"ads","x":1}',
            adguard: '{"type":"ads","x":1}',
        },
        {
            query: '[?.type=="ads"].x=1',
            doc: { type: 'post', x: 0 },
            ubo: '{"type":"post","x":0}',
            adguard: '{"type":"post","x":0}',
        },
        {
            query: '[?.sub[?.ad]]',
            doc: [{ sub: [{ ad: 1 }] }, { sub: [] }],
            ubo: '[{"sub":[]}]',
            adguard: '[{"sub":[{"ad":1}]},{"sub":[]}]',
        },
        // the shape of youtube.com##+js(trusted-json-edit, [?..minimumPlaybackRate==100]..playerConfig…+={…})
        {
            query: '[?..rate==100]..config+={"rate":25}',
            doc: [{ config: { a: 1 }, nested: { rate: 100 } }, { config: { a: 2 } }],
            ubo: '[{"config":{"a":1,"rate":25},"nested":{"rate":100}},{"config":{"a":2}}]',
            adguard: '[{"config":{"a":1,"rate":25},"nested":{"rate":100}},{"config":{"a":2,"rate":25}}]',
        },
    ])('B3: leading filter $query', check);

    // A recursive filter tests each descendant as a whole, also an array, and not the node from which it starts,
    // while one of AdGuard rules tests the node as well, and the items of an array instead of the array
    test.each<FilterCase>([
        {
            query: '..[?.ad]="SET"',
            doc: { ad: 1, a: { ad: 2 } },
            ubo: '{"ad":1,"a":"SET"}',
            adguard: '"\\"SET\\""',
        },
        {
            query: '..[?.ad]',
            doc: [{ ad: 1 }, { k: 1 }],
            ubo: '[{"k":1}]',
            adguard: '[{"k":1}]',
        },
        {
            query: '..[?!.x]',
            doc: { list: [1, 'a', null, { x: 1 }, {}, [1]] },
            ubo: '{}',
            adguard: '{"list":[{}]}',
        },
        {
            query: '..[?@=="ads"]="SET"',
            doc: { a: 'ads', b: ['ads', 'x'] },
            ubo: '{"a":"SET","b":["SET","x"]}',
            adguard: '{"a":"\\"SET\\"","b":["\\"SET\\"","x"]}',
        },
    ])('B4 + B8: recursive filter $query', check);

    // `!` negates the last step of the selector, for each parent which the previous steps select, so a parent
    // which does not exist or is not an object does not match, and with a comparison, a missing property neither
    test.each<FilterCase>([
        {
            query: '.list[?!.x]',
            doc: { list: [1, 'a', null, { x: 1 }, {}, [1]] },
            ubo: '{"list":[1,"a",null,{"x":1}]}',
            adguard: '{"list":[{"x":1}]}',
        },
        {
            query: '.items[?!.x=="a"]',
            doc: { items: [{ x: 'a' }, { x: 'b' }, { id: 3 }, { x: null }] },
            ubo: '{"items":[{"x":"a"},{"id":3}]}',
            adguard: '{"items":[{"x":"a"}]}',
        },
        {
            query: '.items[?!.a.x]',
            doc: { items: [{ a: { x: 1 } }, { a: {} }, {}, { a: 1 }] },
            ubo: '{"items":[{"a":{"x":1}},{},{"a":1}]}',
            adguard: '{"items":[{"a":{"x":1}}]}',
        },
        {
            query: '.items[?!.x!="a"]',
            doc: { items: [{ x: 'a' }, { x: 'b' }, { id: 3 }] },
            ubo: '{"items":[{"x":"b"},{"id":3}]}',
            adguard: '{"items":[{"x":"b"}]}',
        },
        {
            query: '.items[?!.*]',
            doc: { items: [{ a: 1 }, {}] },
            ubo: '{"items":[{"a":1},{}]}',
            adguard: '{"items":[{"a":1}]}',
        },
        // a recursive last step is negated for the node and each object below it, while AdGuard rules negate
        // the whole test, as RFC 9535 does, e.g. an item without `ad` matches `!..ad==true` there
        {
            query: '[?!..ad==true].url',
            doc: [{ url: '/watch' }, { url: '/ad', meta: { ad: true } }, { url: '/x', meta: { ad: false } }],
            ubo: '[{"url":"/watch"},{"url":"/ad","meta":{"ad":true}},{"meta":{"ad":false}}]',
            adguard: '[{"url":"/watch"},{"url":"/ad","meta":{"ad":true}},{"url":"/x","meta":{"ad":false}}]',
        },
        {
            query: '.items[?!..ad==true].url',
            doc: { items: [{ url: '/watch' }, { url: '/ad', meta: { ad: true } }] },
            ubo: '{"items":[{"url":"/watch"},{"url":"/ad","meta":{"ad":true}}]}',
            adguard: '{"items":[{},{"url":"/ad","meta":{"ad":true}}]}',
        },
        // an object below the item without `ad`, e.g. `meta`, matches, as in uBO
        {
            query: '.items[?!..ad].url',
            doc: { items: [{ url: '/watch' }, { url: '/ad', ad: 1, meta: { k: 1 } }, { url: '/b', ad: 1 }] },
            ubo: '{"items":[{},{"ad":1,"meta":{"k":1}},{"url":"/b","ad":1}]}',
            adguard: '{"items":[{},{"url":"/ad","ad":1,"meta":{"k":1}},{"url":"/b","ad":1}]}',
        },
        // a selector of the root is negated in the same way, from the root, e.g. a document without `ad` does not match
        {
            query: '[?!$..ad==true].url',
            doc: [{ url: '/watch' }],
            ubo: '[{"url":"/watch"}]',
            adguard: '[{"url":"/watch"}]',
        },
        {
            query: '[?!$..ad==true].url',
            doc: [{ url: '/watch' }, { url: '/x', ad: false }],
            ubo: '[{},{"ad":false}]',
            adguard: '[{"url":"/watch"},{"url":"/x","ad":false}]',
        },
        {
            query: '.items[?!$..ad==true].url',
            doc: { items: [{ url: '/watch' }] },
            ubo: '{"items":[{"url":"/watch"}]}',
            adguard: '{"items":[{}]}',
        },
        // a negation of the value itself is negated as a whole, also for a primitive value
        {
            query: '.list[?!@==1]',
            doc: { list: [1, 2, 'a', { x: 1 }] },
            ubo: '{"list":[1]}',
            adguard: '{"list":[1]}',
        },
    ])('B5: negation $query', check);

    // `*=` and a regular expression convert a value which is not a string, as `^=` and `$=` of all rules do
    test.each<FilterCase>([
        {
            query: '.items[?.id*="1"]',
            doc: {
                items: [
                    { id: 1 }, { id: 12 }, { id: 'x1' }, { id: true }, { id: null }, { id: { a: 1 } }, { id: [1] }, {},
                ],
            },
            ubo: '{"items":[{"id":true},{"id":null},{"id":{"a":1}},{}]}',
            adguard: '{"items":[{"id":1},{"id":12},{"id":true},{"id":null},{"id":{"a":1}},{"id":[1]},{}]}',
        },
        {
            query: '.items[?.id=/^tr/]',
            doc: { items: [{ id: true }, { id: 'tree' }, { id: 'x' }] },
            ubo: '{"items":[{"id":"x"}]}',
            adguard: '{"items":[{"id":true},{"id":"x"}]}',
        },
        {
            query: '.items[?.id*="obj"]',
            doc: { items: [{ id: { a: 1 } }, { id: 'object' }, { id: 1 }] },
            ubo: '{"items":[{"id":1}]}',
            adguard: '{"items":[{"id":{"a":1}},{"id":1}]}',
        },
    ])('B6: string operator $query', check);

    // A filter on an object tests it only if it has a key, as uBO tests it for each key, which is also the result
    // of RFC 9535, in which a filter selects children, and a filter on a primitive value matches nothing
    test.each<FilterCase>([
        {
            query: '.c[?!.ad]',
            doc: { c: {} },
            ubo: '{"c":{}}',
            adguard: '{}',
        },
        {
            query: '.c[?!.ad]',
            doc: { c: { k: 1 } },
            ubo: '{}',
            adguard: '{}',
        },
        {
            query: '.a[?@==1]',
            doc: { a: 1 },
            ubo: '{"a":1}',
            adguard: '{}',
        },
    ])('filter on an object or a primitive value $query', check);

    // Each slot of an object is tested, while its descendants are visited once, e.g. of an object which another rule
    // has set to several slots, e.g. `.items[*]={"ad":true}`, as by uBO
    test.each([
        {
            name: 'array',
            make: (o: any) => ({ items: [o, o] }),
            ubo: '{"items":[]}',
            adguard: '{"items":[]}',
        },
        {
            name: 'object',
            make: (o: any) => ({ a: o, b: o }),
            ubo: '{}',
            adguard: '{"b":{"ad":true}}',
        },
    ])('B4 + B8: one object in two slots of an $name', ({ make, ubo, adguard }) => {
        expect(run('ubo-trusted-json-edit', '..[?.ad]', make({ ad: true }))).toBe(ubo);
        expect(run('trusted-json-set', '..[?.ad]', make({ ad: true }))).toBe(adguard);
    });

    // B7 is not mirrored: uBO ignores `!` before a regular expression, so it would select the item of ads instead
    test('B7: `!` before a regular expression negates it, unlike uBO', () => {
        const doc = { items: [{ type: 'story', url: '/watch' }, { type: 'ad', url: '/ad' }] };
        expect(run('ubo-trusted-json-edit', '.items[?!.type=/^ad/].url', doc))
            .toBe('{"items":[{"type":"story"},{"type":"ad","url":"/ad"}]}');
    });

    // as B7: uBO ignores `!` before a nested filter as well, so it would select the item with an ad offer instead
    test('B7: `!` before a nested filter negates it, unlike uBO', () => {
        const doc = { items: [{ url: '/watch', offers: [{ k: 1 }] }, { url: '/b', offers: [{ ad: 1 }] }] };
        expect(run('ubo-trusted-json-edit', '.items[?!.offers[?.ad]].url', doc))
            .toBe('{"items":[{"offers":[{"k":1}]},{"url":"/b","offers":[{"ad":1}]}]}');
    });

    test('a rule which would remove the root leaves it, unlike uBO, which makes it null', () => {
        expect(run('ubo-trusted-json-edit', '[?.ad]', { ad: 1, k: 2 })).toBe('{"ad":1,"k":2}');
    });
});

describe('recursive filters of uBO rules', () => {
    afterEach(() => {
        delete (window as any).collectKey;
    });

    // eslint-disable-next-line no-template-curly-in-string
    test('`${key}` of an item of an array is its index as a number, and the method is called once, as by uBO', () => {
        const keys: any[] = [];
        (window as any).collectKey = (key: any) => {
            keys.push(key);
        };
        // eslint-disable-next-line no-template-curly-in-string
        run('ubo-trusted-json-edit', '..[?.ad]=call([null,"collectKey","${key}"])', { items: [{ ad: 1 }] });

        expect(keys).toEqual([0]);
    });

    test('items of an array are enumerated by their indexes, as by uBO, also holes, but not other properties', () => {
        const source: any = { name: 'ubo-trusted-json-edit', args: [], verbose: false };
        // a hole which a reviver leaves, which `..[?@]` matches, as `@` is any value
        const withHole = JSON.parse('[0,1]', (key, value) => (key === '0' ? undefined : value));
        expect(jsonPath(source, withHole, ['..[?@]'], nativeObjects)).toEqual([]);

        // a property of an array which is not an index, e.g. `metadata`, is not a child, and no `NaN` is set
        const list: any = [{ ad: 1 }];
        list.metadata = { ad: 2 };
        jsonPath(source, { list }, ['..[?.ad]="SET"'], nativeObjects);
        expect(Object.keys(list)).toEqual(['0', 'metadata']);
        expect(list[0]).toBe('SET');
        expect(list.metadata).toEqual({ ad: 2 });
    });

    test('a hole of an array is a missing value of a negated comparison, as in uBO', () => {
        const source: any = { name: 'ubo-trusted-json-edit', args: [], verbose: false };
        // a reviver removes the first flag of `[null, true]`, so the only flag is `true`
        const doc = JSON.parse(
            '{"items":[{"url":"/watch","flags":[null,true]}]}',
            function reviver(key, value) {
                return Array.isArray(this) && key === '0' && value === null ? undefined : value;
            },
        );
        jsonPath(source, doc, ['.items[?!.flags[*]==true].url'], nativeObjects);

        expect(doc.items[0].url).toBe('/watch');
    });

    test('a recursive negation does not visit a property of an array which is not an index, as uBO', () => {
        const source: any = { name: 'ubo-trusted-json-edit', args: [], verbose: false };
        const doc: any = [{ url: '/watch' }];
        doc.metadata = { ad: false };
        jsonPath(source, doc, ['[?!$..ad==true].url'], nativeObjects);

        expect(doc[0].url).toBe('/watch');
    });

    test('a negated filter of the root only is evaluated once, not for each item', () => {
        // tags which `*=` converts to strings, so each comparison is counted
        let comparisons = 0;
        const tag = (text: string) => ({
            toString() {
                comparisons += 1;
                return text;
            },
        });
        const doc = {
            tags: [tag('a'), tag('b')],
            items: Array.from({ length: 50 }, (unused, id) => ({ id, ad: 1 })),
        };
        const source: any = { name: 'ubo-trusted-json-edit', args: [], verbose: false };
        jsonPath(source, doc, ['.items[?!$.tags[*]*="absent"].ad'], nativeObjects);

        expect(doc.items[0]).toEqual({ id: 0 });
        expect(doc.items[49]).toEqual({ id: 49 });
        // `!` is tested for each tag, as by uBO, so the first one which does not contain the text matches,
        // once for the command, not for each item
        expect(comparisons).toBe(1);
    });
});
