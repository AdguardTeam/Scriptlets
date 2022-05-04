import { hit } from '../helpers/index';

/**
 * @redirect scorecardresearch-beacon
 *
 * @description
 * Mocks Scorecard Research API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/scorecardresearch_beacon.js
 *
 * **Example**
 * ```
 * ||sb.scorecardresearch.com/beacon.js$script,redirect=scorecardresearch-beacon
 * ```
 */
export function ScoreCardResearchBeacon(source) {
    window.COMSCORE = {
        purge() {
            // eslint-disable-next-line no-underscore-dangle
            window._comscore = [];
        },
        beacon() {},
    };
    hit(source);
}

ScoreCardResearchBeacon.names = [
    'scorecardresearch-beacon',
    'ubo-scorecardresearch_beacon.js',
    'scorecardresearch_beacon.js',
];

ScoreCardResearchBeacon.injections = [
    hit,
];
