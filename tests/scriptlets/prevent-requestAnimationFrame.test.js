/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const {
    test,
    module,
} = QUnit;
const name = 'prevent-requestAnimationFrame';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const nativeRequestAnimationFrame = window.requestAnimationFrame;
const nativeConsole = console.log; // eslint-disable-line no-console

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
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
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    const logProperty = 'logRequestAnimationFrame';

    function change() {
        window[logProperty] = 'changed';
    }
    window.requestAnimationFrame(change);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `requestAnimationFrame("${change.toString()}")`, 'console.hit input');
    };

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.hit, 'value', 'Hit function was executed');
        assert.strictEqual(window[logProperty], 'changed', 'property changed');
        clearGlobalProps(logProperty);
        done();
    }, 20);
});

test('prevent-requestAnimationFrame: by callback name', (assert) => {
    const params = {
        name,
        args: ['change'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    window.one = 'value';

    const change = () => {
        window.one = 'NEW VALUE';
    };
    window.requestAnimationFrame(change);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('one');
        done();
    }, 10);
});

test('prevent-requestAnimationFrame: by regex match', (assert) => {
    const params = {
        name,
        args: ['/a{2,4}/'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    window.aaa = 'one';

    const change = () => {
        window.aaa = 'NEW ONE';
    };
    window.requestAnimationFrame(change);

    // do test checking after scriptlet's execution end
    setTimeout(() => {
        assert.equal(window.aaa, 'one', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('aaa');
        done();
    }, 10);
});

test('prevent-requestAnimationFrame: !match', (assert) => {
    const params = {
        name,
        args: ['!one'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
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
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('one', 'two');
        done();
    }, 50);
});
