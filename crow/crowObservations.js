const {expect} = require('chai');
const chai = require('chai');
chai.config.truncateThreshold = 0; // Disable truncation
chai.use(require('chai-arrays'));
const log = require('./crowLog')
const {
    normalizeString, isDate, stringMatch,
    assertStringMatch, isNumeric, optEqualCaseless, optContain
} = require('./crowString')
const {
    sendToBrowserLog, forEachElement, forTheFirstElement, forAllElements, forAllTexts, forEachText,
} = require("./crowCore");
const {setSelectorAttribute, normalizeSelector, selectorName} = require('./crowSelector')
const {retryWithDelay} = require("./crowTools");
const fs = require('fs').promises;

//// GET Values
async function currentPageUrl() {
    await sendToBrowserLog('Getting URL of the current page');
    return global.browser.getCurrentUrl();
}

async function isElementPresent(page, selector, timeout = 0) {
    await sendToBrowserLog(`Checking if element exist: "${selectorName(selector)}"`);
    let sel = normalizeSelector(page, selector);
    if (timeout > 0) sel = setSelectorAttribute(sel, 'timeout', timeout);
    sel = setSelectorAttribute(sel, 'suppressNotFoundErrors', true) // so the NW will not print error if the element is not present
    const result = await global.browser.isPresent(sel);
    return result === true;
}

async function isElementVisible(page, selector, timeout = 0) {
    await sendToBrowserLog(`Checking if element visible: "${selectorName(selector)}"`);
    let sel = normalizeSelector(page, selector);
    if (timeout > 0) sel = setSelectorAttribute(sel, 'timeout', timeout);
    sel = setSelectorAttribute(sel, 'suppressNotFoundErrors', true) // so the NW will not print error if the element is not present
    const result = await global.browser.isVisible(sel);
    return result === true;
}


async function getElementsCount(page, selector) {
    return await forAllElements(page, selector, 'Get the count of the elements',
        async (elementList) => {
            return elementList.length;
        }, 0);
}

async function getElementIndexFromElementsByText(page, elementsSelector, text, matchOptions = optEqualCaseless, throwErrIfNotFound = true) {
    const uiTexts = await getAllTexts(page, elementsSelector);
    for (const [i, uiText] of uiTexts.entries()) {
        const match = stringMatch(uiText, text, matchOptions);
        if (match) return i;
    }
    if (throwErrIfNotFound)
        log.error(`getElementIndexFromElementsByText: Cannot find ${selectorName(elementsSelector)} has text match ${text}`, true);
    return NaN;
}

async function getAllTexts(page, selector) {
    return await forAllElements(page, selector, 'Get the texts as an array',
        async (elementList) => {
            let result = [];
            for (const element of elementList) result.push(await element.getText());
            return result;
        }, 0)
}

async function waitForTexts(page, selector, callback, maxTry = 20, waitEachTry = 1000) {
    let tryRound = 0;
    while (tryRound < maxTry) {
        try {
            const uiTexts = await getAllTexts(page, selector);
            const result = await callback(uiTexts, tryRound);
            log.debug(`waitForTexts try #${tryRound}: uiText: [${uiTexts.join(', ')}], Matched: ${result}`);
            if (result) {
                return true; // Success
            }
        } catch (error) {
            log.warning(`waitForTexts try #${tryRound} failed for selector "${selector}": ${error.message}`);
        }
        tryRound += 1;
        try {
            await global.browser.pause(waitEachTry)
        } catch (e) {
            log.debug(`waitForTexts: failed to wait for ${waitEachTry}ms, will continue`);
        }
    }
    // If the loop finishes, it means we ran out of tries and callback never returned true
    // Throw an error to signal this failure explicitly
    const errorMessage = `waitForTexts failed for selector "${selector}" after ${maxTry} attempts.`;
    // ESLint rule: "detect-unhandled-async-errors" does not want async function throw exception,
    // But our code is for test, throwing exception is the purpose, so we skip this rule here
    // eslint-disable-next-line security/detect-unhandled-async-errors
    throw new Error(errorMessage); // This is still the correct way to signal failure.
}

async function getAllTypedValues(page, selector) {
    return await forAllElements(page, selector, 'Get the input text as an array',
        async (elementList) => {
            let result = [];
            for (const element of elementList) result.push(await element.getValue());
            return result;
        }, 0)
}

async function getAttribute(page, selector, attribute) {
    return await forTheFirstElement(page, selector, `Get the value of attribute "${attribute}"`,
        async (element) => {
            return await element.getAttribute(attribute);
        }, 0)
}

