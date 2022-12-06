/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'no-topics';
const TOPICS_PROPERTY_NAME = 'browsingTopics';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const clearTopicsProp = () => {
    try {
        delete Document.prototype[TOPICS_PROPERTY_NAME];
    } catch (e) {
        // Safari does not allow to delete property
        Document.prototype[TOPICS_PROPERTY_NAME] = null;
    }
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    clearTopicsProp();
};

module(name, { beforeEach, afterEach });

test('no-topics - works', async (assert) => {
    Document.prototype[TOPICS_PROPERTY_NAME] = () => ['value1', 'value2'];
    const mockedDocument = new Document();

    const done = assert.async();
    runScriptlet(name);

    const response = await mockedDocument[TOPICS_PROPERTY_NAME]();
    const body = await response.json();

    assert.ok(Array.isArray(body) && body.length === 0, 'mocked browsingTopics() returns []');

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    done();
});
