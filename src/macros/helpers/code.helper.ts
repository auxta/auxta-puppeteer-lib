import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {StepStatus} from "../../AuxTA";
import {ExtendDefaultPage} from "./extend-default-page";
import {CDPSession, KnownDevices} from "puppeteer";
import {captureScreenshotPage} from "../../auxta/utilities/screenshot.helper";
import {compareScreenshots} from "../../auxta/services/report.service";
import axios from "axios";

export class FunctionHelper extends ExtendDefaultPage {
    public cdp: CDPSession | undefined;

    /**
     * This method is used to log data in to the test
     * @param keyword
     * @param name
     * @param status
     * @param screenshot
     */
    public log(keyword: string, name: string, status: StatusOfStep, screenshot?: ArrayBuffer) {
        log.push(keyword, log.tag, name, status, screenshot)
    }

    public setTag(tag: string) {
        log.tag = tag;
    }

    public clearTag() {
        log.clearTag();
    }

    /**
     * This method is used to call a REST API.
     * @param method // HTTP method (e.g., 'GET', 'POST', 'PUT', etc.)
     * @param url // URL with query parameters
     * @param headers // Optional Request headers (object in JSON format)
     * @param body // Optional Request body (object in JSON format)
     * @returns 
     */
    public async callREST(method: string, url: string, headers?: object, body?: object) {
        const response = await axios({
            method: method,
            url: url,
            headers: headers,
            data: body
        });
        
        return response; 
    }

    /**
     * This method is used to make a screenshot of a given page
     * @param page
     *
     * */
    public async screenshot(page = puppeteer.defaultPage) {
        const screenshotBuffer = await captureScreenshotPage(page);
        if (screenshotBuffer) {
            return screenshotBuffer;
        }
    }

