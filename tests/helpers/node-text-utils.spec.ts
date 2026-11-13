import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import {
    getAdgNodeTextReplacement,
    getUboNodeTextReplacement,
    replaceNodesText,
    type NodeTextReplacement,
} from '../../src/helpers/node-text-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-replace-node-text', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-rpnt', args: [] } as unknown as Source;

/**
 * Returns the settings of the replacement, and fails if they are `null`.
 *
 * @param replacement Settings returned by a parser.
 *
 * @returns Settings of the replacement.
 */
const getSettings = (replacement: NodeTextReplacement | null): NodeTextReplacement => {
    expect(replacement).not.toBeNull();
    return replacement as NodeTextReplacement;
};

describe('getAdgNodeTextReplacement', () => {
    test('defaults', () => {
        const settings = getSettings(getAdgNodeTextReplacement(adgSource, 'script', 'ad', 'ad', 'no', []));
        expect(settings.sedCount).toBe(Number.MAX_SAFE_INTEGER);
        expect(settings.stay).toBe(false);
        expect(settings.quitAfter).toBeNull();
        expect(settings.timeout).toBe(10000);
        expect(settings.shouldHandleTemplates).toBe(false);
        expect(settings.shouldLog).toBe(false);
    });

    test('node name is compared in lowercase', () => {
        const settings = getSettings(getAdgNodeTextReplacement(adgSource, 'script', 'ad', 'ad', 'no', []));
        expect(settings.isTargetNodeName('SCRIPT')).toBe(true);
        expect(settings.isTargetNodeName('STYLE')).toBe(false);

        const regexpSettings = getSettings(getAdgNodeTextReplacement(adgSource, '/^(div|p)$/', 'ad', 'ad', 'no', []));
        expect(regexpSettings.isTargetNodeName('DIV')).toBe(true);
        expect(regexpSettings.isTargetNodeName('P')).toBe(true);
        expect(regexpSettings.isTargetNodeName('SPAN')).toBe(false);
    });

    // Rules from AdGuard filter lists
    test.each([
        {
            // eslint-disable-next-line max-len
            // 10short.com#%#//scriptlet("trusted-replace-node-text", "script", "openLink", "/window.location.href = '.*?';/", "")
            args: ['script', 'openLink', "/window.location.href = '.*?';/", ''],
            text: "function openLink() { window.location.href = 'https://ad.example'; }",
            expected: 'function openLink() {  }',
        },
        {
            // string pattern replaces the first occurrence
            // eslint-disable-next-line max-len
            // filstalwelle.de#%#//scriptlet('trusted-replace-node-text', 'div', 'WERBUNG', 'WERBUNG', 'Trying to skip ads...')
            args: ['div', 'WERBUNG', 'WERBUNG', 'Trying to skip ads...'],
            text: 'WERBUNG WERBUNG',
            expected: 'Trying to skip ads... WERBUNG',
        },
        {
            // regular expression with `g` flag replaces all occurrences
            // eslint-disable-next-line max-len
            // 1337x.*,1337x.pro#%#//scriptlet('trusted-replace-node-text', 'script', 'window.open', '/window\.location=addUrl;/g', '')
            args: ['script', 'window.open', '/window\\.location=addUrl;/g', ''],
            text: 'window.open(u); window.location=addUrl; window.location=addUrl;',
            expected: 'window.open(u);  ',
        },
        {
            // `textMatch` which starts with `/` but is not a regular expression
            // eslint-disable-next-line max-len
            // watch.impress.co.jp#%#//scriptlet('trusted-replace-node-text', 'script', '/ipc.watch.js', 'ipc.loader.queue.jquery.push', 'ipc.loader.queue.ready.push')
            args: ['script', '/ipc.watch.js', 'ipc.loader.queue.jquery.push', 'ipc.loader.queue.ready.push'],
            text: 'load("/ipc.watch.js"); ipc.loader.queue.jquery.push(f);',
            expected: 'load("/ipc.watch.js"); ipc.loader.queue.ready.push(f);',
        },
        {
            // empty `textMatch` matches any text
            // mylocation.org#%#//scriptlet('trusted-replace-node-text', 'td', '', '(change)', '')
            args: ['td', '', '(change)', ''],
            text: 'Warsaw (change)',
            expected: 'Warsaw ',
        },
        {
            // escaped quotes are unescaped, as the converter keeps them
            // eslint-disable-next-line max-len
            // giphy.com#%#//scriptlet('trusted-replace-node-text', 'script', 'banner_image', '"hasTopLeaderboardAd\":true', '"hasTopLeaderboardAd\":false')
            args: ['script', 'banner_image', '"hasTopLeaderboardAd\\":true', '"hasTopLeaderboardAd\\":false'],
            text: '{"banner_image":1,"hasTopLeaderboardAd":true}',
            expected: '{"banner_image":1,"hasTopLeaderboardAd":false}',
        },
        {
            // `$1` in replacement
            args: ['script', 'ads', '/ads = (\\d+)/', 'ads = 0; old = $1'],
            text: 'ads = 5;',
            expected: 'ads = 0; old = 5;',
        },
    ])('$args', ({ args, text, expected }) => {
        const settings = getSettings(getAdgNodeTextReplacement(
            adgSource,
            args[0],
            args[1],
            args[2],
            args[3],
            [],
        ));
        expect(settings.getModifiedText(text)).toBe(expected);
    });

    test('text is not matched without textMatch, pattern, or if it is empty', () => {
        const settings = getSettings(getAdgNodeTextReplacement(adgSource, 'script', 'ad', 'banner', 'x', []));
        expect(settings.getModifiedText('no match here')).toBeNull();
        // textMatch is matched, but the pattern is not
        expect(settings.getModifiedText('ad')).toBeNull();
        expect(settings.getModifiedText('')).toBeNull();
    });

    test('regular expression with `g` flag matches each text regardless of the previous one', () => {
        const settings = getSettings(getAdgNodeTextReplacement(adgSource, 'script', '/ad/g', '/ad/g', 'x', []));
        expect(settings.getModifiedText('ad ad')).toBe('x x');
        expect(settings.getModifiedText('ad ad')).toBe('x x');
    });

    describe('options', () => {
        test('excludes', () => {
            const settings = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'script',
                'adblock',
                'true',
                'false',
                ['excludes', 'nonce'],
            ));
            expect(settings.getModifiedText('adblock = true')).toBe('adblock = false');
            expect(settings.getModifiedText('adblock = true; nonce')).toBeNull();

            const regexpSettings = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'script',
                'adblock',
                'true',
                'false',
                ['excludes', '/^\\/\\/ keep/'],
            ));
            expect(regexpSettings.getModifiedText('// keep adblock = true')).toBeNull();
            expect(regexpSettings.getModifiedText('adblock = true // keep')).toBe('adblock = false // keep');
        });

        test('sedCount, stay and quitAfter', () => {
            const settings = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'script',
                'ad',
                'ad',
                'x',
                ['sedCount', '2', 'stay', '1', 'quitAfter', '500'],
            ));
            expect(settings.sedCount).toBe(2);
            expect(settings.stay).toBe(true);
            expect(settings.quitAfter).toBe(500);
        });

        test.each(['0', ''])('stay with %j is not set', (value) => {
            const settings = getSettings(getAdgNodeTextReplacement(adgSource, 'p', 'a', 'a', 'b', ['stay', value]));
            expect(settings.stay).toBe(false);
        });

        test('verbose at any position, and as a value of an option', () => {
            const verboseFirst = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'p',
                'a',
                'a',
                'b',
                ['verbose', 'sedCount', '1'],
            ));
            expect(verboseFirst.shouldLog).toBe(true);
            expect(verboseFirst.sedCount).toBe(1);

            const verboseLast = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'p',
                'a',
                'a',
                'b',
                ['sedCount', '1', 'verbose'],
            ));
            expect(verboseLast.shouldLog).toBe(true);

            const verboseValue = getSettings(getAdgNodeTextReplacement(
                adgSource,
                'p',
                'a',
                'a',
                'b',
                ['excludes', 'verbose'],
            ));
            expect(verboseValue.shouldLog).toBe(false);
            expect(verboseValue.getModifiedText('a verbose')).toBeNull();
        });

        test.each([
            ['sedCount', '0'],
            ['sedCount', '-1'],
            ['sedCount', 'one'],
            ['quitAfter', '1s'],
        ])('invalid %s %j is not applied', (name, value) => {
            expect(getAdgNodeTextReplacement(adgSource, 'p', 'a', 'a', 'b', [name, value])).toBeNull();
        });
    });
});

