/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-attr';

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const createElem = (className) => {
    const elem = document.createElement('div');
    if (className) {
        elem.classList.add(className);
    }
    document.body.appendChild(elem);
    return elem;
};

function changeAttr(elem, attr) {
    elem.setAttribute(attr, 'not-test-value');
}

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-set-attr.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('selector + attr + eligible number', (assert) => {
    createHit();
    const attr = 'test-attr';
    const value = '1234';
    const matchClassName = 'testClass';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName);
    const mismatchElem = createElem(mismatchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.ok(matchElem.getAttribute(attr), `Attr ${attr} added to selector-matched element`);
    assert.ok(matchElem.getAttribute(attr) === value, `New attr value ${value} is correct`);
    assert.notOk(mismatchElem.getAttribute(attr), `Attr ${attr} is not added to mismatch element`);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    changeAttr(matchElem, attr);
    setTimeout(() => {
        assert.ok(matchElem.getAttribute(attr) === value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED');
        // Clean up test elements
        matchElem.remove();
        mismatchElem.remove();
        done();
    }, 30);
});

test('selector + attr + empty string', (assert) => {
    createHit();
    const attr = 'test-attr';
    const value = '';
    const matchClassName = 'testClass';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName);
    const mismatchElem = createElem(mismatchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    // Have to revert state here, as getAttribute returns value '' that evaluates to false
    assert.ok(!matchElem.getAttribute(attr), `Attr ${attr} added to selector-matched element`);
    assert.ok(matchElem.getAttribute(attr) === value, `New attr value ${value} is correct`);
    assert.notOk(mismatchElem.getAttribute(attr), `Attr ${attr} is not added to mismatch element`);

    assert.strictEqual(window.hit, 'FIRED');
    matchElem.remove();
    mismatchElem.remove();
    clearGlobalProps('hit');
});

test('selector + attr + empty string', (assert) => {
    createHit();
    const attr = 'test-attr';
    const matchClassName = 'testClass';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName);
    const mismatchElem = createElem(mismatchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr];
    runScriptlet(name, scriptletArgs);

    // Have to revert state here, as getAttribute returns value '' that evaluates to false
    assert.ok(!matchElem.getAttribute(attr), `Attr ${attr} added to selector-matched element`);
    /* eslint-disable-next-line  quotes */
    assert.ok(matchElem.getAttribute(attr) === '', `New attr value '' is correct`);
    assert.notOk(mismatchElem.getAttribute(attr), `Attr ${attr} is not added to mismatch element`);

    assert.strictEqual(window.hit, 'FIRED');
    matchElem.remove();
    mismatchElem.remove();
    clearGlobalProps('hit');
});

test('selector + attr + negative number', (assert) => {
    createHit();
    const attr = 'test-attr';
    const value = '-100';
    const matchClassName = 'testClass';

    const matchElem = createElem(matchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.notOk(matchElem.getAttribute(attr), `Attr ${attr} is not added`);

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
    clearGlobalProps('hit');
    // Clean up test elements
    matchElem.remove();
});

test('selector + attr + too big of a number', (assert) => {
    createHit();
    const attr = 'test-attr';
    const value = '33000';
    const matchClassName = 'testClass';

    const matchElem = createElem(matchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.notOk(matchElem.getAttribute(attr), `Attr ${attr} is not added`);

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
    clearGlobalProps('hit');
    // Clean up test elements
    matchElem.remove();
});

test('selector + attr + true', (assert) => {
    createHit();
    const attr = 'test-attr-true';
    const value = 'true';
    const matchClassName = 'testClassTrue';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName);
    const mismatchElem = createElem(mismatchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.ok(matchElem.getAttribute(attr), `Attr ${attr} added to selector-matched element`);
    assert.ok(matchElem.getAttribute(attr) === value, `New attr value ${value} is correct`);
    assert.notOk(mismatchElem.getAttribute(attr), `Attr ${attr} is not added to mismatch element`);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    changeAttr(matchElem, attr);
    setTimeout(() => {
        assert.ok(matchElem.getAttribute(attr) === value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED');
        // Clean up test elements
        matchElem.remove();
        mismatchElem.remove();
        done();
    }, 30);
});

test('selector + attr + False', (assert) => {
    createHit();
    const attr = 'test-attr-False';
    const value = 'False';
    const matchClassName = 'testClassFalse';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName);
    const mismatchElem = createElem(mismatchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.ok(matchElem.getAttribute(attr), `Attr ${attr} added to selector-matched element`);
    assert.ok(matchElem.getAttribute(attr) === value, `New attr value ${value} is correct`);
    assert.notOk(mismatchElem.getAttribute(attr), `Attr ${attr} is not added to mismatch element`);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    changeAttr(matchElem, attr);
    setTimeout(() => {
        assert.ok(matchElem.getAttribute(attr) === value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED');
        // Clean up test elements
        matchElem.remove();
        mismatchElem.remove();
        done();
    }, 30);
});

test('selector + attr + not allowed string', (assert) => {
    createHit();
    const attr = 'test-attr';
    const value = 'trueNotAllowed';
    const matchClassName = 'testClassNotAllowed';

    const matchElem = createElem(matchClassName);

    const scriptletArgs = [`.${matchClassName}`, attr, value];
    runScriptlet(name, scriptletArgs);

    assert.notOk(matchElem.getAttribute(attr), `Attr ${attr} is not added`);

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
    clearGlobalProps('hit');
    // Clean up test elements
    matchElem.remove();
});
