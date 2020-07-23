/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'hyperlink-setter';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('works fine', (assert) => {
    const DIV_CLASS = 'panel-footer';
    const panelDiv = document.createElement('div');
    panelDiv.className = DIV_CLASS;
    document.body.appendChild(panelDiv);

    const FORM_ATTR = 'action';
    const FORM_ACTION_LINK = 'https://adserver.com/blabla';
    const form = document.createElement('form');
    form.setAttribute(FORM_ATTR, FORM_ACTION_LINK);
    panelDiv.appendChild(form);

    const BUTTON_ATTR = 'link';
    const BUTTON_PROPER_LINK = 'https://example.org/112314a';
    const button = document.createElement('button');
    button.setAttribute(BUTTON_ATTR, BUTTON_PROPER_LINK);
    form.appendChild(button);

    runScriptlet('hyperlink-setter');

    const frameActionArrt = form.getAttribute(FORM_ATTR);
    const frameTargetAttr = form.getAttribute('target');

    assert.strictEqual(frameActionArrt, BUTTON_PROPER_LINK, 'link has been re-set');
    assert.strictEqual(frameTargetAttr, '_blank', 'target attr has been set to form');
    assert.strictEqual(window.hit, 'FIRED');
    button.remove();
    form.remove();
    panelDiv.remove();
});

test('do not work because of form without button', (assert) => {
    const DIV_CLASS = 'panel-footer';
    const panelDiv = document.createElement('div');
    panelDiv.className = DIV_CLASS;
    document.body.appendChild(panelDiv);

    const FORM_ATTR = 'action';
    const FORM_ACTION_LINK = 'https://adserver.com/blabla';

    const form1 = document.createElement('form');
    form1.setAttribute(FORM_ATTR, FORM_ACTION_LINK);
    panelDiv.appendChild(form1);
    const form2 = document.createElement('form');
    form2.setAttribute(FORM_ATTR, FORM_ACTION_LINK);
    panelDiv.appendChild(form2);

    const BUTTON_ATTR = 'link';
    const BUTTON_PROPER_LINK = 'https://example.org/112314a';
    const button = document.createElement('button');
    button.setAttribute(BUTTON_ATTR, BUTTON_PROPER_LINK);
    form1.appendChild(button);

    runScriptlet('hyperlink-setter');

    const form1ActionAttr = form1.getAttribute(FORM_ATTR);
    const form1TargetAttr = form1.getAttribute('target');

    const form2ActionAttr = form2.getAttribute(FORM_ATTR);
    const form2TargetAttr = form2.getAttribute('target');

    assert.strictEqual(form1ActionAttr, FORM_ACTION_LINK, 'link should not been re-set');
    assert.strictEqual(form1TargetAttr, null, 'target attr should not be set to form');
    assert.strictEqual(form2ActionAttr, FORM_ACTION_LINK, 'link should not been re-set');
    assert.strictEqual(form2TargetAttr, null, 'target attr should not be set to form');
    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
    button.remove();
    form1.remove();
    form2.remove();
    panelDiv.remove();
});
