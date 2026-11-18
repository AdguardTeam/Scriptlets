import {
    describe,
    test,
    expect,
    vi,
    afterEach,
} from 'vitest';

import {
    buildJsonPathExpression,
    buildJsonPathQueries,
    jsonPath,
    matchesJsonPath,
    splitJsonPathQueries,
} from '../../src/helpers';
import { type Source } from '../../src/scriptlets';

/* eslint-disable no-template-curly-in-string */

const createSource = (name: string, verbose = false) => ({
    args: [],
    engine: 'test',
    name,
    verbose,
    version: '0.0.0',
} as unknown as Source);

const source = createSource('trusted-json-set');
const untrustedSource = createSource('json-prune');

const nativeObjects = {
    nativeParse: window.JSON.parse,
    nativeStringify: window.JSON.stringify,
};

/**
 * Applies an argument of JSONPath syntax to a root.
 *
 * @param path JSONPath argument.
 * @param root Root which is modified in place.
 * @param scriptletSource Source of the scriptlet.
 * @returns Result of `jsonPath()` and the number of calls of the mutation callback.
 */
const run = (path: string, root: any, scriptletSource: Source = source) => {
    let mutationCount = 0;
    const result = jsonPath(scriptletSource, root, path, nativeObjects, () => {
        mutationCount += 1;
    });
    return { result, mutationCount };
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('splitJsonPathQueries', () => {
    test.each([
        { expression: '$.ads', expected: ['$.ads'] },
        { expression: '  $.ads  ', expected: ['$.ads'] },
        { expression: '', expected: [] },
        { expression: '   ', expected: [] },
        { expression: '$.ads $..banner=false $.props.ad=1', expected: ['$.ads', '$..banner=false', '$.props.ad=1'] },
        // the first query may start without the root
        { expression: '.props.ad $.ads', expected: ['.props.ad', '$.ads'] },
        // several spaces and other whitespace
        { expression: '$.a   $.b\t$.c', expected: ['$.a', '$.b', '$.c'] },
        { expression: '[?(@.ads)]$.e $.b', expected: ['[?(@.ads)]$.e', '$.b'] },
        { expression: 'v2:$.a[?@==1] v2:$.b', expected: ['v2:$.a[?@==1]', 'v2:$.b'] },
        { expression: '..ads;$.x=1 $.y=2', expected: ['..ads;$.x=1', '$.y=2'] },
        { expression: '$={"b":1} $.a=1', expected: ['$={"b":1}', '$.a=1'] },
        // the root without a step is a part of the previous query, as before
        { expression: '$={"b":1} $+={"a":1}', expected: ['$={"b":1} $+={"a":1}'] },
        { expression: '$.price $', expected: ['$.price $'] },
        { expression: '$.. $=x', expected: ['$.. $=x'] },
    ])('$expression is split into $expected', ({ expression, expected }) => {
        expect(splitJsonPathQueries(expression)).toEqual(expected);
    });

    test.each([
        // filters, also with nested ones and logical operators
        '$.items[?(@.a && @.b || @.c)].x',
        '$.a[?(@.b == "x y")]',
        '$..contents.[?.thumbnails.[?.aiType==2]]',
        // quoted names and values, also with escaped quotes
        "$['a b'].c",
        '$["a\\" $.b"]',
        '$.a="x $.b y"',
        "$.a='x $.b'",
        // JSON values and payloads
        '$.a={"b": 1, "c": [1, 2]}',
        '$.a=[1, 2, 3]',
        '$.a=repl({"regex": "a b", "replacement": " $.c"})',
        '$.a=call([null, "fn", "${val}"])',
        // regular expressions of filters and keys
        '$.items[?.t=/a $.b/]',
        '$.items[?.t=~ /a b/]',
        '$./a b/=1',
        // spaces around the value
        '$.a = 1',
        '$.a= [1, 2]',
        '$.a +=  {"x": 1}',
        // leading guards followed by the selector
        '[?(@.ads)] $.config',
        '[?(@.a)] [?(@.b)] $.config=1',
        // `v2:` followed by the selector
        'v2: $.a',
        // values with spaces and keywords
        '$.title=Hello world',
        '$.config.consent=accepted at $now$',
        '$.t=pay $5',
        '$.a=$currentDate$ and $currentISODate$',
    ])('%s is one query', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression.trim()]);
    });

    test.each([
        // anime3rb.com#%#//scriptlet('json-prune', '[?(@.i && @.b && @.u[0]=="https://llvpn.com/tag.min.js")]$.e')
        '[?(@.i && @.b && @.u[0]=="https://llvpn.com/tag.min.js")]$.e',
        // eslint-disable-next-line max-len
        // filmweb.pl#%#//scriptlet('trusted-json-set', 'Array.prototype.filter', '$.*.[?(@.name && @.placement && (@.config.click=/smartadserver/ || @.config.items.*.linkUrl=/smartadserver/ || @.config.data.linkUrl=/smartadserver/))]', '$remove$', '', 'this')
        // eslint-disable-next-line max-len
        '$.*.[?(@.name && @.placement && (@.config.click=/smartadserver/ || @.config.items.*.linkUrl=/smartadserver/ || @.config.data.linkUrl=/smartadserver/))]',
        // eslint-disable-next-line max-len
        // map.naver.com#%#//scriptlet('trusted-json-set', 'Array.prototype.find', '$.*.item.[adClickLog, adDescription, adId, adImages]', '$remove$', '', 'this')
        '$.*.item.[adClickLog, adDescription, adId, adImages]',
        // eslint-disable-next-line max-len
        // www.youtube.com#%#//scriptlet('json-prune', '$.playerResponse[?(@.cards&&!@.playabilityStatus.miniplayer)].playerConfig.audioConfig.muteOnStart')
        '$.playerResponse[?(@.cards&&!@.playabilityStatus.miniplayer)].playerConfig.audioConfig.muteOnStart',
        // eslint-disable-next-line max-len
        // poczta.onet.pl#%#//scriptlet('trusted-json-set-fetch-response', '$[?(@.isPremium==false && displayAds && settings)].isPremium=true', '', '', 'api.poczta.onet.pl/webmail/userconfig')
        '$[?(@.isPremium==false && displayAds && settings)].isPremium=true',
        // www.redgifs.com#%#//scriptlet('ubo-json-edit', '$.gifs[?@.tags[?@=="Ai Generated"]]')
        '$.gifs[?@.tags[?@=="Ai Generated"]]',
    ])('real rule %s is one query', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test.each([
        // a dot or a bracket after a space continues the selector, as in one query before, and in uBO
        '$.a .b',
        '$.a ..b [?.c]',
        "$.a ['b c']",
        '$.a [0]',
        '$.a [?(@.x)]',
        '.a .b',
        '$..a [0] .b',
        // leading guards in a selector are its filter, also before the root after a space
        '$.a [?(@.x)] [?(@.y)].b',
        // a query after a text value has its own value, otherwise the space is a part of the value
        '$.t=see $.a',
        '$.t=a .b',
        '$.msg=Costs 5 $',
        // a query after a text value selects a node, so the root is not replaced
        '$.msg=Total: $ = 5',
        '$.t=x $=1',
        '$.t=x $+=1',
        '$.title=visit example .com',
        '$.a=1 $..c',
        // the regular expression of `replace:/regex/replacement/` is a part of the value
        '$.t=replace:/Ad .*/X/',
        '$.t=replace:/a $.b=1/c/',
        '$.t=replace:/a\\/ $.b=1/c/',
    ])('%s is one query', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test.each([
        { expression: '$.a [?(@.x)] $.b', expected: ['$.a [?(@.x)]', '$.b'] },
        // leading guards directly followed by the root start a query
        { expression: '$.a [?(@.x)]$.b', expected: ['$.a', '[?(@.x)]$.b'] },
        { expression: '$.a [?(@.x)][?(@.y)]$.b', expected: ['$.a', '[?(@.x)][?(@.y)]$.b'] },
        { expression: '$.t=see $.a=1', expected: ['$.t=see', '$.a=1'] },
        { expression: '$.t=replace:/a b/c/ $.b=1', expected: ['$.t=replace:/a b/c/', '$.b=1'] },
        // leading guards start a query after a value
        { expression: '$.t=x [?(@.a)]$.b=1', expected: ['$.t=x', '[?(@.a)]$.b=1'] },
        { expression: '$.t="x" [?(@.a)] $.b', expected: ['$.t="x"', '[?(@.a)] $.b'] },
        // a query without a value follows a structured or quoted value
        { expression: '$.a=[1] $.b', expected: ['$.a=[1]', '$.b'] },
    ])('$expression is split before the root', ({ expression, expected }) => {
        expect(splitJsonPathQueries(expression)).toEqual(expected);
    });

    test('value which is not a string has no queries', () => {
        expect(splitJsonPathQueries(undefined as unknown as string)).toEqual([]);
    });
});

