/**
 * It is necessary for CJS module building and adding 'redirects' to global scope.
 * Otherwise rollup will warn about 'output.name',
 * using which instead of 'entryFileNames' will name the iife output,
 * which should not be named.
 */
import { redirectsCjs } from './index';

// eslint-disable-next-line no-undef
redirects = redirectsCjs;

// TODO remove this file
