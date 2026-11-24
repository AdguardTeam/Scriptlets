import {
    beforeAll,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { queryKameleoonSelector } from '../../src/helpers/kameleoon-selector';

// Names of the elements contain no digits, as all numbers of a selector with `:eq()` are its indexes.
const FIXTURE = `
<div id="fx" data-k="fx">
<h2 data-k="h2a">alpha</h2><h2 data-k="h2b">beta</h2><h2 data-k="h2c">gamma</h2><h2 data-k="h2d">delta</h2>
<span data-k="sa">first</span><span data-k="sb">second</span><span data-k="sc">third</span>
<ul data-k="ulA" class="list">
<li data-k="liAa">one<ul data-k="ulB"><li data-k="liBa">nested x</li></ul></li><li data-k="liAb">two x</li>
</ul>
<ul data-k="ulC" class="list"><li data-k="liCa">three</li></ul>
<div class="box" data-k="boxA">
<span data-k="bsa">x inside</span><span data-k="bsb">no</span><p data-k="bp"><span data-k="bsc">deep x</span></p>
</div>
<div class="box" data-k="boxB"><span data-k="bsd">nothing</span></div>
<div data-name="a b" data-k="attrAB"></div><div data-name="ab" data-k="attrABb"></div>
<input data-k="inp" disabled name="q">
<div id="1abc" data-k="digitId"><b data-k="digitB">bold</b></div>
<div class="col-6" data-k="cola"></div><div class="col-6" data-k="colb"></div>
<div class="col-6" data-k="colc"></div><div class="col-6" data-k="cold"></div>
<div class="col-6" data-k="cole"></div><div class="col-6" data-k="colf"></div>
<div class="col-6" data-k="colg"></div><div class="col-6" data-k="colh"></div>
<form data-k="form"><input data-k="fia" name="a"><input data-k="fib" name="b"></form>
<select data-k="sel"><option data-k="opa">oa</option><option data-k="opb">ob</option></select>
<a title=":eq" data-k="eqTitle">t</a>
<a href="#top" data-k="hash">top</a>
<div id="host" data-k="host"></div>
</div>`;

const getElement = (name: string): Element => document.querySelector(`[data-k="${name}"]`) as Element;

const getRoot = (name: string | null): unknown => {
    if (name === 'shadow') {
        return getElement('host').shadowRoot;
    }
    if (name === 'plain') {
        return {};
    }
    return name === null ? undefined : getElement(name);
};

describe('queryKameleoonSelector', () => {
    beforeAll(() => {
        document.body.innerHTML = FIXTURE;
        const shadowRoot = getElement('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<span data-k="sha">s one</span><span data-k="shb">s two</span>';
    });

    // Expected values are the results of `Kameleoon.API.Utils.querySelectorAll()` of the real engine
    // for the same fixture in Chrome and Firefox, or an empty array where the engine throws.
    test.each([
        // `:eq()`
        ['span:eq(1)', null, ['sb']],
        ['span:eq(0)', null, ['sa']],
        ['span:eq(99)', null, []],
        ['#fx > span:eq(2)', null, ['sc']],
        ['#fx span:eq(1)', null, ['sb']],
        ['.box:eq(1) span', null, ['bsd']],
        ['.box span:eq(1)', null, ['bsb']],
        ['.box:eq(0) span:eq(2)', null, ['bsc']],
        ['option:eq(1)', null, ['opb']],
        ['form:eq(0) input', null, ['fia', 'fib']],
        ["a[href='#top']:eq(0)", null, ['hash']],
        // all numbers of the selector are the indexes
        ['h2:eq(0)', null, ['h2c']],
        ['h2:eq(1)', null, ['h2c']],
        ['h2:eq(5)', null, ['h2c']],
        ['.col-6:eq(0)', null, ['colg']],
        ['.col-6:eq(1)', null, ['colg']],
        ['[data-k=boxA] span:eq(1)', null, []],
        // the part after `:eq()` matches descendants, also after `>`,
        // which must match the selector without `:eq()` in the document
        ['ul:eq(0) > li', null, ['liAa', 'liBa', 'liAb']],
        ['ul:eq(0) li', null, ['liAa', 'liBa', 'liAb']],
        ['ul:eq(1) li', null, ['liBa']],
        ['.list:eq(1) > li', null, ['liCa']],
        ['ul:eq(0) > li:eq(1)', null, ['liBa']],
        ['li:eq(0) ul', null, ['ulB']],
        ['li:eq(0) > ul > li', null, ['liBa']],
        // elements with a length, e.g. a form, are taken as lists of elements
        ['select:eq(0)', null, []],
        ['form:eq(0)', null, []],
        [':eq(0)', null, []],
        // `:contains()`
        ['span:contains("second")', null, ['sb']],
        ["span:contains('x')", null, ['bsa', 'bsc']],
        ['div:contains("x") span', null, ['bsa', 'bsc']],
        ['.box:contains("x")', null, ['boxA']],
        ['li:contains("x") ul', null, ['ulB']],
        ['span:contains("x"):eq(0)', null, []],
        ['span:eq(3):contains("x")', null, ['bsa']],
        [':contains("a") :contains("b")', null, []],
        // attributes and ids
        ['[data-name=a b]', null, ['attrAB']],
        ['div[data-name=ab]', null, ['attrABb']],
        ['input[name=q]', null, ['inp']],
        ["[data-name='a b']", null, ['attrAB']],
        ['[data-name="a b"]', null, ['attrAB']],
        ['div.box[data-k=boxA] span', null, []],
        ['a[href="#top"]', null, ['hash']],
        ['#1abc', null, ['digitId']],
        // `#1abc b` gives `digitB` in browsers, but jsdom does not support the escaped id with a descendant,
        // see the QUnit tests of the `kameleoon` redirect
        ['div #1abc', null, []],
        ['#1abc:eq(0) b', null, []],
        // plain and invalid selectors
        ['span', null, ['sa', 'sb', 'sc', 'bsa', 'bsb', 'bsc', 'bsd']],
        ['##invalid', null, []],
        ['', null, []],
        // the engine throws
        ['span:contains(third)', null, []],
        ['span:contains("")', null, []],
        ['[disabled][name=q]', null, []],
        ['span:eq(a)', null, []],
        ['div:eq(0) [', null, []],
        // the engine calls itself infinitely
        ['a[title=":eq"]', null, []],
        ['[title=":eq"]', null, []],
        // roots
        ['span', 'boxA', ['bsa', 'bsb', 'bsc']],
        ['span:eq(0)', 'boxA', ['bsa']],
        ['span:eq(1)', 'boxA', ['bsb']],
        ['p span:eq(0)', 'boxA', ['bsc']],
        ['span:contains("x")', 'boxA', ['bsa', 'bsc']],
        ['input:eq(1)', 'form', ['fib']],
        ['span', 'shadow', ['sha', 'shb']],
        ['span:contains("two")', 'shadow', ['shb']],
        // the selector without `:eq()` is matched in the document
        ['span:eq(0)', 'shadow', []],
        // a root which cannot be queried
        ['span', 'plain', []],
        ['span:eq(0)', 'plain', []],
    ])('%j in %j → %j', (selector, rootName, expected) => {
        const result = queryKameleoonSelector(selector, getRoot(rootName));
        expect(Array.isArray(result)).toBe(true);
        expect(result.map((element) => element.getAttribute('data-k'))).toEqual(expected);
    });

    test('null root is the document, and a selector which is not a string gives an empty array', () => {
        expect(queryKameleoonSelector('span:eq(2)', null)).toEqual([getElement('sc')]);
        expect(queryKameleoonSelector(undefined)).toEqual([]);
        expect(queryKameleoonSelector(1)).toEqual([]);
        expect(queryKameleoonSelector(null)).toEqual([]);
    });

    test(':eq which is not followed by a number is not queried again', () => {
        // the engine calls itself with the same selector until the call stack is exceeded
        const spy = vi.spyOn(document, 'querySelectorAll');
        try {
            expect(queryKameleoonSelector('[title=":eq"]')).toEqual([]);
            expect(spy).toHaveBeenCalledTimes(1);
        } finally {
            spy.mockRestore();
        }
    });

    test('onError is called for a selector which the engine does not watch', () => {
        const errors = (selector: unknown): number => {
            let count = 0;
            queryKameleoonSelector(selector, undefined, () => {
                count += 1;
            });
            return count;
        };
        // invalid, or not supported by the engine, which throws for them
        expect(errors('div[')).toBe(1);
        expect(errors('span:contains(first)')).toBe(1);
        expect(errors('[title=":eq"]')).toBe(1);
        expect(errors('span:eq(0)[')).toBe(1);
        expect(errors(1)).toBe(1);
        // valid, also if nothing matches
        expect(errors('span')).toBe(0);
        expect(errors('.missing')).toBe(0);
        expect(errors('span:eq(1)')).toBe(0);
        expect(errors('span:contains("first")')).toBe(0);
        expect(errors('[data-name=a b]')).toBe(0);
        expect(() => queryKameleoonSelector('div[', undefined, 'not a function' as never)).not.toThrow();
    });

    test(':contains() alone matches all elements which contain the text, as the engine', () => {
        const names = ['fx', 'ulA', 'liAa', 'ulB', 'liBa'];
        expect(queryKameleoonSelector(':contains("nested")')).toEqual([
            document.documentElement,
            document.body,
            ...names.map(getElement),
        ]);
    });
});
