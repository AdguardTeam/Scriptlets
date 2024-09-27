/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-canvas';

const nativeCanvas = window.HTMLCanvasElement.prototype.getContext;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.HTMLCanvasElement.prototype.getContext = nativeCanvas;
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
        name: 'ubo-prevent-canvas.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('should return null for any context type when no contextType is specified', (assert) => {
    runScriptlet(name);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    assert.strictEqual(context, null);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('should return null for specified context type', (assert) => {
    runScriptlet(name, ['2d']);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    assert.strictEqual(context, null);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('should return original context for non-matching context type', (assert) => {
    runScriptlet(name, ['webgl']);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    assert.ok(context.direction);
});

test('should return null for context type matched by regexp', (assert) => {
    const regexp = /2d|webgl/;
    runScriptlet(name, [`${regexp}`]);

    const canvas2d = document.createElement('canvas');
    const context2d = canvas2d.getContext('2d');

    const canvasWebgl = document.createElement('canvas');
    const contextWebgl = canvasWebgl.getContext('webgl');

    assert.strictEqual(context2d, null);
    assert.strictEqual(contextWebgl, null);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('should return original context for negated context type', (assert) => {
    const negated = '!2d';
    runScriptlet(name, [negated]);

    const canvas2d = document.createElement('canvas');
    const context2d = canvas2d.getContext('2d');

    const canvasWebgl = document.createElement('canvas');
    const contextWebgl = canvasWebgl.getContext('webgl');

    assert.ok(context2d.direction);
    assert.strictEqual(contextWebgl, null);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('should return original context for negated context type regexp', (assert) => {
    const negated = '!/2d/';
    runScriptlet(name, [negated]);

    const canvas2d = document.createElement('canvas');
    const context2d = canvas2d.getContext('2d');

    const canvasWebgl = document.createElement('canvas');
    const contextWebgl = canvasWebgl.getContext('webgl');

    assert.ok(context2d.direction);
    assert.strictEqual(contextWebgl, null);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
