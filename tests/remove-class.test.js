/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'remove-class';

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

const createElem = (selectorClassName, attrs) => {
    const elem = document.createElement('div');
    if (selectorClassName) elem.classList.add(selectorClassName);
    attrs.forEach((a) => elem.classList.add(a));
    document.body.appendChild(elem);

    return elem;
};


test('Adg rule: no selector', (assert) => {
    createHit();
    const classNames = ['test1', 'test2', 'test3'];
    const params = {
        name,
        args: [classNames.join('|')],
        verbose: true,
    };

    const elem = createElem(null, classNames);
    elem.classList.add('test-no-selector');
    const resString = window.scriptlets.invoke(params);
    // console.log(resString);
    evalWrapper(resString);

    classNames.forEach((a) => {
        // console.log(elem.classList.contains(a));
        assert.notOk(elem.classList.contains(a), `Class ${a} has been removed`);
    });
    assert.strictEqual(window.hit, 'FIRED');
});

test('Adg rule', (assert) => {
    createHit();
    const classNames = ['test11', 'test22', 'test33'];
    const selectorClassName = 'test-with-selector';
    const params = {
        name,
        args: [classNames.join('|'), `.${selectorClassName}`],
        verbose: true,
    };

    const elem = createElem(selectorClassName, classNames);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    classNames.forEach((a) => {
        assert.notOk(elem.classList.contains(a), `Class ${a} has been removed`);
    });
    assert.strictEqual(window.hit, 'FIRED');
});
