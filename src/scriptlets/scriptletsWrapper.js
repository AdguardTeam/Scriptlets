/**
 * It is necessary for CJS module building and adding 'scriptlets' to global scope.
 * Otherwise rollup will warn about 'output.name',
 * using which instead of 'entryFileNames' will name the iife output,
 * which should not be named.
 */
import './index';
