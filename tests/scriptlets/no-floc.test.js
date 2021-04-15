/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'no-floc';
const FLOC_PROPERTY_NAME = 'interestCohort';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const clearFlocProp = () => {
    try {
        delete Document.prototype[FLOC_PROPERTY_NAME];
    } catch (e) {
        // Safari does not allow to delete property
        Document.prototype[FLOC_PROPERTY_NAME] = null;
    }
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    clearFlocProp();
};

const evalWrapper = eval;

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-no-floc.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no-floc - works', (assert) => {
    assert.strictEqual(Document.prototype[FLOC_PROPERTY_NAME], undefined, 'interestCohort does not exist');

    Document.prototype[FLOC_PROPERTY_NAME] = () => 'test';
    assert.strictEqual(Document.prototype.interestCohort(), 'test', 'test interestCohort works');

    runScriptlet(name);

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(Document.prototype[FLOC_PROPERTY_NAME], undefined, 'interestCohort mocked');
});

test('no-floc - check for interestCohort presence', (assert) => {
    assert.strictEqual(Document.prototype[FLOC_PROPERTY_NAME], undefined, 'interestCohort does not exist');

    runScriptlet(name);

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(Document.prototype, FLOC_PROPERTY_NAME),
        false,
        'interestCohort property should not be created',
    );
});

test('no-floc - check for non-function interestCohort', (assert) => {
    const TEST_STR = 'testString';
    Document.prototype[FLOC_PROPERTY_NAME] = TEST_STR;
    assert.strictEqual(Document.prototype[FLOC_PROPERTY_NAME], 'testString', 'non-function interestCohort has been set');

    runScriptlet(name);

    assert.strictEqual(window.hit, undefined, 'should not hit');
    assert.strictEqual(Document.prototype[FLOC_PROPERTY_NAME], TEST_STR, 'interestCohort property should not be mocked');
});
