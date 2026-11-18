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
    getJsonPathQueries,
    jsonPath,
    splitJsonPathQueries,
    type JsonPathCache,
    matchesJsonPath,
    resolveJsonSyntaxMode,
    getJsonPathRegexpEnd,
} from '../../src/helpers';
import { type Source } from '../../src/scriptlets';

/* eslint-disable no-template-curly-in-string */

/**
 * Options of uBO JSONPath syntax which are supported in both syntaxes, as no rule used them before:
 * `^=` and `$=` filters, regular expressions of property keys, `repl({...})`, `call([...])`,
 * preconditions `;$` and `{min,max};$`, and `v2:` prefix. `${now}` is a text, as before.
 */

const source = {
    args: [],
    engine: 'test',
    name: 'trusted-json-set',
    verbose: false,
    version: '0.0.0',
} as unknown as Source;

// Errors are logged only in verbose mode
const verboseSource = {
    args: [],
    engine: 'test',
    name: 'trusted-json-set',
    verbose: true,
    version: '0.0.0',
} as unknown as Source;

const untrustedSource = {
    args: [],
    engine: 'test',
    name: 'json-prune',
    verbose: false,
    version: '0.0.0',
} as unknown as Source;

const nativeObjects = {
    nativeParse: window.JSON.parse,
    nativeStringify: window.JSON.stringify,
};

/**
 * Applies an expression to a root.
 *
 * @param path JSONPath expression.
 * @param root Root which is modified in place.
 * @param scriptletSource Source of the scriptlet.
 * @returns Result of `jsonPath()` and whether the root has been modified.
 */
const run = (path: string, root: any, scriptletSource: Source = source) => {
    let isMutated = false;
    const result = jsonPath(scriptletSource, root, path, nativeObjects, () => {
        isMutated = true;
    });
    return { result, isMutated };
};

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Removes items of an array as `jsonPath()` did before, i.e. by `splice()` for each index, from the last one,
 * which stops at the first error, e.g. of an array which refuses a change.
 *
 * @param list Array to remove items of.
 * @param indexes Indexes of the items.
 * @returns True if an item has been removed.
 */
const removeAsBefore = (list: any[], indexes: number[]): boolean => {
    let isRemoved = false;
    try {
        [...indexes].sort((left, right) => right - left).forEach((index) => {
            list.splice(index, 1);
            isRemoved = true;
        });
    } catch {
        // e.g. a sealed array
    }
    return isRemoved;
};

describe('`^=` and `$=` filters', () => {
    test('match the start and the end of a string', () => {
        // eslint-disable-next-line max-len
        // open.spotify.com##+js(trusted-json-edit-fetch-response, .state_machine.tracks.*[?.metadata.uri^="spotify:ad:"].manifest.file_urls_mp3.*.file_id=1, propsToMatch, /track-playback)
        const root = {
            state_machine: {
                tracks: [
                    { metadata: { uri: 'spotify:ad:1' }, manifest: { file_urls_mp3: [{ file_id: 'a' }] } },
                    { metadata: { uri: 'spotify:track:1' }, manifest: { file_urls_mp3: [{ file_id: 'b' }] } },
                ],
            },
        };
        const { isMutated } = run(
            '$.state_machine.tracks.*[?.metadata.uri^="spotify:ad:"].manifest.file_urls_mp3.*.file_id=1',
            root,
        );
        expect(isMutated).toBe(true);
        expect(root.state_machine.tracks[0].manifest.file_urls_mp3[0].file_id).toBe(1);
        expect(root.state_machine.tracks[1].manifest.file_urls_mp3[0].file_id).toBe('b');

        const endsRoot = { items: [{ url: 'https://a/ad.js' }, { url: 'https://a/app.js' }] };
        run('$.items[?.url$="/ad.js"]', endsRoot);
        expect(endsRoot.items).toEqual([{ url: 'https://a/app.js' }]);
    });

    test('remove nodes in non-trusted scriptlets', () => {
        // androidauthority.com##+js(json-edit, .props.pageProps.page.blocks.*[?..resource^="nc-ad"])
        const root = {
            props: {
                pageProps: {
                    page: {
                        blocks: [
                            { data: { resource: 'nc-ad-top' } },
                            { data: { resource: 'article' } },
                        ],
                    },
                },
            },
        };
        const { isMutated } = run('.props.pageProps.page.blocks.*[?..resource^="nc-ad"]', root, untrustedSource);
        expect(isMutated).toBe(true);
        expect(root.props.pageProps.page.blocks).toEqual([{ data: { resource: 'article' } }]);

        // x.ag2m2.cfd##+js(json-edit, .*[?.linkurl^="http"])
        const linksRoot = { a: { linkurl: 'https://ads.example' }, b: { linkurl: '/local' } };
        run('.*[?.linkurl^="http"]', linksRoot, untrustedSource);
        expect(linksRoot).toEqual({ b: { linkurl: '/local' } });
    });

    test('compare the value converted to a string, as in uBO', () => {
        const root = {
            items: [
                { id: 123 },
                { id: 456 },
                { id: ['ad', 'x'] },
                { id: null },
                { id: Object.create(null) },
            ],
        };
        run('$.items[?.id^=12]', root);
        expect(root.items).toHaveLength(4);
        run('$.items[?.id^="ad,"]', root);
        expect(root.items).toHaveLength(3);
        run('$.items[?.id$="ll"]', root);
        expect(root.items).toHaveLength(2);
        // an object which cannot be converted to a string is not matched
        run('$.items[?.id$="]"]', root);
        expect(root.items).toHaveLength(2);
    });

    test('missing property is not matched, also when negated', () => {
        const root = { items: [{ type: 'ad' }, {}] };
        run('$.items[?.type^="a"]', root);
        expect(root.items).toEqual([{}]);

        const negatedRoot = { items: [{ type: 'ad' }, { type: 'post' }] };
        run('$.items[?!.type^="a"]', negatedRoot);
        expect(negatedRoot.items).toEqual([{ type: 'ad' }]);
    });

    test.each([
        // `^=` and `$=` in a quoted operand are a part of it
        { path: '$.items[?.t*="^="]', expected: [{ t: 'x' }] },
        // and in a regular expression
        { path: '$.items[?.t=/^\\^=/]', expected: [{ t: 'x' }] },
        // `$==` is the root path followed by `==`
        { path: '$.items[?(@.t==$.marker)]', expected: [{ t: 'x' }] },
    ])('operator in $path is detected correctly', ({ path, expected }) => {
        const root = { marker: '^=a', items: [{ t: '^=a' }, { t: 'x' }] };
        run(path, root);
        expect(root.items).toEqual(expected);
    });

    test('matchesJsonPath() supports them', () => {
        const root = { items: [{ url: 'https://a/ad.js' }] };
        expect(matchesJsonPath(source, root, '$.items[?.url$=".js"]', nativeObjects)).toBe(true);
        expect(matchesJsonPath(source, root, '$.items[?.url^="http:"]', nativeObjects)).toBe(false);
    });
});

describe('regular expressions of property keys', () => {
    test('match keys after a dot and recursively', () => {
        const root = {
            ad_1: 1, ad_2: 2, content: 3, nested: { ad_3: 4, adx: 5 },
        };
        run('./^ad_/=0', root);
        expect(root).toEqual({
            ad_1: 0, ad_2: 0, content: 3, nested: { ad_3: 4, adx: 5 },
        });

        run('$../^ad_\\d$/', root, untrustedSource);
        expect(root).toEqual({ content: 3, nested: { adx: 5 } });
    });

    test('may contain characters which are delimiters outside of them', () => {
        const root = {
            'a.b=c': 1, 'a[1]': 2, 'x/y': 3, other: 4,
        };
        // `.` is not a path step, and an escaped `=` is not a mutation,
        // as an unescaped one is read as a value of a name, as before
        run('$./^a.b\\=c$/=0', root);
        // `[` and `]`
        run('$./^a\\[1\\]$/=0', root);
        // `\/` is a slash
        run('$./^x\\/y$/=0', root);
        expect(root).toEqual({
            'a.b=c': 0, 'a[1]': 0, 'x/y': 0, other: 4,
        });
    });

    test('may be followed by other steps and used in filters', () => {
        // eslint-disable-next-line max-len
        // www.nytimes.com##+js(trusted-json-edit-fetch-response, v2:$.param_stores.*./^interstitial_/.value.shouldShow=false, propsToMatch, /statsig/initialize?)
        const root = {
            param_stores: {
                store: {
                    interstitial_a: { value: { shouldShow: true } },
                    banner: { value: { shouldShow: true } },
                },
            },
        };
        run('$.param_stores.*./^interstitial_/.value.shouldShow=false', root);
        expect(root.param_stores.store.interstitial_a.value.shouldShow).toBe(false);
        expect(root.param_stores.store.banner.value.shouldShow).toBe(true);

        const listRoot = { items: [{ ad_slot: 1, id: 1 }, { id: 2 }], arr: { list_0: [1, 2] } };
        run('$.items[?./^ad_/]', listRoot);
        run('$./^arr$/./^list_/[0]=9', listRoot);
        expect(listRoot).toEqual({ items: [{ id: 2 }], arr: { list_0: [9, 2] } });
    });

    test('slash without a closing one is a part of a name, as before', () => {
        const root = { '/^ad': 1, ad: 1 };
        run('$./^ad=0', root);
        expect(root).toEqual({ '/^ad': 0, ad: 1 });
    });

    test('with flags is a name, as flags are not supported, as in uBO', () => {
        const root = { ad: 1, '/^ad/i': 1 };
        run('$./^ad/i=0', root);
        expect(root).toEqual({ ad: 1, '/^ad/i': 0 });
    });

    test.each([
        // invalid regular expression
        '$./(/=0',
    ])('invalid %s is not applied', (path) => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { ad: 1 };
        const { isMutated } = run(path, root, verboseSource);
        expect(isMutated).toBe(false);
        expect(root).toEqual({ ad: 1 });
        expect(logSpy).toHaveBeenCalled();
    });

    test('with an unescaped equal sign is a name with a value, as before', () => {
        // the selector already has a value, so the value of the scriptlet argument is not added, as before
        expect(buildJsonPathExpression('$./^ad=/', 'false')).toBe('$./^ad=/');
        expect(buildJsonPathExpression('$./^ad=/', undefined)).toBe('$./^ad=/');
        const root = { '/^ad': 1, ad: 1 };
        run('$./^ad=/', root);
        expect(root).toEqual({ '/^ad': '/', ad: 1 });
    });
});

describe('repl({...})', () => {
    test('replaces by a regular expression with flags', () => {
        // eslint-disable-next-line max-len
        // www.youtube.com##+js(trusted-edit-inbound-object, JSON.stringify, 0, [?.createCommentParams].context.client.userAgent=repl({"regex":"/; (adunit|channel|inline|yahi|oaeb|eafg|yaf4)\\b/","replacement":""}))
        const root = { ua: 'Mozilla; ADUNIT; adunit', n: 1 };
        run('$.ua=repl({"regex":"; adunit","flags":"gi","replacement":""})', root);
        expect(root.ua).toBe('Mozilla');

        const groupRoot = { ua: 'a-1 b-2' };
        run('$.ua=repl({"regex":"(\\\\w)-(\\\\d)","flags":"g","replacement":"$2$1"})', groupRoot);
        expect(groupRoot.ua).toBe('1a 2b');
    });

    test('uses regex as is, so slashes in it are a part of it, as in uBO', () => {
        const root = { ua: 'Mozilla; adunit', other: 'x/; adunit/' };
        run('$.ua=repl({"regex":"/; adunit/","replacement":""})', root);
        run('$.other=repl({"regex":"/; adunit/","replacement":""})', root);
        expect(root).toEqual({ ua: 'Mozilla; adunit', other: 'x' });
    });

    test('replaces the first occurrence of a text in pattern', () => {
        const root = { s: 'a.b a.b (x)' };
        run('$.s=repl({"pattern":"a.b","replacement":"c"})', root);
        expect(root.s).toBe('c a.b (x)');
        run('$.s=repl({"pattern":"(x)","replacement":"y"})', root);
        expect(root.s).toBe('c a.b y');
    });

    test('does not change a value which is not a string, nor any value with an invalid regex', () => {
        const root = { n: 1, o: { a: 1 }, s: 'ab' };
        run('$.*=repl({"regex":"a","replacement":"x"})', root);
        expect(root).toEqual({ n: 1, o: { a: 1 }, s: 'xb' });

        const invalidRoot = { s: 'ab' };
        run('$.s=repl({"regex":"(","replacement":"x"})', invalidRoot);
        expect(invalidRoot).toEqual({ s: 'ab' });
    });

    test.each([
        '$.s=repl({"replacement":"x"})',
        '$.s=repl({invalid json})',
    ])('invalid payload %s is not applied', (path) => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { s: 'ab' };
        expect(run(path, root, verboseSource).isMutated).toBe(false);
        expect(root).toEqual({ s: 'ab' });
        expect(logSpy).toHaveBeenCalled();
    });

    test('is not confused with replace({...}), which keeps its own behavior', () => {
        const root = { s: 'a/b' };
        // `replace` treats a regex in slashes as a regular expression literal
        run('$.s=replace({"regex":"/a/","replacement":"x"})', root);
        expect(root.s).toBe('x/b');
    });
});

