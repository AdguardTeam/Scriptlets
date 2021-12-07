/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'remove-cookie';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-cookie-remover.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Cookie works fine', (assert) => {
    const cName = '__test-cookie-name__';
    document.cookie = `${cName}=cookie`;
    assert.strictEqual(document.cookie.includes(cName), true, 'cookie was set');
});

test('Remove cookie by match', (assert) => {
    const cName = '__test-cookie-name__1';
    const cName1 = '__test-cookie-name__3';
    document.cookie = `${cName}=cookie`;
    document.cookie = `${cName1}=cookie`;
    runScriptlet(name, [cName]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie by match was removed');
    assert.strictEqual(document.cookie.includes(cName1), true, 'Another cookies works');
});

test('Remove all cookies', (assert) => {
    const cName = '__test-cookie-name__2';
    document.cookie = `${cName}=cookie`;
    runScriptlet(name);

    assert.strictEqual(window.hit, 'FIRED');
    assert.strictEqual(document.cookie.includes(cName), false, 'If no match delete all cookies for domain');
});

test('Do not remove cookie - invalid regexp pattern', (assert) => {
    const cName = '__test-cookie-name__1';
    document.cookie = `${cName}=cookie`;

    runScriptlet(name, ['/\\/']);

    assert.strictEqual(window.hit, undefined, 'Hit should not be fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie was not removed');
});
