import { matchStackTrace } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

test('Test matchStackTrace for working with getNativeRegexpTest helper', async (assert) => {
    const notMatched = matchStackTrace('not_present', new Error().stack);
    const matched = matchStackTrace('stack', new Error().stack);

    assert.true(matched);
    assert.false(notMatched);
});
