const log = require('./crowLog');
const {sendToBrowserLog, forTheFirstElement, forGivenElement, gatherElements} = require('./crowCore')
const {normalizeSelector, setSelectorAttribute, selectorName} = require('./crowSelector')
const {platform} = require("node:os");
const {stringMatch, optContain, optEqualCaseless} = require("./crowString");

const ALLOWED_KEYS = [
    "NULL",
    "CANCEL",
    "HELP",
    "BACK_SPACE",
    "TAB",
    "CLEAR",
    "RETURN",
    "ENTER",
    "SHIFT",
    "CONTROL",
    "ALT",
    "PAUSE",
    "ESCAPE",
    "SPACE",
    "PAGEUP",
    "PAGEDOWN",
    "END",
    "HOME",
    "ARROW_LEFT",
    "LEFT_ARROW", // Alias
    "ARROW_UP",
    "UP_ARROW",   // Alias
    "ARROW_RIGHT",
    "RIGHT_ARROW", // Alias
    "ARROW_DOWN",
    "DOWN_ARROW", // Alias
    "INSERT",
    "DELETE",
    "SEMICOLON",
    "EQUALS",
    "NUMPAD0",
    "NUMPAD1",
    "NUMPAD2",
    "NUMPAD3",
    "NUMPAD4",
    "NUMPAD5",
    "NUMPAD6",
    "NUMPAD7",
    "NUMPAD8",
    "NUMPAD9",
    "MULTIPLY",
    "ADD",
    "SEPARATOR",
    "SUBTRACT",
    "DECIMAL",
    "DIVIDE",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "META",
    "COMMAND"
];

function verifyKey(key) {
    return (key === null || key === undefined) ? true : ALLOWED_KEYS.includes(key);
}

async function mouseOver(page, selector, waitAfter = 50) {
    return await forTheFirstElement(page, selector, 'Mouse Over',
        async (element) => {
            element.moveTo(0, 0);
        }, waitAfter);
}

async function pressAndReleaseKeys(key, withModifier = null, waitAfter = 50) {
    let msg = `Typing key ${key}`;
    if (withModifier) msg += ` with modifier "${withModifier}"`;
    await sendToBrowserLog(msg);
    const act = global.browser.actions({async: true});
    if (verifyKey(key) && verifyKey(withModifier)) {
        // eslint-disable-next-line security/detect-object-injection
        if (withModifier) await act.keyDown(global.browser.Keys[withModifier] || withModifier).perform()
        // eslint-disable-next-line security/detect-object-injection
        await act.sendKeys(global.browser.Keys[key] || key).perform();
        // eslint-disable-next-line security/detect-object-injection
        if (withModifier) await act.keyUp(global.browser.Keys[withModifier] || withModifier).perform();
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    }
}

async function keyDownAndDo(key, callback, waitAfter = 50) {
    if (verifyKey(key)) {
        // eslint-disable-next-line security/detect-object-injection
        const keyToPress = global.browser.Keys[key] || key;
        await sendToBrowserLog(`Executing a callback while pressing ${key}`);
        const act = global.browser.actions({async: true});
        await act.keyDown(keyToPress).perform();
        const result = await callback();
        await act.keyUp(keyToPress).perform();
        if (waitAfter > 0) await global.browser.pause(waitAfter);
        return result;
    }else {
        return false;
    }
}

async function clickSwitchToNewTab(page, selector, waitAfter = 1000) {
    const thisKey = platform() === 'darwin' ? global.browser.Keys.COMMAND : global.browser.Keys.CONTROL;
    await forTheFirstElement(page, selector, 'Click and open link in a new tab', async (element) => {
        const act = global.browser.actions({async: true});
        await act.keyDown(thisKey).perform();
        await element.click();
        await act.keyUp(thisKey).perform();
    }, waitAfter);
    await switchToLastWindow();
}

async function click(page, selector, waitAfter = 50) {
    return await forTheFirstElement(page, selector, 'Click',
        async (element) => {
            await element.click();
        }, waitAfter);
}

async function clickByElement(element, waitAfter = 50) {
    return await forGivenElement(element, 'Click', async (e) => {
        await e.click();
    }, waitAfter);
}