async function hasProperty(page, selector, property) {
    return await forTheFirstElement(page, selector, `Query if property "${property}" exist`,
        async (element) => {
            const result = await element.getProperty(property);
            return !!result.value;
        }, 0)
}

//// Assertions

async function assertVisible(page, selector, waitAfter = 0) {
    let sel = normalizeSelector(page, selector)
    await forEachElement(page, sel, 'Assert visible', null, waitAfter);
}

async function assertElementsCount(page, selector, count, waitAfter = 0) {
    if (typeof count === 'string') count = Number(count);
    await forAllElements(page, selector, `Assert count is ${count}`,
        async (elementList) => {
            const msg = `assertElementsCount: ${selectorName(selector)}`;
            return expect(elementList.length).to.equal(count, msg);
        }, waitAfter)
}

async function assertNotPresent(page, selector, waitAfter = 0) {
    await sendToBrowserLog(`Assert not present: "${selectorName(selector)}"`);
    let sel = normalizeSelector(page, selector)
    sel = setSelectorAttribute(sel, 'suppressNotFoundErrors', true) // so the NW will not print error if the element is not present
    const result = await global.browser.isPresent(sel);
    const notPresent = !result;
    expect(notPresent).to.equal(true, `assertNotPresent: ${selectorName(selector)}`);
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function assertNotVisible(page, selector, waitAfter = 0) {
    await sendToBrowserLog(`Assert not visible: "${selectorName(selector)}"`);
    let sel = normalizeSelector(page, selector);
    sel = setSelectorAttribute(sel, 'suppressNotFoundErrors', true) // so the NW will not print error if the element is not present
    const present = await global.browser.isPresent(sel);
    let result = present ? await global.browser.isVisible(sel) : false;
    const notVisible = !result;
    expect(notVisible).to.equal(true, `assertNotVisible: ${selectorName(selector)}`);
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

// async function assertEachTextVisible(_page, _selector, _waitAfterEach = 50) {
//     let msg = 'We do not provide any function that locate element by text. ';
//     msg += 'Please xpath selector to locate element by text (with other options such as:';
//     msg += 'add parent path, specify attribute, case insensitive, contain/exact match, etc)';
//     log.error(msg, true);
// }

//if the selector is button, it should be 'disable' === 'true',
// for other type of element, it normally is 'pointer-events' === 'none'
async function assertDisabled(page, selector, waitAfter = 0) {
    const info = 'Assert disabled';
    await forEachElement(page, selector, info, async (element, index) => {
        const disabledValue = await element.getAttribute('disabled');
        const pointerEventsValue = await element.getAttribute('pointer-events');
        const disabled = (disabledValue === 'true') || (pointerEventsValue === 'none');
        expect(disabled).to.equal(true, `assertDisabled: ${selectorName(selector, index)}`)
    }, waitAfter);
}

async function assertSelected(page, selector, waitAfter = 0) {
    const info = 'Assert selected';
    await forTheFirstElement(page, selector, info, async () => {
        const result = await global.browser.isSelected(normalizeSelector(page, selector))
        expect(result).to.equal(true, `assertSelected: ${selectorName(selector)}`);
    }, waitAfter);
}

async function assertNotSelected(page, selector, waitAfter = 0) {
    const info = 'Assert not selected';
    await forTheFirstElement(page, selector, info, async () => {
        const result = await global.browser.isSelected(normalizeSelector(page, selector))
        const notSelected = !result;
        expect(notSelected).to.equal(true, `assertNotSelected: ${selectorName(selector)}`);
    }, waitAfter);
}

async function assertEachTextMatch(page, selector, text, matchOptions = optEqualCaseless, maxTry = 5, tryInterval = 200) {
    let info = `Assert text matches "${text}"`;
    await retryWithDelay(async () => {
        await forEachText(page, selector, info, (uiText, index) => {
            let msg = `assertEachTextMatch: ${selectorName(selector, index + 1)}`;
            assertStringMatch(uiText, text, matchOptions, msg);
        }, 0);
    }, `assertEachTextMatch expect: ${text}`, maxTry, tryInterval);
}

async function assertEachTypedValueMatch(page, selector, text, matchOptions = optEqualCaseless, waitAfter = 0) {
    let info = `Assert typed value matches "${text}"`;
    await forEachElement(page, selector, info, async (element, index) => {
        let msg = `assertEachTypedValueMatch: ${selectorName(selector, index + 1)}`;
        const actualValue = await element.getValue();
        assertStringMatch(actualValue, text, matchOptions, msg);
    }, waitAfter);
}

async function assertAnyTextMatch(page, selector, text, matchOptions = optEqualCaseless, waitAfter = 0) {
    let info = `Assert any text match "${text}"`;
    await forAllTexts(page, selector, info, (uiTextList) => {
        let found = false;
        for (const uiText of uiTextList) {
            const thisFound = stringMatch(uiText, text, matchOptions);
            if (thisFound) {
                found = true;
                break;
            }
        }
        expect(found).to.equal(true, `assertAnyTextMatch ${text}: ${selectorName(selector)}`);
    }, waitAfter);
}

async function assertEachTextNotContain(page, selector, text, waitAfter = 0) {
    let info = `Assert text not to contain "${text}", ignoring case and special chars`
    await forEachText(page, selector, info, (uiText, index) => {
        const act = normalizeString(uiText);
        const exp = normalizeString(text);
        const msg = `assertEachTextNotContain: ${selectorName(selector, index)}`;
        expect(act).to.not.contain(exp, msg)
    }, waitAfter);
}

async function assertEachTextInArray(page, selector, array, matchOptions = optEqualCaseless, waitAfter = 0) {
    let info = `Assert text is in array "${JSON.stringify(array)}"`;
    await forEachText(page, selector, info,
        async (uiText, index) => {
            let msg = `assert ${uiText} match certain element in array ${JSON.stringify(array)}`
            msg = `${msg}: ${selectorName(selector, index)}`;
            const found = array.some(exp => stringMatch(uiText, exp, matchOptions));
            expect(found).to.equal(true, msg)
        }, waitAfter);
}

async function assertEachTextContainsArray(page,
                                           selector,
                                           array,
                                           matchOrder = false,
                                           waitAfter = 0) {
    let info = `Assert text contains every element in array "${JSON.stringify(array)}"`;
    await forEachText(page, selector, info,
        async (uiText, index) => {
            let msg = `assert ${uiText} contains array ${JSON.stringify(array)}`
            msg = `${msg}: ${selectorName(selector, index)}`;
            let match;
            if (matchOrder) {
                let currentIndex = 0;
                match = array.every(exp => {
                    currentIndex = uiText.indexOf(exp, currentIndex);
                    if (currentIndex === -1) return false; // If any element isn't found in order, return false
                    currentIndex += exp.length; // Move past the found element for the next search
                    return true;
                });
            } else
                match = array.every(exp => stringMatch(uiText, exp, optContain));
            expect(match).to.equal(true, msg);
        }, waitAfter);
}

async function assertEachTextIntegerGreaterThan(page, selector, expInteger, waitAfter = 0) {
    let info = `Assert text integer is greater than ${expInteger}`;
    await forEachText(page, selector, info, (uiText, index) => {
        const cleanedStr = uiText.replace(/,/g, '');
        if (!isNumeric(cleanedStr))
            throw new Error(`${selector} #${index} value ${uiText} is not an integer`);
        const act = Number(cleanedStr);
        const msg = `assertEachTextIntegerGreaterThan: ${selectorName(selector, index)}`;
        expect(act).to.be.greaterThan(expInteger, msg);
    }, waitAfter);
}

async function assertEachTextIntegerEqual(page, selector, expInteger, waitAfter = 0) {
    let info = `Assert text integer is equal to ${expInteger}`;
    await forEachText(page, selector, info, (uiText, index) => {
        const cleanedStr = uiText.replace(/,/g, '');
        if (!isNumeric(cleanedStr))
            throw new Error(`${selector} #${index} value ${uiText} is not an integer`);
        const act = Number(cleanedStr);
        const msg = `assertEachTextIntegerEqual: ${selectorName(selector, index)}`;
        expect(act).to.be.equal(expInteger, msg);
    }, waitAfter);
}

async function assertTextsMatchArray(page, selector, textArray, matchOptions = optEqualCaseless, orderless = false, waitAfter = 0) {
    let info = `Assert the texts match array "${textArray}"`;
    await forAllTexts(page, selector, info, (uiTextList) => {
        let msg = `assertEachTextIntegerEqual the count of texts: ${selectorName(selector)}`;
        expect(uiTextList.length).to.equal(textArray.length, msg);
        if (orderless) {
            const unmatchedTexts = [...textArray];
            uiTextList.forEach((uiText) => {
                const matchIndex = unmatchedTexts.findIndex((expectedText) =>
                    stringMatch(uiText, expectedText, matchOptions)
                );

                if (matchIndex !== -1) {
                    unmatchedTexts.splice(matchIndex, 1); // Remove the matched text
                } else {
                    throw new Error(`assertTextsMatchArray: Text "${uiText}" did not match any expected texts in ${textArray}.`);
                }
            });

            if (unmatchedTexts.length > 0) {
                throw new Error(`Unmatched expected texts remain: ${JSON.stringify(unmatchedTexts)}`);
            }
        } else {
            for (const [i, uiText] of uiTextList.entries()) {
                msg = `assertEachTextIntegerEqual: ${selectorName(selector, i + 1)}`
                assertStringMatch(uiText, textArray.at(i), matchOptions, msg);
            }
        }
    }, waitAfter);
}

async function assertTextsContainArray(page, selector, textArray, matchOptions = optEqualCaseless, waitAfter = 0) {
    let info = `Assert if the texts contains array "${JSON.stringify(textArray)}"`;
    await forAllTexts(page, selector, info, (uiTextList) => {
        for (const [i, text] of textArray.entries()) {
            let msg = `assertTexts ${JSON.stringify(uiTextList)} contains "${text}"`;
            msg = `${msg}: ${selectorName(selector, i + 1)}`;
            const containThisExp = uiTextList.some(thisText => stringMatch(thisText, text, matchOptions));
            expect(containThisExp).to.equal(true, msg);
        }
    }, waitAfter);
}

async function assertTextsSorted(page, selector, order, parseDate = false, emptyValuesLast = false, waitAfter = 0) {
    expect(order).to.be.oneOf(['ascending', 'asc', 'descending', 'desc'], 'Acceptable value for param order');
    const info = `Assert if the texts are sorted in the order of "${order}",`;

    await forAllTexts(page, selector, info, (uiTextList) => {
        const msg = `assertTextsSorted ${order}: ${selectorName(selector)}`;

        const stripParentheses = (text) => {
            if (typeof text !== 'string') return text;
            const match = text.match(/^([^()]+)\s*(\([^)]*\))?/);
            return match ? match[1].trim() : text;
        };

        let exp = uiTextList
            .slice()
            .map(str => {
                const cleaned = stripParentheses(str);
                return (isDate(cleaned) && parseDate) ? Date.parse(cleaned) : cleaned;
            })
            .filter(val => val !== "" && val !== null && val !== undefined);

        let act = uiTextList
            .map(str => {
                const cleaned = stripParentheses(str);
                return (isDate(cleaned) && parseDate) ? Date.parse(cleaned) : cleaned;
            })
            .filter(val => val !== "" && val !== null && val !== undefined);

        exp = (['descending', 'desc'].includes(order)) ? exp.sort().reverse() : exp.sort();

        expect(act.join(',')).to.equal(exp.join(','), msg);
    }, waitAfter);
}

async function assertEachTextBetweenDates(page, selector, dateMin, dateMax, waitAfter = 0) {
    if (typeof (dateMin) !== 'string' && typeof (dateMax) !== 'string'
        && typeof (dateMin.getMonth) !== 'function' && typeof (dateMax.getMonth) !== 'function')
        log.error('assertEachTextBetweenDates: The #3, #4 parameters should be either String or both Date', true);
    let startD = typeof dateMin === 'string' ? Date.parse(dateMin) : dateMin.getTime();
    let endD = typeof dateMax === 'string' ? Date.parse(dateMax) : dateMax.getTime();
    let info = `Assert date is between "${dateMin}" and "${dateMax}"`
    await forEachText(page, selector, info, (uiText, index) => {
        let actDate = Date.parse(uiText);
        const msg = `assertEachTextBetweenDates: ${selectorName(selector, index + 1)}`;
        expect(actDate).to.not.lessThan(startD, msg);
        expect(actDate).to.not.greaterThan(endD, msg);
    }, waitAfter);
}

async function assertEachElementAttributeMatch(page, selector, attribute, value, matchOptions = optEqualCaseless, waitAfter = 0) {
    let info = `Assert element attribute ${attribute} match ${value}`;
    await forEachElement(page, selector, info, async (element, index) => {
        const uiValue = await element.getAttribute(attribute);
        const msg = `assertEachElementAttributeMatch: ${selectorName(selector, index + 1)}`
        log.debug(`assertEachElementAttributeMatch: sel ${selectorName(selector)}, attribute ${attribute}, lookup value ${value}, uiValue ${uiValue}`);
        assertStringMatch(uiValue, value, matchOptions, msg);
    }, waitAfter);
}

async function assertFileExists(folder, fileName, fileNameMatchOptions = optEqualCaseless, retries = 5, interval = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const files = await fs.readdir(folder); // List all files in the directory
            const matchingFile = files.find(file => stringMatch(file, fileName, fileNameMatchOptions)); // Check for files containing the base name
            if (matchingFile) {
                log.debug(`${folder} file with base name that contains "${fileName}" found: "${matchingFile}"`);
                return; // Assertion is good
            }
        } catch (error) {
            log.debug(`Error when look for file [${folder}, ${fileName}]: ${error}`);
        }
        log.debug(`waiting for file [${folder}, ${fileName}] try #${attempt}, Retrying in ${interval}ms...`);
        await global.browser.pause(interval); // Wait for 3000ms before retrying
    }
    expect(false).to.equal(true, `File [${folder}, ${fileName}] exist`);
}

