const Nightwatch = require('nightwatch');
const {normalizeSelector, selectorName} = require('./crowSelector');
const log = require('./crowLog');
const actionTextId = 'crow-action-text-box';
let printActionText = true

const client = Nightwatch.createClient(
    {
        headless: false,
        env: process.env.NIGHTWATCH_ENV
    }
)

async function initBrowser(enableActionText = true) {
    global.browser = await client.launchBrowser();
    printActionText = enableActionText

    if (process.env.NIGHTWATCH_ENV === 'safari') {
        await global.browser.window.resize(2560, 1440); // Resize the window
        log.debug("When browser is Safari, setting window size in conf.js does not work. Setting to 2560x1440 in initBrowser function");
    }
}

async function sendToBrowserLog(text) {
    if (printActionText) {
        await global.browser.execute(function (label, elementId) {
            let tempTextElement = document.getElementById(elementId)
            let tempElementExist = !!tempTextElement; // true if element exists, false otherwise
            if (!tempElementExist)
                tempTextElement = document.createElement('div');
            tempTextElement.id = elementId;
            tempTextElement.style.position = 'fixed';
            tempTextElement.style.top = '0px';
            tempTextElement.style.left = '0px';
            tempTextElement.style.backgroundColor = 'rgba(255, 255, 255, 1)';
            tempTextElement.style.border = `1px dashed black`;
            // tempTextElement.style.borderRadius = '8px';
            tempTextElement.style.padding = '2px 5px';
            tempTextElement.style.zIndex = '9999'; // Ensure it's on top
            tempTextElement.style.color = 'black';
            tempTextElement.style.fontSize = '12px';
            tempTextElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
            tempTextElement.innerText = label;
            if (!tempElementExist)
                document.body.appendChild(tempTextElement);
        }, [text, actionTextId]);
    }
}

async function removeBrowserLog() {
    if (printActionText) {
        await global.browser.execute(function (elementId) {
            const tempTextElement = document.getElementById(elementId);
            tempTextElement.parentNode.removeChild(tempTextElement);
        }, [actionTextId]);
    }
}

async function highlightElement(element) {
    // Scroll the element into view
    await global.browser.execute(function (target) {
        // behavior can also be smooth for better visual result, but it will make test slower
        target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }, [element]);

    await global.browser.execute(function (target) {
        target.style.outline = `3px dashed red`;
    }, [element]);
}

async function removeElementHighlight(element) {
    await global.browser.execute(function (target) {
        target.style.outline = `0px dashed transparent`;
    }, [element]);
}


async function gatherElements(selector) {
    // do not include index for wait
    const querySelector = { ...selector };
    delete querySelector.index;
    if (querySelector.needVisible)
        await global.browser.waitForElementVisible(querySelector);
    else
        await global.browser.waitForElementPresent(querySelector);

    let result = [];
    const count = await global.browser.element.findAll(selector).count();
    // it seems element.findAll will ignore the "index" in the selector
    const indexValue = Number.isInteger(selector.index) && selector.index >= 1 ? selector.index : -1;
    for (let i = 0; i < count; i++) {
        if (indexValue < 0 || indexValue === (i + 1))
            result.push(global.browser.element.findAll(selector).nth(i))
    }
    return result;
}


//// Iterators
async function forGivenElement(element, description, callback, waitAfter = 50, needHighlight = true) {
    await sendToBrowserLog(description);
    if (needHighlight) await highlightElement(element);
    let result = await callback(element);
    try {
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    } catch (e) {
        log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
    }
    if (needHighlight) await removeElementHighlight(element);
    return result;
}

async function forTheFirstElement(page, selector, description, callback, waitAfter = 50) {
    const normSel = normalizeSelector(page, selector);
    await sendToBrowserLog(`For the first matching "${selectorName(selector)}": ${description}`);
    const elements = await gatherElements(normSel);
    if (normSel.needHighlight) await highlightElement(elements[0]);
    let result = await callback(elements[0]);
    try {
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    } catch (e) {
        log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
    }
    if (normSel.needHighlight) await removeElementHighlight(elements[0]);
    return result;
}

async function forAllElements(page, selector, description, callback, waitAfter = 50) {
    const normSel = normalizeSelector(page, selector);
    await sendToBrowserLog(`For all the matching "${selectorName(selector)}": ${description}`);
    const elements = await gatherElements(normSel);
    if (normSel.needHighlight)
        for (const element of elements)
            await highlightElement(element);
    let result = await callback(elements);
    try {
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    } catch (e) {
        log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
    }
    if (normSel.needHighlight)
        for (const element of elements)
            await removeElementHighlight(element);
    return result;
}

async function forEachElement(page, selector, description, callback, waitAfter = 50) {
    const normSel = normalizeSelector(page, selector);
    const elements = await gatherElements(normSel);
    try {
        for (const [i, element] of elements.entries()) {
            await sendToBrowserLog(`For the #${i + 1} matching "${selectorName(selector)}": ${description}`);
            if (normSel.needHighlight) await highlightElement(element);
            if (callback) await callback(element, i);
            if (normSel.needHighlight) await removeElementHighlight(element);
        }
        try {
            if (waitAfter > 0) await global.browser.pause(waitAfter);
        } catch (e) {
            log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
        }
    } catch (error) {
        log.debug(`forEachElement: failed to run the callback function, error: ${error.message}`);
    }
}

async function forAllTexts(page, selector, description, callback, waitAfter = 50) {
    const normSel = normalizeSelector(page, selector);
    await sendToBrowserLog(`For all the texts of "${selectorName(selector)}": ${description}`);
    const elements = await gatherElements(normSel);
    if (normSel.needHighlight)
        for (const element of elements)
            await highlightElement(element);
    let textList = [];
    for (const element of elements) textList.push(await element.getText());
    let result = await callback(textList);
    try {
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    } catch (e) {
        log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
    }
    if (normSel.needHighlight)
        for (const element of elements)
            await removeElementHighlight(element);
    return result;
}

async function forEachText(page, selector, description, callback, waitAfter = 50) {
    const normSel = normalizeSelector(page, selector);
    const elements = await gatherElements(normSel);
    for (const[i, element] of elements.entries()) {
        await sendToBrowserLog(`For the #${i + 1} text of "${selectorName(selector)}": ${description}`);
        if (normSel.needHighlight) await highlightElement(element);
        const thisText = await element.getText();
        await callback(thisText, i);
        if (normSel.needHighlight) await removeElementHighlight(element);
    }
    try {
        if (waitAfter > 0) await global.browser.pause(waitAfter);
    } catch (e) {
        log.debug(`${description}: failed to wait for ${waitAfter}ms, will continue`);
    }
}

module.exports = {
    initBrowser,
    sendToBrowserLog,
    removeBrowserLog,
    gatherElements,
    highlightElement,
    removeElementHighlight,
    forGivenElement,
    forTheFirstElement,
    forAllElements,
    forEachElement,
    forAllTexts,
    forEachText,
};
