import fs from 'fs-extra';

/**
 * Injects JavaScript code into an HTML template at a marker comment position.
 * Replaces the injection marker comment (e.g., `<!-- script injection -->`)
 * with a `<script>...</script>` tag containing the provided code.
 *
 * @param {object} options
 * @param {string} options.templatePath - Absolute path to the HTML template file.
 * @param {string} options.scriptContent - The JavaScript code to inject.
 * @param {string} options.outputPath - Absolute path for the output HTML file.
 * @param {string} [options.injectionMarker='<!-- script injection -->'] - HTML comment to replace.
 */
export const inlineScriptToHtml = async ({
    templatePath,
    scriptContent,
    outputPath,
    injectionMarker = '<!-- script injection -->',
}) => {
    const templateHtml = await fs.readFile(templatePath, 'utf8');
    const scriptTag = `<script>${scriptContent}</script>`;
    const result = templateHtml.replace(injectionMarker, scriptTag);
    await fs.outputFile(outputPath, result, 'utf8');
};
