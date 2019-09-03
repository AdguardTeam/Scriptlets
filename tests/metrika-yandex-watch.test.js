/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
import { clearGlobalProps } from './helpers';


const { test, module } = QUnit;
const name = 'metrika-yandex-watch';

module(name);

const evalWrapper = eval;

test('AdGuard: yandex metrika watch.js', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    assert.expect(4);

    // yandex_metrika_callbacks: these callbacks needed for
    // creating an instance of Ya.Metrika after script loading
    window.yandex_metrika_callbacks = [
        () => assert.ok(true, 'yandex_metrika_callbacks were executed'),
    ];

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.Ya.Metrika, 'Metrika function was created');
    const ya = new window.Ya.Metrika();
    assert.notOk(ya.addFileExtension(), 'addFileExtension function created and executed');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debugScriptlets', 'hit');
});
