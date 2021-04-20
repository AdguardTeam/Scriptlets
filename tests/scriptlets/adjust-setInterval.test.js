/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps, getRandomNumber } from '../helpers';

const { test, module } = QUnit;
const name = 'adjust-setInterval';
const nativeSetInterval = window.setInterval;

const afterEach = () => {
    window.setInterval = nativeSetInterval;
    clearGlobalProps('hit', '__debug', 'intervalValue', 'someKey');
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-nano-setInterval-booster.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no args', (assert) => {
    createHit();
    const params = {
        name,
        args: [],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 100);
});

test('only match param', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();
    const done3 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000);

    const regularInterval = setInterval(() => {
        window.someKey = 'value';
    }, 200);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done1();
    }, 100);

    setTimeout(() => {
        assert.notOk(window.someKey);
        done2();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.someKey, 'value', 'All others timeouts should be okay');
        clearInterval(regularInterval);
        done3();
    }, 250);
});

test('match param + interval', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '500'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 500);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 50);
});

test('all params, boost > 1 (slowing)', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '100', '2'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 100);

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 250);
});

test('all params, boost < 1 (boosting)', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '500', '0.2'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 500); // scriptlet should make it '100'

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 150);
});

test('all params, invalid boost value --> 0.05 by default', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '1000', 'abc'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000); // scriptlet should make it '50'

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 10);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(interval);
        done2();
    }, 80);
});

test('match param + interval', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '*'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();

    const randomDelay = getRandomNumber(400, 500);
    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, randomDelay);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 50);
});

test('all params, boost < 1 (boosting)', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '*', '0.2'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const randomDelay = getRandomNumber(450, 500);
    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, randomDelay); // scriptlet should divide delay by 5

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 150);
});