    /**
     * This method is used to make a screenshot of a given page and compare it with another
     * @param key
     * @param threshold
     * @param page
     *
     * */
    public async screenshotCompare(key: string, threshold = 0.1, page = puppeteer.defaultPage) {
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            const screenshotBuffer = await captureScreenshotPage(page);
            if (screenshotBuffer) {
                const screenshot = screenshotBuffer;
                const result = await compareScreenshots(key, screenshot);
                if (result.presentDifference && Number(result.presentDifference) > threshold) {
                    log.push('Then', log.tag, `I compare screenshots with key ${key}, and difference is: ${result.presentDifference}%`, StatusOfStep.FAILED, screenshot, key)
                } else {
                    log.push('Then', log.tag, `I compare screenshots with key ${key}`, StatusOfStep.PASSED, screenshot, key)
                }
            }
        } else {
            log.push('Then', log.tag, `I compare screenshots with key ${key}`, StatusOfStep.PASSED, undefined, key)
        }
    }

    /**
     * This method is used to make a suggestion log
     * @param name
     *
     * */
    public suggest(name: string) {
        log.addSuggestion(name)
    }

    public async performanceFail(name: string, screenshot = true, page = puppeteer.defaultPage) {
        if (screenshot) {
            const screenshotBuffer = await captureScreenshotPage(page);
            log.addPerformanceFail(name, screenshotBuffer)
        } else {
            log.addPerformanceFail(name)
        }
    }

    /**
     * This method used to click the selected text by Xpath expression
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param options
     * @param page
     * @param time - how much timeout to set
     * @param log_message - true or false to log a message or not
     *
     * */
    public async clickByText(selector: string, text: string, dotOrText = '.', options = {}, page = puppeteer.defaultPage, time: number = this.defaultTimeout, log_message = true) {
        const message = `I clicked on the '${text}' '${selector}'`;
        try {
            const [linkHandlers]: any = await page.$$(`xpath/.//${selector}[contains(${dotOrText},"${text}")]`);

            if (linkHandlers) {
                await linkHandlers.click(options);
                log.push('Then', log.tag, message, StatusOfStep.PASSED);
            }
        } catch (e) {
            if (log_message) {
                log.push('And', log.tag, `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', log.tag, message, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to click the selected text by Xpath expression with class
     * @param class_selector
     * @param class_name
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param page
     *
     * */
    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
        const message = `I click on the '${text}' '${selector}'`;
        try {
            const [linkHandlers]: any = await page.$$(`xpath/.//${class_selector}[contains(@class,${this.getEscapedText(class_name)})]//${selector}[contains(${dotOrText},"${text}")]`);

            if (linkHandlers) {
                await linkHandlers.click();
                log.push('Then', log.tag, message, StatusOfStep.PASSED);
                return;
            }
        } catch (e) {
        }
        log.push('Then', log.tag, message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    //div[contains(@class,"mat-menu-content")]//button
    /**
     * This method used to wait for selector with text by Xpath expression
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param page
     *
     * */
    public async waitForSelectorWithText(selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
        const message = `I check for '${text}' on the current page`;
        try {
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const linkHandlers = await page.$$(`xpath/.//${selector}[contains(${dotOrText},"${text}")]`);
            if (linkHandlers.length > 0) {
                log.push('And', log.tag, message, StatusOfStep.PASSED);
                return true;
            }
        } catch (e) {
        }
        log.push('And', log.tag, message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    /**
     * This method used to set timeout
     * @param timeout
     * */
    public async timeout(timeout = this.defaultTimeout) {
        await new Promise(r => setTimeout(r, timeout));
    }

    /**
     * Waiting for selector with timeout 60000
     *
     * @function waitForSelector
     * @param {string} option - visible, hidden
     * @param selector - class to select
     * @param time
     * @param page
     * @param log_message
     */

    public async waitForSelector(option: string, selector: string, time: number = this.defaultTimeout, page = puppeteer.defaultPage, log_message = true) {
        const message = `I checked for the '${selector}' element to be ${option}`;
        try {
            await page.waitForSelector(selector, {
                [option]: true,
                timeout: time
            });
        } catch (e) {
            if (log_message) {
                log.push('And', log.tag, `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', log.tag, message, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to check if the url contains given name
     * @param selector
     * @param page
     *
     * */
    public async urlContains(selector: string, page = puppeteer.defaultPage) {
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', log.tag, message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', log.tag, message, StatusOfStep.PASSED);
    }

    public async forceState(selector: string, state: string, index = 0, page = puppeteer.defaultPage) {
        this.cdp = await page.target().createCDPSession();

        const docNodeId = (await this.cdp.send('DOM.getDocument')).root.nodeId;
        const nodeIds = (await this.cdp.send('DOM.querySelectorAll', {
            nodeId: docNodeId,
            selector: selector,
        })).nodeIds;
        await this.cdp.send('CSS.enable');
        await this.cdp.send('CSS.forcePseudoState', {
            nodeId: nodeIds[index],
            forcedPseudoClasses: [state],
        });
    }

    public async endForceState() {
        this.cdp?.detach();
    }

    /**
     * This method used to more quickly press enter
     * @param page
     *
     * */
    public async pressEnter(page = puppeteer.defaultPage) {
        await page.keyboard.press('Enter');
    }

    /**
     * This method used to emulate different phones
     * @remarks
     * currently the allowed named are:
     * "Blackberry PlayBook" | "Blackberry PlayBook landscape" | "BlackBerry Z30" | "BlackBerry Z30 landscape" | "Galaxy Note 3" | "Galaxy Note 3 landscape" | "Galaxy Note II" | "Galaxy Note II landscape" | "Galaxy S III" | "Galaxy S III landscape" | "Galaxy S5" | "Galaxy S5 landscape" | "Galaxy S8" | "Galaxy S8 landscape" | "Galaxy S9+" | "Galaxy S9+ landscape" | "Galaxy Tab S4" | "Galaxy Tab S4 landscape" | "iPad" | "iPad landscape" | "iPad (gen 6)" | "iPad (gen 6) landscape" | "iPad (gen 7)" | "iPad (gen 7) landscape" | "iPad Mini" | "iPad Mini landscape" | "iPad Pro" | "iPad Pro landscape" | "iPad Pro 11" | "iPad Pro 11 landscape" | "iPhone 4" | "iPhone 4 landscape" | "iPhone 5" | "iPhone 5 landscape" | "iPhone 6" | "iPhone 6 landscape" | "iPhone 6 Plus" | "iPhone 6 Plus landscape" | "iPhone 7" | "iPhone 7 landscape" | "iPhone 7 Plus" | "iPhone 7 Plus landscape" | "iPhone 8" | "iPhone 8 landscape" | "iPhone 8 Plus" | "iPhone 8 Plus landscape" | "iPhone SE" | "iPhone SE landscape" | "iPhone X" | "iPhone X landscape" | "iPhone XR" | "iPhone XR landscape" | "iPhone 11" | "iPhone 11 landscape" | "iPhone 11 Pro" | "iPhone 11 Pro landscape" | "iPhone 11 Pro Max" | "iPhone 11 Pro Max landscape" | "iPhone 12" | "iPhone 12 landscape" | "iPhone 12 Pro" | "iPhone 12 Pro landscape" | "iPhone 12 Pro Max" | "iPhone 12 Pro Max landscape" | "iPhone 12 Mini" | "iPhone 12 Mini landscape" | "iPhone 13" | "iPhone 13 landscape" | "iPhone 13 Pro" | "iPhone 13 Pro landscape" | "iPhone 13 Pro Max" | "iPhone 13 Pro Max landscape" | "iPhone 13 Mini" | "iPhone 13 Mini landscape" | "JioPhone 2" | "JioPhone 2 landscape" | "Kindle Fire HDX" | "Kindle Fire HDX landscape" | "LG Optimus L70" | "LG Optimus L70 landscape" | "Microsoft Lumia 550" | "Microsoft Lumia 950" | "Microsoft Lumia 950 landscape" | "Nexus 10" | "Nexus 10 landscape" | "Nexus 4" | "Nexus 4 landscape" | "Nexus 5" | "Nexus 5 landscape" | "Nexus 5X" | "Nexus 5X landscape" | "Nexus 6" | "Nexus 6 landscape" | "Nexus 6P" | "Nexus 6P landscape" | "Nexus 7" | "Nexus 7 landscape" | "Nokia Lumia 520" | "Nokia Lumia 520 landscape" | "Nokia N9" | "Nokia N9 landscape" | "Pixel 2" | "Pixel 2 landscape" | "Pixel 2 XL" | "Pixel 2 XL landscape" | "Pixel 3" | "Pixel 3 landscape" | "Pixel 4" | "Pixel 4 landscape" | "Pixel 4a (5G)" | "Pixel 4a (5G) landscape" | "Pixel 5" | "Pixel 5 landscape" | "Moto G4" | "Moto G4 landscape"
     * @param phone_name
     * @param page
     *
     * */
    public async emulate(phone_name: string, page = puppeteer.defaultPage) {
        // @ts-ignore
        const phone = KnownDevices[phone_name]
        await page.emulate(phone);
    }

    /**
     * This method used to restart the browser
     *
     * */
    public async restartBrowser() {
        await puppeteer.close();
        await puppeteer.startBrowser();
    }

    /**
     * This method used to click on selector and wait for a page to be created
     * @param selector
     * @param page
     * @param newPage
     *
     * */
    public async clickAndWaitForPageToBeCreated(selector: string, page = puppeteer.defaultPage, newPage: boolean) {
        if (newPage) {
            const nav = new Promise(res => page.browser().on('targetcreated', res));
            await page.click(selector);
            await nav;
        } else {
            await page.click(selector);
        }

    }

    public async waitForResponse(name: string, wait = true, page = puppeteer.defaultPage) {
        if (wait) {
            await page.waitForResponse(response => response.url().includes(name));
            this.log('Then', `I wait for response with name: ${name}`, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to close last page in browser
     * @param page
     *
     * */
    public async closeLastPage(page = puppeteer.defaultPage) {
        const pages = await page.browser().pages();
        await pages[pages.length - 1].close();
    }

    /**
     * This method used to log in a microsoft account
     * @param button
     * @param email
     * @param password
     * @param page
     * @param newPage
     *
     * @param staySignIn
     * */
    public async microsoftLogin(button: string, email: string, password: string, page = puppeteer.defaultPage, newPage = true, staySignIn = true) {
        const email_input = 'input[type="email"]';
        const password_input = 'input[type="password"]';
        await this.clickAndWaitForPageToBeCreated(button, page, newPage);
        const pages = await page.browser().pages();
        const loginPage = pages[pages.length - 1];
        await this.extend_page_functions(loginPage);
        await this.waitForResponse('signin-options', true, loginPage)
        await loginPage.type(email_input, email, {delay: 0});
        await loginPage.keyboard.press('Enter');
        await this.waitForResponse('arrow_left', true, loginPage);
        let isWorkOrPersonalVisible = await page.$('div.table');
        if (!!isWorkOrPersonalVisible) {
            await (await page.$$('div.table'))[0].click();
            console.log('Then', 'I clicked Work or school account', StepStatus.PASSED);
            await this.waitForResponse('microsoft_logo', true, loginPage);
        }
        // if() here check is container with asking Work or Personal is account?
        try {
            await this.timeout(1000);
            (await loginPage.$(password_input))?.type(password);
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.PASSED);
        } catch (e) {
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.FAILED);
            throw new Error(`I type password into the ${password_input}`)
        }
        await this.timeout(1000);
        await loginPage.keyboard.press('Enter');
        if (staySignIn) {
            await this.waitForResponse('2_11d9e3bcdfede9ce5ce5ace2d129f1c4', true, loginPage);
            await this.timeout(1000);
            await loginPage.keyboard.press('Enter');
        }
    }

    private getEscapedText(text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }

    /**
     * Sends a POST request to the specified URL with the provided body and Bearer token.
     *
     * @param {string} url - The endpoint URL to which the request is sent.
     * @param {Object} body - The request payload to be sent in the body of the POST request.
     * @param {string} token - The Bearer token used for authentication in the Authorization header.
     * @throws {Error} - Throws an error if the request fails or if a non-200 status code is returned.
     */
    public async callAPI(url: string, body: {}, token: string) {
        return await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
    }


}

export default new FunctionHelper();
