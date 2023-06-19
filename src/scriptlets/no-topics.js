import {
    hit,
    noopPromiseResolve,
} from '../helpers/index';

/**
 * @scriptlet no-topics
 *
 * @description
 * Prevents using the Topics API.
 * https://developer.chrome.com/docs/privacy-sandbox/topics/
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('no-topics')
 * ```
 *
 * @added v1.6.18.
 */
export function noTopics(source) {
    const TOPICS_PROPERTY_NAME = 'browsingTopics';

    if (Document instanceof Object === false) {
        return;
    }
    if (!Object.prototype.hasOwnProperty.call(Document.prototype, TOPICS_PROPERTY_NAME)
        || Document.prototype[TOPICS_PROPERTY_NAME] instanceof Function === false) {
        return;
    }

    // document.browsingTopics() is async function so it's better to return noopPromiseResolve()
    // https://github.com/patcg-individual-drafts/topics#the-api-and-how-it-works
    Document.prototype[TOPICS_PROPERTY_NAME] = () => noopPromiseResolve('[]');
    hit(source);
}

noTopics.names = [
    'no-topics',
];

noTopics.injections = [
    hit,
    noopPromiseResolve,
];
