import { attachdependencies, wrapInIIFE } from '../../src/injector';
import log from '../../src/helpers/log';
import testLog from '../../src/helpers/log';

describe('injector', () => {

    it('should concat scriptlet and deps', () => {
        const expResult = testLog.toString() + log.toString();
        const result = attachdependencies(testLog, [log]);
        expect(result).toEqual(expResult);
    })

    it('should wrap func in IIFE and convert to string', () => {
        function test(arg) { return arg };
        const testStr = test.toString();
        const exRes =`"use strict";(${testStr})(1);`
        const res = wrapInIIFE(test, [1]);
        expect(res).toEqual(exRes);
    });

});