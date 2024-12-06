/* eslint-disable import/no-unresolved */

// Dist directory will be available after scriptlets build
import { scriptlets } from '../dist/index';
import { Redirects } from '../dist/redirects/index';

window.scriptlets = scriptlets;
window.Redirects = Redirects;