describe('getUboNodeTextReplacement', () => {
    test('defaults', () => {
        const settings = getSettings(getUboNodeTextReplacement(uboSource, 'script', 'ad', 'no', []));
        expect(settings.sedCount).toBe(Number.MAX_SAFE_INTEGER);
        expect(settings.stay).toBe(false);
        expect(settings.quitAfter).toBeNull();
        expect(settings.timeout).toBeNull();
        expect(settings.shouldHandleTemplates).toBe(true);
    });

    test('node name is matched as a whole, case-insensitively', () => {
        const settings = getSettings(getUboNodeTextReplacement(uboSource, 'P', 'a', 'b', []));
        expect(settings.isTargetNodeName('P')).toBe(true);
        expect(settings.isTargetNodeName('PRE')).toBe(false);

        const textSettings = getSettings(getUboNodeTextReplacement(uboSource, '#text', 'a', 'b', []));
        expect(textSettings.isTargetNodeName('#text')).toBe(true);
    });

    // Rules from uBO filter lists, converted to AdGuard syntax by AGTree
    test.each([
        {
            // bintv.fun,bintvs.fun##+js(rpnt, script, keydown, ooo)
            args: ['keydown', 'ooo', []],
            text: 'addEventListener("keydown", f); window.onkeydown = f;',
            expected: 'addEventListener("ooo", f); window.onooo = f;',
        },
        {
            // jobzhub.store##+js(rpnt, script, /initialTimeSeconds = \d+/, initialTimeSeconds = 7)
            args: ['/initialTimeSeconds = \\d+/', 'initialTimeSeconds = 7', []],
            text: 'initialTimeSeconds = 30; initialTimeSeconds = 30;',
            expected: 'initialTimeSeconds = 7; initialTimeSeconds = 30;',
        },
        {
            // novelpia.com##+js(rpnt, style, .np{, .dummy{, condition, @media print)
            args: ['.np{', '.dummy{', ['condition', '@media print']],
            text: '@media print { .np{ display: none; } }',
            expected: '@media print { .dummy{ display: none; } }',
        },
        {
            // novelpia.com##+js(rpnt, style, .np{, .dummy{, condition, @media print)
            args: ['.np{', '.dummy{', ['condition', '@media print']],
            text: '.np{ color: red; }',
            expected: null,
        },
        {
            // fsicomics.com##+js(rpnt, script, > 0, < 0, includes, clearInterval)
            args: ['> 0', '< 0', ['includes', 'clearInterval']],
            text: 'if (count > 0) { next(); }',
            expected: null,
        },
        {
            // eslint-disable-next-line max-len
            // primesrc.me,primewire.*##+js(rpnt, script, window.csrf_token =, window.userID = 1;window.csrf_token =, excludes, window.userID)
            args: ['window.csrf_token =', 'window.userID = 1;window.csrf_token =', ['excludes', 'window.userID']],
            text: 'window.userID = 5; window.csrf_token = "b";',
            expected: null,
        },
        {
            // baumbet.ro##+js(rpnt, script, window.location.reload)
            args: ['window.location.reload', '', []],
            text: 'window.location.reload();',
            expected: '();',
        },
        {
            // empty pattern replaces the whole text
            args: ['', 'replaced', []],
            text: 'any text',
            expected: 'replaced',
        },
    ])('$args', ({ args, text, expected }) => {
        const settings = getSettings(getUboNodeTextReplacement(
            uboSource,
            'script',
            args[0] as string,
            args[1] as string,
            args[2] as string[],
        ));
        expect(settings.getModifiedText(text)).toBe(expected);
    });

    test('options', () => {
        const settings = getSettings(getUboNodeTextReplacement(
            uboSource,
            'script',
            'ad',
            'x',
            ['sedCount', '1', 'stay', '1', 'quitAfter', '500'],
        ));
        expect(settings.sedCount).toBe(1);
        expect(settings.stay).toBe(true);
        expect(settings.quitAfter).toBe(500);
    });

    test('invalid sedCount and quitAfter are ignored, as in uBO', () => {
        const settings = getSettings(getUboNodeTextReplacement(
            uboSource,
            'script',
            'ad',
            'x',
            ['sedCount', 'one', 'quitAfter', '1s'],
        ));
        expect(settings.sedCount).toBe(Number.MAX_SAFE_INTEGER);
        expect(settings.quitAfter).toBeNull();
    });

    test.each([
        ['/ads(/', []],
        ['ads', ['includes', '/(/']],
        ['ads', ['excludes', '/(/']],
    ])('invalid regular expression %s %j is not applied', (pattern, args) => {
        expect(getUboNodeTextReplacement(uboSource, 'script', pattern, '', args)).toBeNull();
    });
});