describe('call([...])', () => {
    test('calls a method of the owner, the value or window with placeholders', () => {
        const root = { list: [1, 2, 3], config: { ad: 1 } };
        // removes the first item of each matched array
        run('$.list=call(["${val}","splice",0,1])', root);
        expect(root.list).toEqual([2, 3]);

        const target = vi.fn();
        (window as any).jsonPathCallTarget = target;
        run('$.config.ad=call([null,"jsonPathCallTarget","${key}","${val}",true])', root);
        expect(target).toHaveBeenCalledWith('ad', 1, true);
        delete (window as any).jsonPathCallTarget;

        const owner = { ad: 1, removeAd(key: string) { delete (this as any)[key]; } };
        const ownerRoot = { item: owner };
        run('$.item.ad=call(["${obj}","removeAd","${key}"])', ownerRoot);
        // the value is not assigned again, so a property which the method has removed stays removed
        expect(Object.keys(owner)).toEqual(['removeAd']);
    });

    test('calls the method for each matched node, and logs an error of one of them', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { a: [1], b: 'not an array', c: [2] };
        const { isMutated } = run('$.*=call(["${val}","pop"])', root, verboseSource);
        expect(isMutated).toBe(true);
        expect(root).toEqual({ a: [], b: 'not an array', c: [] });
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('JSONPath call failed for $.b'));
    });

    test('calls nothing without the name of a method', () => {
        const target = vi.fn();
        (window as any).jsonPathCallTarget = target;
        expect(run('$.a=call([null])', { a: 1 }).isMutated).toBe(false);
        expect(target).not.toHaveBeenCalled();
        delete (window as any).jsonPathCallTarget;
    });

    test('calls the method from the last matched node to the first one, as uBO', () => {
        const calls: unknown[] = [];
        (window as any).jsonPathCallTarget = (value: unknown) => calls.push(value);
        run('$.items.*.id=call([null,"jsonPathCallTarget","${val}"])', { items: [{ id: 1 }, { id: 2 }, { id: 3 }] });
        expect(calls).toEqual([3, 2, 1]);
        delete (window as any).jsonPathCallTarget;

        // so removing items by their index does not shift the next ones
        const root = { list: [{ ad: 1 }, { id: 2 }, { ad: 3 }] };
        run('$.list[?.ad]=call(["${obj}","splice","${key}",1])', root);
        expect(root.list).toEqual([{ id: 2 }]);
    });

    test('calls the method for each match of a node which is matched more than once, as uBO', () => {
        const target = vi.fn();
        (window as any).jsonPathCallTarget = target;
        run('$[\'a\',\'a\']=call([null,"jsonPathCallTarget","${key}"])', { a: 1 });
        run('$[/^a/,/a$/]=call([null,"jsonPathCallTarget","${key}"])', { a: 1, b: 2 });
        expect(target.mock.calls).toEqual([['a'], ['a'], ['a'], ['a']]);
        delete (window as any).jsonPathCallTarget;

        // other mutations still change such a node once
        const root = { list: [1] };
        run('$[\'list\',\'list\']+=[2]', root);
        expect(root.list).toEqual([1, 2]);
    });

    test('calls the method for the root with an object which holds it, as uBO', () => {
        const target = vi.fn();
        (window as any).jsonPathCallTarget = target;
        const root = { a: 1 };
        const { result, isMutated } = run('$=call([null,"jsonPathCallTarget","${obj}","${key}","${val}"])', root);
        expect(isMutated).toBe(true);
        expect(target).toHaveBeenCalledWith({ $: root }, '$', root);
        expect(result).toBe(root);

        // the root is replaced if the method changes it, and it is `null` if the method removes it
        (window as any).jsonPathCallTarget = (holder: any) => {
            holder.$ = { replaced: true };
        };
        expect(run('$=call([null,"jsonPathCallTarget","${obj}"])', { a: 1 }).result).toEqual({ replaced: true });
        (window as any).jsonPathCallTarget = (holder: any) => {
            delete holder.$;
        };
        expect(run('$=call([null,"jsonPathCallTarget","${obj}"])', { a: 1 }).result).toBeNull();
        delete (window as any).jsonPathCallTarget;
    });

    test('calls a method of a nested object by its path, on the object which holds it', () => {
        const player = {
            ads: { stopped: [] as unknown[], stop(id: unknown) { this.stopped.push(id); } },
        };
        (window as any).jsonPathPlayer = player;
        const root = { ad: { id: 7 } };
        const { isMutated } = run('$.ad.id=call([null,"jsonPathPlayer.ads.stop","${val}"])', root);
        expect(isMutated).toBe(true);
        // `this` is `player.ads`, so the method works
        expect(player.ads.stopped).toEqual([7]);
        delete (window as any).jsonPathPlayer;

        // a path from the matched value, e.g. a method of its prototype
        const listRoot = { list: [3, 1, 2] };
        run('$.list=call(["${val}","constructor.prototype.sort.call","${val}"])', listRoot);
        expect(listRoot.list).toEqual([1, 2, 3]);
    });

    test('calls a property whose name has dots as it is, as in uBO', () => {
        const target = vi.fn();
        (window as any)['jsonPath.callTarget'] = target;
        run('$.a=call([null,"jsonPath.callTarget","${val}"])', { a: 1 });
        expect(target).toHaveBeenCalledWith(1);
        delete (window as any)['jsonPath.callTarget'];
    });

    test.each([
        // missing object on the path
        '$.*=call([null,"jsonPathMissing.stop"])',
        // empty part
        '$.*=call([null,"console..log"])',
        '$.*=call([null,".log"])',
        // not a function
        '$.*=call([null,"location.href"])',
    ])('invalid path in %s is logged for each node', (path) => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { a: 1, b: 2 };
        expect(run(path, root, verboseSource).isMutated).toBe(false);
        expect(root).toEqual({ a: 1, b: 2 });
        const failures = logSpy.mock.calls.filter((args) => String(args.join(' ')).includes('JSONPath call failed'));
        expect(failures).toHaveLength(2);
    });

    test('is allowed only in trusted scriptlets', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { list: [1, 2] };
        run('$.list=call(["${val}","pop"])', root, untrustedSource);
        expect(root.list).toEqual([1, 2]);
    });

    test('with an invalid array payload is not applied', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { list: [1, 2] };
        expect(run('$.list=call([null,"x",])', root, verboseSource).isMutated).toBe(false);
        expect(root.list).toEqual([1, 2]);
        expect(logSpy).toHaveBeenCalled();
    });
});

describe('values of uBO syntax in other forms', () => {
    test.each([
        'call(me)',
        'call({"a":1})',
        'call()',
        'repl(x)',
        'repl(["a","x"])',
        'repl()',
        // uBO `${now}` is not supported yet, as `$now$` is the keyword of AdGuard syntax
        '${now}',
        'x-${now}',
    ])('%s is set as a text, as before', (value) => {
        const root = { a: 'x' };
        expect(run(`$.a=${value}`, root).isMutated).toBe(true);
        expect(root).toEqual({ a: value });
    });

    test('call() and repl() with spaces around a payload are payloads', () => {
        const calls: unknown[] = [];
        (window as any).jsonPathCallTarget = (value: unknown) => calls.push(value);
        const root = { a: 'ab', b: 1 };
        run('$.a=repl( {"pattern":"a","replacement":"x"} )', root);
        run('$.b=call( [null,"jsonPathCallTarget","${val}"] )', root);
        expect(root.a).toBe('xb');
        expect(calls).toEqual([1]);
        delete (window as any).jsonPathCallTarget;
    });
});

describe('preconditions `;$` and `{min,max};$`', () => {
    test('apply the command only if the selector before them matches', () => {
        const root = { flags: { ads: true }, a: 1 };
        expect(run('..ads;$.a=2', root).isMutated).toBe(true);
        expect(root.a).toBe(2);

        const otherRoot = { flags: {}, a: 1 };
        expect(run('..ads;$.a=2', otherRoot).isMutated).toBe(false);
        expect(otherRoot.a).toBe(1);
    });

    test.each([
        { range: '{2}', expected: true },
        { range: '{3}', expected: false },
        { range: '{1,2}', expected: true },
        { range: '{3,5}', expected: false },
        { range: '{2,}', expected: true },
        { range: '{3,}', expected: false },
        { range: '{,2}', expected: true },
        { range: '{,1}', expected: false },
        { range: '{0}', expected: false },
    ])('count of matches is in range $range: $expected', ({ range, expected }) => {
        const root = { list: [{ ad: 1 }, { ad: 2 }, { id: 3 }], a: 1 };
        expect(run(`$.list[?.ad]${range};$.a=2`, root).isMutated).toBe(expected);
    });

    test('zero matches can be required, and several preconditions are combined', () => {
        const root = { a: 1, b: { c: 1 } };
        expect(run('..ads{,0};$..c{1};$.a=2', root).isMutated).toBe(true);
        expect(root.a).toBe(2);
        expect(run('..ads{,0};$..zz;$.a=3', root).isMutated).toBe(false);
        expect(root.a).toBe(2);
    });

    test('precondition may start with a guard, and the command may be a removal', () => {
        const root = { type: 'player', ads: [1], other: 1 };
        run('[?.type=="player"]..ads;$.ads', root, untrustedSource);
        expect(root).toEqual({ type: 'player', other: 1 });

        const otherRoot = { type: 'feed', ads: [1] };
        run('[?.type=="player"]..ads;$.ads', otherRoot, untrustedSource);
        expect(otherRoot).toEqual({ type: 'feed', ads: [1] });
    });

    test('semicolons in quotes and brackets are not preconditions', () => {
        const root = { 'a;$b': 1, items: [{ t: 'x;$y' }] };
        run('$["a;$b"]=2', root);
        run('$.items[?.t=="x;$y"].t="z"', root);
        expect(root).toEqual({ 'a;$b': 2, items: [{ t: '"z"' }] });
    });

    test('semicolon which is not followed by $ is a part of a name, as before', () => {
        const root = {
            'a;b': 1, a: 1, b: { 'c;': 1 }, ads: 1,
        };
        run('$.a;b', root, untrustedSource);
        run('$.b.c;', root, untrustedSource);
        expect(root).toEqual({ a: 1, b: {}, ads: 1 });
        // and it is followed by a precondition
        run('$.a;b;$.ads', { 'a;b': 1, ads: 1 }, untrustedSource);
        const other = { 'a;b': 1, ads: 1 };
        run('$.a;b;$.ads', other, untrustedSource);
        expect(other).toEqual({ 'a;b': 1 });
    });

    test.each([
        // three items match the filter of the array root, as in uBO
        { path: '[?(@.ad)]{2,};$..x', expected: true },
        { path: '[?(@.ad)]{3};$..x', expected: true },
        { path: '[?.ad]{2};$..x', expected: false },
        { path: '[?(@.ad)]{,1};$..x', expected: false },
        { path: '[?(@.ad)];$..x', expected: true },
        // the second filter tests the items matched by the first one
        { path: '[?(@.ad)][?(@.x)]{2};$..x', expected: true },
        // a guard followed by a selector is matched if an item matches it, and the selector is counted
        { path: '[?(@.ad)]..x{2};$..x', expected: true },
        { path: '[?(@.zz)]..x{2};$..x', expected: false },
    ])('precondition $path with only leading filters counts their matches', ({ path, expected }) => {
        const root = [{ ad: 1, x: 1 }, { ad: 1, x: 2 }, { ad: 1 }];
        run(path, root, untrustedSource);
        expect(root.some((item) => 'x' in item)).toBe(!expected);
    });

    test('matchesJsonPath() supports them', () => {
        const root = { ads: 1, a: 1 };
        expect(matchesJsonPath(source, root, '..ads;$.a', nativeObjects)).toBe(true);
        expect(matchesJsonPath(source, root, '..ads{2};$.a', nativeObjects)).toBe(false);
    });
});

