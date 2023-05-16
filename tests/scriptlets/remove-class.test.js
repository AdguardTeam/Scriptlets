/* eslint-disable no-underscore-dangle, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'remove-class';

const nativeConsole = console.log; // eslint-disable-line no-console

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole; // eslint-disable-line no-console
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const createElem = (selector, classNames) => {
    const elem = document.createElement('div');
    if (selector) elem.classList.add(selector);
    elem.classList.add(...classNames);
    document.body.appendChild(elem);

    return elem;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-remove-class.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('multiple class names + no selector', (assert) => {
    createHit();
    const classNames = ['example', 'test'];

    const first = createElem(null, ['first', 'nice', 'test']);
    const second = createElem(null, ['second', 'rare', 'example', 'for', 'test']);
    const third = createElem(null, ['third', 'testing', 'better', 'example']);

    const scriptletArgs = [classNames.join('|')];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(first.classList.contains(a), `Class '${a}' has been removed`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => {
        first.classList.add(classNames[0]);
        second.classList.add(classNames[1]);
    }, 15);

    setTimeout(() => {
        classNames.forEach((a) => {
            assert.notOk(first.classList.contains(a), `Class '${a}' has been removed`);
            assert.notOk(second.classList.contains(a), `Class '${a}' has been removed`);
            assert.notOk(third.classList.contains(a), `Class '${a}' has been removed`);
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        first.remove();
        second.remove();
        third.remove();
        done();
    }, 50);
});

test('multiple class names for different elements + single selector', (assert) => {
    createHit();
    const classNames = ['test11', 'test22', 'test33'];
    const parentSelectorClassName = 'iamyourfather';
    const childSelectorClassName = 'daaamn';

    const parentElement = createElem(parentSelectorClassName, classNames);
    const childElement = createElem(childSelectorClassName, classNames);
    parentElement.appendChild(childElement);

    const scriptletArgs = [classNames.join('|'), `.${childSelectorClassName}`];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(childElement.classList.contains(a), `Class '${a}' removed for matched (child) element`);
        assert.ok(parentElement.classList.contains(a), `Class '${a}' should not be removed for mismatched elements`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { childElement.classList.add(classNames[0]); }, 50);
    setTimeout(() => { childElement.classList.add(classNames[1]); }, 80);

    setTimeout(() => {
        classNames.forEach((a) => {
            assert.notOk(childElement.classList.contains(a), `Class '${a}' has been removed`);
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        childElement.remove();
        parentElement.remove();
        done();
    }, 150);
});

test('single class name for different elements + multiple selectors', (assert) => {
    createHit();
    const classNames = ['testClass'];
    const firstClass = 'first';
    const secondClass = 'second';

    const firstElement = createElem(firstClass, classNames);
    const secondElement = createElem(secondClass, classNames);

    const selectors = `.${firstClass}, .${secondClass}`;
    const scriptletArgs = [classNames.join('|'), selectors];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
        assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { firstElement.classList.add(classNames[0]); }, 50);
    setTimeout(() => { secondElement.classList.add(classNames[0]); }, 80);

    setTimeout(() => {
        classNames.forEach((a) => {
            assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
            assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        firstElement.remove();
        secondElement.remove();
        done();
    }, 150);
});

test('multiple class names + multiple selectors', (assert) => {
    createHit();
    const classNames = ['testClass0', 'testClass1'];
    const firstClass = 'first';
    const secondClass = 'second';

    const firstElement = createElem(firstClass, classNames);
    const secondElement = createElem(secondClass, classNames);

    const selectors = `.${firstClass}, .${secondClass}`;
    const scriptletArgs = [classNames.join('|'), selectors];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
        assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { firstElement.classList.add(classNames[0]); }, 50);
    setTimeout(() => { secondElement.classList.add(classNames[1]); }, 80);

    setTimeout(() => {
        classNames.forEach((a) => {
            assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
            assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        firstElement.remove();
        secondElement.remove();
        done();
    }, 150);
});

// Only 'asap' and 'asap stay' cases were tested as test suit is loaded on 'complete' page state
// and 'loading' and 'interactive' states are unavailable.
test('single class name for different elements + multiple selectors, asap', (assert) => {
    createHit();
    const classNames = ['testClass'];
    const firstClass = 'first';
    const secondClass = 'second';

    const firstElement = createElem(firstClass, classNames);
    const secondElement = createElem(secondClass, classNames);

    const applying = 'asap';
    const selectors = `.${firstClass}, .${secondClass}`;
    const scriptletArgs = [classNames.join('|'), selectors, applying];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
        assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    // clean up test elements
    firstElement.remove();
    secondElement.remove();
    clearGlobalProps('hit');
});

test('single class name for different elements + multiple selectors + asap stay', (assert) => {
    createHit();
    const classNames = ['testClass'];
    const firstClass = 'first';
    const secondClass = 'second';

    const firstElement = createElem(firstClass, classNames);
    const secondElement = createElem(secondClass, classNames);

    const applying = 'asap stay';
    const selectors = `.${firstClass}, .${secondClass}`;
    const scriptletArgs = [classNames.join('|'), selectors, applying];
    runScriptlet(name, scriptletArgs);

    classNames.forEach((a) => {
        assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
        assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { firstElement.classList.add(classNames[0]); }, 50);
    setTimeout(() => { secondElement.classList.add(classNames[0]); }, 80);

    setTimeout(() => {
        classNames.forEach((a) => {
            assert.notOk(firstElement.classList.contains(a), `Class '${a}' removed for matched element`);
            assert.notOk(secondElement.classList.contains(a), `Class '${a}' removed for matched element`);
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        firstElement.remove();
        secondElement.remove();
        done();
    }, 150);
});

test('invalid selector — no match', (assert) => {
    createHit();
    const classNames = ['testClass'];
    const selectors = ', stay';
    const scriptletArgs = [classNames.join('|'), selectors];
    runScriptlet(name, scriptletArgs);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(input, `${name}: Invalid selector arg: '${selectors}'`, 'logged error for invalid remove-class selector');
    };

    assert.strictEqual(window.hit, undefined, 'hit SHOULD NOT fire');

    clearGlobalProps('hit');
});