describe('replaceNodesText', () => {
    /**
     * Flushes pending mutation observer callbacks.
     */
    const flushMutations = async (): Promise<void> => {
        await Promise.resolve();
        await Promise.resolve();
    };

    /**
     * Adds a paragraph with the text to the body.
     *
     * @param text Text of the paragraph.
     *
     * @returns Added paragraph.
     */
    const addParagraph = (text: string): HTMLParagraphElement => {
        const p = document.createElement('p');
        p.textContent = text;
        document.body.appendChild(p);
        return p;
    };

    /**
     * Returns settings which replace `ad` with `x` in paragraphs.
     *
     * @param settings Settings to override.
     *
     * @returns Settings of the replacement.
     */
    const getTestSettings = (settings: Partial<NodeTextReplacement>): NodeTextReplacement => ({
        isTargetNodeName: (nodeName) => nodeName === 'P' || nodeName === '#text',
        getModifiedText: (text) => (text.includes('ad') ? text.replace(/ad/g, 'x') : null),
        sedCount: Number.MAX_SAFE_INTEGER,
        stay: false,
        quitAfter: null,
        timeout: 10000,
        shouldHandleTemplates: false,
        shouldLog: false,
        ...settings,
    });

    const observers: MutationObserver[] = [];
    const NativeMutationObserver = window.MutationObserver;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // observers of `stay` are disconnected after each test
        window.MutationObserver = class extends NativeMutationObserver {
            constructor(callback: MutationCallback) {
                super(callback);
                observers.push(this);
            }
        };
    });

    afterEach(() => {
        observers.splice(0).forEach((observer) => observer.disconnect());
        window.MutationObserver = NativeMutationObserver;
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    test('present nodes, also text nodes, and added nodes until the timeout', async () => {
        const present = addParagraph('ad present');
        const textNode = document.createTextNode('ad text');
        document.body.appendChild(textNode);

        replaceNodesText(adgSource, getTestSettings({
            isTargetNodeName: (nodeName) => nodeName === '#text',
        }));

        expect(present.firstChild?.textContent).toBe('x present');
        expect(textNode.textContent).toBe('x text');

        const added = addParagraph('ad added');
        await flushMutations();
        // the paragraph itself is added, not its text node
        expect(added.textContent).toBe('ad added');
    });

    test('added nodes are not processed after the default timeout', async () => {
        replaceNodesText(adgSource, getTestSettings({}));

        const addedBefore = addParagraph('ad before');
        await flushMutations();
        expect(addedBefore.textContent).toBe('x before');

        vi.advanceTimersByTime(10000);
        const addedAfter = addParagraph('ad after');
        await flushMutations();
        expect(addedAfter.textContent).toBe('ad after');
    });

    test('stay keeps processing added nodes after the default timeout', async () => {
        replaceNodesText(adgSource, getTestSettings({ stay: true }));

        vi.advanceTimersByTime(60000);
        const added = addParagraph('ad after');
        await flushMutations();
        expect(added.textContent).toBe('x after');
    });

    test('quitAfter replaces the default timeout, after the document is interactive', async () => {
        // the document is already interactive in tests
        replaceNodesText(adgSource, getTestSettings({ quitAfter: 20000 }));

        vi.advanceTimersByTime(15000);
        const addedBefore = addParagraph('ad before');
        await flushMutations();
        expect(addedBefore.textContent).toBe('x before');

        vi.advanceTimersByTime(5000);
        const addedAfter = addParagraph('ad after');
        await flushMutations();
        expect(addedAfter.textContent).toBe('ad after');
    });

    test('quitAfter 0 and no timeout stop when the document is interactive', async () => {
        const present = addParagraph('ad present');
        replaceNodesText(uboSource, getTestSettings({ quitAfter: 0 }));
        replaceNodesText(uboSource, getTestSettings({ timeout: null }));
        expect(present.textContent).toBe('x present');

        const added = addParagraph('ad added');
        await flushMutations();
        expect(added.textContent).toBe('ad added');
    });

    test('sedCount limits the number of matched nodes, present and added ones', async () => {
        const first = addParagraph('ad first');
        const notMatched = addParagraph('none');

        replaceNodesText(adgSource, getTestSettings({ sedCount: 2, stay: true }));
        expect(first.textContent).toBe('x first');
        expect(notMatched.textContent).toBe('none');

        const second = addParagraph('ad second');
        const third = addParagraph('ad third');
        await flushMutations();
        expect(second.textContent).toBe('x second');
        expect(third.textContent).toBe('ad third');
    });

    test('nodes in templates are processed only if enabled', () => {
        const template = document.createElement('template');
        template.innerHTML = '<p>ad in template</p>';
        document.body.appendChild(template);
        const templateParagraph = template.content.firstChild as HTMLParagraphElement;

        replaceNodesText(adgSource, getTestSettings({}));
        expect(templateParagraph.textContent).toBe('ad in template');

        replaceNodesText(uboSource, getTestSettings({ shouldHandleTemplates: true }));
        expect(templateParagraph.textContent).toBe('x in template');
    });

    test('text is not written if it would not change', () => {
        const p = addParagraph('ad');
        const setter = vi.spyOn(Node.prototype, 'textContent', 'set');

        replaceNodesText(adgSource, getTestSettings({ getModifiedText: (text) => text }));

        expect(setter).not.toHaveBeenCalled();
        expect(p.textContent).toBe('ad');
        setter.mockRestore();
    });

    test('error of a node is logged once, and other nodes are still processed', async () => {
        const failing = addParagraph('ad fail');
        const other = addParagraph('ad other');
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        const settings = getTestSettings({
            isTargetNodeName: (nodeName) => nodeName === 'P',
            getModifiedText: (text) => {
                if (text.includes('fail')) {
                    throw new Error('page error');
                }
                return text.replace('ad', 'x');
            },
            stay: true,
        });
        replaceNodesText({ ...adgSource, verbose: true } as Source, settings);

        expect(failing.textContent).toBe('ad fail');
        expect(other.textContent).toBe('x other');

        // the failing node is processed again when it is added again, but not logged again
        document.body.appendChild(failing);
        await flushMutations();

        const failureLogs = log.mock.calls.filter((call) => String(call[0]).includes('Failed to replace text'));
        expect(failureLogs).toHaveLength(1);
        log.mockRestore();
    });

    describe('Trusted Types', () => {
        /**
         * Adds a script with the text to the body, which is not executed.
         *
         * @param text Text of the script.
         *
         * @returns Added script.
         */
        const addScript = (text: string): HTMLScriptElement => {
            const script = document.createElement('script');
            script.type = 'text/plain';
            script.textContent = text;
            document.body.appendChild(script);
            return script;
        };

        const scriptSettings = {
            isTargetNodeName: (nodeName: string) => nodeName === 'P' || nodeName === 'SCRIPT',
        };

        afterEach(() => {
            delete (window as unknown as { trustedTypes?: unknown }).trustedTypes;
        });

        test('policy is not created if no script text is replaced', () => {
            const createPolicy = vi.fn();
            (window as unknown as { trustedTypes: unknown }).trustedTypes = { createPolicy };
            const p = addParagraph('ad paragraph');

            replaceNodesText(adgSource, getTestSettings(scriptSettings));

            expect(p.textContent).toBe('x paragraph');
            expect(createPolicy).not.toHaveBeenCalled();
        });

        test('policy is created once for all scripts', () => {
            const createScript = vi.fn((text: string) => text);
            const createPolicy = vi.fn(() => ({
                createHTML: (text: string) => text,
                createScript,
                createScriptURL: (text: string) => text,
            }));
            (window as unknown as { trustedTypes: unknown }).trustedTypes = {
                createPolicy,
                getAttributeType: () => null,
                getPropertyType: () => null,
                isHTML: () => false,
                isScript: () => false,
                isScriptURL: () => false,
            };
            const first = addScript('ad first');
            const second = addScript('ad second');

            replaceNodesText(adgSource, getTestSettings(scriptSettings));

            expect(first.textContent).toBe('x first');
            expect(second.textContent).toBe('x second');
            expect(createPolicy).toHaveBeenCalledTimes(1);
            expect(createScript).toHaveBeenCalledTimes(2);
        });

        test("policy disallowed by the page, e.g. by `trusted-types 'none'`, does not stop other nodes", () => {
            const createPolicy = vi.fn(() => {
                throw new TypeError("Refused to create a TrustedTypePolicy named 'AGPolicy'");
            });
            (window as unknown as { trustedTypes: unknown }).trustedTypes = { createPolicy };
            const log = vi.spyOn(console, 'log').mockImplementation(() => {});
            const p = addParagraph('ad paragraph');
            const first = addScript('ad first');
            const second = addScript('ad second');

            replaceNodesText({ ...adgSource, verbose: true } as Source, getTestSettings(scriptSettings));

            expect(p.textContent).toBe('x paragraph');
            // the text is set as is, as Trusted Types are not required for scripts here
            expect(first.textContent).toBe('x first');
            expect(second.textContent).toBe('x second');
            expect(createPolicy).toHaveBeenCalledTimes(1);
            const policyLogs = log.mock.calls.filter((call) => String(call[0]).includes('Trusted Types policy'));
            expect(policyLogs).toHaveLength(1);
            log.mockRestore();
        });
    });
});