async function clickUntilAttributeMatch(page,
                                        selector,
                                        expectAttrObj,
                                        waitAfter = 50,
                                        matchOptions = optContain,
                                        maxRetry = 5,
                                        checkAttrSelector = 'same') {
    const checkSel = checkAttrSelector === 'same' ? selector : checkAttrSelector;
    let clickTry = 0;
    try {
        while (clickTry < maxRetry) {
            let match = true;
            let logMsg = `clickUntilAttributeMatch: ${selectorName(checkSel)}, try #${clickTry}, `;
            for (const [attr, expValue] of Object.entries(expectAttrObj)) {
                const attrValue = await forTheFirstElement(page, checkSel, `Get the value of attribute "${attr}"`,
                    async (element) => {
                        return await element.getAttribute(attr);
                    })
                match = match && stringMatch(attrValue, expValue, matchOptions);
                logMsg += `attr: ${attr}, expect: ${expValue}, got: ${attrValue}, Match: ${match}`;
            }
            log.debug(logMsg);
            if (match) break;
            await forTheFirstElement(page, selector,
                `Click until match attribute map ${JSON.stringify(expectAttrObj)}`,
                async (element) => {
                    await element.click();
                }, waitAfter);
            clickTry += 1;
        }
    } catch (e) {
        log.debug(`clickUntilAttributeMatch: failed with error ${e.message}`);
    }
}

async function clickByText(page,
                           selector,
                           text,
                           matchOptions = optEqualCaseless,
                           waitAfter = 50,
                           throwErrIfNotFound = true) {
    let findAllSel = normalizeSelector(page, selector);
    findAllSel = setSelectorAttribute(findAllSel, 'needHighlight', false);
    let info = `find the first element that has text match ${text}`;
    const elements = await gatherElements(findAllSel);
    let clickable = false;
    for (const element of elements) {
        const uiText = await element.getText();
        clickable = stringMatch(uiText, text, matchOptions);
        if (clickable) {
            const normSel = normalizeSelector(page, selector)
            info = `Click on "${selectorName(selector)}"`;
            await forGivenElement(element, info, async e => {
                await e.click();
            }, waitAfter, normSel.needHighlight);
            break;
        }
    }
    if (!clickable && throwErrIfNotFound)
        log.error(`clickByText: Cannot find ${selectorName(selector)} has text match ${text}`, true);
    return clickable
}

async function clickIfExist(page, selector, waitAfter = 50, timeout = 0) {
    let sel = normalizeSelector(page, selector);
    sel = setSelectorAttribute(sel, 'suppressNotFoundErrors', true) // so the NW will not print error if the element is not present
    if (timeout > 0) sel = setSelectorAttribute(sel, 'timeout', timeout);
    if (await global.browser.isPresent(sel)) {
        return await forTheFirstElement(page, selector, 'Click only if it exists',
            async (element) => {
                await element.click();
            }, waitAfter);
    } else
        log.info(`clickIfExist: Element ${selectorName(selector)} is not present, so skipped clicking on it`);
}

// removeHiddenClass: some input element has a class 'd-none', that prevent element from being interactable
// this often happen for file upload when input holds the file path and the value is set by UI code
// it's better to remove it if d-none class exists
async function type(page, selector, text, waitAfter = 50, removeHiddenClass = false) {
    let sel = normalizeSelector(page, selector);
    if (removeHiddenClass) {
        await global.browser.execute(function (selector) {
            const element = document.querySelector(selector);
            if (element && element.classList.contains('d-none')) element.classList.remove('d-none');
        }, [sel.selector]);
    }
    return await forTheFirstElement(page, sel, 'Type the given text',
        async (element) => {
            const currentValue = await element.getValue();
            if (currentValue)
                for (let i = 0, len = currentValue.length; i < len; i++)
                    await element.setValue('\uE003'); // remove text from textarea
            await element.setValue(text);
        }, waitAfter)
}