async function assertFileWithSubstringExists(folderPath, substring, retries = 5, interval = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            let files = await fs.readdir(folderPath);
            files.find(file => file.includes(substring));
            return
        } catch (error) {
            log.debug(`Error when look for file [${folderPath}, ${substring}]: ${error}`);
        }
        log.debug(`waiting for file [${substring}] try #${attempt}, Retrying in ${interval}ms...`);
        await global.browser.pause(interval); // Wait for 3000ms before retrying
    }
    expect(false).to.equal(true, `File ${substring} exist`);
}

async function assertAnyWindowUrlOrContentContains(textList, maxTry = 25) {
    const lookupList = Array.isArray(textList) ? textList : [textList];
    const originalWindow = await global.browser.window.getHandle();
    await retryWithDelay(async () => {
        const allWindows = await global.browser.window.getAllHandles();
        log.debug(`assertAnyWindowUrlOrContentContains: allWindows: ${JSON.stringify(allWindows)}`);
        let matched = false;
        for (const [i, window] of allWindows.entries()) {
            await global.browser.window.switchTo(window);
            const currentUrl = await global.browser.getCurrentUrl();
            log.debug(`assertAnyWindowUrlOrContentContains: window #${i} ${window}, url: ${currentUrl}`);
            matched = matched || lookupList.every(part => stringMatch(currentUrl, part, optContain));
            if (matched) break;
            matched = matched || await Promise.all(lookupList.map(async (part) => {
                const sel = {
                    selector: `//*[contains(., '${part}')]`, locateStrategy: 'xpath',
                    timeout: 500, suppressNotFoundErrors: true
                };
                const visible = await global.browser.isVisible(sel);
                return visible === true
            })).then(results => results.every(Boolean));
            if (matched) break;
        }
        if (!matched) throw new Error(`assertAnyWindowUrlOrContentContains cannot find a window whose URL or content contains ${lookupList.join(', ')}`)
    }, `assertAnyWindowUrlOrContentContains ${lookupList.join(', ')}`, maxTry);
    await global.browser.window.switchTo(originalWindow);
}

