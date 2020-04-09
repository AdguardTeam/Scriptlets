/* global QUnit */
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
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole; // eslint-disable-line no-console
};

module(name, { beforeEach, afterEach });

test('prevent-requestAnimationFrame: adg no args -- logging', (assert) => {
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);

    const agLogRequestAnimationFrame = 'agLogRequestAnimationFrame';

    function callback() {
        window[agLogRequestAnimationFrame] = 'changed';
        requestAnimationFrame(callback);
    }
    window.requestAnimationFrame(callback);


    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `requestAnimationFrame("${callback.toString()}")`, 'console.hit input');
    };

    assert.equal(window.hit, 'value', 'Hit function was executed');
    assert.strictEqual(window[agLogRequestAnimationFrame], 'changed', 'property changed');
    clearGlobalProps(agLogRequestAnimationFrame);
});


// test('prevent-setTimeout: adg by setTimeout callback name', (assert) => {
//     const params = {
//         name,
//         args: ['test', '50'],
//         verbose: true,
//     };
//     const scriptlet = window.scriptlets.invoke(params);
//     const done = assert.async();

//     window.one = 'value';
//     window.two = 'value';
//     // We need to run our assertion after all timeouts
//     setTimeout(() => {
//         assert.equal(window.one, 'value', 'Target property not changed');
// eslint-disable-next-line max-len
//         assert.equal(window.two, 'new value', 'Another property should successfully changed by another timeout');
//         assert.equal(window.hit, 'value', 'Hit function was executed');
//         done();
//     }, 100);

//     // run scriptlet code
//     evalWrap(scriptlet);
//     // check if scriptlet works
//     const test = () => { window.one = 'new value'; };
//     setTimeout(test, 50);


//     // check if scriptlet doesn't affect on others timeouts
//     const anotherTimeout = () => { window.two = 'new value'; };
//     const timeoutAnother = setTimeout(anotherTimeout);
// });


// test('prevent-setTimeout: adg by code matching', (assert) => {
//     const params = {
//         name,
//         args: ['one', '50'],
//         verbose: true,
//     };
//     const scriptlet = window.scriptlets.invoke(params);
//     const done = assert.async();

//     window.one = 'value';
//     window.two = 'value';
//     // We need to run our assertion after all timeouts
//     setTimeout(() => {
//         assert.equal(window.one, 'value', 'Target property not changed');
// eslint-disable-next-line max-len
//         assert.equal(window.two, 'new value', 'Another property should  be successfully changed by another timeout');
//         assert.equal(window.hit, 'value', 'Hit function was executed');
//         done();
//     }, 100);

//     // run scriptlet code
//     evalWrap(scriptlet);
//     // check if scriptlet works
//     const testCallback = () => { window.one = 'new value'; };
//     const timeoutTest = setTimeout(testCallback, 50);
//     testTimeouts.push(timeoutTest);

//     // check if scriptlet doesn't affect on others timeouts
//     const anotherTimeout = () => { window.two = 'new value'; };
//     const timeoutAnother = setTimeout(anotherTimeout);
//     testTimeouts.push(timeoutAnother);
// });


// test('prevent-setTimeout: adg -- !match', (assert) => {
//     const params = {
//         name,
//         args: ['!first'],
//         verbose: true,
//     };
//     const scriptlet = window.scriptlets.invoke(params);
//     const done = assert.async();

//     window.one = 'one';
//     window.two = 'two';
//     window.three = 'three';
//     // We need to run our assertion after all timeouts
//     setTimeout(() => {
//         assert.equal(window.one, 'NEW ONE', '!match-property not changed');
//         // eslint-disable-next-line max-len
//         assert.equal(window.two, 'two', 'Second property should be successfully changed');
//         assert.equal(window.three, 'three', 'Third property should be successfully changed');
//         assert.equal(window.hit, 'value', 'Hit function was executed');
//         done();
//     }, 100);

//     // run scriptlet code
//     evalWrap(scriptlet);

//     // only this one should not be prevented because of match = !one
//     const first = () => { window.one = 'NEW ONE'; };
//     setTimeout(first, 30);

//     const second = () => { window.two = 'NEW TWO'; };
//     setTimeout(second, 40);


//     const third = () => { window.three = 'NEW THREE'; };
//     setTimeout(third, 50);
// });