describe('v2: prefix', () => {
    test('filter tests the children of an object, not the object itself', () => {
        const root = { b: { c: 2, d: 3 } };
        run('v2:$.b[?@==2]', root, untrustedSource);
        expect(root).toEqual({ b: { d: 3 } });

        // without the prefix, the filter tests the object itself, as before
        const v1Root = { b: { c: 2, d: 3 } };
        run('$.b[?@.c==2].c', v1Root, untrustedSource);
        expect(v1Root).toEqual({ b: { d: 3 } });
    });

    test('filter tests the items of an array, as without it', () => {
        const root = { list: [{ t: 'ad' }, { t: 'x' }] };
        run('v2:$.list[?@.t=="ad"]', root, untrustedSource);
        expect(root.list).toEqual([{ t: 'x' }]);
    });

    test('leading filter selects the children of the root', () => {
        const root = { a: { type: 'ads', v: 1 }, b: { type: 'x', v: 1 } };
        run('v2:[?@.type=="ads"].v=0', root);
        expect(root).toEqual({ a: { type: 'ads', v: 0 }, b: { type: 'x', v: 1 } });
    });

    test('recursive filter tests the descendants, not the node itself', () => {
        const root = { type: 'ads', v: 1, inner: { type: 'ads', v: 1 } };
        run('v2:$..[?@.type=="ads"].v=0', root);
        expect(root).toEqual({ type: 'ads', v: 1, inner: { type: 'ads', v: 0 } });
    });

    test('applies to nested filters', () => {
        const root = { list: [{ tags: { a: 'ad', b: 'x' } }, { tags: { a: 'x' } }] };
        run('v2:$.list[?@.tags[?@=="ad"]]', root, untrustedSource);
        expect(root.list).toEqual([{ tags: { a: 'x' } }]);
    });

    test('is detected as JSONPath syntax', () => {
        expect(resolveJsonSyntaxMode('v2:$.a', '').mode).toBe('jsonpath');
        expect(buildJsonPathExpression('v2:$.a', 'false')).toBe('v2:$.a=false');
    });

    test('does not change the next expression evaluated without it', () => {
        const root = { b: { c: 2 } };
        run('v2:$.zz[?@==1]', root);
        run('$.b[?@.c==2].c', root, untrustedSource);
        expect(root).toEqual({ b: {} });
    });
});

describe('regular expressions of filters', () => {
    test.each([
        // a character class with a slash
        { path: '$.items[?@.url=/ads[/?#]/]', removed: ['ads/banner', 'ads?x'] },
        { path: '$.items[?@.url=~/^ads[/?#]/]', removed: ['ads/banner', 'ads?x'] },
        // escaped `||` is a part of it
        { path: '$.items[?@.url=/^x\\|\\|y$/]', removed: ['x||y'] },
    ])('$path is a regular expression as a whole, as before', ({ path, removed }) => {
        const root = { items: [{ url: 'ads/banner' }, { url: 'ads?x' }, { url: 'x||y' }, { url: 'news' }] };
        run(path, root, untrustedSource);
        expect(root.items.map((item) => item.url)).toEqual(
            ['ads/banner', 'ads?x', 'x||y', 'news'].filter((url) => !removed.includes(url)),
        );
    });

    test.each([
        // the operand ends at `&&`, so a slash of another operand does not close it
        {
            path: '$.items[?@.url=/ads && @.fallback=="/content"]',
            root: { items: [{ url: '/ads', fallback: '/content' }, { url: '/x', fallback: '/content' }] },
            expected: { items: [{ url: '/x', fallback: '/content' }] },
        },
        // the operand ends at the closing bracket, so a slash of the value does not close it
        {
            path: '[?@.url=/ads]$.banner=replace({"regex":"/content","replacement":"ok"})',
            root: { url: '/ads', banner: '/content x' },
            expected: { url: '/ads', banner: 'ok x' },
        },
    ])('text $path which starts with a slash is compared as a text, as before', ({ path, root, expected }) => {
        run(path, root);
        expect(root).toEqual(expected);
    });

    test('are still separated from other conditions', () => {
        // eslint-disable-next-line max-len
        // filmweb.pl#%#//scriptlet('trusted-json-set', 'Array.prototype.filter', '$.*.[?(@.name && @.placement && (@.config.click=/smartadserver/ || @.config.items.*.linkUrl=/smartadserver/ || @.config.data.linkUrl=/smartadserver/))]', '$remove$', '', 'this')
        const root = [
            { name: 1, placement: 1, config: { click: 'https://smartadserver.com' } },
            { name: 1, placement: 1, config: { items: [{ linkUrl: 'a.smartadserver' }] } },
            { name: 1, placement: 1, config: { data: { linkUrl: 'other' } } },
        ];
        // eslint-disable-next-line max-len
        run('$.*.[?(@.name && @.placement && (@.config.click=/smartadserver/ || @.config.items.*.linkUrl=/smartadserver/ || @.config.data.linkUrl=/smartadserver/))]', root);
        expect(root).toEqual([{ name: 1, placement: 1, config: { data: { linkUrl: 'other' } } }]);
    });
});

describe('review fixes', () => {
    test('`$=` with nothing before it is the root followed by `=`, as before', () => {
        // a root of a filter equals the value
        const root = { items: [1, 11, 21, 2] };
        run('$.items[?$=1]', root, untrustedSource);
        expect(root.items).toEqual([11, 21, 2]);

        // `$=` of a path ends with the value
        const pathRoot = { items: [{ u: 'a.js' }, { u: 'a.css' }] };
        run('$.items[?@.u$=".js"]', pathRoot, untrustedSource);
        expect(pathRoot.items).toEqual([{ u: 'a.css' }]);

        // `$==` is the root followed by `==`
        const strictRoot = { items: [1, 11] };
        run('$.items[?$==1]', strictRoot, untrustedSource);
        expect(strictRoot.items).toEqual([11]);
    });

    test.each([
        { range: '{,0}', withAds: false, withoutAds: true },
        { range: '{0,0}', withAds: false, withoutAds: true },
        { range: '{0}', withAds: false, withoutAds: true },
        { range: '{0,}', withAds: true, withoutAds: true },
    ])('explicit zero in $range is kept', ({ range, withAds, withoutAds }) => {
        expect(run(`..ads${range};$.flag=false`, { ads: 1, flag: true }).isMutated).toBe(withAds);
        expect(run(`..ads${range};$.flag=false`, { other: 1, flag: true }).isMutated).toBe(withoutAds);
    });

    test.each([
        { path: '$.obj[/^ad./]', expected: { ad: 2, other: 3 } },
        { path: '$.obj[/^ad=/]', expected: { adx: 1, ad: 2, other: 3 } },
        { path: '$.obj[/^AD./i]', expected: { ad: 2, other: 3 } },
        { path: '$.obj[/^ad=/,/^ot/]', expected: { adx: 1, ad: 2 } },
        { path: '$.obj[/^a/,/^ot/]', expected: {} },
    ])('regular expression in brackets $path is matched, as before', ({ path, expected }) => {
        const root = {
            obj: {
                adx: 1, ad: 2, other: 3, 'ad=': 4,
            },
        };
        run(path, root, untrustedSource);
        expect(root.obj).toEqual(expected);
    });

    test('v2: with leading filters is a complete query', () => {
        const root = { item: { ad: true }, tracking: 1 };
        run('v2:[?@.ad] $.tracking', root, untrustedSource);
        expect(root).toEqual({});
    });

    test.each([
        { path: '$.items[?@.url=/ads]', removed: '/ads' },
        { path: '$.items[?@.url=/]', removed: '/' },
        { path: '$.items[?@.url=/ads] $.other', removed: '/ads' },
    ])('slash of a text value in $path is a part of it, as before', ({ path, removed }) => {
        const root = { items: [{ url: '/ads' }, { url: '/' }, { url: '/x' }], other: 1 };
        run(path, root, untrustedSource);
        expect(root.items.map((item) => item.url)).not.toContain(removed);
        expect(root.items).toHaveLength(2);
    });
});

describe('getJsonPathRegexpEnd', () => {
    test.each([
        // regular expressions of keys, in brackets and of filters
        {
            str: '$./^ad./', index: 2, isFilterAllowed: false, expected: 7,
        },
        {
            str: '$.obj[/^ad./]', index: 6, isFilterAllowed: false, expected: 11,
        },
        {
            str: '$.obj[/a/,/b/]', index: 10, isFilterAllowed: false, expected: 12,
        },
        // the operand ends at the closing bracket, so it is a text, as before
        {
            str: '[?.t=/a]b/]', index: 5, isFilterAllowed: true, expected: -1,
        },
        {
            str: '[?.u=/ads[/?#]/]', index: 5, isFilterAllowed: true, expected: 14,
        },
        {
            str: '[?.u=/ads && @.b=="/c"]', index: 5, isFilterAllowed: true, expected: -1,
        },
        {
            str: '$./^a[/.]b/.c', index: 2, isFilterAllowed: false, expected: 10,
        },
        {
            str: '[?.t=~ /a/i]', index: 7, isFilterAllowed: true, expected: 9,
        },
        // a filter is not allowed, e.g. at the top level, where `=` starts a value
        {
            str: '$.url=/ad.js/', index: 6, isFilterAllowed: false, expected: -1,
        },
        // no closing slash, so it is a text
        {
            str: '[?@.url=/ads]', index: 8, isFilterAllowed: true, expected: -1,
        },
        {
            str: '[?@.url=/]', index: 8, isFilterAllowed: true, expected: -1,
        },
        // the whole operand is a regular expression with flags, as before
        {
            str: '[?@.u=/a/b/c]', index: 6, isFilterAllowed: true, expected: 10,
        },
        // the content of brackets
        {
            str: '/^a/,/^b/', index: 0, isFilterAllowed: true, expected: 3,
        },
        {
            str: '/^a/,/^b/', index: 5, isFilterAllowed: true, expected: 8,
        },
        // a slash which follows other characters
        {
            str: '$.a/b/', index: 3, isFilterAllowed: true, expected: -1,
        },
    ])('$str at $index is $expected', ({
        str,
        index,
        isFilterAllowed,
        expected,
    }) => {
        expect(getJsonPathRegexpEnd(str, index, isFilterAllowed)).toBe(expected);
    });
});

describe('order of recursive descent', () => {
    test('first match of a recursive selector of a comparison is the shallowest one, as before', () => {
        // `$..max` matches 10 at depth 1 first, not 1 at depth 3, which comes first depth-first
        const root = {
            a: { b: { max: 1 } },
            max: 10,
            items: [{ price: 5 }, { price: 20 }],
        };
        run('$.items[?(@.price < $..max)]', root, untrustedSource);
        expect(root.items).toEqual([{ price: 20 }]);
    });

    test('call() visits descendants depth-first, as uBO', () => {
        const calls: unknown[] = [];
        (window as any).jsonPathCallTarget = (value: unknown) => calls.push(value);
        run('$..x=call([null,"jsonPathCallTarget","${val}"])', { a: { b: { x: 1 } }, c: { x: 2 } });
        expect(calls).toEqual([2, 1]);
        delete (window as any).jsonPathCallTarget;
    });

    test('recursive filter tests primitive values as well, both depth-first and breadth-first', () => {
        const calls: unknown[] = [];
        (window as any).jsonPathCallTarget = (value: unknown) => calls.push(value);
        // depth-first, `a.c` is matched before `d`, and the method is called from the last match
        run('$..[?(@==2)]=call([null,"jsonPathCallTarget","${key}"])', { a: { c: 2 }, d: 2, e: 1 });
        expect(calls).toEqual(['d', 'c']);
        const root = { a: [1, 2, 'x'], b: { c: 2 } };
        run('$..[?(@==2)]', root, untrustedSource);
        expect(root).toEqual({ a: [1, 'x'], b: {} });
        delete (window as any).jsonPathCallTarget;
    });

    test('recursive step of other kinds matches nodes in objects and arrays', () => {
        const root = {
            a: [[1, 2], { k: 1 }], k: 0, b: { c: { k: 2 } }, s: 'k',
        };
        run('$..k', root, untrustedSource);
        run('$..[0]', root, untrustedSource);
        expect(root).toEqual({ a: [{}], b: { c: {} }, s: 'k' });
    });
});

