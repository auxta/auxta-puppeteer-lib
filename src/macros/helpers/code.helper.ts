import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StatusOfStep } from "../../auxta/enums/status-of.step";
import { config } from "../../auxta/configs/config";

export class FunctionHelper {
    public readonly defaultTimeout: number = config.timeout;

    public log(keyword: string, name: string, status: StatusOfStep){
        log.push(keyword, name, status)
    }

    public suggest(name: string){
        log.addSuggestion(name)
    }

    private getEscapedText(text: string){
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }
    
    public async clickByText(selector: string, text: string, page = puppeteer.defaultPage) {
        const message = `I click on the '${text}' '${selector}'`;
        try{
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const [linkHandlers] = await page.$x(`//${selector}[. = ${this.getEscapedText(text)}]`);

            if (linkHandlers) {
                log.push('Then', message, StatusOfStep.PASSED);
                await linkHandlers.click();
                return;
            }
        } catch (e){
        }
        log.push('Then', message, StatusOfStep.FAILED);
        throw new Error(message);

    }

    public async waitForSelectorWithText(selector: string, text: string, page = puppeteer.defaultPage) {
        const message = `I check for '${text}' on the current page`;
        try{
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const linkHandlers = await page.$x(`//${selector}[. = ${this.getEscapedText(text)}]`);
            if (linkHandlers.length > 0) {
                log.push('And', message, StatusOfStep.PASSED);
                return true;
            }
        }catch (e) {
        }
        log.push('And', message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    public async goto(url: string, page = puppeteer.defaultPage) {
        await page.goto(url);
        log.push('Then', `I go to the '${url}' page`, StatusOfStep.PASSED);
    }

    public async type(field: string, value: string, page = puppeteer.defaultPage) {
        try{
            await page.waitForSelector(field, {
                timeout: this.defaultTimeout
            });
            await page.type(field, value);
            let elementName = await page.$eval(field, (e) => e.textContent);
            if (!elementName || elementName === ' ') elementName = field;
            log.push('Then', `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
        } catch (e){
            const msg = `I type '${value}' into the '${field}' field`
            log.push('Then', msg, StatusOfStep.FAILED);
            throw new Error(msg)
        }
    }

    public async waitForNetwork(page = puppeteer.defaultPage) {
        let message = 'I wait for the page to load'
        try{
            await page.waitForNetworkIdle();
            log.push('Then', message, StatusOfStep.PASSED);
        } catch (e){
            log.push('Then', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
    }

    public async timeout(timeout = this.defaultTimeout, page = puppeteer.defaultPage) {
        await page.waitForTimeout(timeout);
    }

    /**
     * Waiting for selector with timeout 60000
     *
     * @function waitForSelector
     * @param {string} option - visible, hidden
     * @param selector - class to select
     * @param time
     * @param page
     */

    public async waitForSelector(option: string, selector: string, time: number = this.defaultTimeout, page = puppeteer.defaultPage) {
        const message = `I check for the '${selector}' element to be ${option}`;
        try{
            await page.waitForSelector(selector, {
                [option]: true,
                timeout: time
            });
        } catch (e){
            log.push('And', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', message, StatusOfStep.PASSED);
    }

    public async click(selector: string, page = puppeteer.defaultPage) {
        try{
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            let elementName = await page.$eval(selector, (e) => e.textContent);
            if (!elementName || elementName === ' ') elementName = selector;
            await page.click(selector);
            log.push('Then', `I click on the '${elementName}'`, StatusOfStep.PASSED);
        } catch (e){
            const msg = `I click on the '${selector}'`;
            log.push('Then', msg, StatusOfStep.FAILED);
            throw new Error(msg)
        }
    }

    public async urlContains(selector: string, page = puppeteer.defaultPage) {
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', message, StatusOfStep.FAILED);
            throw new Error(`I am not at the '${selector}' page`)
        }
        log.push('And', message, StatusOfStep.PASSED);
    }

}

export default new FunctionHelper();
