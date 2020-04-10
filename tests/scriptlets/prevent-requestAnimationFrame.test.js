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
        name: 'requestAnimationFrame-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams.toString(), codeByAliasParams.toString());
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

    const logProperty = 'agLogRequestAnimationFrame';

    const testWrapper = () => {
        let times = 0;
        function change() {
            window[logProperty] = 'changed';
            if (times < 2) {
                times += 1;
                window.requestAnimationFrame(change);
            }
        }
        window.requestAnimationFrame(change);
    };
    testWrapper();

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        // eslint-disable-next-line no-undef
        assert.strictEqual(input, `requestAnimationFrame("${change.toString()}")`, 'console.hit input');
    };

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

    const testWrapper = () => {
        let times = 0;
        const change = () => {
            window.one = 'NEW VALUE';
            if (times < 2) {
                times += 1;
                window.requestAnimationFrame(change);
            }
        };
        window.requestAnimationFrame(change);
    };
    testWrapper();

    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('one');
        done();
    }, 20);
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

    const testWrapper = () => {
        let times = 0;
        const change = () => {
            window.aaa = 'NEW ONE';
            if (times < 2) {
                times += 1;
                window.requestAnimationFrame(change);
            }
        };
        window.requestAnimationFrame(change);
    };
    testWrapper();

    setTimeout(() => {
        assert.equal(window.aaa, 'one', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('aaa');
        done();
    }, 20);
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

    const testWrapper = () => {
        let timesOne = 0;
        const changeOne = () => {
            window.one = 'NEW ONE';
            if (timesOne < 2) {
                timesOne += 1;
                window.requestAnimationFrame(changeOne);
            }
        };
        window.requestAnimationFrame(changeOne);

        let timesTwo = 0;
        const changeTwo = () => {
            window.two = 'NEW TWO';
            if (timesTwo < 2) {
                timesTwo += 1;
                window.requestAnimationFrame(changeTwo);
            }
        };
        window.requestAnimationFrame(changeTwo);
    };
    testWrapper();

    setTimeout(() => {
        assert.equal(window.one, 'NEW ONE', 'not \'one\' property should be changed');
        assert.equal(window.two, 'two', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        clearGlobalProps('one', 'two');
        done();
    }, 50);
});