describe('jsonPath with several queries', () => {
    test('removes the nodes of each query', () => {
        const root = { ads: [1], banner: { show: true }, page: { banner: 1, content: 2 } };
        const { mutationCount } = run('$.ads $..banner', root, untrustedSource);
        expect(root).toEqual({ page: { content: 2 } });
        // hit() is called once
        expect(mutationCount).toBe(1);
    });

    test('applies the queries in order, each to the result of the previous ones', () => {
        const root = { list: [1, 2], flag: false };
        run('$.list+=[3] $.list[2]=4 $.flag=true [?(@.flag==true)]$.done=true', root);
        expect(root).toEqual({ list: [1, 2, 4], flag: true });
        // `done` does not exist, so it is not created
        expect(Object.keys(root)).not.toContain('done');

        const otherRoot = { a: 1, b: 1 };
        run('$.a=2 [?(@.a==2)]$.b=3', otherRoot);
        expect(otherRoot).toEqual({ a: 2, b: 3 });
    });

    test('applies the other queries if one of them matches nothing or its guard does not match', () => {
        const root = { a: 1, b: 1 };
        const { mutationCount } = run('$.missing=1 [?(@.zz)]$.a=5 $.b=2', root);
        expect(root).toEqual({ a: 1, b: 2 });
        expect(mutationCount).toBe(1);
    });

    test('applies none of the queries if one of them is invalid', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { a: 1, b: 1 };
        const { mutationCount } = run('$.a=2 $./(/=3', root, createSource('trusted-json-set', true));
        expect(root).toEqual({ a: 1, b: 1 });
        expect(mutationCount).toBe(0);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('JSONPath processing failed'));
    });

    test('applies only the removals in a non-trusted scriptlet', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { ads: 1, a: 1 };
        run('$.ads $.a=2', root, untrustedSource);
        expect(root).toEqual({ a: 1 });
    });

    test('applies preconditions and v2: to their own query only', () => {
        const root = { flags: { ad: true, x: true }, list: [{ ad: 1 }], other: 1 };
        run('..ad{2,};$.other v2:$.flags[?@==true] $.list[?.ad]', root, untrustedSource);
        // `ad` occurs twice, so `other` is removed, and the filter of `list` tests its items
        expect(root).toEqual({ flags: {}, list: [] });
    });

    test('stops when a query has removed the root', () => {
        const target = vi.fn((holder: any) => {
            delete holder.$;
        });
        (window as any).jsonPathRemoveRoot = target;
        const { result } = run('$=call([null,"jsonPathRemoveRoot","${obj}"]) $.a=1', { a: 0 });
        expect(result).toBeNull();
        delete (window as any).jsonPathRemoveRoot;
    });

    test.each([
        'json-edit',
        'ubo-json-edit',
        'ubo-json-edit-fetch-response.js',
        'ubo-trusted-json-edit',
    ])('uBO rules of %s are not split, as uBO ignores spaces in a query', (name) => {
        // as in uBO, `.a .b` is `.a.b`
        const root = { a: { b: 1, c: 1 }, b: 2 };
        run('.a .b', root, createSource(name));
        expect(root).toEqual({ a: { c: 1 }, b: 2 });
    });

    test('rules of ubo-json-prune are split, as uBO json-prune has no JSONPath syntax', () => {
        const root = { a: { b: 1, c: 1 }, b: 2 };
        run('.a $.b', root, createSource('ubo-json-prune'));
        expect(root).toEqual({});
    });

    test('uBO rules of json-edit are one query also with the root after a space, as in uBO', () => {
        // uBO applies nothing for `.a $.b`
        const root = { a: { b: 1, c: 1 }, b: 2 };
        run('.a $.b', root, createSource('ubo-json-edit'));
        expect(root).toEqual({ a: { b: 1, c: 1 }, b: 2 });
    });

    test.each([
        { path: '$.a [?(@.x)]', root: { a: [{ x: 1 }, { y: 2 }], b: 1 }, expected: { a: [{ y: 2 }], b: 1 } },
        { path: '$.a [0]', root: { a: [1, 2, 3] }, expected: { a: [2, 3] } },
        { path: '$.a .b', root: { a: { b: 1, c: 1 }, b: 2 }, expected: { a: { c: 1 }, b: 2 } },
        { path: '$.a ..c', root: { a: { b: { c: 1 } }, c: 2 }, expected: { a: { b: {} }, c: 2 } },
        {
            path: '$.a [?(@.x)] $.b',
            root: { a: [{ x: 1 }, { y: 2 }], b: 1 },
            expected: { a: [{ y: 2 }] },
        },
    ])('removes the same nodes by $path as before, with a space in the selector', ({ path, root, expected }) => {
        run(path, root, untrustedSource);
        expect(root).toEqual(expected);
    });

    test('matchesJsonPath() matches if any of the queries matches', () => {
        const root = { a: 1 };
        expect(matchesJsonPath(source, root, '$.missing $.a', nativeObjects)).toBe(true);
        expect(matchesJsonPath(source, root, '$.missing $.other', nativeObjects)).toBe(false);
    });
});

