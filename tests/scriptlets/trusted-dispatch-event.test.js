/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-dispatch-event';

const createElem = () => {
    const div = document.createElement('div');
    div.setAttribute('id', 'testElem');

    document.body.appendChild(div);
    return div;
};

const removeElem = () => {
    const elem = document.getElementById('testElem');
    if (elem) {
        elem.remove();
    }
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    removeElem();
};

module(name, { beforeEach, afterEach });

test('Dispatch event - document', (assert) => {
    const event = 'testEvent1';

    let eventFired = false;

    const scriptletArgs = [event];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(eventFired, false, 'Event not fired yet');

    document.addEventListener('testEvent1', () => {
        eventFired = true;
    });

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(eventFired, true, 'Event fired');
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 10);
});

test('Dispatch event - specific element', (assert) => {
    const event = 'testEvent2';
    const selector = '#testElem';

    let eventFired = false;

    const scriptletArgs = [event, selector];
    runScriptlet(name, scriptletArgs);

    const elem = createElem();

    assert.strictEqual(eventFired, false, 'Event not fired yet');

    elem.addEventListener('testEvent2', () => {
        eventFired = true;
    });

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(eventFired, true, 'Event fired');
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 10);
});

test('Dispatch event - window object', (assert) => {
    const event = 'windowObj';
    const selector = 'window';

    let eventFired = false;

    const scriptletArgs = [event, selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(eventFired, false, 'Event not fired yet');

    window.addEventListener('windowObj', () => {
        eventFired = true;
    });

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(eventFired, true, 'Event fired');
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 10);
});
