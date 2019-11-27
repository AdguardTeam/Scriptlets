/* global unsafeWindow */

// Save links to original browser API objects
// We might need this in the case if the page modifies it or replaces with polyfills.
const win = (unsafeWindow || window);
const browser = {
    window: win,
    document: win.document,
    location: win.document.location,
    console: {},
    querySelector: win.document.querySelector.bind(win.document),
    querySelectorAll: win.document.querySelectorAll.bind(win.document),
    getAttribute: Function.prototype.call.bind(HTMLElement.prototype.getAttribute),
    setAttribute: Function.prototype.call.bind(HTMLElement.prototype.setAttribute),
    removeAttribute: Function.prototype.call.bind(HTMLElement.prototype.removeAttribute),
    defineProperty: Object.defineProperty,
    MutationObserver: win.MutationObserver,
};

Object.keys(browser.window.console).forEach((name) => {
    browser.console[name] = browser.window.console[name];
});

export default browser;
