/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'ati-smarttag';

const changingProps = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('ati-smarttag: works', (assert) => {
    runRedirect(name);

    const { ATInternet } = window;

    assert.ok(ATInternet, 'ATInternet exists');
    assert.ok(ATInternet.Tracker.Tag, 'ATInternet.Tracker.Tag exists');

    const tag = new ATInternet.Tracker.Tag();

    assert.ok(tag && typeof tag === 'object', 'tag returns obj');

    assert.ok(tag.setConfig instanceof Function, 'tag.setConfig is function');
    assert.strictEqual(tag.setConfig(), undefined, 'tag.setConfig() is mocked');

    assert.ok(tag.setParam instanceof Function, 'tag.setParam is function');
    assert.strictEqual(tag.setParam(), undefined, 'tag.setParam() is mocked');

    assert.ok(tag.dispatch instanceof Function, 'tag.dispatch is function');
    assert.strictEqual(tag.dispatch(), undefined, 'tag.dispatch() is mocked');

    assert.ok(tag.customVars instanceof Object, 'tag.customVars is object');
    assert.ok(tag.customVars.set instanceof Function, 'tag.customVars.set is function');
    assert.strictEqual(tag.customVars.set(), undefined, 'tag.customVars.set() is mocked');

    assert.ok(tag.publisher instanceof Object, 'tag.publisher is object');
    assert.ok(tag.publisher.set instanceof Function, 'tag.publisher.set is function');
    assert.strictEqual(tag.publisher.set(), undefined, 'tag.publisher.set() is mocked');

    assert.ok(tag.order instanceof Object, 'tag.order is object');
    assert.ok(tag.order.set instanceof Function, 'tag.order.set is function');
    assert.strictEqual(tag.order.set(), undefined, 'tag.order.set() is mocked');

    assert.ok(tag.click instanceof Object, 'tag.click is object');
    assert.ok(tag.click.send instanceof Function, 'tag.click.send is function');
    assert.strictEqual(tag.click.send(), undefined, 'tag.click.send() is mocked');

    assert.ok(tag.clickListener instanceof Object, 'tag.clickListener is object');
    assert.ok(tag.clickListener.send instanceof Function, 'tag.clickListener.send is function');
    assert.strictEqual(tag.clickListener.send(), undefined, 'tag.clickListener.send() is mocked');

    assert.ok(tag.internalSearch instanceof Object, 'tag.internalSearch is object');
    assert.ok(tag.internalSearch.set instanceof Function, 'tag.internalSearch.set is function');
    assert.strictEqual(tag.internalSearch.set(), undefined, 'tag.internalSearch.set() is mocked');
    assert.ok(tag.internalSearch.send instanceof Function, 'tag.internalSearch.send is function');
    assert.strictEqual(tag.internalSearch.send(), undefined, 'tag.internalSearch.send() is mocked');

    // tag.ecommerce checking: start
    const { ecommerce } = tag;
    const {
        displayCart,
        updateCart,
        displayProduct,
        displayPageProduct,
        addProduct,
        removeProduct,
    } = ecommerce;
    assert.ok(ecommerce instanceof Object, 'tag.ecommerce is object');

    assert.ok(displayCart instanceof Object, 'ecommerce.displayCart is object');
    assert.ok(displayCart.products instanceof Object, 'ecommerce.displayCart.products is object');
    assert.ok(displayCart.products.set instanceof Function, 'displayCart.products.set is function');
    assert.strictEqual(displayCart.products.set(), undefined, 'displayCart.products.set() is mocked');
    assert.ok(displayCart.cart instanceof Object, 'ecommerce.displayCart.cart is object');
    assert.ok(displayCart.cart.set instanceof Function, 'displayCart.cart.set is function');
    assert.strictEqual(displayCart.cart.set(), undefined, 'displayCart.cart.set() is mocked');

    assert.ok(updateCart instanceof Object, 'ecommerce.updateCart is object');
    assert.ok(updateCart.cart instanceof Object, 'ecommerce.updateCart.cart is object');
    assert.ok(updateCart.cart.set instanceof Function, 'updateCart.cart.set is function');
    assert.strictEqual(updateCart.cart.set(), undefined, 'updateCart.cart.set() is mocked');

    assert.ok(displayProduct instanceof Object, 'ecommerce.displayProduct is object');
    assert.ok(displayProduct.products instanceof Object, 'ecommerce.displayProduct.products is object');
    assert.ok(displayProduct.products.set instanceof Function, 'displayProduct.products.set is function');
    assert.strictEqual(displayProduct.products.set(), undefined, 'displayProduct.products.set() is mocked');

    assert.ok(displayPageProduct instanceof Object, 'ecommerce.displayPageProduct is object');
    assert.ok(displayPageProduct.products instanceof Object, 'ecommerce.displayPageProduct.products is object');
    assert.ok(displayPageProduct.products.set instanceof Function, 'displayPageProduct.products.set is function');
    assert.strictEqual(displayPageProduct.products.set(), undefined, 'displayPageProduct.products.set() is mocked');

    assert.ok(addProduct instanceof Object, 'ecommerce.addProduct is object');
    assert.ok(addProduct.products instanceof Object, 'ecommerce.addProduct.products is object');
    assert.ok(ecommerce.addProduct.products.set instanceof Function, 'addProduct.products.set is function');
    assert.strictEqual(ecommerce.addProduct.products.set(), undefined, 'addProduct.products.set() is mocked');

    assert.ok(removeProduct instanceof Object, 'ecommerce.removeProduct is object');
    assert.ok(removeProduct.products instanceof Object, 'ecommerce.removeProduct.products is object');
    assert.ok(removeProduct.products.set instanceof Function, 'removeProduct.products.set is function');
    assert.strictEqual(removeProduct.products.set(), undefined, 'removeProduct.products.set() is mocked');
    // tag.ecommerce checking: end

    assert.ok(tag.identifiedVisitor instanceof Object, 'tag.identifiedVisitor is object');
    assert.ok(tag.identifiedVisitor.unset instanceof Function, 'tag.identifiedVisitor.unset is function');
    assert.strictEqual(tag.identifiedVisitor.unset(), undefined, 'tag.identifiedVisitor.unset() is mocked');

    assert.ok(tag.page instanceof Object, 'tag.page is object');
    assert.ok(tag.page.set instanceof Function, 'tag.page.set is function');
    assert.strictEqual(tag.page.set(), undefined, 'tag.page.set() is mocked');
    assert.ok(tag.page.send instanceof Function, 'tag.page.send is function');
    assert.strictEqual(tag.page.send(), undefined, 'tag.page.send() is mocked');

    assert.ok(tag.selfPromotion instanceof Object, 'tag.selfPromotion is object');
    assert.ok(tag.selfPromotion.add instanceof Function, 'tag.selfPromotion.add is function');
    assert.strictEqual(tag.selfPromotion.add(), undefined, 'tag.selfPromotion.add() is mocked');
    assert.ok(tag.selfPromotion.send instanceof Function, 'tag.selfPromotion.send is function');
    assert.strictEqual(tag.selfPromotion.send(), undefined, 'tag.selfPromotion.send() is mocked');

    assert.ok(tag.privacy instanceof Object, 'tag.privacy is object');
    assert.ok(tag.privacy.setVisitorMode instanceof Function, 'tag.privacy.setVisitorMode is function');
    assert.strictEqual(tag.privacy.setVisitorMode(), undefined, 'tag.privacy.setVisitorMode() is mocked');
    assert.ok(tag.privacy.getVisitorMode instanceof Function, 'tag.privacy.getVisitorMode is function');
    assert.strictEqual(tag.privacy.getVisitorMode(), undefined, 'tag.privacy.getVisitorMode() is mocked');
    assert.ok(tag.privacy.hit instanceof Function, 'tag.privacy.hit is function');
    assert.strictEqual(tag.privacy.hit(), undefined, 'tag.privacy.hit() is mocked');

    assert.ok(tag.richMedia instanceof Object, 'tag.richMedia is object');
    assert.ok(tag.richMedia.add instanceof Function, 'tag.richMedia.add is function');
    assert.strictEqual(tag.richMedia.add(), undefined, 'tag.richMedia.add() is mocked');
    assert.ok(tag.richMedia.send instanceof Function, 'tag.richMedia.send is function');
    assert.strictEqual(tag.richMedia.send(), undefined, 'tag.richMedia.send() is mocked');
    assert.ok(tag.richMedia.remove instanceof Function, 'tag.richMedia.remove is function');
    assert.strictEqual(tag.richMedia.remove(), undefined, 'tag.richMedia.remove() is mocked');
    assert.ok(tag.richMedia.removeAll instanceof Function, 'tag.richMedia.removeAll is function');
    assert.strictEqual(tag.richMedia.removeAll(), undefined, 'tag.richMedia.removeAll() is mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
