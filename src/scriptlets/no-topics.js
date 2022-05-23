import {
    hit,
    noopPromiseResolve,
} from '../helpers';

/**
 * @scriptlet no-topics
 *
 * @description
 * Prevents using The Topics API
 * https://developer.chrome.com/docs/privacy-sandbox/topics/
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('no-topics')
 * ```
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
    Document.prototype[TOPICS_PROPERTY_NAME] = () => noopPromiseResolve();
    hit(source);
}

noTopics.names = [
    'no-topics',
];

noTopics.injections = [
    hit,
    noopPromiseResolve,
];
