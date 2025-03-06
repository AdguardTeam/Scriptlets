import { describe, test, expect } from 'vitest';

import { jsonPruner, getPrunePath } from '../../src/helpers';

const name = 'json-prune';
const nativeObjects = {
    nativeStringify: window.JSON.stringify,
};

describe('getPrunePath tests', () => {
    const testCases = [
        {
            pathToCheck: 'foo',
            expected: [
                {
                    path: 'foo',
                },
            ],
        },
        {
            pathToCheck: 'foo.bar',
            expected: [
                {
                    path: 'foo.bar',
                },
            ],
        },
        {
            pathToCheck: 'value.video.isAd.[=].1',
            expected: [
                {
                    path: 'value.video.isAd',
                    value: 1,
                },
            ],
        },
        {
            pathToCheck: 'entries.element.div.[=].advertisement',
            expected: [
                {
                    path: 'entries.element.div',
                    value: 'advertisement',
                },
            ],
        },
        {
            pathToCheck: 'foo bar.a baz',
            expected: [
                {
                    path: 'foo',
                },
                {
                    path: 'bar.a',
                },
                {
                    path: 'baz',
                },
            ],
        },
        {
            pathToCheck: 'foo.bar ads_enabled data.ads.list.* data.[].vast_url',
            expected: [
                {
                    path: 'foo.bar',
                },
                {
                    path: 'ads_enabled',
                },
                {
                    path: 'data.ads.list.*',
                },
                {
                    path: 'data.[].vast_url',
                },
            ],
        },
        {
            // eslint-disable-next-line max-len
            pathToCheck: 'advert values.ad foo.bar.[=]./test abc \\/ foo \\/ bar test/ test.xyz data.[].vast_url baz.foo.[=].true abc',
            expected: [
                {
                    path: 'advert',
                },
                {
                    path: 'values.ad',
                },
                {
                    path: 'foo.bar',
                    value: /test abc \/ foo \/ bar test/,
                },
                {
                    path: 'test.xyz',
                },
                {
                    path: 'data.[].vast_url',
                },
                {
                    path: 'baz.foo',
                    value: true,
                },
                {
                    path: 'abc',
                },
            ],
        },
    ];
    test.each(testCases)('$pathToCheck -> $expected', ({ pathToCheck, expected }) => {
        expect(getPrunePath(pathToCheck)).toStrictEqual(expected);
    });
});