describe('review fixes of round 4', () => {
    test('invalid regular expression of keys in a filter rejects all queries', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { a: 1, b: [{ x: 1 }] };
        expect(run('$.a $.b[?(@./a**/)]', root, { ...untrustedSource, verbose: true } as Source).isMutated)
            .toBe(false);
        expect(root).toEqual({ a: 1, b: [{ x: 1 }] });
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('JSONPath processing failed'));
    });

    test('node matched twice is updated once, by its index and by its key', () => {
        // `$..[?(@.s)]` matches the item as an item of the array and as a descendant
        const root = { list: [{ s: 'a' }], o: { s: 'b' } };
        run('$..[?(@.s)].s=replace:/(.+)/$1$1/', root);
        expect(root).toEqual({ list: [{ s: 'aa' }], o: { s: 'bb' } });
        run('$..[?(@.s)].s+=!', root);
        expect(root).toEqual({ list: [{ s: 'aa!' }], o: { s: 'bb!' } });
    });

    test('node matched twice is removed once, and other items are kept in order', () => {
        const root = {
            list: [{ ad: 1 }, { id: 1 }, { ad: 2 }, { ad: 3 }, { id: 2 }, { ad: 4 }],
        };
        const { result, isMutated } = run('$..[?(@.ad)]', root, untrustedSource);
        expect(isMutated).toBe(true);
        expect(result).toBe(root);
        expect(root).toEqual({ list: [{ id: 1 }, { id: 2 }] });
    });

    test('items removed from an array keep its holes in place, as by splice()', () => {
        // eslint-disable-next-line no-sparse-arrays
        const list = [{ ad: 1 }, , { id: 1 }];
        run('$.list[0]', { list }, untrustedSource);
        expect(list.length).toBe(2);
        expect(0 in list).toBe(false);
        expect(list[1]).toEqual({ id: 1 });
    });
});

describe('cache of parsed queries of a rule', () => {
    /**
     * Applies queries to a root with a cache.
     *
     * @param path Queries.
     * @param root Root which is modified in place.
     * @param cache Cache of the rule.
     * @param scriptletSource Source of the scriptlet.
     * @returns Result of `jsonPath()`.
     */
    const runCached = (path: string[], root: any, cache: JsonPathCache, scriptletSource: Source = source) => {
        return jsonPath(scriptletSource, root, path, nativeObjects, undefined, '', false, cache);
    };

    test('parses the selectors of each query once, and keeps them by the query', () => {
        const cache: JsonPathCache = Object.create(null);
        runCached(['$.a=1', '$.b'], { a: 0, b: 0 }, cache);
        expect(Object.keys(cache)).toEqual(['$.a=1', '$.b']);
        const parsed = cache['$.a=1'];
        runCached(['$.a=1'], { a: 0 }, cache);
        expect(cache['$.a=1']).toBe(parsed);
    });

    test('resolves time keywords for each payload', () => {
        const cache: JsonPathCache = Object.create(null);
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
            vi.setSystemTime(1000);
            const first = { t: 0 };
            runCached(['$.t=$now$'], first, cache);
            vi.setSystemTime(2000);
            const second = { t: 0 };
            runCached(['$.t=$now$'], second, cache);
            expect([first.t, second.t]).toEqual([1000, 2000]);
        } finally {
            vi.useRealTimers();
        }
    });

    test('appends a new object to each payload', () => {
        const cache: JsonPathCache = Object.create(null);
        const first = { list: [] as any[] };
        const second = { list: [] as any[] };
        runCached(['$.list+=[{"a":1}]'], first, cache);
        runCached(['$.list+=[{"a":1}]'], second, cache);
        expect(first.list).toEqual([{ a: 1 }]);
        expect(second.list).toEqual([{ a: 1 }]);
        expect(first.list[0]).not.toBe(second.list[0]);
    });

    test('matches a regular expression with g flag in each payload', () => {
        const cache: JsonPathCache = Object.create(null);
        const roots = [0, 1, 2].map(() => ({ items: [{ u: 'ad1' }, { u: 'x' }, { u: 'ad2' }] }));
        roots.forEach((root) => runCached(['$.items[?(@.u=/ad/g)]'], root, cache, untrustedSource));
        roots.forEach((root) => expect(root).toEqual({ items: [{ u: 'x' }] }));
    });

    test.each([
        '$..[?(@.ad)]',
        '$.items[?(@.u=~/^ad/i && @.n > 1)].n=0',
        '[?(@.items)]$.items[0]',
        '..ad{2,};$.items[1:]',
        'v2:$.flags[?@==true]',
        '$.items[*].u=replace:/a/b/',
    ])('gives the same results as without a cache for %s', (query) => {
        const cache: JsonPathCache = Object.create(null);
        const createRoot = () => ({
            items: [{ u: 'ad1', n: 2, ad: 1 }, { u: 'x', n: 3 }, { u: 'AD2', n: 1, ad: 2 }],
            flags: { a: true, b: false },
        });
        for (let i = 0; i < 2; i += 1) {
            const cached = createRoot();
            const uncached = createRoot();
            runCached([query], cached, cache);
            jsonPath(source, uncached, [query], nativeObjects);
            expect(cached).toEqual(uncached);
        }
    });

    test('keeps a query which cannot be parsed as invalid, so it is not parsed again', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const cache: JsonPathCache = Object.create(null);
        const root = { a: 0 };
        runCached(['$.a=1', '$./(/'], root, cache);
        expect(root).toEqual({ a: 0 });
        expect(cache['$./(/']).toBeNull();
        runCached(['$.a=1', '$./(/'], root, cache);
        expect(root).toEqual({ a: 0 });
    });

    test('applies none of the queries while a value of one of them cannot be built', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const cache: JsonPathCache = Object.create(null);
        const root = { a: 0, b: 0 };
        runCached(['$.a=1', '$.b=json:{bad'], root, cache);
        runCached(['$.a=1', '$.b=json:{bad'], root, cache);
        expect(root).toEqual({ a: 0, b: 0 });
        // its selector is kept, while its value is built again, as it may fail for another reason
        expect(cache['$.b=json:{bad']).not.toBeNull();
    });

    test('builds the value only for a value which the query matches', () => {
        const cache: JsonPathCache = Object.create(null);
        const parseSpy = vi.fn(JSON.parse);
        const objects = { nativeParse: parseSpy, nativeStringify: JSON.stringify };
        const path = ['$.a=json:{"b":1}'];
        jsonPath(source, { a: 0 }, path, objects, undefined, '', false, cache);
        parseSpy.mockClear();
        jsonPath(source, { x: 0 }, path, objects, undefined, '', false, cache);
        expect(parseSpy).not.toHaveBeenCalled();
        const root = { a: 0 };
        jsonPath(source, root, path, objects, undefined, '', false, cache);
        expect(root).toEqual({ a: { b: 1 } });
        expect(parseSpy).toHaveBeenCalled();
    });
});

describe('keys which end with `^` or `$`', () => {
    test('are compared by `=` in brackets, as `^=` and `$=` are filters', () => {
        const createRoot = () => ({ items: [{ a$: 1, 'a^': 1, a: 'x' }, { a: '21' }, { a: '12' }] });
        const bracketRoot = createRoot();
        run("$.items[?(@['a$']=1)]", bracketRoot, untrustedSource);
        expect(bracketRoot.items).toEqual([{ a: '21' }, { a: '12' }]);

        const endsWithRoot = createRoot();
        run('$.items[?(@.a$=1)]', endsWithRoot, untrustedSource);
        expect(endsWithRoot.items).toEqual([{ a$: 1, 'a^': 1, a: 'x' }, { a: '12' }]);

        const caretRoot = createRoot();
        run("$.items[?(@['a^']=1)]", caretRoot, untrustedSource);
        expect(caretRoot.items).toEqual([{ a: '21' }, { a: '12' }]);

        const startsWithRoot = createRoot();
        run('$.items[?(@.a^=1)]', startsWithRoot, untrustedSource);
        expect(startsWithRoot.items).toEqual([{ a$: 1, 'a^': 1, a: 'x' }, { a: '21' }]);
    });
});

describe('objects referenced more than once', () => {
    test('are updated once by a query', () => {
        // e.g. an argument of a method, which is not parsed from JSON
        const shared = { s: 'x' };
        run('$.*.s+=!', { a: shared, b: shared });
        expect(shared.s).toBe('x!');
    });
});

describe('review fixes of round 6', () => {
    test.each([
        { path: '$.a=replace({"regex":"x","replacement":"see $.b=1"})', value: undefined },
        { path: '$.a=replace( {"regex":"x","replacement":"see $.b=1"} )', value: undefined },
        { path: '$.a=replace:/x/see $.b=1/', value: undefined },
        { path: '$.a', value: 'replace:/x/see $.b=1/' },
    ])('replacement of $path is one value', ({ path, value }) => {
        const root = { a: 'x', b: 7 };
        jsonPath(source, root, buildJsonPathQueries(path, value), nativeObjects);
        expect(root).toEqual({ a: 'see $.b=1', b: 7 });
    });

    test('query after a replacement with its closing slash is separate', () => {
        expect(buildJsonPathQueries('$.a=replace:/x/y $.c=1/g $.b=1', undefined))
            .toEqual(['$.a=replace:/x/y $.c=1/g', '$.b=1']);
        const root = { a: 'xx', b: 7 };
        jsonPath(source, root, buildJsonPathQueries('$.a=replace:/x/y/g $.b=1', undefined), nativeObjects);
        expect(root).toEqual({ a: 'yy', b: 1 });
    });

    test.each([
        { title: 'news', expected: { title: 'news', ads: 1 } },
        { title: "it's", expected: { title: "it's" } },
    ])('guard with \\x27 in its regular expression is followed by a query, for $title', ({ title, expected }) => {
        // a raw quote makes the argument one query, see `hasQuotedRegexp()`
        expect(splitJsonPathQueries("[?.title=/it's/] $.ads $.tracking")).toHaveLength(1);
        const root = { title, ads: 1, tracking: 1 };
        run('[?.title=/it\\x27s/] $.ads $.tracking', root, untrustedSource);
        expect(root).toEqual(expected);
    });

    test.each([
        "$.items[?(@.u=/it's/)]",
        "$.items[?@.u=~/it's/]",
        '$.items[?(@.u=/a"b/ || @.u=="x")]',
    ])('regular expression with a quote in filter %s is matched', (path) => {
        const root = { items: [{ u: "it's" }, { u: 'a"b' }, { u: 'x' }, { u: 'y' }] };
        run(path, root, untrustedSource);
        expect(root.items.length).toBeLessThan(4);
        expect(root.items).toContainEqual({ u: 'y' });
    });

    test('error of the mutation callback is not thrown, and the value is modified', () => {
        const root = { ad: 1, a: 1 };
        const result = jsonPath(untrustedSource, root, '$.ad', nativeObjects, () => {
            throw new Error('page');
        });
        expect(result).toEqual({ a: 1 });
    });

    test('removes the last item without moving the other ones', () => {
        const list = [{ id: 0 }, { id: 1 }, { id: 2 }];
        const writes: PropertyKey[] = [];
        const proxy = new Proxy(list, {
            set(target, key, value) {
                writes.push(key);
                return Reflect.set(target, key, value);
            },
        });
        run('$.list[-1]', { list: proxy }, untrustedSource);
        expect(list).toEqual([{ id: 0 }, { id: 1 }]);
        // only `length` is written, as by `splice()`
        expect(writes).toEqual(['length']);
    });

    test('moves an inherited item, as splice() does', () => {
        // eslint-disable-next-line no-sparse-arrays
        const list: any[] = [{ ad: 1 }, , { id: 2 }];
        Object.setPrototypeOf(list, Object.assign(Object.create(Array.prototype), { 1: 'inherited' }));
        run('$.list[0]', { list }, untrustedSource);
        expect(list.length).toBe(2);
        expect(Object.prototype.hasOwnProperty.call(list, 0)).toBe(true);
        expect(list[0]).toBe('inherited');
        expect(list[1]).toEqual({ id: 2 });
    });

    test.each([
        { path: '$.obj./^ad/ .flag', expected: { obj: { adItem: { x: 1 }, other: { flag: 1 } } } },
        { path: '$.obj./^ad/  ..flag', expected: { obj: { adItem: { x: 1 }, other: { flag: 1 } } } },
    ])('regular expression of keys may be followed by a space, in $path', ({ path, expected }) => {
        const root = { obj: { adItem: { flag: 1, x: 1 }, other: { flag: 1 } } };
        run(path, root, untrustedSource);
        expect(root).toEqual(expected);

        const arrays = { obj: { adList: [1, 2] } };
        run('$.obj./^ad/ [0]', arrays, untrustedSource);
        expect(arrays).toEqual({ obj: { adList: [2] } });
    });

    test('uBO rule of json-edit is trimmed before v2: is detected', () => {
        const uboSource = { ...untrustedSource, name: 'ubo-json-edit' } as Source;
        const root = { a: { ad: 1 }, b: { x: 1 } };
        run(' v2:[?@.ad] ', root, uboSource);
        expect(root).toEqual({ b: { x: 1 } });
    });

    test('property reached twice by a query is deleted once', () => {
        let deleteCount = 0;
        const b = new Proxy({ ad: true, x: 1 }, {
            deleteProperty(target, key) {
                deleteCount += 1;
                return Reflect.deleteProperty(target, key);
            },
        });
        run('$..*..ad', { a: { b } }, untrustedSource);
        expect(deleteCount).toBe(1);
        expect({ ...b }).toEqual({ x: 1 });
    });

    test('matchesJsonPath() stops at the first match of the last step', () => {
        let readCount = 0;
        const items = Array.from({ length: 1000 }, (_, i) => new Proxy({ x: i + 1 }, {
            get(target, key) {
                readCount += 1;
                return Reflect.get(target, key);
            },
        }));
        expect(matchesJsonPath(untrustedSource, { items }, '$.items[?(@.x)]', nativeObjects)).toBe(true);
        expect(readCount).toBeLessThan(10);
        expect(matchesJsonPath(untrustedSource, { items }, '$.items[?(@.x > 999)]', nativeObjects)).toBe(true);
        expect(matchesJsonPath(untrustedSource, { items }, '$.items[?(@.x > 1000)]', nativeObjects)).toBe(false);
    });
});

