import { hit } from '../helpers/index';

/**
 * @redirect scorecardresearch-beacon
 *
 * @description
 * Mocks Scorecard Research API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/scorecardresearch_beacon.js
 *
 * ### Examples
 *
 * ```adblock
 * ||sb.scorecardresearch.com/beacon.js$script,redirect=scorecardresearch-beacon
 * ```
 *
 * @added v1.0.10.
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