describe('buildJsonPathQueries', () => {
    test('appends the value to each query without a value', () => {
        expect(buildJsonPathQueries('$.a $.b="1" $..c', 'false')).toEqual(['$.a=false', '$.b="1"', '$..c=false']);
        expect(buildJsonPathQueries('$.a $.b=1 $..c=2', 'false')).toEqual(['$.a=false', '$.b=1', '$..c=2']);
        expect(buildJsonPathQueries('$.a $.b', '$remove$')).toEqual(['$.a', '$.b']);
    });

    test('does not append the value to a part of a text value', () => {
        // a query after a text value has its own value
        expect(buildJsonPathQueries('$.a $.b=1 $..c', 'false')).toEqual(['$.a=false', '$.b=1 $..c']);
        expect(buildJsonPathQueries('$.title=visit example .com', '')).toEqual(['$.title=visit example .com']);
        expect(buildJsonPathQueries('$.msg=Costs 5 $', '')).toEqual(['$.msg=Costs 5 $']);
        expect(buildJsonPathQueries('$.t=replace:/Ad .*/X/', undefined)).toEqual(['$.t=replace:/Ad .*/X/']);
    });

    test('has no queries if a query has no value', () => {
        expect(buildJsonPathQueries('$.b $.a=1', undefined)).toEqual([]);
    });

    test.each([
        { path: '$.t=replace:/Ad .*/X/', value: undefined, expected: { t: 'X', com: 1 } },
        { path: '$.t=visit example .com', value: '', expected: { t: 'visit example .com', com: 1 } },
        { path: '$.t=Costs 5 $', value: '', expected: { t: 'Costs 5 $', com: 1 } },
        { path: '$.t=see $.com', value: 'false', expected: { t: 'see $.com', com: 1 } },
    ])('sets the text value of $path as before', ({ path, value, expected }) => {
        const root = { t: 'Ad here', com: 1 };
        const result = jsonPath(source, root, buildJsonPathQueries(path, value), nativeObjects);
        expect(result).toBe(root);
        expect(root).toEqual(expected);
    });

    test.each([
        'Please wait ...',
        'see $.ads',
        'a .b [?.c] v2:$.d',
        '{"a": 1} $.x',
    ])('value %s of a separate argument is never split', (value) => {
        expect(buildJsonPathQueries('$.title', value)).toEqual([`$.title=${value}`]);

        const root = {
            title: 'x', ads: 1, b: 1, x: 1,
        };
        jsonPath(source, root, buildJsonPathQueries('$.title', value), nativeObjects);
        expect(root).toEqual({
            title: value, ads: 1, b: 1, x: 1,
        });
    });

    test('builds a single query as buildJsonPathExpression() does', () => {
        expect(buildJsonPathQueries(' $.a ', 'false')).toEqual([buildJsonPathExpression(' $.a ', 'false')]);
        expect(buildJsonPathQueries('$.title=Hello world', undefined)).toEqual(['$.title=Hello world']);
        expect(buildJsonPathQueries('[?(@.ads)] $.config', '1')).toEqual(['[?(@.ads)] $.config=1']);
    });
});