describe('review fixes of round 7', () => {
    test.each([
        { title: "it's", expected: { title: "it's", note: "Don't show" } },
        { title: 'news', expected: { title: 'news', ads: 1, note: "Don't show" } },
    ])('guard with \\x27 is followed by a query with a quote in its value, for $title', ({ title, expected }) => {
        const path = "[?.title=/it\\x27s/] $.ads $.note=Don't show";
        expect(buildJsonPathQueries(path, '$remove$')).toEqual(['[?.title=/it\\x27s/] $.ads', "$.note=Don't show"]);
        const root = { title, ads: 1, note: 'x' };
        jsonPath(source, root, buildJsonPathQueries(path, '$remove$'), nativeObjects);
        expect(root).toEqual(expected);
    });

    test.each([
        // the argument ends with the closing slash of the replacement, so it is the value as a whole, as before
        { path: '$.a=replace:/x/path/ $.b=1/', expected: { a: 'path/ $.b=1', b: '7' } },
        { path: '$.a=replace:/x/y/ $.b=1/g', expected: { a: 'y/ $.b=1', b: '7' } },
        // and so is a replacement followed by another one, which may be `replace({...})` instead
        { path: '$.a=replace:/x/y/ $.b=replace:/7/8/', expected: { a: 'y/ $.b=replace:/7/8', b: '7' } },
        { path: '$.a=replace:/x/y/ $.b=replace({"regex":"7","replacement":"8"})', expected: { a: 'y', b: '8' } },
        // otherwise a query may follow the replacement
        { path: '$.a=replace:/x/y/ $.b=1', expected: { a: 'y', b: 1 } },
    ])('replacement of $path', ({ path, expected }) => {
        const root = { a: 'x', b: '7' };
        jsonPath(source, root, buildJsonPathQueries(path, undefined), nativeObjects);
        expect(root).toEqual(expected);
    });

    test.each([
        { trap: 'deleteProperty', indexes: [2] },
        { trap: 'deleteProperty', indexes: [0] },
        { trap: 'deleteProperty', indexes: [0, 2] },
        { trap: 'set', indexes: [0] },
        { trap: 'set', indexes: [2] },
        { trap: 'set', indexes: [0, 1] },
    ])('array which refuses $trap is changed by removal of $indexes as before', ({ trap, indexes }) => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const list = [1, 2, 3];
        const { isMutated } = run(
            `$.a[${indexes.join(',')}]`,
            { a: new Proxy(list, { [trap]: () => false }) },
            untrustedSource,
        );
        const listBefore = [1, 2, 3];
        expect(removeAsBefore(new Proxy(listBefore, { [trap]: () => false }), indexes)).toBe(isMutated);
        expect(list).toEqual(listBefore);
    });

    test('matchesJsonPath() stops at the first match of a v2: filter, as without it', () => {
        let readCount = 0;
        const items = [
            { ad: true },
            {
                get ad() {
                    readCount += 1;
                    throw new Error('page');
                },
            },
        ];
        expect(matchesJsonPath(untrustedSource, { items }, 'v2:$.items[?@.ad]', nativeObjects)).toBe(true);
        expect(matchesJsonPath(untrustedSource, { items }, '$.items[?@.ad]', nativeObjects)).toBe(true);
        expect(readCount).toBe(0);
    });
});

describe('review fixes of round 8', () => {
    test.each([
        { name: 'sealed', create: () => Object.seal(['first', 'keep', 'last']), indexes: [0, 2] },
        { name: 'sealed', create: () => Object.seal(['first', 'keep', 'last']), indexes: [0] },
        { name: 'sealed', create: () => Object.seal(['first', 'keep', 'last']), indexes: [1] },
        { name: 'frozen', create: () => Object.freeze(['first', 'keep', 'last']) as string[], indexes: [0, 2] },
    ])('$name array is changed by removal of $indexes as before', ({ create, indexes }) => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const list = create();
        const { isMutated } = run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = create();
        expect(removeAsBefore(listBefore, indexes)).toBe(isMutated);
        expect(list).toEqual(listBefore);
    });

    test('items of an array are removed and other ones are kept if the array allows it', () => {
        const list = Object.preventExtensions(['first', 'keep', 'last', 'keep too']);
        expect(run('$.a[0,2]', { a: list }, untrustedSource).isMutated).toBe(true);
        expect(list).toEqual(['keep', 'keep too']);
    });

    test('queries with guards with the same quote in their regular expressions are one query, as before', () => {
        // the quote of the first regular expression is closed by the one of the second, as `jsonPath()` reads
        // a single query, so such queries need separate rules, or another form of the quote, e.g. `\x27`
        const path = "[?.title=/it's/]$.ads [?.title=/it's/]$.tracking";
        expect(splitJsonPathQueries(path)).toEqual([path]);
        const root = { title: "it's", ads: 1, tracking: 1 };
        run(path, root, untrustedSource);
        expect(root).toEqual({ title: "it's", ads: 1, tracking: 1 });

        const otherPath = '[?.title=/it\\x27s/]$.ads [?.title=/it\\x27s/]$.tracking';
        expect(splitJsonPathQueries(otherPath).length).toBe(2);
        run(otherPath, root, untrustedSource);
        expect(root).toEqual({ title: "it's" });
    });

    test.each(['\t', '\n', ' \t '])('regular expression of keys may be followed by %j', (whitespace) => {
        const root = { obj: { adItem: { flag: 1, x: 1 }, adList: [1, 2] } };
        run(`$.obj./^ad/${whitespace}.flag`, root, untrustedSource);
        expect(root.obj.adItem).toEqual({ x: 1 });
        run(`$.obj./^adL/${whitespace}[0]`, root, untrustedSource);
        expect(root.obj.adList).toEqual([2]);
    });
});

describe('review fixes of round 9', () => {
    /**
     * Returns own properties of an array with their kinds and values.
     *
     * @param list Array.
     * @returns Description of the properties.
     */
    const describeItems = (list: any[]) => Object.getOwnPropertyNames(list).map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(list, key) as PropertyDescriptor;
        return descriptor.get ? `${key}: getter` : `${key}: ${JSON.stringify(descriptor.value)}`;
    });

    test.each([
        {
            name: 'getter without a setter',
            create: () => {
                const list: any[] = [0, 'keep', 'last'];
                Object.defineProperty(list, 0, { get: () => 'getter', configurable: true, enumerable: true });
                return list;
            },
            indexes: [0],
        },
        {
            name: 'inherited item and a read-only one',
            create: () => {
                // eslint-disable-next-line no-sparse-arrays
                const list: any[] = [{ ad: 1 }, , { id: 2 }];
                Object.setPrototypeOf(list, Object.assign(Object.create(Array.prototype), { 1: 'inherited' }));
                Object.defineProperty(list, 2, { value: { id: 2 }, writable: false, configurable: false });
                return list;
            },
            indexes: [0],
        },
        {
            name: 'inherited item',
            create: () => {
                // eslint-disable-next-line no-sparse-arrays
                const list: any[] = [{ ad: 1 }, , { id: 2 }, { ad: 3 }, { id: 4 }];
                Object.setPrototypeOf(list, Object.assign(Object.create(Array.prototype), { 1: 'inherited' }));
                return list;
            },
            indexes: [0, 3],
        },
    ])('array with $name is changed by removal of $indexes as before', ({ create, indexes }) => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const list = create();
        const { isMutated } = run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = create();
        expect(removeAsBefore(listBefore, indexes)).toBe(isMutated);
        expect(describeItems(list)).toEqual(describeItems(listBefore));
    });

    test.each([
        { size: 10, indexes: [0, 2, 4, 6, 8] },
        { size: 10, indexes: [0, 9] },
        { size: 10, indexes: [3, 4, 5] },
        { size: 10, indexes: [9, 1] },
        { size: 7, indexes: [6] },
    ])('items $indexes of $size are removed as before', ({ size, indexes }) => {
        const list = Array.from({ length: size }, (_, i) => i);
        run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = Array.from({ length: size }, (_, i) => i);
        removeAsBefore(listBefore, indexes);
        expect(list).toEqual(listBefore);
    });

    test('regular expression of a filter may contain an escaped slash before && in quotes', () => {
        const root = { items: [{ x: 'a"/&&"b' }, { x: 'c' }] };
        run('$.items[?@.x=/a"\\/&&"b/]', root, untrustedSource);
        expect(root).toEqual({ items: [{ x: 'c' }] });
    });

    test.each(['\t', '\n', ' \t'])('regular expression of a filter may follow =%j', (whitespace) => {
        // it is recognized as a regular expression with a raw quote, so the argument is one query,
        // while its quote would be read as an opening one otherwise, and the argument would be split
        const path = `[?.title=${whitespace}/it's/] $.ads $.tracking`;
        expect(splitJsonPathQueries(path)).toEqual([path]);
        const escapedPath = `[?.title=${whitespace}/it\\x27s/] $.ads $.tracking`;
        expect(splitJsonPathQueries(escapedPath)).toEqual([`[?.title=${whitespace}/it\\x27s/] $.ads`, '$.tracking']);
        const root = { title: "it's", ads: 1, tracking: 1 };
        run(escapedPath, root, untrustedSource);
        expect(root).toEqual({ title: "it's" });
    });
});

describe('review fixes of round 10', () => {
    test.each([
        { indexes: [0, 2, 4] },
        { indexes: [4, 2] },
        { indexes: [2] },
    ])('array with a read-only item is changed by removal of $indexes as before', ({ indexes }) => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const create = () => {
            const list = ['a', 'b', 'c', 'd', 'e'];
            Object.defineProperty(list, 2, {
                value: 'c', writable: false, configurable: false, enumerable: true,
            });
            return list;
        };
        const list = create();
        const { isMutated } = run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = create();
        expect(removeAsBefore(listBefore, indexes)).toBe(isMutated);
        expect(list).toEqual(listBefore);
    });

    test.each([
        { size: 5, indexes: [0, 4] },
        { size: 30, indexes: Array.from({ length: 15 }, (_, i) => i * 2) },
    ])('array with its own copyWithin is changed by removal of $indexes.length items', ({ size, indexes }) => {
        const create = () => {
            const list: any = Array.from({ length: size }, (_, i) => i);
            list.copyWithin = null;
            return list;
        };
        const list = create();
        run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = create();
        removeAsBefore(listBefore, indexes);
        expect(list).toEqual(listBefore);
    });

    test.each([
        { size: 30, indexes: Array.from({ length: 15 }, (_, i) => i * 2) },
        { size: 30, indexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 29] },
        { size: 100, indexes: Array.from({ length: 20 }, (_, i) => 99 - i * 3) },
    ])('$indexes.length items of $size are removed in one pass as before', ({ size, indexes }) => {
        const create = () => Array.from({ length: size }, (_, i) => (i % 7 === 3 ? undefined : { id: i }));
        const list = create();
        run(`$.a[${indexes.join(',')}]`, { a: list }, untrustedSource);
        const listBefore = create();
        removeAsBefore(listBefore, indexes);
        expect(list).toEqual(listBefore);
    });

    test.each([
        '$.items[?@.x=/a"/&&"b/]',
        '$.items[?@.x=/a"\\/&&"b/]',
        '$.items[?(@.x=/a"]"b/ || @.x=="c")]',
    ])('regular expression of a filter with quotes %s is read as before', (path) => {
        const root = { items: [{ x: 'a"/&&"b' }, { x: 'a"]"b' }, { x: 'c' }, { x: 'd' }] };
        run(path, root, untrustedSource);
        expect(root.items).toContainEqual({ x: 'd' });
        expect(root.items.length).toBeLessThan(4);
    });
});

