/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-requestAnimationFrame';

const nativeRequestAnimationFrame = window.requestAnimationFrame;
const nativeConsole = console.log; // eslint-disable-line no-console

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.requestAnimationFrame = nativeRequestAnimationFrame;
    console.log = nativeConsole; // eslint-disable-line no-console
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'ubo-no-requestAnimationFrame-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('prevent-requestAnimationFrame: no args -- logging', (assert) => {
    const logProperty = 'logRequestAnimationFrame';
    function testFunction() {
        window[logProperty] = 'changed';
    }

    let loggedMessage;
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        loggedMessage = input;
    };

    runScriptlet(name);
    const done = assert.async();

    requestAnimationFrame(testFunction);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        assert.strictEqual(
            loggedMessage,
            `prevent-requestAnimationFrame: requestAnimationFrame(${testFunction.toString()})`,
            'console.hit input',
        );
        assert.strictEqual(window[logProperty], 'changed', 'property changed');
        clearGlobalProps(logProperty);
        done();
    }, 100);
});

test('prevent-requestAnimationFrame: by callback name', (assert) => {
    const scriptletArgs = ['change'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    window.one = 'value';

    const change = () => {
        window.one = 'NEW VALUE';
    };
    window.requestAnimationFrame(change);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('one');
        done();
    }, 100);
});

test('prevent-requestAnimationFrame: by regex match', (assert) => {
    const scriptletArgs = ['/a{2,4}/'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    window.aaa = 'one';

    const change = () => {
        window.aaa = 'NEW ONE';
    };
    window.requestAnimationFrame(change);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.aaa, 'one', 'Target property not changed');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('aaa');
        done();
    }, 100);
});

test('prevent-requestAnimationFrame: !match', (assert) => {
    const scriptletArgs = ['!one'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    window.one = 'one';
    window.two = 'two';

    const changeOne = () => {
        window.one = 'NEW ONE';
    };
    window.requestAnimationFrame(changeOne);

    const changeTwo = () => {
        window.two = 'NEW TWO';
    };
    window.requestAnimationFrame(changeTwo);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.one, 'NEW ONE', 'not \'one\' property should be changed');
        assert.equal(window.two, 'two', 'Target property not changed');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('one', 'two');
        done();
    }, 200);
});

test('prevent-requestAnimationFrame: does not work - invalid regexp pattern', (assert) => {
    const scriptletArgs = ['/*/'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    const property = 'prop';
    window[property] = 'value';

    function testMethod() {
        window[property] = 'changed';
    }
    window.requestAnimationFrame(testMethod);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window[property], 'changed', 'property should be changed');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        clearGlobalProps(property);
        done();
    }, 200);
});
