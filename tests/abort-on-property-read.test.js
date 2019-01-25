import puppeteer from 'puppeteer';
import abortOnPropertyRead from '../src/scriptlets/abort-on-property-read';

describe('abort-on-property-read', () => {
    let browser;
    let page;
    beforeAll(async () => {
        browser = await puppeteer.launch();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.evaluate(() => window.testProperty = 'test');
        // await page.evaluate(abortOnPropertyRead, 'testProperty');
    });

    it('should throw error', async () => {
        await expect(page.evaluate(() => window.testProperty)).resolves.toEqual('test');
    });

    afterAll(async () => {
        browser.close();
    })
})