describe('review fixes of round 11', () => {
    test.each(['^=', '$=', '*='])('value which cannot be converted is not matched by %s, and other items are', (op) => {
        const root = {
            items: [{ url: 'x', p: { toString: null } }, { url: 'ads', p: 'ads' }],
            tracking: 1,
        };
        run(`$.items[?@.url${op}@.p] $.tracking`, root, untrustedSource);
        expect(root).toEqual({ items: [{ url: 'x', p: { toString: null } }] });
    });

    test.each([
        // as in uBO, nothing is assigned to a value which is not a string, or with an invalid regular expression
        {
            value: 42, payload: '{"regex":"a","replacement":"X"}', sets: 0, expected: 42,
        },
        {
            value: 'abc', payload: '{"regex":"(","replacement":"X"}', sets: 0, expected: 'abc',
        },
        // and a string is assigned, also if nothing is replaced
        {
            value: 'bcd', payload: '{"regex":"a","replacement":"X"}', sets: 1, expected: 'bcd',
        },
        {
            value: 'abc', payload: '{"regex":"a","replacement":"X"}', sets: 1, expected: 'Xbc',
        },
    ])('repl() of $value with $payload calls the setter $sets times', ({
        value, payload, sets, expected,
    }) => {
        let setCount = 0;
        let current: any = value;
        const root = {};
        Object.defineProperty(root, 'x', {
            enumerable: true,
            get: () => current,
            set: (nextValue) => {
                setCount += 1;
                current = nextValue;
            },
        });
        const { isMutated } = run(`$.x=repl(${payload})`, root);
        expect(setCount).toBe(sets);
        expect(isMutated).toBe(sets > 0);
        expect(current).toBe(expected);
    });

    test('repl() of the root which is not a string changes nothing', () => {
        const root = { a: 1 };
        const { result, isMutated } = run('$=repl({"regex":"a","replacement":"X"})', root);
        expect(result).toBe(root);
        expect(isMutated).toBe(false);
    });

    test('regular expression of a filter with a quoted ] after a slash is read as before', () => {
        const root = { items: [{ x: 'a"/]"b' }, { x: 'c' }] };
        run('$.items[?@.x=/a"/]"b/]', root, untrustedSource);
        expect(root).toEqual({ items: [{ x: 'c' }] });
    });

    test('error of a query of the page does not stop the other queries', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = {
            a: {
                get b() {
                    throw new Error('page');
                },
            },
            ads: 1,
        };
        const { isMutated } = run('$.a.b.c $.ads', root, { ...untrustedSource, verbose: true } as Source);
        expect(isMutated).toBe(true);
        expect(root).not.toHaveProperty('ads');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("failed for expression '$.a.b.c'"));
    });
});

describe('review fixes of round 12', () => {
    test.each([
        '$.items[?@.x=/a"/] v2:"b/]',
        '$.items[?@.x=/a"/] $"b/]',
        '$.items[?@.x=/a"/] $x"b/]',
        "$.items[?@.x=/a'/] [x'b/]",
        // the next query would not be well-formed, e.g. with a quote which is not closed, `]` without `[`,
        // or `&&` outside a filter, so the space is a part of the regular expression
        "$.obj[/a'/] $.x'b/,'k']",
        '$.items[?@.x=/a"/] v2:b/]',
        '$.items[?@.x=/a"/] $.xb/ && @.y==1]',
        "$.items[?@.x=/'/] v2:/i && @.y==1]",
    ])('regular expression %s with a quote and a space is one query', (path) => {
        expect(splitJsonPathQueries(path)).toEqual([path]);
        // the part before the space would be a broader filter, which would remove this item
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const different = { x: `${path.slice(path.indexOf('=/') + 2, path.indexOf('=/') + 4)} different` };
        const root = { items: [different, { x: 'c' }] };
        run(path, root, untrustedSource);
        expect(root.items).toEqual([different, { x: 'c' }]);
    });

    test('regular expression with a quote and v2: in it removes only its matches, as before', () => {
        const root = { items: [{ x: 'a"/] v2:"b' }, { x: 'a" different' }, { x: 'c' }] };
        run('$.items[?@.x=/a"/] v2:"b/]', root, untrustedSource);
        expect(root.items).toEqual([{ x: 'a" different' }, { x: 'c' }]);
    });

    test('guard with a raw quote makes the argument one query, while with \\x27 it is a separate query', () => {
        expect(splitJsonPathQueries("[?.t=/it's/]$.a v2:$.c $.d")).toEqual(["[?.t=/it's/]$.a v2:$.c $.d"]);
        expect(splitJsonPathQueries("[?.t=/it's/] $.a $.note=Don't show")).toEqual([
            "[?.t=/it's/] $.a $.note=Don't show",
        ]);
        expect(splitJsonPathQueries('[?.t=/it\\x27s/]$.a v2:$.c $.d')).toEqual([
            '[?.t=/it\\x27s/]$.a',
            'v2:$.c',
            '$.d',
        ]);
        expect(splitJsonPathQueries("[?.t=/it\\x27s/] $.a $.note=Don't show")).toEqual([
            '[?.t=/it\\x27s/] $.a',
            "$.note=Don't show",
        ]);
    });

    test.each(['*=', '^=', '$='])('value to compare by %s is converted only when a value is compared, once', (op) => {
        let callCount = 0;
        const needle = {
            toString: () => {
                callCount += 1;
                return 'ad';
            },
        };
        const withoutStrings = { items: [{ url: 5, needle }, { needle }] };
        run(`$.items[?@.url${op}@.needle]`, withoutStrings, untrustedSource);
        // `^=` and `$=` convert a number to a string, as in uBO, but `*=` does not compare it
        expect(callCount).toBe(op === '*=' ? 0 : 1);

        callCount = 0;
        const withStrings = { items: [{ url: 'ad', needle }, { url: 'ad', needle }, { url: 'x', needle }] };
        run(`$.items[?@.url${op}@.needle]`, withStrings, untrustedSource);
        expect(withStrings.items).toEqual([{ url: 'x', needle }]);
        // once for each item, as the value to compare is selected for each of them
        expect(callCount).toBe(3);
    });
});

describe('review fixes of round 13', () => {
    test('removal of more than 8 items shortens the array without deleting its items one by one', () => {
        // V8 makes an array a dictionary if its items are deleted one by one, which is slow for the page,
        // while setting its length keeps it packed, as `splice()` does
        let deleteCount = 0;
        const list = Array.from({ length: 2000 }, (_, i) => ({ id: i, ad: i % 20 !== 0 }));
        const proxy = new Proxy(list, {
            deleteProperty(target, key) {
                deleteCount += 1;
                return Reflect.deleteProperty(target, key);
            },
        });
        run('$.list[?(@.ad==true)]', { list: proxy }, untrustedSource);
        expect(list.length).toBe(100);
        expect(list.every((item, i) => i in list && item.id === i * 20)).toBe(true);
        // only the last item is removed by `splice()`, which deletes it
        expect(deleteCount).toBe(1);
    });

    test('Array.isArray() of the page is called only for values with a numeric length', () => {
        const isArraySpy = vi.spyOn(Array, 'isArray');
        const root = { data: { a: 1 }, list: [{ ad: 1 }, { id: 2 }] };
        run('[?(@.data)]$.data.a', root, untrustedSource);
        expect(isArraySpy).not.toHaveBeenCalled();
        run('$.list[?(@.ad)]', root, untrustedSource);
        expect(isArraySpy).toHaveBeenCalled();
        expect(root).toEqual({ data: {}, list: [{ id: 2 }] });
    });

    test.each([
        { path: '$..[?(@==2)]', expected: { a: [1, 'x'], b: {} } },
        { path: '$..[?(!@.x)]', expected: { a: [] } },
        { path: '$..[?(!(@.x && @.y))]', expected: { a: [] } },
        { path: '$..[?(@.c==2)]', expected: { a: [1, 2, 'x'] } },
        { path: '$..[?(@.x || @==2)]', expected: { a: [1, 'x'], b: {} } },
        { path: '$..[?(@.x && @==2)]', expected: { a: [1, 2, 'x'], b: { c: 2 } } },
    ])('recursive filter $path matches primitive values which it may match, as before', ({ path, expected }) => {
        const root = { a: [1, 2, 'x'], b: { c: 2 } };
        run(path, root, untrustedSource);
        expect(root).toEqual(expected);
    });

    test.each([
        // filters which may match a primitive item
        { path: '$.a[?(@==2)]', expected: [1, 'x', null, { c: 2 }, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@=="")]', expected: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, [2]] },
        { path: '$.a[?(@^="x")]', expected: [1, 2, null, { c: 2 }, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@!=2)]', expected: [2] },
        { path: '$.a[?(!@.x)]', expected: [] },
        { path: '$.a[?(!(@.x && @.y))]', expected: [] },
        { path: '$.a[?(@.c==2 || @=="x")]', expected: [1, 2, null, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@[?(@==2)])]', expected: [1, 'x', null, { c: 2 }, { c: 3, d: 1 }, ''] },
        // the filter tests an item which is not an array itself, and the items of one which is
        { path: '$.a.*[?(@==2)]', expected: [1, 'x', null, { c: 2 }, { c: 3, d: 1 }, [], ''] },
        // filters which may not match it, so primitive items are skipped
        { path: '$.a[?(@.c==2)]', expected: [1, 2, 'x', null, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@.c)]', expected: [1, 2, 'x', null, [2], ''] },
        { path: '$.a[?(@.c!=2)]', expected: [1, 2, 'x', null, { c: 2 }, [2], ''] },
        { path: '$.a[?(@.c && @==2)]', expected: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@.c==3 && @.d)]', expected: [1, 2, 'x', null, { c: 2 }, [2], ''] },
        { path: '$.a[?(@[0]==2)]', expected: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, ''] },
        { path: '$.a[?(@.*)]', expected: [1, 2, 'x', null, ''] },
        { path: '$.a[?(@..c)]', expected: [1, 2, 'x', null, [2], ''] },
        // a property of a primitive value is not selected, e.g. `length` of a text
        { path: '$.a[?(@.length==1)]', expected: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, ''] },
        { path: '$.a[?(@.toString)]', expected: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, [2], ''] },
        { path: '$.a[?(@.c>=2)].c', expected: [1, 2, 'x', null, {}, { d: 1 }, [2], ''] },
        { path: '$.a[?(@.c==2)][?(@.c)]', expected: [1, 2, 'x', null, { c: 3, d: 1 }, [2], ''] },
    ])('filter $path of an array with primitive items matches the same items as before', ({ path, expected }) => {
        const root = { a: [1, 2, 'x', null, { c: 2 }, { c: 3, d: 1 }, [2], ''], b: { c: 2 } };
        run(path, root, untrustedSource);
        expect(root).toEqual({ a: expected, b: { c: 2 } });
    });

    test.each([
        // `=` of the regular expression is not a value of a next query
        { path: '$.items[?@.x=/a"/] v2:.flag=1"b/]', value: '$remove$' },
        // a quote outside brackets is a part of a name
        { path: "$.ads $.meta.don'tPrompt", value: '$remove$' },
        // a precondition followed by a space
        { path: '..zz; $.a', value: '$remove$' },
        // `v2:` without a selector and a text after a quoted value are a part of the value
        { path: '$.note=API v2: mode=fast', value: undefined },
        { path: '$.title="Ads" by $.sponsor', value: 'false' },
        // the root without a step
        { path: '$.price $', value: '$remove$' },
        { path: '$.. $=x', value: undefined },
    ])('$path is split as before', ({ path, value }) => {
        const queries = buildJsonPathQueries(path, value);
        const expected: Record<string, string[]> = {
            "$.ads $.meta.don'tPrompt": ['$.ads', "$.meta.don'tPrompt"],
            '$.title="Ads" by $.sponsor': ['$.title="Ads" by $.sponsor'],
        };
        expect(queries).toEqual(expected[path] || [buildJsonPathExpression(path, value)]);
    });

    test('several queries with names after the root are split without scanning the rest again from each', () => {
        // Each lookahead of the splitter is local, i.e. it scans only the next query, so splitting is linear for
        // such arguments, while a lookahead which checked each next query again from each of them would make it
        // exponential, e.g. 2 s for 22 queries in a text value. Calls of the methods which the splitter calls
        // for the characters it checks are counted, as they do not depend on the time
        const countCalls = (expression: string): number => {
            const startsWithSpy = vi.spyOn(String.prototype, 'startsWith');
            const includesSpy = vi.spyOn(String.prototype, 'includes');
            try {
                splitJsonPathQueries(expression);
                return startsWithSpy.mock.calls.length + includesSpy.mock.calls.length;
            } finally {
                startsWithSpy.mockRestore();
                includesSpy.mockRestore();
            }
        };
        const tokens = (n: number) => Array.from({ length: n }, (_, i) => `$.k${i}`).join(' ');
        expect(splitJsonPathQueries(`$.t=Tags: ${tokens(22)} (beta`)).toHaveLength(1);
        expect(splitJsonPathQueries(tokens(2000))).toHaveLength(2000);
        // about 2 times as many calls for twice as many tokens, and 4 times for a quadratic scan
        const textCalls = (n: number) => countCalls(`$.t=Tags: ${tokens(n)} (beta`);
        expect(textCalls(40) / textCalls(20)).toBeLessThan(3);
        expect(countCalls(tokens(2000)) / countCalls(tokens(1000))).toBeLessThan(3);
    });
});

