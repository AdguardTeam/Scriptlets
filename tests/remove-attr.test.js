/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'remove-attr';

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
};

module(name, { afterEach });

const createHit = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

const createElem = (className, attrs) => {
    const elem = document.createElement('div');
    if (className) elem.classList.add(className);
    attrs.forEach((a) => elem.setAttribute(a, true));
    document.body.appendChild(elem);

    return elem;
};

function addAttr(elem, attr) {
    elem.setAttribute(attr, true);
}


test('ubo alias', (assert) => {
    createHit();
    const attrs = ['test1', 'test2'];
    const className = 'test';
    const params = {
        name: 'ubo-remove-attr.js',
        args: [attrs.join('|'), `.${className}`],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    const done = assert.async();

    const elem = createElem(className, attrs);

    setTimeout(() => { addAttr(elem, 'test2'); }, 34);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem.getAttribute(a), `Attr ${a} removed`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 50);

    evalWrapper(resString);
});


test('Adg rule: no selector', (assert) => {
    createHit();
    const attrs = ['test1', 'test2'];
    const params = {
        name,
        args: [attrs.join('|')],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    const done = assert.async();

    const elem = createElem(null, attrs);

    setTimeout(() => { addAttr(elem, 'test1'); }, 62);
    setTimeout(() => { addAttr(elem, 'test2'); }, 75);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem.getAttribute(a), `Attr ${a} removed`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 200);

    evalWrapper(resString);
});


test('Adg rule', (assert) => {
    createHit();
    const attrs = ['test1'];
    const className = 'test';
    const params = {
        name,
        args: [attrs.join('|'), `.${className}`],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    const done = assert.async();

    const elem = createElem(className, attrs);

    setTimeout(() => { addAttr(elem, 'test1'); }, 87);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem.getAttribute(a), `Attr ${a} removed`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 300);

    evalWrapper(resString);
});