describe('jsonPruner tests', () => {
    test('Removes "advert" element', async () => {
        const root = {
            foo: 1,
            bar: 2,
            advert: {
                values: {
                    ad: 3,
                },
            },
            baz: 4,
        };

        const expected = {
            foo: 1,
            bar: 2,
            baz: 4,
        };

        const pathToPrune = getPrunePath('advert');
        const requiredPaths = getPrunePath('');
        const stack = '';

        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Remove "c" element if value is equal to 3', async () => {
        const root = {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        };

        const expected = {
            a: 1,
            b: 2,
            d: 4,
        };

        const pathToPrune = getPrunePath('c.[=].3');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Do not remove - value does not match', async () => {
        const root = {
            a: 1,
            b: 2,
            c: 2,
            d: 4,
        };

        const expected = {
            a: 1,
            b: 2,
            c: 2,
            d: 4,
        };

        const pathToPrune = getPrunePath('c.[=].3');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes all elements with "fooBar" value', async () => {
        const root = {
            a: 1,
            b: 'fooBar',
            c: 3,
            d: 'fooBar',
        };

        const expected = {
            a: 1,
            c: 3,
        };

        const pathToPrune = getPrunePath('*.[=].fooBar');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes all elements with "fooBar2" value from "test" object', async () => {
        const root = {
            test: {
                a: 1,
                b: 'fooBar2',
                c: 3,
                d: 'fooBar2',
            },
        };

        const expected = {
            test: {
                a: 1,
                c: 3,
            },
        };

        const pathToPrune = getPrunePath('test.*.[=].fooBar2');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Path do not match, not remove', async () => {
        const root = {
            baz: {
                a: 1,
                b: 'fooBar2',
                c: 3,
                d: 'fooBar2',
            },
        };

        const expected = {
            baz: {
                a: 1,
                b: 'fooBar2',
                c: 3,
                d: 'fooBar2',
            },
        };

        const pathToPrune = getPrunePath('test.*.[=].fooBar2');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes all elements from "test" object which values are matched by regex "/foo Bar/"', async () => {
        const root = {
            test: {
                a: 1,
                b: 'foo Bar abc',
                c: 3,
                d: 'foo Bar2',
            },
        };

        const expected = {
            test: {
                a: 1,
                c: 3,
            },
        };

        const pathToPrune = getPrunePath('test.*.[=]./foo Bar/');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects with "infoAd" property', async () => {
        const root = {
            videos: {
                video1: {
                    infoAd: {
                        time: 10,
                    },
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    src: 'src2',
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.infoAd');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes all "video" objects with "isAd" property', async () => {
        const root = {
            videos: {
                video0: {
                    src: 'src0',
                },
                video1: {
                    isAd: true,
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    src: 'src3',
                },
                video4: {
                    src: 'src4',
                },
                video5: {
                    isAd: true,
                    src: 'src5',
                },
            },
        };

        const expected = {
            videos: {
                video0: {
                    src: 'src0',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    src: 'src3',
                },
                video4: {
                    src: 'src4',
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.isAd');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects with isAd property in values object', async () => {
        const root = {
            videos: {
                video1: {
                    values: {
                        isAd: true,
                        src: 'src1',
                    },
                },
                video2: {
                    values: {
                        src: 'src2',
                    },
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    values: {
                        src: 'src2',
                    },
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.values.isAd');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects with isAd property in any nested object', async () => {
        const root = {
            videos: {
                video1: {
                    foo: {
                        isAd: true,
                        src: 'src1',
                    },
                },
                video2: {
                    bar: {
                        src: 'src2',
                    },
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    bar: {
                        src: 'src2',
                    },
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.*.isAd');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes object which contains array with object which contains "isAd" key', async () => {
        const root = [
            {
                content1: [
                    {
                        id: 0,
                        source: 'example.com',
                    },
                    {
                        id: 1,
                        source: 'example.org',
                        isAd: true,
                    },
                ],
                state: {
                    ready: true,
                },
            },
            {
                content2: [
                    { id: 0 },
                    { id: 1 },
                ],
                state: {
                    ready: true,
                },
            },
        ];

        const expected = [
            {
                state: {
                    ready: true,
                },
            },
            {
                content2: [
                    { id: 0 },
                    { id: 1 },
                ],
                state: {
                    ready: true,
                },
            },
        ];

        const pathToPrune = getPrunePath('[].{-}.*.isAd');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes array elements which contains "a" object', async () => {
        let testPassed = false;

        const root = {
            gifs: [
                { a: 1 },
                { b: 2 },
                { a: 3 },
                { b: 4 },
                { c: { a: 5 } },
                { a: 3 },
                { foo: 'bar' },
            ],
        };

        const expected = {
            gifs: [
                { b: 2 },
                { b: 4 },
                { c: { a: 5 } },
                { foo: 'bar' },
            ],
        };

        const pathToPrune = getPrunePath('gifs.[-].a');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        let cValue;

        try {
            for (let i = 0; i < result.gifs.length; i += 1) {
                const gif = result.gifs[i];
                if (gif.c) {
                    cValue = gif.c.a;
                }
            }
            testPassed = true;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not read "cValue":', e);
        }

        expect(testPassed).toStrictEqual(true);
        expect(cValue).toStrictEqual(5);
        expect(result).toStrictEqual(expected);
    });

    test('Should not remove, {-} does not match array', async () => {
        const root = {
            gifs: [
                { a: 1 },
                { b: 2 },
                { a: 3 },
                { b: 4 },
                { c: { a: 5 } },
            ],
        };

        const expected = {
            gifs: [
                { a: 1 },
                { b: 2 },
                { a: 3 },
                { b: 4 },
                { c: { a: 5 } },
            ],
        };

        const pathToPrune = getPrunePath('gifs.{-}.a');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects when "isAd" property is "true"', async () => {
        const root = {
            videos: {
                video1: {
                    isAd: true,
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    isAd: false,
                    src: 'src3',
                },
                video4: {
                    isAd: true,
                    src: 'src4',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    src: 'src2',
                },
                video3: {
                    isAd: false,
                    src: 'src3',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.isAd.[=].true');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects when regex matches "value" property', async () => {
        const root = {
            videos: {
                video1: {
                    value: 'advertisement',
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    isAd: 'video',
                    src: 'src3',
                },
                video4: {
                    value: 'advertisement',
                    src: 'src4',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    src: 'src2',
                },
                video3: {
                    isAd: 'video',
                    src: 'src3',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.value.[=]./advert/');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects when it has "entries.value.ad" path', async () => {
        const root = {
            videos: {
                video1: {
                    entries: {
                        value: {
                            src: 'src1',
                            ad: {
                                value: 'advertisement',
                            },
                        },
                    },
                },
                video2: {
                    entries: {
                        value: {
                            src: 'src2',
                        },
                    },
                },
                video3: {
                    entries: {
                        value: {
                            src: 'src3',
                            ad: {
                                value: 'advertisement',
                            },
                        },
                    },
                },
                video4: {
                    entries: {
                        value: {
                            src: 'src4',
                            ad: {
                                value: 'advertisement',
                            },
                        },
                    },
                },
                video5: {
                    entries: {
                        value: {
                            src: 'src5',
                        },
                    },
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    entries: {
                        value: {
                            src: 'src2',
                        },
                    },
                },
                video5: {
                    entries: {
                        value: {
                            src: 'src5',
                        },
                    },
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.entries.value.ad');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Removes video objects from videos and images when regex matches "value" property', async () => {
        const root = {
            videos: {
                video1: {
                    value: 'advertisement',
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    value: 'video',
                    src: 'src3',
                },
                video4: {
                    value: 'advertisement',
                    src: 'src4',
                },
                video5: {
                    src: 'src5',
                },
            },
            images: {
                video1: {
                    value: 'advertisement',
                    src: 'src1',
                },
                video2: {
                    src: 'src2',
                },
                video3: {
                    value: 'video',
                    src: 'src3',
                },
                video4: {
                    value: 'advertisement',
                    src: 'src4',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const expected = {
            videos: {
                video2: {
                    src: 'src2',
                },
                video3: {
                    value: 'video',
                    src: 'src3',
                },
                video5: {
                    src: 'src5',
                },
            },
            images: {
                video2: {
                    src: 'src2',
                },
                video3: {
                    value: 'video',
                    src: 'src3',
                },
                video5: {
                    src: 'src5',
                },
            },
        };

        const pathToPrune = getPrunePath('videos.{-}.value.[=]./advert/ images.{-}.value.[=]./advert/');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Remove different elements', async () => {
        const root = {
            foo: {
                element: { div: 1 },
                elements: [
                    {
                        div: {
                            foo: {
                                bar: 'baz',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'advert',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'test',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                advert: 'test',
                            },
                        },
                    },
                    {
                        div: [
                            {
                                baz: {
                                    advert: true,
                                },
                            },
                        ],
                    },
                    {
                        div: {
                            foo: {
                                bar: 'Ad By Company Name',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'Ad  Foo/bar  test',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: ' I am  out of ideas / :( ',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'test',
                            },
                        },
                    },
                ],
                span: { div: 2 },
                advert: { div: 3 },
            },
            advert: { div: 4 },
            bar: { div: 5 },
        };

        const expected = {
            foo: {
                element: { div: 1 },
                elements: [
                    {
                        div: {
                            foo: {
                                bar: 'baz',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'test',
                            },
                        },
                    },
                    {
                        div: {
                            foo: {
                                bar: 'test',
                            },
                        },
                    },
                ],
                span: { div: 2 },
            },
            bar: { div: 5 },
        };

        // eslint-disable-next-line max-len
        const pathToPrune = getPrunePath('foo.advert foo.elements.[-].div.*.advert foo.elements.[-].div.foo.bar.[=].advert foo.elements.[-].div.foo.bar.[=]./Ad By Company/ foo.elements.[-].div.[].baz.advert foo.elements.[-].div.foo.bar.[=]./Ad  Foo\\/bar  test/ foo.elements.[-].div.foo.bar.[=]./ I am  out of ideas \\/ :\\( / advert');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });

    test('Array - should not be removed', async () => {
        const root = [
            'foo',
            0,
            1,
            43200,
            100,
        ];

        const expected = [
            'foo',
            0,
            1,
            43200,
            100,
        ];

        // eslint-disable-next-line max-len
        const pathToPrune = getPrunePath('playerResponse.adPlacements playerResponse.playerAds playerResponse.adSlots adPlacements playerAds adSlots');
        const requiredPaths = getPrunePath('');
        const stack = '';
        const result = jsonPruner(name, root, pathToPrune, requiredPaths, stack, nativeObjects);

        expect(result).toStrictEqual(expected);
    });
});
