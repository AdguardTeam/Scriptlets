import {
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { buildJsonPathExpression, jsonPath, matchesJsonPath } from '../../src/helpers';

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

    test('All books besides that at the path pointing to the first', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$.store.book[1:]',
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

    test('Remove everything if there is price or isbn in root', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '[?($..price || $..isbn)].*',
            nativeObjects,
        );

        expect(result).toStrictEqual({});
    });

    test('Remove everything if there is price or fooBar in root', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '[?($..price || $..fooBar)].*',
            nativeObjects,
        );

        expect(result).toStrictEqual({});
    });

    test('Remove everything if there is price and isbn in root', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '[?($..price && $..isbn)].*',
            nativeObjects,
        );

        expect(result).toStrictEqual({});
    });

    test('Remove all videos with "_ads_" in the key', () => {
        const root = {
            videos: {
                video_ads_1: {
                    title: 'Test video 1',
                    src: 'https://example.com/video1.mp4',
                },
                video_ads_2: {
                    title: 'Test video 2',
                    src: 'https://example.com/video2.mp4',
                },
                video_ads_3: {
                    title: 'Test video 3',
                    src: 'https://example.com/video3.mp4',
                },
                content_video_1: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_video_2: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_video_3: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.videos[/_ads_/]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            videos: {
                content_video_1: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_video_2: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_video_3: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        });
    });

    test('Remove all videos that ends with "_ads" in the key', () => {
        const root = {
            videos: {
                video_1_ads: {
                    title: 'Test video 1',
                    src: 'https://example.com/video1.mp4',
                },
                video_2_ads: {
                    title: 'Test video 2',
                    src: 'https://example.com/video2.mp4',
                },
                video_3_ads: {
                    title: 'Test video 3',
                    src: 'https://example.com/video3.mp4',
                },
                content_1_no_ads_video: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_2_no_ads_video: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_3_no_ads_video: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.videos[/_ads$/]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            videos: {
                content_1_no_ads_video: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_2_no_ads_video: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_3_no_ads_video: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        });
    });

    test('Remove all "src" from videos with "_ads_" in the key', () => {
        const root = {
            videos: {
                video_ads_1: {
                    title: 'Test video 1',
                    src: 'https://example.com/video1.mp4',
                },
                video_ads_2: {
                    title: 'Test video 2',
                    src: 'https://example.com/video2.mp4',
                },
                video_ads_3: {
                    title: 'Test video 3',
                    src: 'https://example.com/video3.mp4',
                },
                content_video_1: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_video_2: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_video_3: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.videos[/_ads_/].src',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            videos: {
                video_ads_1: {
                    title: 'Test video 1',
                },
                video_ads_2: {
                    title: 'Test video 2',
                },
                video_ads_3: {
                    title: 'Test video 3',
                },
                content_video_1: {
                    title: 'Test content video 1',
                    src: 'https://example.com/content_video1.mp4',
                },
                content_video_2: {
                    title: 'Test content video 2',
                    src: 'https://example.com/content_video2.mp4',
                },
                content_video_3: {
                    title: 'Test content video 3',
                    src: 'https://example.com/content_video3.mp4',
                },
            },
        });
    });

    test('Removes matching keys recursively with regex "^ads_" property selector', () => {
        const root = {
            data: {
                ads_audio: true,
                nested: {
                    ads_video: true,
                    organic_video: true,
                },
            },
            ads_banner: {
                enabled: true,
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..[/^ads_/]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            data: {
                nested: {
                    organic_video: true,
                },
            },
        });
    });

    test('Removes matching keys recursively with regex "^ads_" property selector and specific "advert" keys', () => {
        const root = {
            data: {
                ads_audio: true,
                nested: {
                    ads_video: true,
                    organic_video: true,
                },
            },
            ads_banner: {
                enabled: true,
            },
            advert: {
                enabled: true,
            },
            no_advert: {
                enabled: true,
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..[/^ads_/, advert]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            data: {
                nested: {
                    organic_video: true,
                },
            },
            no_advert: {
                enabled: true,
            },
        });
    });

    test('Removes cards when filter path uses regex property selector', () => {
        const root = {
            cards: [
                {
                    video_ads_1: {
                        type: 'video',
                    },
                    id: 1,
                },
                {
                    content_video_1: {
                        type: 'video',
                    },
                    id: 2,
                },
                {
                    banner_ads_1: {
                        type: 'banner',
                    },
                    id: 3,
                },
            ],
        };

        const result = jsonPath(
            source,
            root,
            '$.cards[?(@[/_ads_/].type=="video")]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            cards: [
                {
                    content_video_1: {
                        type: 'video',
                    },
                    id: 2,
                },
                {
                    banner_ads_1: {
                        type: 'banner',
                    },
                    id: 3,
                },
            ],
        });
    });

    test('Removes books with price greater than 10 and title matching regex', () => {
        const root = {
            books: [
                {
                    test_title_1: 'Book 1',
                    price_1: 8,
                },
                {
                    title_2: 'Book 2',
                    price_2: 15,
                },
                {
                    test_title_3: 'Book 3',
                    price_3: 20,
                },
                {
                    title_4: 'Book 4',
                    price_4: 5,
                },
                {
                    title_5: 'Book 5',
                    price_5: 25,
                },
                {
                    title_6: 'Book Test',
                    price_6: 100,
                },
            ],
        };

        const result = jsonPath(
            source,
            root,
            '$.books[?(@[/^price_/] > 10 && @[/title_/]=~/Book \\d+/)]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            books: [
                {
                    test_title_1: 'Book 1',
                    price_1: 8,
                },
                {
                    title_4: 'Book 4',
                    price_4: 5,
                },
                {
                    title_6: 'Book Test',
                    price_6: 100,
                },
            ],
        });
    });

    test('Remove everything if there is price and isbn and fooBar in root (nothing should be removed)', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '[?($..price && $..isbn && $..fooBar)].*',
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

    test('Matches JSONPath selector without mutating the input', () => {
        const root = createStoreRoot();
        const snapshot = JSON.parse(JSON.stringify(root));

        const result = matchesJsonPath(source, root, '$..book[?(@.isbn)]', nativeObjects);

        expect(result).toBe(true);
        expect(root).toStrictEqual(snapshot);
    });

    test('Returns false when JSONPath selector does not match', () => {
        const root = createStoreRoot();
        const snapshot = JSON.parse(JSON.stringify(root));

        const result = matchesJsonPath(source, root, '$..book[?(@.price>100)]', nativeObjects);

        expect(result).toBe(false);
        expect(root).toStrictEqual(snapshot);
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

    test('Sets values selected by regex property selector', () => {
        const root = {
            flags: {
                ads_audio: true,
                ads_video: true,
                content_video: true,
                content_audio_no_ads_test: true,
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.flags[/^ads_/]=false',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            flags: {
                ads_audio: false,
                ads_video: false,
                content_video: true,
                content_audio_no_ads_test: true,
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

    test('Does not hang on circular reference during recursive descent', () => {
        const obj = { a: 1, nested: { b: 2 } };
        obj.nested.parent = obj;

        const result = jsonPath(source, obj, '$..a', nativeObjects);

        // $..a removed all `a` properties; cycle protection means traversal
        // terminated cleanly rather than hanging
        expect(result.a).toBeUndefined();
        expect(result.nested.b).toBe(2);
    });

    test('Does not hang on circular reference behind a non-caching proxy', () => {
        // Same circular data as above, but wrapped by a proxy that returns
        // a FRESH wrapper on every property read (a non-caching membrane).
        // Object identity is different on each visit, so the WeakSet-based
        // cycle protection never detects the cycle and recursive descent
        // re-enters the same circular structure forever.
        const data = { a: 1, nested: { b: 2 } };
        data.nested.parent = data;

        // The underlying data holds only 2 objects; the traversal budget
        // (MAX_RECURSIVE_CANDIDATES) must stop the descent, so the guard sits
        // well above it and only fires if the budget fails. The guard throws
        // to fail fast instead of hanging the test runner — a synchronous
        // infinite loop could not be interrupted by the test timeout. The
        // throw is swallowed by jsonPath's internal try/catch, so the
        // assertion below is on the wrap counter.
        const WRAP_LIMIT = 250000;
        let wrapCount = 0;
        const wrap = (target) => {
            if (target === null || typeof target !== 'object') {
                return target;
            }
            wrapCount += 1;
            if (wrapCount > WRAP_LIMIT) {
                throw new Error('Recursive descent did not terminate');
            }
            return new Proxy(target, {
                get(innerTarget, prop, receiver) {
                    return wrap(Reflect.get(innerTarget, prop, receiver));
                },
            });
        };

        jsonPath(source, wrap(data), '$..b', nativeObjects);

        expect(wrapCount).toBeLessThan(WRAP_LIMIT);
    });

    test('Applies recursive descent before a filter step', () => {
        const root = { deep: { items: [{ val: 1 }, { val: 9 }] } };

        // `$..[?(...)]` must test every descendant, like the equivalent
        // `$..items[?(@.val==1)]` does, instead of applying the filter
        // to the root candidate only
        const result = jsonPath(source, root, '$..[?(@.val==1)].val=2', nativeObjects);

        expect(result.deep.items[0].val).toBe(2);
        expect(result.deep.items[1].val).toBe(9);
    });

    test('Recursive filter step matches candidates at multiple nesting levels', () => {
        // Both the top-level array and the nested array contain items that
        // satisfy the filter; `$..[?(...)]` must reach all of them.
        const root = {
            items: [{ enabled: true }, { enabled: false }],
            group: {
                items: [{ enabled: true }, { enabled: true }],
            },
        };

        const result = jsonPath(source, root, '$..[?(@.enabled==true)].enabled=false', nativeObjects);

        expect(result.items[0].enabled).toBe(false);
        expect(result.items[1].enabled).toBe(false);
        expect(result.group.items[0].enabled).toBe(false);
        expect(result.group.items[1].enabled).toBe(false);
    });

    test('Recursive filter step remove mode', () => {
        const root = {
            ads: [{ blocked: true, id: 1 }, { blocked: false, id: 2 }],
            sidebar: {
                ads: [{ blocked: true, id: 3 }],
            },
        };

        // remove every object that has `blocked: true` anywhere in the tree
        const result = jsonPath(source, root, '$..[?(@.blocked==true)]', nativeObjects);

        expect(result.ads.length).toBe(1);
        expect(result.ads[0].id).toBe(2);
        expect(result.sidebar.ads.length).toBe(0);
    });

    test('Recursive filter step with logical AND condition', () => {
        const root = {
            level1: {
                level2: {
                    items: [
                        { type: 'ad', active: true },
                        { type: 'ad', active: false },
                        { type: 'content', active: true },
                    ],
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..[?(@.type=="ad"&&@.active==true)].active=false',
            nativeObjects,
        );

        expect(result.level1.level2.items[0].active).toBe(false);
        expect(result.level1.level2.items[1].active).toBe(false);
        expect(result.level1.level2.items[2].active).toBe(true);
    });

    test('Recursive descent depth limit: node at the limit is matched, node one step beyond is not', () => {
        // MAX_RECURSIVE_DEPTH = 1000.
        //
        // The traversal queue is filled level-by-level:
        //   - Expanding a node at depth 999 adds its children (depth 1000) to
        //     the queue. Those children are collected and are matchable.
        //   - When the traversal tries to expand the first depth-1000 node,
        //     childDepth becomes 1001 > 1000, so the entire remaining queue
        //     is abandoned — not just that one subtree.
        //   - Nodes at depth 1001+ are never queued and never matchable.
        //
        // The depth limit therefore stops the whole remaining traversal, not
        // just one branch. Nodes up to and including depth 1000 are still
        // reachable because they were already queued by their parents.

        // Build a linear chain 1002 levels deep: root -> n1 -> n2 -> ... -> n1001
        const root = {};
        let node = root;
        for (let i = 1; i <= 1001; i += 1) {
            node.next = {};
            node = node.next;
        }

        // `node` is now at depth 1001 (beyond the limit).
        // Walk from root to get the node exactly at the limit (depth 1000).
        const nodeBeyondLimit = node;
        let nodeAtLimit = root;
        for (let i = 0; i < 1000; i += 1) {
            nodeAtLimit = nodeAtLimit.next;
        }

        nodeAtLimit.marker = 'at-limit'; // depth 1000 — should be matched
        nodeBeyondLimit.marker = 'beyond'; // depth 1001 — should be skipped

        jsonPath(source, root, '$..marker', nativeObjects);

        // The node at the limit was reachable: its `marker` was removed
        expect(nodeAtLimit.marker).toBeUndefined();
        // The node one step beyond was never queued: its `marker` is untouched
        expect(nodeBeyondLimit.marker).toBe('beyond');
    });

    test('Can remove a Uint8Array property via direct path', () => {
        const root = { payload: new Uint8Array(150000), other: 1 };

        const result = jsonPath(source, root, '$.payload', nativeObjects);

        expect(result.payload).toBeUndefined();
        expect(result.other).toBe(1);
    });

    test('Can remove a Uint8Array property via recursive descent', () => {
        const root = { data: { payload: new Uint8Array(150000), other: 1 } };

        const result = jsonPath(source, root, '$..payload', nativeObjects);

        expect(result.data.payload).toBeUndefined();
        expect(result.data.other).toBe(1);
    });

    test('Can replace a Uint8Array property with an empty array', () => {
        const root = { data: { payload: new Uint8Array(150000), other: 1 } };

        const result = jsonPath(source, root, '$..payload=[]', nativeObjects);

        expect(Array.isArray(result.data.payload)).toBe(true);
        expect(result.data.payload.length).toBe(0);
        expect(result.data.other).toBe(1);
    });

    test('Large array of primitives does not exhaust the traversal budget', () => {
        // Primitives (numbers, strings, booleans) can never form a cycle, so
        // they must not count against MAX_RECURSIVE_CANDIDATES. A real-world
        // JSON response with a 100 000-element array of numbers would otherwise
        // fire the budget before reaching any other property in the tree.
        const root = {
            data: new Array(150000).fill(0).map((_, i) => i),
            config: { ads: { enabled: true } },
        };

        const result = jsonPath(source, root, '$..enabled=false', nativeObjects);

        expect(result.config.ads.enabled).toBe(false);
    });

    test('Skips typed array elements during recursive descent', () => {
        // A Uint8Array exposes every element as a numbered key via Object.keys.
        // Without the ArrayBuffer.isView guard each byte becomes a
        // JsonPathCandidate pushed to the traversal queue: 5,000,000 bytes
        // generate ~5M objects and take ~500ms to process. With the guard
        // the array is skipped in O(1) and only meaningful properties are queued.
        const root = {
            payload: new Uint8Array(5_000_000),
            config: {
                ads: { enabled: true },
            },
        };

        const start = performance.now();
        const result = jsonPath(source, root, '$..enabled=false', nativeObjects);
        const elapsed = performance.now() - start;

        expect(result.config.ads.enabled).toBe(false);
        // Without the guard this takes ~500ms on modern hardware.
        // A 200ms threshold gives enough headroom for slower machines while
        // still catching the regression.
        expect(elapsed).toBeLessThan(200);
    });

    test('Non-caching proxy traversal is bounded and returns partial results', () => {
        // Unlike the hang test above, this verifies that once the budget fires
        // the function still returns the root unchanged rather than throwing
        // or returning undefined.
        const data = { keep: 'this', nested: {} };
        data.nested.parent = data;

        const wrap = (target) => {
            if (target === null || typeof target !== 'object') {
                return target;
            }
            return new Proxy(target, {
                get(innerTarget, prop, receiver) {
                    return wrap(Reflect.get(innerTarget, prop, receiver));
                },
            });
        };

        const result = jsonPath(source, wrap(data), '$..missing', nativeObjects);

        // traversal terminated early but the root object is returned intact
        expect(result).toBeDefined();
        expect(result.keep).toBe('this');
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

    test('Appends payload to objects selected by regex property selector', () => {
        const root = {
            widgets: {
                ad_card: {
                    visible: true,
                },
                ad_modal: {
                    blocked: false,
                    visible: false,
                },
                organic_card: {
                    visible: true,
                },
                organic_not_ad: {
                    visible: true,
                },
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.widgets[/^ad_/]+={"blocked":true}',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            widgets: {
                ad_card: {
                    blocked: true,
                    visible: true,
                },
                ad_modal: {
                    blocked: true,
                    visible: false,
                },
                organic_card: {
                    visible: true,
                },
                organic_not_ad: {
                    visible: true,
                },
            },
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

    test('Removes books matching OR filter where both conditions are individually parenthesized', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..book[?(@.category == "reference") || (@.price > 20)]',
            nativeObjects,
        );

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

    test('Removes books matching AND filter where both conditions are individually parenthesized', () => {
        const root = createStoreRoot();

        const result = jsonPath(
            source,
            root,
            '$..book[?(@.category == "fiction") && (@.price < 15)]',
            nativeObjects,
        );

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

    test('Handles bracket-notation access on a property key ending with a backslash', () => {
        const root = {
            'prefix\\': 'value',
            other: 'kept',
        };

        // JSONPath $['prefix\\'] — the key contains one trailing backslash.
        // As a JavaScript string literal that is "$['prefix\\\\']".
        const result = jsonPath(
            source,
            root,
            "$['prefix\\\\']",
            nativeObjects,
        );

        expect(result).toStrictEqual({ other: 'kept' });
    });

    test('Handles double-quoted access on a key with a backslash before a quote', () => {
        const root = {
            "prefix\\'": 'value',
            other: 'kept',
        };

        // JSONPath $["prefix\\'"] — the token contains the overlapping `\\'`
        // the key is "prefix\'"
        const result = jsonPath(
            source,
            root,
            '$["prefix\\\\\'"]',
            nativeObjects,
        );

        expect(result).toStrictEqual({ other: 'kept' });
    });

    test('Handles backtick-quoted access on a key with a backslash before a backtick', () => {
        const root = {
            'prefix\\`': 'value',
            other: 'kept',
        };

        // JSONPath $["prefix\\`"] — the token contains the overlapping `\\``
        // the key is "prefix\`"
        const result = jsonPath(
            source,
            root,
            '$["prefix\\\\`"]',
            nativeObjects,
        );

        expect(result).toStrictEqual({ other: 'kept' });
    });

    test('Handles single-quoted access on a key with a backslash before a quote', () => {
        const root = {
            'prefix\\\'': 'value',
            other: 'kept',
        };

        // JSONPath $['prefix\\\''] — the key contains one trailing backslash and a single quote.
        // As a JavaScript string literal that is "$['prefix\\\\\\'']".
        // The key is "prefix\'"
        const result = jsonPath(
            source,
            root,
            "$['prefix\\\\\\'']",
            nativeObjects,
        );

        expect(result).toStrictEqual({ other: 'kept' });
    });

    test('Removes books cheaper than root-level maxPrice using root-relative filter path', () => {
        const root = {
            maxPrice: 10,
            store: {
                book: [
                    { title: 'Cheap', price: 5 },
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.store.book[?(@.price < $.maxPrice)]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            maxPrice: 10,
            store: {
                book: [
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        });
    });

    test('Removes books cheaper than maxPrice using recursive descent', () => {
        const root = {
            store: {
                maxPrice: 10,
                book: [
                    { title: 'Cheap', price: 5 },
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.store.book[?(@.price < $..maxPrice)]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                maxPrice: 10,
                book: [
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        });
    });

    test('Removes books cheaper than maxPrice using recursive descent with bracket notation', () => {
        const root = {
            store: {
                maxPrice: 10,
                book: [
                    { title: 'Cheap', price: 5 },
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        };

        const result = jsonPath(
            source,
            root,
            '$.store.book[?(@.price < $..[maxPrice])]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            store: {
                maxPrice: 10,
                book: [
                    { title: 'Mid', price: 15 },
                    { title: 'Expensive', price: 25 },
                ],
            },
        });
    });

    test('Handles filter comparison whose left-hand side path contains a nested filter expression', () => {
        const root = {
            rows: [
                {
                    // Row 1 has a tag named "sponsored".
                    tags: [{ name: 'sponsored', active: true }, { name: 'organic' }],
                    id: 1,
                },
                {
                    // Row 2 has no "sponsored" tag.
                    tags: [{ name: 'organic' }],
                    id: 2,
                },
            ],
        };

        const result = jsonPath(
            source,
            root,
            '$.rows[?(@.tags[?(@.name == "sponsored")].name == "sponsored")]',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            rows: [
                {
                    tags: [{ name: 'organic' }],
                    id: 2,
                },
            ],
        });
    });

    test('Returns original data when replace payload has missing regex field', () => {
        const root = {
            request: {
                referer: 'https://example.org/video',
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..referer=replace({"replacement":"#broken"})',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            request: {
                referer: 'https://example.org/video',
            },
        });
    });

    test('Returns original data when replace payload has non-string regex field', () => {
        const root = {
            request: {
                referer: 'https://example.org/video',
            },
        };

        const result = jsonPath(
            source,
            root,
            '$..referer=replace({"regex":123,"replacement":"#broken"})',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            request: {
                referer: 'https://example.org/video',
            },
        });
    });

    test('Recursive descent traverses deeply nested structures', () => {
        // Builds a 100-level deep structure to verify index-based BFS
        // does not degrade with depth.
        let root = { value: 'test' };
        for (let i = 0; i < 100; i += 1) {
            root = { child: root };
        }

        const result = jsonPath(source, root, '$..value', nativeObjects);

        // The deeply nested "value" property should be removed
        const findValue = (obj) => {
            if (obj && typeof obj === 'object') {
                if ('value' in obj) return true;
                return Object.values(obj).some(findValue);
            }
            return false;
        };
        expect(findValue(result)).toBe(false);
    });
});

describe('jsonPath time keywords', () => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    // Tolerance in ms, should be greater than one second
    // because '$currentDate$' value has no milliseconds in it
    const TOLERANCE_MS = 2000;

    test('Sets current time as a value of the existing key for $now$ value', () => {
        const root = { data: { now: 1 } };

        const result = jsonPath(source, root, '$.data.now=$now$', nativeObjects);

        expect(typeof result.data.now).toBe('number');
        expect(Date.now() - result.data.now).toBeLessThan(TOLERANCE_MS);
    });

    test('Sets a value with $now$ keyword used as a part of it', () => {
        const root = { config: { consent: 'none' } };

        const result = jsonPath(source, root, '$.config.consent=accepted at $now$', nativeObjects);

        expect(result.config.consent).toMatch(/^accepted at \d+$/);
    });

    test('Sets a json value with multiple keywords used as a part of it', () => {
        const root = { config: {} };

        const result = jsonPath(
            source,
            root,
            '$.config=json:{"count":1,"firstTime":$now$,"date":"$currentISODate$"}',
            nativeObjects,
        );

        expect(result.config.count).toBe(1);
        expect(typeof result.config.firstTime).toBe('number');
        // all the keywords are replaced with the very same time
        expect(new Date(result.config.date).getTime()).toBe(result.config.firstTime);
        expect(Date.now() - result.config.firstTime).toBeLessThan(TOLERANCE_MS);
    });

    test('Appends a json payload with $now$ keyword used as a part of it', () => {
        const root = { config: { ads: true } };

        const result = jsonPath(source, root, '$.config+={"firstTime":$now$}', nativeObjects);

        expect(result.config.ads).toBe(true);
        expect(typeof result.config.firstTime).toBe('number');
        expect(Date.now() - result.config.firstTime).toBeLessThan(TOLERANCE_MS);
    });

    test('Appends an array payload with $now$ keyword used as a part of it', () => {
        const root = { times: [1] };

        const result = jsonPath(source, root, '$.times+=[$now$]', nativeObjects);

        expect(result.times).toHaveLength(2);
        expect(Date.now() - result.times[1]).toBeLessThan(TOLERANCE_MS);
    });

    test('Uses $now$ keyword in the replace() replacement', () => {
        const root = { referer: 'time:none' };

        const result = jsonPath(
            source,
            root,
            '$.referer=replace({"regex":"none","replacement":"$now$"})',
            nativeObjects,
        );

        expect(result.referer).toMatch(/^time:\d+$/);
    });

    test('Keyword in the replace() regexp is used as is', () => {
        const FIXED_TIME = '2026-07-28T12:00:00.000Z';
        vi.useFakeTimers();
        vi.setSystemTime(new Date(FIXED_TIME));

        // Content is the very time which the keyword would be resolved to,
        // so the replacement is applied if the keyword in the regexp is resolved
        const currentTime = `${Date.parse(FIXED_TIME)}`;
        const root = { referer: currentTime };

        const result = jsonPath(
            source,
            root,
            '$.referer=replace({"regex":"$now$","replacement":"replaced"})',
            nativeObjects,
        );

        // Regexp is a match pattern, so the keyword in it is not resolved
        // and such a regexp matches nothing
        expect(result.referer).toBe(currentTime);

        vi.useRealTimers();
    });

    test('Keyword-like value is not modified', () => {
        const root = { config: { consent: 'none' } };

        const result = jsonPath(source, root, '$.config.consent=$now', nativeObjects);

        expect(result.config.consent).toBe('$now');
    });
});
