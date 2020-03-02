/**
 * It is necessary for CJS module building.
 * Otherwise rollup will warn about 'output.name',
 * using which instead of 'entryFileNames' will name the iife output,
 * which should not be named.
 */
import './index';
