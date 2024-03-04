/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';
import {
    noopStr,
    noopFunc,
    noopResolveVoid,
    noopResolveNull,
} from '../../src/helpers/index';

const { test, module } = QUnit;
const name = 'no-protected-audience';

const protectedAudienceMethods = {
    joinAdInterestGroup: noopResolveVoid,
    runAdAuction: noopResolveNull,
    leaveAdInterestGroup: noopResolveVoid,
    clearOriginJoinedAdInterestGroups: noopResolveVoid,
    createAuctionNonce: noopStr,
    updateAdInterestGroups: noopFunc,
};

const methodNames = Object.keys(protectedAudienceMethods);

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('no-protected-audience', async (assert) => {
    runScriptlet(name);

    /**
     * TODO remove this check when Protected Audience API gets to puppeteer/playwright.
     * This works with --gui option though.
     */
    if (Navigator.prototype.joinAdInterestGroup instanceof Function) {
        const done = assert.async(methodNames.length);
        for (const methodName of methodNames) {
            const mockMethod = protectedAudienceMethods[methodName];
            const navigatorMethod = Navigator.prototype[methodName];

            if (mockMethod() instanceof Promise) {
                const originalValue = await mockMethod();
                const navigatorValue = await navigatorMethod();

                assert.strictEqual(navigatorValue, originalValue, `async ${methodName} was successfully stubbed`);
                done();
            } else {
                const originalValue = mockMethod();
                const navigatorValue = navigatorMethod();

                assert.strictEqual(navigatorValue, originalValue, `${methodName} was successfully stubbed`);
                done();
            }
        }
    }

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});