describe('review fixes of round 14', () => {
    test.each([
        { path: '$..[?(@[?(@==2)])]', expected: { y: 3 } },
        { path: '$..[?(@[?(@.z)])]', expected: { x: 2, y: 3 } },
        { path: '$..[?(@[?(@==2)].z)]', expected: { x: 2, y: 3 } },
    ])('recursive filter with a nested one $path matches primitive values as before', ({ path, expected }) => {
        const root = { x: 2, y: 3 };
        run(path, root, untrustedSource);
        expect(root).toEqual(expected);
    });

    test('value which cannot be built for a reason of the page is built again for the next value', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const cache: JsonPathCache = Object.create(null);
        const getTimeSpy = vi.spyOn(Date.prototype, 'getTime').mockImplementation(() => {
            throw new Error('page');
        });
        const first = { stamp: 0 };
        jsonPath(source, first, ['$.stamp=$now$'], nativeObjects, undefined, '', false, cache);
        expect(first).toEqual({ stamp: 0 });

        getTimeSpy.mockRestore();
        const second = { stamp: 0 };
        jsonPath(source, second, ['$.stamp=$now$'], nativeObjects, undefined, '', false, cache);
        expect(second.stamp).toBeGreaterThan(0);
    });

    test('value of a later query which cannot be built does not mark the others as built', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const cache: JsonPathCache = Object.create(null);
        const root = { a: 0, b: 0 };
        jsonPath(source, root, ['$.a=1', '$.b=json:{bad'], nativeObjects, undefined, '', false, cache);
        expect(cache['$.a=1']?.isValueChecked).toBe(false);
        expect(root).toEqual({ a: 0, b: 0 });
    });

    test('text value with many query starts is split in linear time', () => {
        // the number of `startsWith()` calls doubles for twice as many tokens, instead of growing four times
        const countCalls = (count: number) => {
            const tokens = Array.from({ length: count }, (_, i) => `$.k${i}`).join(' ');
            const startsWithSpy = vi.spyOn(String.prototype, 'startsWith');
            expect(splitJsonPathQueries(`$.t=Tags: ${tokens} (beta`)).toHaveLength(1);
            const calls = startsWithSpy.mock.calls.length;
            startsWithSpy.mockRestore();
            return calls;
        };
        expect(countCalls(512) / countCalls(256)).toBeLessThan(3);
    });

    test('thousands of queries are split without exceeding the call stack', () => {
        const tokens = Array.from({ length: 20000 }, (_, i) => `$.k${i}`).join(' ');
        expect(getJsonPathQueries(untrustedSource, tokens)).toHaveLength(20000);
        expect(splitJsonPathQueries(`$.t=Tags: ${tokens} (beta`)).toHaveLength(1);
    });
});

describe('review fixes of round 15', () => {
    test.each(['!=', '<', '>=', '*=', '^=', '$=', '&& @.x', '|| @.x'])(
        'regular expression of keys in a filter may be followed by %s without a space, as with it',
        (operator) => {
            // each filter matches at least the first item
            const operands: Record<string, string> = {
                '!=': '!="b"',
                '<': '<"b"',
                '>=': '>="abc"',
                '*=': '*="bc"',
                '^=': '^="ab"',
                '$=': '$="bc"',
                '&& @.x': '&& @.y',
                '|| @.x': '|| @.y',
            };
            const operand = operands[operator];
            const createRoot = () => ({ items: [{ "don'tPrompt": 'abc', y: 1 }, { "don'tPrompt": 'b' }, { x: 1 }] });
            const spacedRoot = createRoot();
            const root = createRoot();
            run(`$.items[?@./^don't/ ${operand}]`, spacedRoot, untrustedSource);
            run(`$.items[?@./^don't/${operand}]`, root, untrustedSource);
            expect(root).toEqual(spacedRoot);
            // the filter matches an item, so the regular expression of keys is read in both
            expect(spacedRoot.items.length).toBeLessThan(3);
        },
    );

    test('regular expression of keys followed by != removes the item', () => {
        const root = { items: [{ "don'tPrompt": true }, { x: 1 }] };
        run("$.items[?@./^don't/!=false]", root, untrustedSource);
        expect(root).toEqual({ items: [{ x: 1 }] });
    });

    test.each([
        '$.ads v2:*[?@.ad==true]',
        '$.ads v2: *[?@.ad==true]',
        `$.ads v2:${' '.repeat(64)}$.items[?@.ad==true]`,
        `$.ads v2:${' '.repeat(200)}*[?@.ad==true]`,
    ])('v2: query %j after another query is separate, as applied separately', (path) => {
        const queries = splitJsonPathQueries(path);
        expect(queries).toHaveLength(2);
        const createRoot = () => ({ ads: 1, items: { x: { ad: true }, y: { ad: false } } });
        const separately = createRoot();
        queries.forEach((query) => run(query, separately, untrustedSource));
        const combined = createRoot();
        run(path, combined, untrustedSource);
        expect(combined).toEqual(separately);
        expect(combined).not.toHaveProperty('ads');
    });
});

describe('review fixes of round 16', () => {
    test.each([
        // an operator of a filter only as a whole, and only inside a filter
        '/api/*', '/api/$metadata', '/api/$', '/api/*x', '/api/!x',
        '/api/^x', '/api/&x', '/api/|x', '/api/<x', '/api/>x',
        // a character which ends a regular expression of keys for scanning, but is not followed by a step
        '/api/(id)', '/api/+x', '/api/;x', '/api/]x', '/api/{x}', '/api/)x',
    ])('name %s after a dot, like a regular expression of keys, is a name, as before', (key) => {
        const root = { routes: { [key]: 1, api: 1 }, list: [{ [key]: 1, api: 1 }] };
        run(`$.routes.${key}`, root, untrustedSource);
        run(`$.list[0].${key}`, root, untrustedSource);
        expect(root).toEqual({ routes: { api: 1 }, list: [{ api: 1 }] });
    });

    test.each([
        '$.r./a=b/$x=1',
        '$.r./a=b/*x=1',
        '$.r./a=b/!x=1',
    ])('%s outside a filter is not a regular expression of keys, so its = is a value, as before', (path) => {
        const root = {
            r: {
                '/a': 0, '/a=b/$x': 0, '/a=b/*x': 0, '/a=b/!x': 0,
            },
        };
        run(path, root);
        expect(root.r['/a']).toBe(path.slice('$.r./a='.length));
    });

    test('regular expression of keys followed by a step or the end is still one', () => {
        const root = { routes: { api: { x: 1 }, apis: 1, other: 1 } };
        run('$.routes./^api/.x', root, untrustedSource);
        expect(root).toEqual({ routes: { api: {}, apis: 1, other: 1 } });
        run('$.routes./^api/', root, untrustedSource);
        expect(root).toEqual({ routes: { other: 1 } });
    });
});

describe('review fixes of round 17', () => {
    test('name like a regular expression of keys with the value / of the scriptlet argument is set, as before', () => {
        // e.g. trusted-json-set with the selector `$.routes./login` and the value `/`
        const expression = buildJsonPathExpression('$.routes./login', '/');
        expect(expression).toBe('$.routes./login=/');
        const root = { routes: { '/login': '/old', '/sso?login=1': 1 } };
        run(expression as string, root);
        expect(root).toEqual({ routes: { '/login': '/', '/sso?login=1': 1 } });
    });

    test('name like a regular expression of keys with a text value which contains a slash is set, as before', () => {
        const root = { labels: { '/account': 'Account', account: 1 } };
        run('$.labels./account=Log in / Sign up', root);
        expect(root).toEqual({ labels: { '/account': 'Log in / Sign up', account: 1 } });
    });

    test('names like regular expressions of keys separated by a space are separate queries', () => {
        const expression = '$.routes./login $.routes./(ad|promo)/';
        expect(getJsonPathQueries(untrustedSource, expression)).toEqual([
            '$.routes./login',
            '$.routes./(ad|promo)/',
        ]);
        const root = {
            routes: {
                '/login': 1, ad: 1, promo: 1, other: 1,
            },
        };
        run(expression, root, untrustedSource);
        // the same as each query applied separately
        const separateRoot = {
            routes: {
                '/login': 1, ad: 1, promo: 1, other: 1,
            },
        };
        run('$.routes./login', separateRoot, untrustedSource);
        run('$.routes./(ad|promo)/', separateRoot, untrustedSource);
        expect(root).toEqual(separateRoot);
        expect(root).toEqual({ routes: { other: 1 } });
    });

    test.each([
        ['$.r./^a\\=b$/', 'a=b'],
        ['$.r./^a\\sb$/', 'a b'],
        ['$.r./^a[\\x3D\\s]b$/', 'a=b'],
    ])('regular expression of keys %s with an escaped = or a space matches %s', (path, key) => {
        const root = { r: { [key]: 1, other: 1 } };
        run(path, root, untrustedSource);
        expect(root).toEqual({ r: { other: 1 } });
    });
});

describe('review fixes of round 18', () => {
    test.each([
        ['$.entities.&nbsp; v2:$.ads', ['$.entities.&nbsp;', 'v2:$.ads']],
        ['$.a; [?(@.ads)]$.b', ['$.a;', '[?(@.ads)]$.b']],
    ])('%s with ; before v2: or a guard is a name, so it is a separate query', (expression, queries) => {
        expect(splitJsonPathQueries(expression)).toEqual(queries);
    });

    test('; before v2: query is a name, and the combined rule is the same as separate ones', () => {
        const create = () => ({ entities: { '&nbsp;': 1, '&nbsp': 1, other: 1 }, ads: 1, content: 1 });
        const root = create();
        run('$.entities.&nbsp; v2:$.ads', root, untrustedSource);
        const separateRoot = create();
        run('$.entities.&nbsp;', separateRoot, untrustedSource);
        run('v2:$.ads', separateRoot, untrustedSource);
        expect(root).toEqual(separateRoot);
        expect(root).toEqual({ entities: { '&nbsp': 1, other: 1 }, content: 1 });
    });

    test('; before the root is still a precondition of the same query', () => {
        expect(splitJsonPathQueries('..adSlots; $.ads')).toEqual(['..adSlots; $.ads']);
        expect(splitJsonPathQueries('v2:..adSlots; $.ads')).toEqual(['v2:..adSlots; $.ads']);
    });

    test.each(['&&', '||'])('name %s after a dot is a separate query', (name) => {
        const expression = `$.ads $.operators.${name}`;
        expect(splitJsonPathQueries(expression)).toEqual(['$.ads', `$.operators.${name}`]);
        const create = () => ({ ads: 1, operators: { '&&': 1, '||': 1, other: 1 }, content: 1 });
        const root = create();
        run(expression, root, untrustedSource);
        const separateRoot = create();
        run('$.ads', separateRoot, untrustedSource);
        run(`$.operators.${name}`, separateRoot, untrustedSource);
        expect(root).toEqual(separateRoot);
        expect(root).not.toHaveProperty('ads');
        expect(root.operators).not.toHaveProperty(name);
    });

    test('&& of a filter in a regular expression with a quote and a space is still one query', () => {
        expect(splitJsonPathQueries('$.items[?@.x=/a"/] $.xb/ && @.y==1]')).toEqual([
            '$.items[?@.x=/a"/] $.xb/ && @.y==1]',
        ]);
        expect(splitJsonPathQueries('$.items[?@.x=/a"/] $.xb/&&@.y==1]')).toEqual([
            '$.items[?@.x=/a"/] $.xb/&&@.y==1]',
        ]);
    });

    test('regular expression of keys with a space has to use \\s', () => {
        const root = { r: { 'a b': 1, '/a b/': 1, other: 1 } };
        // `./a b/` is a name, as before
        run('$.r./a b/=0', root);
        expect(root.r).toEqual({ 'a b': 1, '/a b/': 0, other: 1 });
        run('$.r./^a\\sb$/=2', root);
        expect(root.r).toEqual({ 'a b': 2, '/a b/': 0, other: 1 });
    });
});

