import puppeteer from 'puppeteer';
import path from 'path';

describe('abort-on-property-read', () => {
    let browser;
    let page;
    beforeAll(async () => {
        browser = await puppeteer.launch();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.goto(`file:${path.resolve(__dirname, '..', 'index.html')}`);
        const onError = e => console.log(e);
        page.on('error', onError)
        page.on('pageerror', onError);
    });

    it('should throw reference error', async () => {
        await page.evaluate(() => {
            window.testProperty = 'test';
            evalCode = window.scriptlets.invoke({
                name: 'abort-on-property-read',
                args: ['testProperty']
            });
            eval(evalCode);
        });
        
        try {
            await page.evaluate(() => window.testProperty);
        } catch (e) {
            expect(e.message).toContain('ReferenceError');
        }
    });

    it('should get field normaly', async () => {
        await page.evaluate(() => {
            window.forbiddenProp = 'test';
            window.okProp = 'I am ok';
            evalCode = window.scriptlets.invoke({
                name: 'abort-on-property-read',
                args: ['wrongProperty']
            });
            eval(evalCode);
        });
        
        const prop = await page.evaluate(() => window.okProp);
        expect(prop).toEqual('I am ok');
    })

    afterAll(async () => {
        browser.close();
    })
})