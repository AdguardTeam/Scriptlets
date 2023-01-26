import { parseMatchProps } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

const GET_METHOD = 'GET';
const METHOD_PROP = 'method';
const URL_PROP = 'url';

const URL1 = 'example.com';
const URL2 = 'http://example.com';
const URL3 = '/^https?://example.org/';
const URL4 = '/^https?://example.org/section#user:45/comments/';

test('Test parseMatchProps with different url props, simple input', (assert) => {
    assert.strictEqual(parseMatchProps(URL1).url, URL1, 'No url match prop, no protocol, not regexp');
    assert.strictEqual(parseMatchProps(`url:${URL1}`).url, URL1, 'url match prop, no protocol, not regexp');

    assert.strictEqual(parseMatchProps(URL2).url, URL2, 'No url match prop, has protocol, not regexp');
    assert.strictEqual(parseMatchProps(`url:${URL2}`).url, URL2, 'url match prop, has protocol, not regexp');

    assert.strictEqual(parseMatchProps(URL3).url, URL3, 'No url match prop, has protocol, regexp');
    assert.strictEqual(parseMatchProps(`url:${URL3}`).url, URL3, 'url match prop, has protocol, regexp');

    assert.strictEqual(parseMatchProps(URL4).url, URL4, 'No url match prop, has protocol, regexp, extra colon in url');
    assert.strictEqual(parseMatchProps(`url:${URL4}`).url, URL4, 'url match prop, has protocol, extra colon in url');
});

test('Test parseMatchProps with different url props, mixed input', (assert) => {
    const INPUT1 = `${URL1} ${METHOD_PROP}:${GET_METHOD}`;
    const expected1 = {
        url: URL1,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(parseMatchProps(INPUT1), expected1, 'No url match prop, no protocol, not regexp');

    const INPUT1_PREFIXED = `${URL_PROP}:${URL1} ${METHOD_PROP}:${GET_METHOD}`;
    const expectedPrefixed1 = {
        url: URL1,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(
        parseMatchProps(INPUT1_PREFIXED),
        expectedPrefixed1,
        'Has url match prop, no protocol, not regexp',
    );

    const INPUT2 = `${URL2} ${METHOD_PROP}:${GET_METHOD}`;
    const expected2 = {
        url: URL2,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(parseMatchProps(INPUT2), expected2, 'No url match prop, has protocol, not regexp');

    const INPUT2_PREFIXED = `${URL_PROP}:${URL2} ${METHOD_PROP}:${GET_METHOD}`;
    const expectedPrefixed2 = {
        url: URL2,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(
        parseMatchProps(INPUT2_PREFIXED),
        expectedPrefixed2,
        'Has url match prop, has protocol, not regexp',
    );

    const INPUT3 = `${URL3} ${METHOD_PROP}:${GET_METHOD}`;
    const expected3 = {
        url: URL3,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(parseMatchProps(INPUT3), expected3, 'No url match prop, has protocol, regexp');

    const INPUT3_PREFIXED = `${URL_PROP}:${URL3} ${METHOD_PROP}:${GET_METHOD}`;
    const expectedPrefixed3 = {
        url: URL3,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(parseMatchProps(INPUT3_PREFIXED), expectedPrefixed3, 'Has url match prop, has protocol, regexp');

    const INPUT4 = `${URL4} ${METHOD_PROP}:${GET_METHOD}`;
    const expected4 = {
        url: URL4,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(parseMatchProps(INPUT4), expected4, 'No url match prop, has protocol, regexp, extra colon in url');

    const INPUT4_PREFIXED = `${URL_PROP}:${URL4} ${METHOD_PROP}:${GET_METHOD}`;
    const expectedPrefixed4 = {
        url: URL4,
        [METHOD_PROP]: GET_METHOD,
    };
    assert.deepEqual(
        parseMatchProps(INPUT4_PREFIXED),
        expectedPrefixed4,
        'Has url match prop, has protocol, regexp, extra colon in url',
    );
});