describe('review fixes of round 19', () => {
    test.each([
        { expression: '$.ads $.labels.en||US', name: 'en||US', parent: 'labels' },
        { expression: '$.ads $.media.video&&audio', name: 'video&&audio', parent: 'media' },
    ])('$expression with && or || inside a name is separate queries', ({ expression, name, parent }) => {
        const separate = expression.split(' ');
        expect(splitJsonPathQueries(expression)).toEqual(separate);
        const create = (): any => ({ ads: 1, [parent]: { [name]: 1, other: 1 }, content: 1 });
        const root = create();
        run(expression, root, untrustedSource);
        const separateRoot = create();
        separate.forEach((query) => run(query, separateRoot, untrustedSource));
        expect(root).toEqual(separateRoot);
        expect(root).toEqual({ [parent]: { other: 1 }, content: 1 });
    });

    test('&& inside a name of a query with a value of trusted-json-set is a separate query', () => {
        const root = { a: 0, media: { 'video&&audio': 0 } };
        run('$.a=1 $.media.video&&audio=2', root);
        expect(root).toEqual({ a: 1, media: { 'video&&audio': 2 } });
    });

    test.each([
        '$.items[?@.x=/a"/] $.xb/&&!@.y]',
        '$.items[?.x=/a"/] $.xb/&&.y==1]',
        '$.items[?@.x=/a"/] $.xb/ &&@.y]',
        '$.items[?(@.x=/a"/) $.xb/)&&(@.y==1)]',
    ])('rest %s of a filter after a space of its regular expression is still one query', (path) => {
        expect(splitJsonPathQueries(path)).toEqual([path]);
    });

    test.each([
        // guards of a text value, which are a query only if the query has its own value
        ['$.note=Filters: [?.f0] [?.f1] $.b=1', ['$.note=Filters:', '[?.f0] [?.f1] $.b=1']],
        ['$.note=Filters: [?.f0] [?.f1] $.b', ['$.note=Filters: [?.f0] [?.f1] $.b']],
        // the guard with a quote which is not closed is not well-formed, so the value continues through it
        ["$.note=x [?.f0] [?'f1] $.b=1", ["$.note=x [?.f0] [?'f1]", '$.b=1']],
        ['$.note=Filters: [?.f0 [?.f1 $.b=1', ['$.note=Filters: [?.f0 [?.f1', '$.b=1']],
        // `;` before the root continues the selector, through all next queries
        ['$.t=x $.a0; $.a1; $.b=1', ['$.t=x', '$.a0; $.a1; $.b=1']],
        ['$.t=x $.a0; $.a1; $.b', ['$.t=x $.a0; $.a1; $.b']],
        ['$.t=x [?.a] $.a0; $.b=1', ['$.t=x', '[?.a] $.a0; $.b=1']],
        ['$.a; $.b; $.c', ['$.a; $.b; $.c']],
        ['[?.a] $.x $.y', ['[?.a] $.x', '$.y']],
        ['v2: $.a $.b', ['v2: $.a', '$.b']],
    ])('%s is split as before, with lookaheads which are scanned once', (expression, queries) => {
        expect(splitJsonPathQueries(expression)).toEqual(queries);
    });

    test('; with a space before the root is one query, but not a precondition, which is ;$ without it', () => {
        const spaced = { adSlots: 1, ads: 2 };
        run('..adSlots; $.ads', spaced, untrustedSource);
        expect(spaced).toEqual({ adSlots: 1, ads: 2 });
        const precondition = { adSlots: 1, ads: 2 };
        run('..adSlots;$.ads', precondition, untrustedSource);
        expect(precondition).toEqual({ adSlots: 1 });
    });
});

describe('review fixes of round 20', () => {
    test.each([
        // a bare operand after `&&`
        '$.items[?@.x=/a"/] $.xb/&&y==1]',
        // no logical operator at all, the closing bracket is in the value
        '$.items[?@.x=/a"/] $.b=c/]',
        '$.items[?@.x=/a"/]=1 $.b=2 $.c=x/]',
        // a query between them
        '$.items[?@.x=/a"/] $.b $.c=x/]',
        "$.obj[/a'/] $.b=c/]",
    ])('%s after a regular expression with a quote, with a closing bracket in a value, is one query', (path) => {
        expect(splitJsonPathQueries(path)).toEqual([path]);
        // the part before the space would be a broader filter, which would remove this item
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const create = () => ({ items: [{ x: 'a" different', y: 0 }, { x: 'c', y: 1 }], obj: { "a'": 1 }, b: 1 });
        const root = create();
        run(path, root, untrustedSource);
        expect(root).toEqual(create());
    });

    test.each([
        ['$.ads $.labels.a || b', ['$.ads', '$.labels.a || b'], 'a || b'],
        ['$.ads $.labels.a && b', ['$.ads', '$.labels.a && b'], 'a && b'],
        ['$.ads $.labels.a &&b', ['$.ads', '$.labels.a &&b'], 'a &&b'],
    ])('%s with a name with spaces and a logical operator is separate queries', (expression, queries, name) => {
        expect(splitJsonPathQueries(expression)).toEqual(queries);
        const create = () => ({ ads: 1, labels: { [name]: 1, a: 1, other: 1 } });
        const root = create();
        run(expression, root, untrustedSource);
        const separateRoot = create();
        queries.forEach((query) => run(query, separateRoot, untrustedSource));
        expect(root).toEqual(separateRoot);
        expect(root).toEqual({ labels: { a: 1, other: 1 } });
    });

    test.each([
        // the quote is escaped by its code, so the end of the regular expression is certain
        ['[?.t=/it\\x27s/]$.a $.note=:)', ['[?.t=/it\\x27s/]$.a', '$.note=:)']],
        ['[?.t=/it\\x27s/]$.a $.labels.a || b', ['[?.t=/it\\x27s/]$.a', '$.labels.a || b']],
        // without a quote the end of the regular expression is certain as well
        ['$.items[?@.x=/a/] $.b=c/]', ['$.items[?@.x=/a/]', '$.b=c/]']],
        // a quote of a string is not a quote of a regular expression
        ['$.items[?(@.u=="it\'s")] $.b', ['$.items[?(@.u=="it\'s")]', '$.b']],
        // a quote outside brackets is a part of a name, also in a value
        ["$.meta.don'tPrompt $.note=Don't show", ["$.meta.don'tPrompt", "$.note=Don't show"]],
    ])('%s is split, as it has no regular expression with a raw quote', (expression, queries) => {
        expect(splitJsonPathQueries(expression)).toEqual(queries);
    });

    test.each([
        "[?.t=/it's/]$.a $.items[?(@.x)] $.c",
        "[?.t=/it's/]$.a $.labels.a || b",
        "[?.t=/it's/]$.a $.items[?.u=/ads[/?#]/]",
        // also the queries before the regular expression with a raw quote
        '$.a $.b=1 $.items[?@.x=/a"/] $.c=x/]',
        "$.note=:) [?.t=/it's/]$.a=1 $.b=2",
        // a regular expression of keys in a filter
        "$.items[?@./it's/] $.b",
    ])('%s with a regular expression with a raw quote is one query', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test('text value with a closing bracket after a regular expression with a quote is not separated', () => {
        // the documented limit: `\x27` instead of the quote, or separate rules, are needed
        expect(splitJsonPathQueries("[?.t=/it's/]$.a $.note=:)")).toEqual(["[?.t=/it's/]$.a $.note=:)"]);
        const root = { t: "it's", a: 1, note: '' };
        run('[?.t=/it\\x27s/]$.a=2 $.note=:)', root);
        expect(root).toEqual({ t: "it's", a: 2, note: ':)' });
    });

    test.each([
        [
            '$.note=Filters: [?.a0][?.b] [?.a1][?.b] $.result=1',
            ['$.note=Filters:', '[?.a0][?.b] [?.a1][?.b] $.result=1'],
        ],
        ['$.note=Filters: [?.a0][?.b] [?.a1][?.b] $.result', ['$.note=Filters: [?.a0][?.b] [?.a1][?.b] $.result']],
        ['$.a=1 [?.a0][?.b]$.c=2 [?.a1] [?.b]$.d=3', ['$.a=1', '[?.a0][?.b]$.c=2', '[?.a1] [?.b]$.d=3']],
    ])('%s with adjacent guards is split as before', (expression, queries) => {
        expect(splitJsonPathQueries(expression)).toEqual(queries);
    });
});

describe('splitting without guesses', () => {
    test.each([
        // a closing bracket without an opening one
        '$.a $.b]',
        // a quote in brackets which is not closed
        '$.a $.b["x',
    ])('%s with a next selector which is not well-formed is one query, as before', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test.each([
        // a quoted or structured value, after which a query without its own value may start
        '$.t="x" $.a]',
        '$.t="x" $.a["k',
        '$.t={"a":1} $.b]',
        // a text value, after which the next query has a value at the top level, but is not well-formed
        '$.t=x $.a][=1',
    ])('value followed by a query which is not well-formed, %s, is one query, as before', (expression) => {
        expect(splitJsonPathQueries(expression)).toEqual([expression]);
    });

    test('text value followed by a query which is not well-formed is one value, as before', () => {
        expect(splitJsonPathQueries('$.t=x $.a]=1')).toEqual(['$.t=x $.a]=1']);
        const root = { t: '', a: 0 };
        run('$.t=x $.a]=1', root);
        expect(root).toEqual({ t: 'x $.a]=1', a: 0 });
    });

    test('regular expression of keys with a raw quote outside brackets is read as a whole, so it is split', () => {
        expect(splitJsonPathQueries("$.r./it's/ $.b")).toEqual(["$.r./it's/", '$.b']);
        const root = { r: { "it's": 1, other: 1 }, b: 1 };
        run("$.r./it's/ $.b", root, untrustedSource);
        expect(root).toEqual({ r: { other: 1 } });
    });
});

describe('filters of items of live arrays', () => {
    /**
     * Creates an array whose first item is a getter which returns an ad on its first read
     * and an article on the next ones, as a getter of the page may.
     *
     * @returns array and the number of reads of its first item
     */
    const createLiveItems = () => {
        const items: any[] = [{ id: 'x' }, { id: 'y' }];
        const ad = { id: 'ad' };
        const article = { id: 'article' };
        let reads = 0;
        Object.defineProperty(items, 0, {
            configurable: true,
            enumerable: true,
            get: () => {
                reads += 1;
                return reads === 1 ? ad : article;
            },
            set: (value) => {
                Object.defineProperty(items, 0, {
                    value,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                });
            },
        });
        return {
            items,
            ad,
            article,
            getReads: () => reads,
        };
    };

    test.each([
        // a filter which cannot match a primitive item, which is skipped then
        '$.items[?(@.id=="ad")]',
        // a filter which may match a primitive item
        '$.items[?(!@.missing && @.id=="ad")]',
    ])('%s tests the value of an item which the first read returns, as before', (path) => {
        const { items, getReads } = createLiveItems();
        const root = { items };
        run(path, root);
        expect(root.items).toEqual([{ id: 'y' }]);
        // once by the filter, and once by the removal
        expect(getReads()).toBe(2);
    });

    test('item which the filter matches is the one which the next step modifies', () => {
        const { items, ad, article } = createLiveItems();
        const root = { items };
        run('$.items[?(@.id=="ad")].id=removed', root);
        // the ad which the filter has tested is modified, not the article of the next read
        expect(ad).toEqual({ id: 'removed' });
        expect(article).toEqual({ id: 'article' });
    });
});