async function assertAnyWindowUrlContains(textList, maxTry = 25) {
    const lookupList = Array.isArray(textList) ? textList : [textList];
    const originalWindow = await global.browser.window.getHandle();
    await retryWithDelay(async () => {
        const allWindows = await global.browser.window.getAllHandles();
        log.debug(`assertAnyWindowUrlContains: allWindows: ${JSON.stringify(allWindows)}`);
        let matched = false;
        for (const [i, window] of allWindows.entries()) {
            await global.browser.window.switchTo(window);
            const currentUrl = await global.browser.getCurrentUrl();
            log.debug(`assertAnyWindowUrlContains: window #${i} ${window}, url: ${currentUrl}`);
            matched = matched || lookupList.every(part => stringMatch(currentUrl, part, optContain));
            if (matched) break;
        }
        if (!matched) throw new Error(`assertAnyWindowUrlContains cannot find a window whose URL contains ${lookupList.join(', ')}`)
    }, `assertAnyWindowUrlContains ${lookupList.join(', ')}`, maxTry);
    await global.browser.window.switchTo(originalWindow);
}

module.exports = {
    currentPageUrl,
    isElementPresent,
    isElementVisible,
    getElementsCount,
    getElementIndexFromElementsByText,
    getAllTexts,
    getAllTypedValues,
    getAttribute,
    hasProperty,
    waitForTexts,
    forAllTexts,
    forEachText,
    assertNotPresent,
    assertNotVisible,
    assertVisible,
    assertElementsCount,
    assertDisabled,
    assertSelected,
    assertNotSelected,
    assertEachTextMatch,
    assertEachTypedValueMatch,
    assertAnyTextMatch,
    assertEachTextNotContain,
    assertEachTextInArray,
    assertEachTextContainsArray,
    assertEachTextIntegerGreaterThan,
    assertEachTextIntegerEqual,
    assertTextsMatchArray,
    assertTextsContainArray,
    assertTextsSorted,
    assertEachTextBetweenDates,
    assertEachElementAttributeMatch,
    assertFileExists,
    assertFileWithSubstringExists,
    assertAnyWindowUrlOrContentContains,
    assertAnyWindowUrlContains,
}