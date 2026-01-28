/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'spoof-css';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const createElem = (className) => {
    const elem = document.createElement('div');
    if (className) {
        elem.classList.add(className);
    }
    document.body.appendChild(elem);
    return elem;
};

const addStyle = (text) => {
    const style = document.createElement('style');
    style.innerText = `${text}`;
    document.body.appendChild(style);
    return style;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-spoof-css.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

// uBO has a different arguments sequence, so we need to test it separately
test('Check uBO alias', (assert) => {
    const matchClassName = 'testClassUboAlias';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNamePropertyFirst = 'display';
    const cssValuePropertyFirst = 'block';
    const cssNamePropertySecond = 'height';
    const cssValuePropertySecond = '233px';

    const scriptletArgs = [
        `.${matchClassName}`,
        cssNamePropertyFirst,
        cssValuePropertyFirst,
        cssNamePropertySecond,
        cssValuePropertySecond,
    ];
    runScriptlet('ubo-spoof-css', scriptletArgs);

    const elStyleDisplay = window.getComputedStyle(matchElem).display;
    const elStyleHeight = window.getComputedStyle(matchElem).height;

    assert.strictEqual(elStyleDisplay, cssValuePropertyFirst, `display style is set to ${cssValuePropertyFirst}`);
    assert.strictEqual(elStyleHeight, cssValuePropertySecond, `height style is set to ${cssValuePropertySecond}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('Check uBO alias - two elements', (assert) => {
    const matchClassNameFirst = 'testClassUboFirst';
    const matchClassNameSecond = 'testClassUboSecond';

    const matchElemFirst = createElem(matchClassNameFirst);
    const matchElemSecond = createElem(matchClassNameSecond);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassNameFirst} { ${cssProperty} }`);

    const cssNamePropertyFirst = 'display';
    const cssValuePropertyFirst = 'block';
    const cssNamePropertySecond = 'height';
    const cssValuePropertySecond = '233px';

    const scriptletArgs = [
        // eslint-disable-next-line no-useless-escape
        `.${matchClassNameFirst}\, .${matchClassNameSecond}`,
        cssNamePropertyFirst,
        cssValuePropertyFirst,
        cssNamePropertySecond,
        cssValuePropertySecond,
    ];
    runScriptlet('ubo-spoof-css', scriptletArgs);

    const elStyleDisplayFirst = window.getComputedStyle(matchElemFirst).display;
    const elStyleHeightFirst = window.getComputedStyle(matchElemFirst).height;

    const elStyleDisplaySecond = window.getComputedStyle(matchElemSecond).display;
    const elStyleHeightSecond = window.getComputedStyle(matchElemSecond).height;

    assert.strictEqual(elStyleDisplayFirst, cssValuePropertyFirst, `display style is set to ${cssValuePropertyFirst}`);
    assert.strictEqual(elStyleHeightFirst, cssValuePropertySecond, `height style is set to ${cssValuePropertySecond}`);
    assert.strictEqual(elStyleDisplaySecond, cssValuePropertyFirst, `display style is set to ${cssValuePropertyFirst}`);
    assert.strictEqual(elStyleHeightSecond, cssValuePropertySecond, `height style is set to ${cssValuePropertySecond}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElemFirst.remove();
    matchElemSecond.remove();
    matchStyle.remove();
});

test('Check uBO alias with debug', (assert) => {
    const matchClassName = 'testClassUboDebug';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNamePropertyFirst = 'display';
    const cssValuePropertyFirst = 'block';
    const cssNamePropertySecond = 'height';
    const cssValuePropertySecond = '233px';
    const debug = 'debug';

    const scriptletArgs = [
        `.${matchClassName}`,
        cssNamePropertyFirst,
        cssValuePropertyFirst,
        cssNamePropertySecond,
        cssValuePropertySecond,
        debug,
        '1',
    ];
    runScriptlet('ubo-spoof-css', scriptletArgs);

    const elStyleDisplay = window.getComputedStyle(matchElem).display;
    const elStyleHeight = window.getComputedStyle(matchElem).height;

    assert.strictEqual(elStyleDisplay, cssValuePropertyFirst, `display style is set to ${cssValuePropertyFirst}`);
    assert.strictEqual(elStyleHeight, cssValuePropertySecond, `height style is set to ${cssValuePropertySecond}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property - getComputedStyle', (assert) => {
    const matchClassName = 'testClassGetComputedStyle';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const elStyle = window.getComputedStyle(matchElem).display;

    assert.strictEqual(elStyle, 'block', 'display style is set to block');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('Only selector - do nothing', (assert) => {
    const matchClassName = 'testClassNothing';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const scriptletArgs = [`.${matchClassName}`];
    runScriptlet(name, scriptletArgs);

    const elStyle = window.getComputedStyle(matchElem).display;

    assert.strictEqual(elStyle, 'none', 'display style is set to none');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property + test element which style should not be changed - getComputedStyle', (assert) => {
    const matchClassNameChange = 'testClassChange';
    const matchClassNameNotChange = 'testClassNotChange';

    const matchElemChange = createElem(matchClassNameChange);
    const matchElemNotChange = createElem(matchClassNameNotChange);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassNameChange}, .${matchClassNameNotChange} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    const scriptletArgs = [`.${matchClassNameChange}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const elStyleChange = window.getComputedStyle(matchElemChange).display;
    const elStyleNotChange = window.getComputedStyle(matchElemNotChange).display;

    assert.strictEqual(elStyleChange, 'block', 'display style is set to block');
    assert.strictEqual(elStyleNotChange, 'none', 'display style is set to none');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElemChange.remove();
    matchElemNotChange.remove();
    matchStyle.remove();
});

test('One selector and non existed property - getComputedStyle', (assert) => {
    const matchClassName = 'testClassNotExistedProperty';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const elStyle = window.getComputedStyle(matchElem);
    const elStyleGetPropertyValue = elStyle.getPropertyValue('not_existed_property');

    assert.strictEqual(elStyleGetPropertyValue, '', 'not_existed_property returns empty string');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property - getComputedStyle clip-path', (assert) => {
    const matchClassName = 'testClassClipPath';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'clip-path: circle(50%);';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'clip-path';
    const cssValueProperty = 'circle(0%)';

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const elStyle = window.getComputedStyle(matchElem).clipPath;

    assert.strictEqual(elStyle, 'circle(0%)', 'display style is set to block');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and two properties, set by two separate scriptlets - getComputedStyle', (assert) => {
    const matchClassName = 'testClassTwoScriptlets';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important; visibility: hidden !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNamePropertyOne = 'display';
    const cssValuePropertyOne = 'block';

    const cssNamePropertyTwo = 'visibility';
    const cssValuePropertyTwo = 'visible';

    const scriptletArgsOne = [`.${matchClassName}`, cssNamePropertyOne, cssValuePropertyOne];
    runScriptlet(name, scriptletArgsOne);

    const scriptletArgsTwo = [`.${matchClassName}`, cssNamePropertyTwo, cssValuePropertyTwo];
    runScriptlet(name, scriptletArgsTwo);

    const computedStyle = window.getComputedStyle(matchElem);
    const elStyleDisplay = computedStyle.display;
    const elStylePropValDisplay = computedStyle.getPropertyValue('display');
    const elStyleVisibility = computedStyle.visibility;
    const elStylePropValVisibility = computedStyle.getPropertyValue('visibility');

    assert.strictEqual(elStyleDisplay, 'block', 'display style is set to block');
    assert.strictEqual(elStylePropValDisplay, 'block', 'display style is set to block - getPropertyValue');
    assert.strictEqual(elStyleVisibility, 'visible', 'visibility style is set to visible');
    assert.strictEqual(elStylePropValVisibility, 'visible', 'visibility style is set to visible - getPropertyValue');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('Two selectors and one property - getComputedStyle', (assert) => {
    const matchClassNameFirst = 'testClassFirst';
    const matchClassNameSecond = 'testClassSecond';

    const matchElemFirst = createElem(matchClassNameFirst);
    const matchElemSecond = createElem(matchClassNameFirst);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassNameFirst} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    const scriptletArgs = [`.${matchClassNameFirst}, .${matchClassNameSecond}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const computedStyleSecond = window.getComputedStyle(matchElemSecond);
    const elStyleDisplaySecond = computedStyleSecond.display;
    const elStylePropValDisplaySecond = computedStyleSecond.getPropertyValue('display');

    const computedStyleFirst = window.getComputedStyle(matchElemFirst);
    const elStyleDisplayFirst = computedStyleFirst.display;
    const elStylePropValDisplayFirst = computedStyleFirst.getPropertyValue('display');

    assert.strictEqual(elStyleDisplayFirst, 'block', 'display style is set to block');
    assert.strictEqual(elStylePropValDisplayFirst, 'block', 'display style is set to block - getPropertyValue');

    assert.strictEqual(elStyleDisplaySecond, 'block', 'display style is set to block');
    assert.strictEqual(elStylePropValDisplaySecond, 'block', 'display style is set to block - getPropertyValue');

    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElemFirst.remove();
    matchElemSecond.remove();
    matchStyle.remove();
});

test('Two selectors divided by escaped comma and one property - getComputedStyle', (assert) => {
    const matchClassNameFirst = 'testClassFirstComma';
    const matchClassNameSecond = 'testClassSecondComma';

    const matchElemFirst = createElem(matchClassNameFirst);
    const matchElemSecond = createElem(matchClassNameFirst);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassNameFirst} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    // eslint-disable-next-line no-useless-escape
    const scriptletArgs = [`.${matchClassNameFirst}\, .${matchClassNameSecond}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const computedStyleSecond = window.getComputedStyle(matchElemSecond);
    const elStyleDisplaySecond = computedStyleSecond.display;
    const elStylePropValDisplaySecond = computedStyleSecond.getPropertyValue('display');

    const computedStyleFirst = window.getComputedStyle(matchElemFirst);
    const elStyleDisplayFirst = computedStyleFirst.display;
    const elStylePropValDisplayFirst = computedStyleFirst.getPropertyValue('display');

    assert.strictEqual(elStyleDisplayFirst, 'block', 'display style is set to block');
    assert.strictEqual(elStylePropValDisplayFirst, 'block', 'display style is set to block - getPropertyValue');

    assert.strictEqual(elStyleDisplaySecond, 'block', 'display style is set to block');
    assert.strictEqual(elStylePropValDisplaySecond, 'block', 'display style is set to block - getPropertyValue');

    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElemFirst.remove();
    matchElemSecond.remove();
    matchStyle.remove();
});

test('One selector and one property - getComputedStyle getOwnPropertyDescriptor', (assert) => {
    const matchClassName = 'testClassGetOwnPropertyDescriptor';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'display: none !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'display';
    const cssValueProperty = 'block';

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const elStyle = window.getComputedStyle(matchElem);
    const elStyleDisplay = Object.getOwnPropertyDescriptor(elStyle, 'display').value;

    assert.strictEqual(elStyleDisplay, 'block', 'display style is set to block - getOwnPropertyDescriptor');
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property - getBoundingClientRect height', (assert) => {
    const EXPECTED_HEIGHT = 1024;
    const matchClassName = 'testClassClientRect';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'height: 100px !important; width: 100px !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'height';
    const cssValueProperty = `${EXPECTED_HEIGHT}`;

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const boundingClientRect = matchElem.getBoundingClientRect();
    const elStyleHeight = boundingClientRect.height;

    assert.strictEqual(elStyleHeight, EXPECTED_HEIGHT, `height is set to ${EXPECTED_HEIGHT}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property - check if "width" in getBoundingClientRect is set correctly', (assert) => {
    const EXPECTED_WIDTH = 100;
    const EXPECTED_VISIBILITY = 'hidden';
    const matchClassName = 'testClassClientRect';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'height: 100px !important; width: 100px !important; visibility: visible !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'visibility';
    const cssValueProperty = `${EXPECTED_VISIBILITY}`;

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const boundingClientRect = matchElem.getBoundingClientRect();
    const elStyleWidth = boundingClientRect.width;
    const elStyleVisibility = window.getComputedStyle(matchElem).visibility;

    assert.strictEqual(elStyleWidth, EXPECTED_WIDTH, `width is set to ${EXPECTED_WIDTH}`);
    assert.strictEqual(elStyleVisibility, EXPECTED_VISIBILITY, `visibility is set to ${EXPECTED_VISIBILITY}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('Two separated scriptlets - getBoundingClientRect - width and height', (assert) => {
    const EXPECTED_HEIGHT = 7000;
    const EXPECTED_WIDTH = 8000;
    const matchClassName = 'testClassClientRect';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'height: 100px !important; width: 100px !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNamePropertyOne = 'height';
    const cssValuePropertyOne = `${EXPECTED_HEIGHT}`;

    const scriptletArgsOne = [`.${matchClassName}`, cssNamePropertyOne, cssValuePropertyOne];
    runScriptlet(name, scriptletArgsOne);

    const cssNamePropertyTwo = 'width';
    const cssValuePropertyTwo = `${EXPECTED_WIDTH}`;

    const scriptletArgsTwo = [`.${matchClassName}`, cssNamePropertyTwo, cssValuePropertyTwo];
    runScriptlet(name, scriptletArgsTwo);

    const boundingClientRect = matchElem.getBoundingClientRect();
    const elStyleHeight = boundingClientRect.height;
    const elStyleWidth = boundingClientRect.width;

    assert.strictEqual(elStyleHeight, EXPECTED_HEIGHT, `height is set to ${EXPECTED_HEIGHT}`);
    assert.strictEqual(elStyleWidth, EXPECTED_WIDTH, `width is set to ${EXPECTED_WIDTH}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('One selector and one property - getBoundingClientRect top', (assert) => {
    const EXPECTED_TOP = 2050;
    const matchClassName = 'testClassClientRect';

    const matchElem = createElem(matchClassName);
    const cssProperty = 'height: 100px !important; width: 100px !important;';
    const matchStyle = addStyle(`.${matchClassName} { ${cssProperty} }`);

    const cssNameProperty = 'top';
    const cssValueProperty = `${EXPECTED_TOP}`;

    const scriptletArgs = [`.${matchClassName}`, cssNameProperty, cssValueProperty];
    runScriptlet(name, scriptletArgs);

    const boundingClientRect = matchElem.getBoundingClientRect();
    const elStyleHeight = boundingClientRect.top;

    assert.strictEqual(elStyleHeight, EXPECTED_TOP, `top is set to ${EXPECTED_TOP}`);
    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('hit');
    matchElem.remove();
    matchStyle.remove();
});

test('Native code check', (assert) => {
    const matchClassName = 'testClassNativeCode';
    const matchElem = createElem(matchClassName);

    const property = 'height, 100, width, 200, display, block';

    const scriptletArgs = [`.${matchClassName}`, property];
    runScriptlet(name, scriptletArgs);

    const elGetComputedStyle = window.getComputedStyle(matchElem);
    const nativeCodeGetComputedStyle = window.getComputedStyle.toString();
    const nativeCodeGetPropertyValue = elGetComputedStyle.getPropertyValue.toString();
    const nativeCodeGetBoundingClientRect = Element.prototype.getBoundingClientRect.toString();

    assert.ok(
        nativeCodeGetComputedStyle.includes('function getComputedStyle() { [native code] }'),
        'getComputedStyle native code is present',
    );
    assert.ok(
        nativeCodeGetPropertyValue.includes('function getPropertyValue() { [native code] }'),
        'getPropertyValue native code is present',
    );
    assert.ok(
        nativeCodeGetBoundingClientRect.includes('function getBoundingClientRect() { [native code] }'),
        'getBoundingClientRect native code is present',
    );
    assert.strictEqual(window.hit, 'FIRED');

    matchElem.remove();
    clearGlobalProps('hit');
});

// https://github.com/AdguardTeam/Scriptlets/issues/422
test('Anti-detection: toString.toString() check', (assert) => {
    const matchClassName = 'testClassToStringToString';
    const matchElem = createElem(matchClassName);

    const scriptletArgs = [`.${matchClassName}`, 'display', 'block'];
    runScriptlet(name, scriptletArgs);

    const elGetComputedStyle = window.getComputedStyle(matchElem);
    const getPropertyValueFn = elGetComputedStyle.getPropertyValue;

    // Check that toString.toString() also returns native code format
    // This is a common anti-adblock detection technique
    const toStringToString = getPropertyValueFn.toString.toString();

    assert.ok(
        toStringToString.includes('[native code]'),
        'getPropertyValue.toString.toString() should return native code format',
    );

    // Check that String(getComputedStyle.toString) returns 'function toString() { [native code] }'
    // Some anti-adblock scripts check: String(getComputedStyle.toString).indexOf('toString') === -1
    const getComputedStyleToString = String(window.getComputedStyle.toString);
    assert.strictEqual(
        getComputedStyleToString,
        'function toString() { [native code] }',
        'String(getComputedStyle.toString) should return toString native code format',
    );

    // Also verify getPropertyValue.toString.toString() returns correct toString format
    assert.strictEqual(
        toStringToString,
        'function toString() { [native code] }',
        'getPropertyValue.toString.toString() should return toString native code format',
    );

    // Check that toString.name returns 'toString'
    // Some anti-adblock scripts check: getComputedStyle.toString.name === 'toString'
    assert.strictEqual(
        window.getComputedStyle.toString.name,
        'toString',
        'getComputedStyle.toString.name should be "toString"',
    );

    matchElem.remove();
    clearGlobalProps('hit');
});

// https://github.com/AdguardTeam/Scriptlets/issues/422
test('Anti-detection: __defineGetter__ stack trace should not contain Proxy', (assert) => {
    const matchClassName = 'testClassDefineGetter';
    const matchElem = createElem(matchClassName);

    const scriptletArgs = [`.${matchClassName}`, 'display', 'block'];
    runScriptlet(name, scriptletArgs);

    const elGetComputedStyle = window.getComputedStyle(matchElem);
    const getPropertyValueFn = elGetComputedStyle.getPropertyValue;

    // Anti-adblock scripts call __defineGetter__ to trigger an error
    // and check if 'Proxy' appears in the stack trace
    let stackTrace = '';
    try {
        // eslint-disable-next-line no-restricted-properties
        getPropertyValueFn.__defineGetter__('test', () => {});
    } catch (e) {
        stackTrace = e.stack || '';
    }

    assert.notOk(
        stackTrace.includes('Proxy'),
        'getPropertyValue.__defineGetter__ error stack should not contain "Proxy"',
    );

    // Also test getComputedStyle.__defineGetter__
    let stackTraceGCS = '';
    try {
        // eslint-disable-next-line no-restricted-properties
        window.getComputedStyle.__defineGetter__('test', () => {});
    } catch (e) {
        stackTraceGCS = e.stack || '';
    }

    assert.notOk(
        stackTraceGCS.includes('Proxy'),
        'getComputedStyle.__defineGetter__ error stack should not contain "Proxy"',
    );

    matchElem.remove();
    clearGlobalProps('hit');
});
