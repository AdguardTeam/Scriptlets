export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        try {
            delete window[prop];
        } catch (e) {
            try {
                // Safari does not allow to delete property
                window[prop] = null;
            } catch (e) {
                // some tests can not set property of window which has only a getter.
                // e.g. 'popAdsProp' and 'popns' for set-popads-dummy scriptlet
            }
        }
    });
};

/**
 * Returns random number from range inclusively min and max
 *
 * @param {number} min minimum range limit
 * @param {number} max maximum range limit
 * @returns {number}
 */
export const getRandomNumber = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// eslint-disable-next-line no-eval
export const evalWrapper = eval;

/**
 * Fetches and parses the redirects YAML file, returning an instance of Redirects.
 * @typedef {import('./path/to/redirects').Redirects} Redirects
 * @returns {Promise<Redirects>} A promise that resolves to an instance of Redirects.
 */
export const getRedirectsInstance = async () => {
    const yamlResponse = await fetch('./scriptlets/redirects.yml');
    const yamlString = await yamlResponse.text();
    return new window.Redirects(yamlString);
};

/**
 * Runs scriptlet with given args
 *
 * @param {string} name scriptlet name
 * @param {Array|undefined} args array of scriptlet args
 * @param {boolean} [verbose=true]
 */
export const runScriptlet = (name, args, verbose = true) => {
    const params = {
        name,
        args,
        verbose,
    };
    const resultString = window.scriptlets.invoke(params);

    // Create a trustedTypes policy for eval,
    // it's required for a test with CSP "require-trusted-types-for" for "trusted-replace-node-text" scriptlet
    if (window.trustedTypes) {
        const policy = window.trustedTypes.createPolicy('myEscapePolicy', {
            createScript: (string) => string,
        });
        const sanitizedString = policy.createScript(resultString);
        evalWrapper(sanitizedString);
    } else {
        evalWrapper(resultString);
    }
};

/**
 * Runs redirect
 *
 * @param {string} name redirect name
 * @param {boolean} [verbose=true]
 */
export const runRedirect = (name, verbose = true) => {
    const params = {
        name,
        verbose,
    };
    const resultString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resultString);
};

/**
 * Clear cookie by name
 *
 * @param {string} cName
 */
export const clearCookie = (cName) => {
    // Without "path=/;" cookie is not to be re-set with no value
    document.cookie = `${cName}=; path=/; max-age=0`;
};

export const isSafariBrowser = () => navigator.vendor === 'Apple Computer, Inc.';

export const PANEL_ID = 'panel';
export const CLICKABLE_NAME = 'clickable';
export const SELECTORS_DELIMITER = ',';

/**
 * Generates a CSS selector string based on the order of clicked elements.
 *
 * @param {number[]} clickOrder - An array of numbers representing the order in which elements were clicked.
 * @returns {string} A string of CSS selectors corresponding to the click order.
 */
export const createSelectorsString = (clickOrder) => {
    const selectors = clickOrder.map((elemNum) => `#${PANEL_ID} > #${CLICKABLE_NAME}${elemNum}`);
    return selectors.join(SELECTORS_DELIMITER);
};

/**
 * Creates a clickable checkbox element with a unique ID and an onClick assertion.
 *
 * @param {number} elementNum - The number for this element.
 * @param {string} [text=''] - Optional text content for the checkbox.
 * @returns {HTMLInputElement} The created checkbox element.
 */
export const createClickable = (elementNum, text = '') => {
    const clickableId = `${CLICKABLE_NAME}${elementNum}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = clickableId;
    checkbox.textContent = text;
    checkbox.onclick = (e) => {
        e.currentTarget.setAttribute('clicked', true);
        window.clickOrder.push(elementNum);
    };
    return checkbox;
};
/**
 * Creates a panel div element with the specified ID and appends it to the body.
 *
 * @returns {HTMLDivElement} The created panel element.
 */
export const createPanel = () => {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
    return panel;
};

/**
 * Removes the panel element from the document.
 */
export const removePanel = () => document.getElementById('panel').remove();
