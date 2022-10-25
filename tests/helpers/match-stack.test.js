import { matchStackTrace } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

test('Test matchStackTrace for working with getNativeRegexpTest helper', async (assert) => {
    const match = matchStackTrace('stack', new Error().stack);

    assert.ok(!match);
});
