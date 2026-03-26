import {
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { buildJsonPathExpression, jsonPath } from '../../src/helpers';

const source = {
    args: [],
    engine: 'test',
    name: 'trusted-json-set',
    verbose: false,
    version: '0.0.0',
};
const untrustedSource = {
    args: [],
    engine: 'test',
    name: 'json-prune',
    verbose: false,
    version: '0.0.0',
};
const nativeObjects = {
    nativeParse: window.JSON.parse,
    nativeStringify: window.JSON.stringify,
};

const createStoreRoot = () => ({
    store: {
        book: [
            {
                category: 'reference',
                author: 'Nigel Rees',
                title: 'Sayings of the Century',
                price: 8.95,
            },
            {
                category: 'fiction',
                author: 'Evelyn Waugh',
                title: 'Sword of Honour',
                price: 12.99,
            },
            {
                category: 'fiction',
                author: 'Herman Melville',
                title: 'Moby Dick',
                isbn: '0-553-21311-3',
                price: 8.99,
            },
            {
                category: 'fiction',
                author: 'J. R. R. Tolkien',
                title: 'The Lord of the Rings',
                isbn: '0-395-19395-8',
                price: 22.99,
            },
        ],
        bicycle: {
            color: 'red',
            price: 19.95,
        },
    },
});

describe('jsonPath tests', () => {
    test('Preserves inline mutation expressions', () => {
        expect(buildJsonPathExpression('$..*[?(@.price==8.99)].price=10', undefined))
            .toBe('$..*[?(@.price==8.99)].price=10');
    });

    test('Returns empty expression when mutation value is missing', () => {
        expect(buildJsonPathExpression('$..*[?(@.price==8.99)].price', undefined)).toBe('');
    });

    test('Builds remove expression when argumentValue is $remove$', () => {
        expect(buildJsonPathExpression('$.store.book[*].price', '$remove$')).toBe('$.store.book[*].price');
    });

    test('Removes first book', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$.store.book[0]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                        price: 8.99,
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 19.95,
                },
            },
        });
    });

    test('Removes all author fields from books', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$.store.book[*].author',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'reference',
                        title: 'Sayings of the Century',
                        price: 8.95,
                    },
                    {
                        category: 'fiction',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                        price: 8.99,
                    },
                    {
                        category: 'fiction',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 19.95,
                },
            },
        });
    });

    test('Removes all price fields', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..price',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'reference',
                        author: 'Nigel Rees',
                        title: 'Sayings of the Century',
                    },
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                    },
                ],
                bicycle: {
                    color: 'red',
                },
            },
        });
    });

    test('Removes all price, title and color fields', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..[price,title,color]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'reference',
                        author: 'Nigel Rees',
                    },
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        isbn: '0-553-21311-3',
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        isbn: '0-395-19395-8',
                    },
                ],
                bicycle: {
                },
            },
        });
    });

    test('Removes books with price less than 20 and category fiction', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..book[?(@.price<20 && @.category=="fiction")]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'reference',
                        author: 'Nigel Rees',
                        title: 'Sayings of the Century',
                        price: 8.95,
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 19.95,
                },
            },
        });
    });

    test('Removes books when filter uses logical OR', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..book[?(@.price>20 || @.category=="reference")]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                        price: 8.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 19.95,
                },
            },
        });
    });

    test('Removes books when logical AND is nested under logical OR', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..book[?(@.category=="reference" || (@.price<10 && @.category=="fiction"))]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 19.95,
                },
            },
        });
    });

    test('Supports bracket notation', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$["store"]["book"][*]["author"]',
            nativeObjects,
        );

        expect(result.store.book[0].author).toBeUndefined();
        expect(result.store.book[1].author).toBeUndefined();
    });

    test('Removes all things in store with wildcard', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$.store.*', nativeObjects);

        expect(result).toStrictEqual({
            store: {},
        });
    });

    test('Removes the third book', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[2]', nativeObjects);

        expect(result.store.book).toHaveLength(3);
        expect(result.store.book[2].title).toBe('The Lord of the Rings');
    });

    test('Removes the last book with computed index', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[(@.length-1)]', nativeObjects);

        expect(result.store.book).toHaveLength(3);
        expect(result.store.book[2].title).toBe('Moby Dick');
    });

    test('Removes the last book with slice syntax', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[-1:]', nativeObjects);

        expect(result.store.book).toHaveLength(3);
        expect(result.store.book[2].title).toBe('Moby Dick');
    });

    test('Removes the first two books with union index', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[0,1]', nativeObjects);

        expect(result.store.book).toHaveLength(2);
        expect(result.store.book[0].title).toBe('Moby Dick');
    });

    test('Removes multiple array indexes correctly even when selector order is descending', () => {
        const root = {
            items: ['zero', 'one', 'two', 'three', 'four'],
        };

        const result = jsonPath(source, root, '$.items[3,1]', nativeObjects);

        expect(result).toStrictEqual({
            items: ['zero', 'two', 'four'],
        });
    });

    test('Removes the first two books with slice', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[:2]', nativeObjects);

        expect(result.store.book).toHaveLength(2);
        expect(result.store.book[0].title).toBe('Moby Dick');
    });

    test('Removes all books with isbn by filter', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(@.isbn)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'reference',
                author: 'Nigel Rees',
                title: 'Sayings of the Century',
                price: 8.95,
            },
            {
                category: 'fiction',
                author: 'Evelyn Waugh',
                title: 'Sword of Honour',
                price: 12.99,
            },
        ]);
    });

    test('Removes all books without isbn by negated filter', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(!@.isbn)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'fiction',
                author: 'Herman Melville',
                title: 'Moby Dick',
                isbn: '0-553-21311-3',
                price: 8.99,
            },
            {
                category: 'fiction',
                author: 'J. R. R. Tolkien',
                title: 'The Lord of the Rings',
                isbn: '0-395-19395-8',
                price: 22.99,
            },
        ]);
    });

    test('Removes all books cheaper than 10 by filter', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(@.price<10)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'fiction',
                author: 'Evelyn Waugh',
                title: 'Sword of Honour',
                price: 12.99,
            },
            {
                category: 'fiction',
                author: 'J. R. R. Tolkien',
                title: 'The Lord of the Rings',
                isbn: '0-395-19395-8',
                price: 22.99,
            },
        ]);
    });

    test('Removes all books with exact price match', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(@.price==8.95)]', nativeObjects);

        expect(result.store.book[0].title).toBe('Sword of Honour');
    });

    test('Removes all books whose author matches regex with =~', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(@.author =~ /.*REES/i)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'fiction',
                author: 'Evelyn Waugh',
                title: 'Sword of Honour',
                price: 12.99,
            },
            {
                category: 'fiction',
                author: 'Herman Melville',
                title: 'Moby Dick',
                isbn: '0-553-21311-3',
                price: 8.99,
            },
            {
                category: 'fiction',
                author: 'J. R. R. Tolkien',
                title: 'The Lord of the Rings',
                isbn: '0-395-19395-8',
                price: 22.99,
            },
        ]);
    });

    test('Removes all books whose author matches regex with =~', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[?(@.author=~/.*(Tolkien|REES)/i)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'fiction',
                author: 'Evelyn Waugh',
                title: 'Sword of Honour',
                price: 12.99,
            },
            {
                category: 'fiction',
                author: 'Herman Melville',
                title: 'Moby Dick',
                isbn: '0-553-21311-3',
                price: 8.99,
            },
        ]);
    });

    test('Removes all books whose author does not match regex with =~', () => {
        const root = createStoreRoot();

        // Negation "!@.author" is used to match only these elements that do not satisfy the condition
        const result = jsonPath(source, root, '$..book[?(!@.author=~/.*(Tolkien|REES)/i)]', nativeObjects);

        expect(result.store.book).toStrictEqual([
            {
                category: 'reference',
                author: 'Nigel Rees',
                title: 'Sayings of the Century',
                price: 8.95,
            },
            {
                category: 'fiction',
                author: 'J. R. R. Tolkien',
                title: 'The Lord of the Rings',
                isbn: '0-395-19395-8',
                price: 22.99,
            },
        ]);
    });

    test('Removes selected properties from the first book', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..book[0][category, author]', nativeObjects);

        expect(result.store.book[0]).toStrictEqual({
            price: 8.95,
            title: 'Sayings of the Century',
        });
    });

    test('Removes children property from props with specific id', () => {
        const root = [
            {
                type: {
                    _payload: {
                        status: 'fulfilled',
                        reason: null,
                    },
                },
                key: 'ad-block-checker',
                ref: null,
                props: {
                    id: 'ad-block-initializer',
                    children: "(() => 'test')()",
                },
            },
        ];

        const result = jsonPath(source, root, '$..props[?.id=="ad-block-initializer"].children', nativeObjects);

        expect(result).toStrictEqual([
            {
                type: {
                    _payload: {
                        status: 'fulfilled',
                        reason: null,
                    },
                },
                key: 'ad-block-checker',
                ref: null,
                props: {
                    id: 'ad-block-initializer',
                },
            },
        ]);
    });

    // eslint-disable-next-line max-len
    test('Removes interstitialNativeAds property from fullScreenSlideshowSettings, combined bracket and dot notation', () => {
        const root = {
            configs: {
                'GalleryPage/ntpmsn': {
                    'properties==test': {
                        fullScreenSlideshowSettings: {
                            interstitialNativeAds: true,
                            autoSlideShow: true,
                        },
                    },
                },
                'ArticlePage/ntpmsn': {
                    contentSettings: {
                        interstitialNativeAds: false,
                        contentLoaded: true,
                    },
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            "$.configs['GalleryPage/ntpmsn']['properties==test'].fullScreenSlideshowSettings.interstitialNativeAds",
            nativeObjects,
        );

        expect(result).toStrictEqual({
            configs: {
                'GalleryPage/ntpmsn': {
                    'properties==test': {
                        fullScreenSlideshowSettings: {
                            autoSlideShow: true,
                        },
                    },
                },
                'ArticlePage/ntpmsn': {
                    contentSettings: {
                        interstitialNativeAds: false,
                        contentLoaded: true,
                    },
                },
            },
        });
    });

    test('Removes media src when the same media node has ad flag', () => {
        const root = {
            content: {
                block1: {
                    media: {
                        ad: true,
                        src: '1.jpg',
                    },
                },
                block2: {
                    media: {
                        src: '2.jpg',
                    },
                },
            },
        };

        const result = jsonPath(source, root, '$.content.*.media[?(@.ad)].src', nativeObjects);

        expect(result).toStrictEqual({
            content: {
                block1: {
                    media: {
                        ad: true,
                    },
                },
                block2: {
                    media: {
                        src: '2.jpg',
                    },
                },
            },
        });
    });

    test('Removes all title and price properties regardless of location', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..[title, price]', nativeObjects);

        expect(result).toStrictEqual({
            store: {
                bicycle: {
                    color: 'red',
                },
                book: [
                    {
                        author: 'Nigel Rees',
                        category: 'reference',
                    },
                    {
                        author: 'Evelyn Waugh',
                        category: 'fiction',
                    },
                    {
                        author: 'Herman Melville',
                        category: 'fiction',
                        isbn: '0-553-21311-3',
                    },
                    {
                        author: 'J. R. R. Tolkien',
                        category: 'fiction',
                        isbn: '0-395-19395-8',
                    },
                ],
            },
        });
    });

    test('Sets all prices which are equal to 8.99, to 10', () => {
        const root = {
            store: {
                book: [
                    {
                        category: 'reference',
                        author: 'Nigel Rees',
                        title: 'Sayings of the Century',
                        price: 8.99,
                    },
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                        price: 8.99,
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 8.99,
                },
                food: {
                    fast: {
                        pizza: { price: 8.99 },
                        hotDog: { price: 2.66 },
                    },
                    drink: {
                        water: { price: 1 },
                        juice: { price: 8.99 },
                    },
                },
            },
        };

        const result = jsonPath(source, root, '$..*[?(@.price==8.99)].price=10', nativeObjects);

        expect(result).toStrictEqual({
            store: {
                book: [
                    {
                        category: 'reference',
                        author: 'Nigel Rees',
                        title: 'Sayings of the Century',
                        price: 10,
                    },
                    {
                        category: 'fiction',
                        author: 'Evelyn Waugh',
                        title: 'Sword of Honour',
                        price: 12.99,
                    },
                    {
                        category: 'fiction',
                        author: 'Herman Melville',
                        title: 'Moby Dick',
                        isbn: '0-553-21311-3',
                        price: 10,
                    },
                    {
                        category: 'fiction',
                        author: 'J. R. R. Tolkien',
                        title: 'The Lord of the Rings',
                        isbn: '0-395-19395-8',
                        price: 22.99,
                    },
                ],
                bicycle: {
                    color: 'red',
                    price: 10,
                },
                food: {
                    fast: {
                        pizza: { price: 10 },
                        hotDog: { price: 2.66 },
                    },
                    drink: {
                        water: { price: 1 },
                        juice: { price: 10 },
                    },
                },
            },
        });
    });

    test('Does not set values for untrusted scriptlets', () => {
        const root = {
            store: {
                book: [
                    { title: 'One', price: 8.99 },
                    { title: 'Two', price: 12.99 },
                ],
            },
        };

        const result = jsonPath(untrustedSource, root, '$..*[?(@.price==8.99)].price=10', nativeObjects);

        expect(result).toStrictEqual({
            store: {
                book: [
                    { title: 'One', price: 8.99 },
                    { title: 'Two', price: 12.99 },
                ],
            },
        });
    });

    test('Skips processing when stack does not match', () => {
        const root = {
            price: 8.99,
            nested: { price: 8.99 },
        };

        const result = jsonPath(source, root, '$..price', nativeObjects, undefined, 'definitelyMissingStackFrame');

        expect(result).toStrictEqual({
            price: 8.99,
            nested: { price: 8.99 },
        });
    });

    test('Logs payload when selector is empty', () => {
        const logSpy = vi.spyOn(window.console, 'log').mockImplementation(() => { });
        const root = createStoreRoot();

        const result = jsonPath(source, root, '', nativeObjects);

        expect(result).toBe(root);
        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logSpy.mock.calls[0][0].includes(`${source.name}: ${window.location.hostname}`)).toBeTruthy();
        logSpy.mockRestore();
    });

    test('Removes all timeline items with ad type', () => {
        const root = {
            result: {
                timeline: [
                    { id: 1, type: 'post' },
                    { id: 2, type: 'ad' },
                    { id: 3, type: 'story' },
                    { id: 4, type: 'ad' },
                ],
            },
        };

        const result = jsonPath(source, root, '$.result.timeline.*[?.type=="ad"]', nativeObjects);

        expect(result.result.timeline).toStrictEqual([
            { id: 1, type: 'post' },
            { id: 3, type: 'story' },
        ]);
    });

    test('Removes matched items from each nested array without cross-array index shifting', () => {
        const root = {
            groups: [
                {
                    items: [
                        { id: 'a1', ad: true },
                        { id: 'a2', ad: false },
                        { id: 'a3', ad: true },
                    ],
                },
                {
                    items: [
                        { id: 'b1', ad: false },
                        { id: 'b2', ad: true },
                        { id: 'b3', ad: false },
                    ],
                },
            ],
        };

        const result = jsonPath(source, root, '$.groups.*.items[?(@.ad==true)]', nativeObjects);

        expect(result).toStrictEqual({
            groups: [
                {
                    items: [
                        { id: 'a2', ad: false },
                    ],
                },
                {
                    items: [
                        { id: 'b1', ad: false },
                        { id: 'b3', ad: false },
                    ],
                },
            ],
        });
    });

    test('Removes all nodes with nested SponsoredData typename', () => {
        const root = {
            edges: {
                node: [
                    { payload: { __typename: 'SponsoredData' }, id: 1 },
                    { payload: { __typename: 'OrganicData' }, id: 2 },
                ],
            },
        };

        const result = jsonPath(source, root, '$..node[?.*.__typename=="SponsoredData"]', nativeObjects);

        expect(result.edges.node).toStrictEqual([
            { payload: { __typename: 'OrganicData' }, id: 2 },
        ]);
    });

    test('Removes ads and source from article and video content', () => {
        const root = {
            content: {
                article: {
                    source: 'example.com',
                    ads: true,
                    displayed: true,
                },
                video: {
                    source: 'example.com',
                    ads: true,
                    displayed: true,
                },
                content: {
                    source: 'example.com',
                    displayed: true,
                },
            },
        };

        const result = jsonPath(source, root, '$.content[article, video].[ads, source]', nativeObjects);

        expect(result).toStrictEqual({
            content: {
                article: {
                    displayed: true,
                },
                video: {
                    displayed: true,
                },
                content: {
                    source: 'example.com',
                    displayed: true,
                },
            },
        });
    });

    test('Sets ads_audio to false everywhere', () => {
        const root = {
            data: {
                ads_audio: true,
                nested: {
                    ads_audio: true,
                },
            },
        };

        const result = jsonPath(source, root, '$..ads_audio=false', nativeObjects);

        expect(result).toStrictEqual({
            data: {
                ads_audio: false,
                nested: {
                    ads_audio: false,
                },
            },
        });
    });

    test('Sets visibility status to hidden when type is ads', () => {
        const root = {
            type: 'ads',
            content: {
                advertiser_brand: {
                    name: 'Test',
                    url: 'https://example.org/',
                },
            },
            visibility: {
                status: 'allowed',
                reason: null,
            },
            debug_info: null,
        };

        const result = jsonPath(
            source,
            root,
            '[?.type == "ads"].visibility.status=hidden',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            type: 'ads',
            content: {
                advertiser_brand: {
                    name: 'Test',
                    url: 'https://example.org/',
                },
            },
            visibility: {
                status: 'hidden',
                reason: null,
            },
            debug_info: null,
        });
    });

    test('Merges parsed JSON object into an existing target object', () => {
        const root = {
            foo: {
                a: {
                    old: 0,
                },
                c: 3,
            },
        };

        const expression = buildJsonPathExpression('$.foo', 'json:{"a":{"test":1},"b":{"c":1}}');
        const result = jsonPath(source, root, expression, nativeObjects);

        expect(result).toStrictEqual({
            foo: {
                a: {
                    test: 1,
                },
                b: {
                    c: 1,
                },
                c: 3,
            },
        });
    });

    test('Does not create missing intermediate objects when selector matches nothing', () => {
        const root = {
            config: {},
        };

        const result = jsonPath(source, root, '$.config.ads.blocked=true', nativeObjects);

        expect(result).toStrictEqual({
            config: {},
        });
    });

    test('Merges parsed JSON object into an existing target object', () => {
        const root = {
            config: {},
        };

        const expression = buildJsonPathExpression('$..', 'json:{"a":{"test":1},"b":{"c":1}}');
        const result = jsonPath(source, root, expression, nativeObjects);

        expect(result).toStrictEqual({
            config: {},
            a: {
                test: 1,
            },
            b: {
                c: 1,
            },
        });
    });

    test('Can reproduce nested legacy path creation by appending to an existing parent object', () => {
        const root = {
            config: {},
        };

        const result = jsonPath(source, root, '$.config+={"ads":{"blocked":true}}', nativeObjects);

        expect(result).toStrictEqual({
            config: {
                ads: {
                    blocked: true,
                },
            },
        });
    });

    test('Appends object properties when root guard and client filter match', () => {
        const root = {
            session: {
                userAgent: 'channel-web',
            },
            data: {
                client: {
                    clientName: 'WEB',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '[?..userAgent*="channel"]..client[?.clientName=="WEB"]+={"clientScreen":"CHANNEL"}',
            nativeObjects,
        );

        expect(result.data.client).toStrictEqual({
            clientName: 'WEB',
            clientScreen: 'CHANNEL',
        });
    });

    test('Appends object properties when root guard and client filter match', () => {
        const root = {
            session: {
                userAgent: 'channel-web',
            },
            data: {
                client: {
                    clientName: 'WEB',
                    clientScreen: 'WEB',
                    clientVersion: '1.0',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '[?..userAgent*="channel"]..client[?.clientName=="WEB"]+={"clientScreen":"CHANNEL"}',
            nativeObjects,
        );

        expect(result.data.client).toStrictEqual({
            clientName: 'WEB',
            clientScreen: 'CHANNEL',
            clientVersion: '1.0',
        });
    });

    test('Replaces referer when regex root guard matches', () => {
        const root = {
            meta: {
                userAgent: 'video-player',
            },
            request: {
                referer: 'https://example.org/video',
            },
        };

        const result = jsonPath(
            source,
            root,
            '[?..userAgent=/foo|bar|video-player|baz|asdf/]..referer=replace({"regex":"$","replacement":"#test"})',
            nativeObjects,
        );

        expect(result.request.referer).toBe('https://example.org/video#test');
    });

    test('Replaces referer when regex root guard matches', () => {
        const root = {
            meta: {
                userAgent: 'video-player',
            },
            request: {
                referer: 'https://example.org/videoads',
            },
        };

        const result = jsonPath(
            source,
            root,
            // eslint-disable-next-line max-len
            '[?..userAgent=/foo|bar|video-player|baz|asdf/]..referer=replace({"regex":"videoads","replacement":"video"})',
            nativeObjects,
        );

        expect(result.request.referer).toBe('https://example.org/video');
    });

    test('Sets noopFunc and trueFunc values', () => {
        const root = {
            data: {
                noop: null,
                truthy: null,
            },
        };

        jsonPath(source, root, '$..noop=noopFunc', nativeObjects);
        const result = jsonPath(source, root, '$..truthy=trueFunc', nativeObjects);

        expect(typeof result.data.noop).toBe('function');
        expect(result.data.noop()).toBeUndefined();
        expect(typeof result.data.truthy).toBe('function');
        expect(result.data.truthy()).toBe(true);
    });

    test('Leaves data unchanged when a guard does not match', () => {
        const root = {
            session: {
                userAgent: 'organic-web',
            },
            data: {
                client: {
                    clientName: 'WEB',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '[?..userAgent*="channel"]..client+={"clientScreen":"CHANNEL"}',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            session: {
                userAgent: 'organic-web',
            },
            data: {
                client: {
                    clientName: 'WEB',
                },
            },
        });
    });

    test('Appends object properties to the root object', () => {
        const root = {};

        const result = jsonPath(
            source,
            root,
            '$.+={"ads":"false","foo": 123}',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            ads: 'false',
            foo: 123,
        });
    });

    test('Appends object properties to an existing root object', () => {
        const root = { test: 1 };

        const result = jsonPath(
            source,
            root,
            '$.+={"ads":"false","foo": 123}',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            test: 1,
            ads: 'false',
            foo: 123,
        });
    });

    test('Removes recommendation items when nested adClickLog contains clickUrl', () => {
        const root = [
            {
                data: {
                    poiRecommendations: {
                        chips: null,
                        recommendations: [
                            {
                                category: 'restaurant',
                                items: [
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '220m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 2216,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: {
                                            clickUrl: 'https://example.org/ad_click',
                                        },
                                        adDescription: null,
                                        adId: null,
                                        distance: '190m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 852,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '30m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 809,
                                        title: 'Test',
                                    },
                                ],
                                recommendType: 'similar',
                                __typename: 'PoiRecommendation',
                            },
                            {
                                category: 'cafe',
                                items: [
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: 1,
                                        adDescription: null,
                                        adId: null,
                                        distance: '2.7km',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 3564,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: {
                                            clickUrl: 'https://example.org/ad_click',
                                        },
                                        adDescription: null,
                                        adId: null,
                                        distance: '960m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 91,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '720m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 122,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '720m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 109,
                                        title: 'Test',
                                    },
                                ],
                                recommendType: 'next',
                                __typename: 'PoiRecommendation',
                            },
                        ],
                        __typename: 'PoiRecommendationsResult',
                    },
                },
            },
        ];

        const result = jsonPath(
            source,
            root,
            '$..data.poiRecommendations.recommendations..items.*[?.adClickLog.clickUrl]',
            nativeObjects,
        );

        expect(result).toStrictEqual([
            {
                data: {
                    poiRecommendations: {
                        chips: null,
                        recommendations: [
                            {
                                category: 'restaurant',
                                items: [
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '220m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 2216,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '30m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 809,
                                        title: 'Test',
                                    },
                                ],
                                recommendType: 'similar',
                                __typename: 'PoiRecommendation',
                            },
                            {
                                category: 'cafe',
                                items: [
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: 1,
                                        adDescription: null,
                                        adId: null,
                                        distance: '2.7km',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 3564,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '720m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 122,
                                        title: 'Test',
                                    },
                                    {
                                        __typename: 'RecommendationItem',
                                        adClickLog: null,
                                        adDescription: null,
                                        adId: null,
                                        distance: '720m',
                                        imageUrls: [
                                            {
                                                __typename: 'RecommendationImageUrl',
                                                rank: 1,
                                                url: 'https://example.org/image1.jpg',
                                            },
                                        ],
                                        impressionEventUrl: null,
                                        reviewCount: 109,
                                        title: 'Test',
                                    },
                                ],
                                recommendType: 'next',
                                __typename: 'PoiRecommendation',
                            },
                        ],
                        __typename: 'PoiRecommendationsResult',
                    },
                },
            },
        ]);
    });

    test('Returns original data when replace payload is invalid', () => {
        const root = {
            request: {
                referer: 'https://example.org/video',
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..referer=replace({"regex":"[","replacement":"#broken"})',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            request: {
                referer: 'https://example.org/video',
            },
        });
    });

    test('Keeps the root unchanged when selector matches nothing', () => {
        const root = createStoreRoot();

        const result = jsonPath(source, root, '$..magazine[0]', nativeObjects);

        expect(result).toStrictEqual(createStoreRoot());
    });
});