describe('splitJsonPathQueries with values and guards', () => {
    test.each([
        // a text value with quotes, slashes or `=`, which are a part of it
        { expression: '$.url=/ad.js $.flag=false', expected: ['$.url=/ad.js', '$.flag=false'] },
        { expression: "$.title=Don't show ads $.flag=false", expected: ["$.title=Don't show ads", '$.flag=false'] },
        { expression: '$.token=YWQ= $.flag=false', expected: ['$.token=YWQ=', '$.flag=false'] },
        { expression: '$.u=https://a.b/?x= $.flag=false', expected: ['$.u=https://a.b/?x=', '$.flag=false'] },
        // `...` and `$` followed by a name do not start a query
        { expression: '$.t=Please wait ... $.a=1', expected: ['$.t=Please wait ...', '$.a=1'] },
        // a quoted value ends with its quote
        { expression: '$.t="see $.ads" $.a', expected: ['$.t="see $.ads"', '$.a'] },
        // a structured value ends where its brackets are closed
        { expression: '$.a={"b": "x $.c"} $.d', expected: ['$.a={"b": "x $.c"}', '$.d'] },
        { expression: '$.a=json:{"b": [1, 2]} $.d', expected: ['$.a=json:{"b": [1, 2]}', '$.d'] },
        // eslint-disable-next-line max-len
        { expression: '$.a=repl({"regex": "a b", "replacement": ""}) $.d', expected: ['$.a=repl({"regex": "a b", "replacement": ""})', '$.d'] },
        // a guard followed by a selector of the same query is complete
        { expression: '[?.enabled]["ads"] $.tracking', expected: ['[?.enabled]["ads"]', '$.tracking'] },
        { expression: '[?.enabled] $.ads $.tracking', expected: ['[?.enabled] $.ads', '$.tracking'] },
    ])('$expression is split into $expected', ({ expression, expected }) => {
        expect(splitJsonPathQueries(expression)).toEqual(expected);
    });

    test.each([
        // quotes and brackets in a regular expression of a guard
        "[?.title=/it's/] $.ads",
        '[?.title=/a]b/] $.ads',
        '[?.title=~ /x"y/] $.ads',
        // `=` inside a filter is not a value
        '[?(@.a == "x")] $.ads',
    ])('guard %s is followed by its selector', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test('failed guard does not remove the selector of its query', () => {
        const root = { title: 'news', ads: 1 };
        jsonPath(untrustedSource, root, "[?.title=/it's/] $.ads", nativeObjects);
        expect(root).toEqual({ title: 'news', ads: 1 });
    });

    test('queries with text values are applied as one by one', () => {
        const root = {
            url: 'x', title: 'x', token: 'x', flag: true,
        };
        jsonPath(source, root, "$.url=/ad.js $.title=Don't show ads $.token=YWQ= $.flag=false", nativeObjects);
        expect(root).toEqual({
            url: '/ad.js', title: "Don't show ads", token: 'YWQ=', flag: false,
        });
    });
});

describe('value `$remove$` of a query', () => {
    const createRoot = () => ({
        ads: [1, 2],
        banner: true,
        items: [{ ad: true, id: 1 }, { id: 2 }, 'text'],
        page: { banner: true, title: 't' },
        premium: false,
    });

    /**
     * Applies an argument of JSONPath syntax with a value, as `trusted-json-set` scriptlets do.
     *
     * @param path JSONPath argument.
     * @param value Value of the separate argument.
     * @param scriptletSource Source of the scriptlet.
     * @returns Modified root, the queries and the number of calls of the mutation callback.
     */
    const runWithValue = (path: string, value: any, scriptletSource: Source = source) => {
        const root = createRoot();
        const queries = buildJsonPathQueries(path, value);
        let mutationCount = 0;
        const result = jsonPath(scriptletSource, root, queries, nativeObjects, () => {
            mutationCount += 1;
        });
        return {
            mutationCount,
            queries,
            result,
            root,
        };
    };

    test.each([
        '$.ads',
        '$..banner',
        '$.items[?(@.ad)]',
        '$.items[0]',
        "$['ads','premium']",
        '$.page.*',
        '$.items[?(@.id==2)].id',
        '[?(@.premium==false)]$.ads',
        '..banner;$.ads',
        'v2:$.page[?(@==true)]',
    ])('%s=$remove$ removes the same nodes as the separate value `$remove$`', (selector) => {
        const expected = runWithValue(selector, '$remove$');
        const actual = runWithValue(`${selector}=$remove$`, undefined);
        expect(expected.root).not.toEqual(createRoot());
        expect(actual.root).toEqual(expected.root);
        expect(actual.result).toBe(actual.root);
        expect(actual.mutationCount).toBe(1);
    });

    test.each([
        { path: '$.none=$remove$', value: undefined },
        // a guard which is not matched
        { path: '[?(@.premium==true)]$.ads=$remove$', value: undefined },
        // the root is not removed, as by the separate value
        { path: '$=$remove$', value: undefined },
        { path: '$', value: '$remove$' },
    ])('$path with $value changes nothing', ({ path, value }) => {
        const { root, result, mutationCount } = runWithValue(path, value);
        expect(result).toBe(root);
        expect(root).toEqual(createRoot());
        expect(mutationCount).toBe(0);
    });

    test.each([
        // example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads=$remove$ $..banner=false')
        { path: '$.ads=$remove$ $..banner=false', value: undefined },
        { path: '$..banner=false $.ads=$remove$', value: undefined },
        // eslint-disable-next-line max-len
        // example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads=$remove$ $..banner=false', '', '', 'result', 'adManager')
        { path: '$.ads=$remove$ $..banner=false', value: '' },
        { path: '$..banner=false $.ads=$remove$', value: '' },
        { path: '$.ads= $remove$  $..banner=false', value: undefined },
        // the separate value is set by the queries without their own one, also after `$remove$`
        { path: '$.ads=$remove$ $..banner', value: 'false' },
        { path: '$..banner $.ads=$remove$', value: 'false' },
        { path: '$.ads=$remove$\t$..banner', value: 'false' },
        { path: '$.ads $..banner=false', value: '$remove$' },
    ])('$path with $value removes `ads` and sets `banner` in any order', ({ path, value }) => {
        const { root, queries, mutationCount } = runWithValue(path, value);
        expect(queries).toHaveLength(2);
        expect(root).toEqual({
            banner: false,
            items: [{ ad: true, id: 1 }, { id: 2 }, 'text'],
            page: { banner: false, title: 't' },
            premium: false,
        });
        expect(mutationCount).toBe(1);
    });

    test('expressions with `$remove$` and with text values are applied in any order', () => {
        const expected = {
            banner: true,
            items: [{ id: 2 }, 'text'],
            page: { banner: true, title: "Don't show" },
            premium: true,
        };
        expect(runWithValue("$.page.title=Don't show $.ads=$remove$ $.items[?(@.ad)]=$remove$ $.premium", 'true').root)
            .toEqual(expected);
        expect(runWithValue("$.items[?(@.ad)]=$remove$ $.premium $.ads=$remove$ $.page.title=Don't show", 'true').root)
            .toEqual(expected);
    });

    test.each([
        { path: '$.a=$remove$ $.b', expected: ['$.a=$remove$', '$.b=1'] },
        { path: '$.a= $remove$ $.b', expected: ['$.a= $remove$', '$.b=1'] },
        { path: '$.a=$remove$ [?(@.x)]$.b', expected: ['$.a=$remove$', '[?(@.x)]$.b=1'] },
        { path: '$.a=$remove$ v2:$.b', expected: ['$.a=$remove$', 'v2:$.b=1'] },
        { path: 'v2:$.a=$remove$ $.b $.c=$remove$', expected: ['v2:$.a=$remove$', '$.b=1', '$.c=$remove$'] },
        // a text which starts with `$remove$`, or has it, is a text value, as before
        { path: '$.a=$remove$ them $.b', expected: ['$.a=$remove$ them $.b'] },
        { path: '$.a=$remove$$ $.b', expected: ['$.a=$remove$$ $.b'] },
        { path: '$.a=see $remove$ $.b', expected: ['$.a=see $remove$ $.b'] },
        { path: '$.a="$remove$" $.b', expected: ['$.a="$remove$"', '$.b=1'] },
        // what follows is not a query
        { path: '$.a=$remove$ $', expected: ['$.a=$remove$ $'] },
        { path: '$.a=$remove$ .b', expected: ['$.a=$remove$ .b'] },
        // `+=` appends the text
        { path: '$.a+=$remove$ $.b', expected: ['$.a+=$remove$ $.b'] },
    ])('$path is built into $expected', ({ path, expected }) => {
        expect(buildJsonPathQueries(path, '1')).toEqual(expected);
    });

    test('has no queries if a query after `$remove$` has no value', () => {
        expect(buildJsonPathQueries('$.a=$remove$ $.b', undefined)).toEqual([]);
        expect(buildJsonPathQueries('$.a=$remove$ $.b=$remove$', undefined)).toEqual(['$.a=$remove$', '$.b=$remove$']);
    });

    test.each([
        { path: '$.ads=json:"$remove$"', expected: '$remove$' },
        { path: '$.ads="$remove$"', expected: '"$remove$"' },
        { path: "$.ads='$remove$'", expected: "'$remove$'" },
        { path: '$.ads=$remove$ them', expected: '$remove$ them' },
        { path: '$.ads=$remove$$', expected: '$remove$$' },
        { path: '$.ads+=$remove$', expected: [1, 2, '$remove$'] },
    ])('$path sets a text, as before', ({ path, expected }) => {
        const { root, mutationCount } = runWithValue(path, undefined);
        expect(root).toEqual({ ...createRoot(), ads: expected });
        expect(mutationCount).toBe(1);
    });

    test('is read by the splitter only for trusted scriptlets', () => {
        expect(splitJsonPathQueries('$.a=$remove$ $.b')).toEqual(['$.a=$remove$ $.b']);
        expect(splitJsonPathQueries('$.a=$remove$ $.b', true)).toEqual(['$.a=$remove$', '$.b']);
        expect(splitJsonPathQueries('$.a+=$remove$ $.b', true)).toEqual(['$.a+=$remove$ $.b']);
        expect(splitJsonPathQueries('$.a=false $.b', true)).toEqual(['$.a=false $.b']);
    });

    test('argument of a trusted scriptlet which is not built is split the same way', () => {
        const root = createRoot();
        const { mutationCount } = run('$.ads=$remove$ $.items', root);
        expect(root).toEqual({ banner: true, page: { banner: true, title: 't' }, premium: false });
        expect(mutationCount).toBe(1);
    });

    test.each([
        '$.ads=$remove$',
        '$.ads=$remove$ $.premium',
        '$.premium $.ads=$remove$',
    ])('%s is not applied by a scriptlet which is not trusted, as before', (path) => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = createRoot();
        const { result, mutationCount } = run(path, root, createSource('json-prune', true));
        expect(result).toBe(root);
        if (path.startsWith('$.premium')) {
            // other queries are applied, as before
            const expected: Record<string, unknown> = createRoot();
            delete expected.premium;
            expect(root).toEqual(expected);
        } else {
            expect(root).toEqual(createRoot());
            expect(mutationCount).toBe(0);
        }
        expect(logSpy.mock.calls.flat().join('\n')).toContain('allowed only in trusted scriptlets');
    });

    test('query with `$remove$` is parsed once with a cache', () => {
        const cache = Object.create(null);
        const queries = buildJsonPathQueries('$.ads=$remove$ $..banner=false', undefined);
        const parsedQueries: unknown[] = [];
        for (let i = 0; i < 3; i += 1) {
            const root = createRoot();
            jsonPath(source, root, queries, nativeObjects, undefined, '', false, cache);
            expect(root.ads).toBeUndefined();
            expect(root.page.banner).toBe(false);
            for (let k = 0; k < queries.length; k += 1) {
                if (i === 0) {
                    parsedQueries.push(cache[queries[k]]);
                } else {
                    // the same parsed queries, not parsed again
                    expect(cache[queries[k]]).toBe(parsedQueries[k]);
                }
            }
        }
        expect(Object.keys(cache)).toEqual(queries);
        parsedQueries.forEach((parsed) => expect(parsed).toBeTruthy());
    });
});
