import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { program } from 'commander';

const { error: logError, log } = console;

/**
 * Test directories that use an index.test.js barrel file
 * to register all individual test/spec files.
 */
const TEST_DIRS_TO_CHECK = [
    'tests/scriptlets',
    'tests/redirects',
];

/**
 * Index file name pattern.
 */
const INDEX_FILE_NAME = 'index.test.js';

/**
 * QUnit test file name pattern.
 *
 * Note: `.spec.js` files are not included in the test list
 * because they are run by Vitest, not QUnit.
 */
const TEST_FILE_NAME_PATTERN = /\.test\.js$/;

/**
 * Regexp to match lines like `import './foo.test';`
 */
const IMPORT_LINE_REGEX = /import\s+['"]\.\/([^'"]+\.test)['"]/g;

/**
 * Extracts imported file stems (without extension) from an index file.
 *
 * @param indexPath Absolute path to the index file.
 *
 * @returns Set of imported stems, e.g. "prevent-xhr.test".
 */
const getImportedStems = (indexPath: string): Set<string> => {
    const content = readFileSync(indexPath, 'utf-8');
    const stems = new Set<string>();

    const matches = content.matchAll(IMPORT_LINE_REGEX);

    for (const match of matches) {
        stems.add(match[1]);
    }

    return stems;
};

/**
 * Appends missing import lines to the end of the index file.
 *
 * @param indexPath Absolute path to the index file.
 * @param stems Array of missing stems to append, e.g. ["prevent-xhr.test"].
 */
const appendImports = (indexPath: string, stems: string[]): void => {
    const lines = stems.map((stem) => `import './${stem}';`);

    const content = readFileSync(indexPath, 'utf-8');

    const separator = content.endsWith('\n') ? '' : '\n';

    writeFileSync(indexPath, `${content}${separator}${lines.join('\n')}\n`);
};

/**
 * Checks that all QUnit test files are imported in the index files.
 * When `autoFix` is true, missing imports are appended automatically.
 *
 * @param autoFix Whether to auto-fix by appending missing imports.
 */
const lintTestLists = (autoFix: boolean): void => {
    let hasErrors = false;

    for (const dir of TEST_DIRS_TO_CHECK) {
        const absDir = join(process.cwd(), dir);
        const indexPath = join(absDir, INDEX_FILE_NAME);

        let importedStems: Set<string>;
        try {
            importedStems = getImportedStems(indexPath);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logError(`Could not read ${dir}/${INDEX_FILE_NAME}: ${message}`);
            hasErrors = true;
            continue;
        }

        const missingImports = readdirSync(absDir).reduce<string[]>((acc, f) => {
            if (
                TEST_FILE_NAME_PATTERN.test(f)
                && f !== INDEX_FILE_NAME
            ) {
                const stem = f.replace(/\.js$/, '');

                if (!importedStems.has(stem)) {
                    acc.push(stem);
                }
            }
            return acc;
        }, []);

        if (missingImports.length > 0) {
            if (autoFix) {
                appendImports(indexPath, missingImports);
                log(`Fixed ${dir}/${INDEX_FILE_NAME}: added ${missingImports.length} import(s).`);
            } else {
                hasErrors = true;
                logError(`\n${dir}/${INDEX_FILE_NAME} is missing ${missingImports.length} import(s):`);
                for (const stem of missingImports) {
                    logError(`  - import './${stem}';`);
                }
            }
        }
    }

    if (hasErrors) {
        logError('\n⚠️ Please add the missing imports to the corresponding index file.\n');
        logError("You can run 'pnpm lint:test-lists --fix' to automatically add missing imports.\n");
        process.exit(1);
    } else {
        log('✅ All test files are registered in their index files.');
    }
};

program
    .option('--fix', 'automatically add missing imports to index files')
    .parse();

const { fix } = program.opts<{ fix: boolean }>();

lintTestLists(fix);
