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

const createElem = (selector, classNames) => {
    const elem = document.createElement('div');
    if (selector) elem.classList.add(selector);
    classNames.forEach((a) => elem.classList.add(a));
    document.body.appendChild(elem);

    return elem;
};


test('Adg rule: no selector', (assert) => {
    createHit();
    const classNames = ['example', 'test'];
    const params = {
        name,
        args: [classNames.join('|')],
        verbose: true,
    };

    const first = createElem(null, ['first', 'nice', 'test']);
    const second = createElem(null, ['second', 'rare', 'example', 'for', 'test']);
    const third = createElem(null, ['third', 'testing', 'better', 'example']);


    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    classNames.forEach((a) => {
        assert.notOk(first.classList.contains(a), `Class ${a} has been removed`);
        assert.notOk(second.classList.contains(a), `Class ${a} has been removed`);
        assert.notOk(third.classList.contains(a), `Class ${a} has been removed`);
    });
    assert.strictEqual(window.hit, 'FIRED');
});

test('Adg rule', (assert) => {
    createHit();
    const classNames = ['test11', 'test22', 'test33'];
    const parentSelectorClassName = 'iamyourfather';
    const childSelectorClassName = 'daaamn';
    const params = {
        name,
        args: [classNames.join('|'), `.${childSelectorClassName}`],
        verbose: true,
    };
    const parentElement = createElem(parentSelectorClassName, classNames);
    const childElement = createElem(childSelectorClassName, classNames);
    parentElement.appendChild(childElement);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    classNames.forEach((a) => {
        assert.notOk(childElement.classList.contains(a), `Class ${a} has been removed`);
    });
    assert.strictEqual(window.hit, 'FIRED');
});