async function refreshPage(waitAfter = 1000) {
    const currentUrl = await global.browser.getCurrentUrl();
    log.debug(`refreshPage currentUrl ${currentUrl}`);
    await global.browser.url(currentUrl);
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function goBackPage(waitAfter = 1000) {
    const currentUrl = await global.browser.getCurrentUrl();
    log.debug(`goBackPage from ${currentUrl}`);
    await global.browser.back(); // This navigates one step back in history
    if (waitAfter > 0) await global.browser.pause(waitAfter);

    const newUrl = await global.browser.getCurrentUrl();
    log.debug(`goBackPage to ${newUrl}`);
}

async function navigateToUrl(url, waitAfter = 1000) {
    await global.browser.url(url);
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function switchToWindowAtIndex(index, waitAfter = 50, closePreviousWindow = false) {
    const allWindows = await global.browser.window.getAllHandles();
    log.debug(`switchToWindowAtIndex: there are ${allWindows.length} windows, switching to #${index}`);
    if (closePreviousWindow) await global.browser.window.close();
    await global.browser.window.switchTo(allWindows.at(index));
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function switchToLastWindow(waitAfter = 50) {
    const allWindows = await global.browser.window.getAllHandles();
    log.debug(`switchToLastWindow: allWindows: ${JSON.stringify(allWindows)}`);
    // For FirefoxHeadless mode (only headless), it has a default dummy page, which has dummy URL, that's a special feature
    // so we loop through from the last one , stop at the one that does not have "dummy URL"
    for (let i = 1; i <= allWindows.length; i++) {
        const windowIndex = allWindows.length - i;
        await global.browser.window.switchTo(allWindows.at(windowIndex));
        const currentUrl = await global.browser.getCurrentUrl();
        log.debug(`switchToLastWindow: window #${windowIndex} ${allWindows.at(windowIndex)}, url: ${currentUrl}`);
        const dummyUrls = [
            "about:blank",
            "0.0.10.0", // Or your specific dummy local IP
            "127.0.0.1"
        ];
        if (!dummyUrls.some(url => currentUrl.includes(url))) break;
    }
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function switchToWindowMatchUrl(urlKeywords, waitAfter = 50) {
    const lookupList = Array.isArray(urlKeywords) ? urlKeywords : [urlKeywords];
    const allWindows = await global.browser.window.getAllHandles();
    log.debug(`switchToWindowMatchUrl: allWindows: ${JSON.stringify(allWindows)}`);
    let matched = false;
    for (const [i, window] of allWindows.entries()) {
        await global.browser.window.switchTo(window);
        const currentUrl = await global.browser.getCurrentUrl();
        log.debug(`switchToLastWindow: window #${i} ${window}, url: ${currentUrl}`);
        matched = matched || lookupList.every(part => stringMatch(currentUrl, part, optContain));
        if (matched) break;
    }
    if (!matched)
        throw new Error(`switchToWindowMatchUrl: Cannot find window that URL contains ${lookupList.join(', ')}`);
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function scrollToPageBottom(waitAfter = 50) {
    await sendToBrowserLog('Scroll to the page bottom');
    await global.browser.execute(async () => {
        return window.scrollX;
    }, [], async (result) => {
        // automated testing frameworks like Nightwatch.js require some initial interaction or scrolling before subsequent scrolling commands work as expected
        await global.browser.execute(`window.scrollTo(${result.value}, 1);`);
        await global.browser.execute(`window.scrollTo(${result.value}, document.body.scrollHeight);`);
    });
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function scrollToPageTop(waitAfter = 50) {
    await sendToBrowserLog('Scroll to the page top');
    await global.browser.execute(async () => {
        return window.scrollX;
    }, [], async (result) => {
        await global.browser.execute(`window.scrollTo(${result.value}, 1);`);
        await global.browser.execute(`window.scrollTo(${result.value}, 0);`);
    });
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function scrollToPageRight(waitAfter = 50) {
    await sendToBrowserLog('Scroll to the page right');
    await global.browser.execute(async () => {
        return window.scrollY;
    }, [], async (result) => {
        await global.browser.execute(`window.scrollTo(1, ${result.value});`);
        await global.browser.execute(`window.scrollTo(document.body.scrollWidth, ${result.value});`);
    });
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function scrollToPageLeft(waitAfter = 50) {
    await sendToBrowserLog('Scroll to the page left');
    await global.browser.execute(async () => {
        return window.scrollY;
    }, [], async (result) => {
        await global.browser.execute(`window.scrollTo(1, ${result.value});`);
        await global.browser.execute(`window.scrollTo(0, ${result.value});`);
    });
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function takeScreenshot(fileNamePath, waitAfter = 50) {
    await global.browser.saveScreenshot(fileNamePath, () => {
        console.log(`Screenshot ${fileNamePath} is saved`);
    });
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

module.exports = {
    pressAndReleaseKeys,
    keyDownAndDo,
    click,
    clickByElement,
    clickByText,
    clickUntilAttributeMatch,
    clickIfExist,
    clickSwitchToNewTab,
    type,
    refreshPage,
    navigateToUrl,
    switchToWindowAtIndex,
    switchToLastWindow,
    switchToWindowMatchUrl,
    scrollToPageBottom,
    scrollToPageTop,
    scrollToPageRight,
    scrollToPageLeft,
    mouseOver,
    takeScreenshot,
    goBackPage,
}