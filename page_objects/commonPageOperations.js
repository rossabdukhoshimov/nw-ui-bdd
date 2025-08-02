const observer = require("../crow/crowObservations");
const core = require("../crow/crowCore");
const {normalizeString, stringInArray, optEqual, optEqualCaseless} = require("../crow/crowString");
const action = require("../crow/crowActions");
const log = require("../crow/crowLog");
const {selectorName, setSelectorAttribute} = require("../crow/crowSelector");
const {optContain} = require("crow/crowString");
const {expect} = require("chai");
const {mergeSelectors} = require("crow/crowSelector");

async function waitTextNumberGreaterThan(pageObject, textSelector, expectNumber, throwError = true, maxTry = 25) {
    let tryRound = 0;
    while (tryRound < maxTry) {
        const text = await observer.getAllTexts(pageObject, textSelector);
        let actualCount = -1000;
        if (typeof text === 'object' && text.length > 0) actualCount = Number(normalizeString(text[0]));
        log.debug(`waitTextNumberGreaterThan try ${tryRound}, uiText ${actualCount}`);
        if (actualCount > expectNumber) break;
        tryRound += 1;
        pageObject.pause(200);
    }
    if (throwError)
        await observer.assertEachTextIntegerGreaterThan(pageObject, textSelector, expectNumber);
    return pageObject;
}
async function waitElementDismissed(pageObject, selector, throwError = true, maxTry = 80) {
    let tryRound = 0;
    const quickSel = setSelectorAttribute(selector, 'timeout', 50);
    while (tryRound < maxTry) {
        const present = await observer.isElementPresent(pageObject, quickSel);
        log.debug(`waitElementDismissed try ${tryRound}, element ${selectorName(selector)} present ${present}`);
        if (!present) return pageObject;
        tryRound += 1;
        await global.browser.pause(200);
    }
    if (throwError)
        throw new Error(`waitElementDismissed: element "${selectorName(selector)}" still exist after ${maxTry} tries`);
    return pageObject;
}
async function chooseDateFromCalendar(pageObject, year, month, day) {
    const calendarChooseYearButton = 'div.v-overlay--active div.v-date-picker button.v-date-picker-controls__mode-btn';
    const calendarChooseMonthButton = 'div.v-overlay--active div.v-date-picker button.v-date-picker-controls__month-btn';
    const calendarYearButton = `//div[contains(@class, "v-overlay--active")]//div[contains(@class, "v-date-picker-years")]//button[contains(., "${year}")]`;
    const calendarMonthButtons = 'div.v-overlay--active div.v-date-picker-months button';
    const calendarDayButtons = 'div.v-overlay--active button.v-date-picker-month__day-btn';
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mName = months[parseInt(month) - 1];
    await action.click(pageObject, calendarChooseYearButton, 200);
    await action.click(pageObject, calendarYearButton, 200);
    await action.click(pageObject, calendarChooseMonthButton, 200);
    await action.clickByText(pageObject, calendarMonthButtons, mName, optContain, 200);
    await action.clickByText(pageObject, calendarDayButtons, `${parseInt(day)}`, optEqual, 200);
    return pageObject;
}
async function tableOptionTurnOnAllColumns(pageObject, columnOptionBtnSel) {
    await action.click(pageObject, columnOptionBtnSel);
    const buttonSel = '[id$="-show-all-columns"]';
    const classes = await observer.getAttribute(pageObject, buttonSel, 'class');
    if (!classes.includes('disabled')) await action.click(pageObject, buttonSel);
    await action.pressAndReleaseKeys('ESCAPE');
    return pageObject;
}
async function tableOptionTurnOnOnlyColumns(pageObject, columnList, columnOptionBtnSel) {
    await action.click(pageObject, columnOptionBtnSel);
    // click show all if enabled
    const showAllSel = '[id$="-show-all-columns"]';
    const classes = await observer.getAttribute(pageObject, showAllSel, 'class');
    if (!classes.includes('disabled')) await action.click(pageObject, showAllSel);
    // click whatever column that is not in the list
    const optionsSel = 'div.v-overlay--active > div.v-overlay__content [id$="-table-toggle-menu-item"]';
    const msg = `Turn off column if not in [${columnList.join(',')}]`
    await core.forEachElement(pageObject, optionsSel, msg, async (element) => {
        const uiText = await element.getText();
        if (!stringInArray(uiText, columnList, optEqualCaseless)) await action.clickByElement(element);
    });
    await action.pressAndReleaseKeys('ESCAPE');
    return pageObject;
}
async function tableOptionTurnOnColumnsIfNot(pageObject, crowTable, columnList, columnOptionBtnSel) {
    let currentCols = await crowTable.headers(true);
    currentCols = currentCols.map(col => col.toLowerCase());
    const clickCols = columnList.filter(col => !currentCols.includes(col.toLowerCase()));
    if (clickCols.length > 0) {
        await action.click(pageObject, columnOptionBtnSel);
        const optionsSel = 'div.v-overlay--active > div.v-overlay__content [id$="-table-toggle-menu-item"]';

        for (const col of clickCols) {
            const clicked = await action.clickByText(pageObject, optionsSel, col, optEqualCaseless);
            expect(clicked).to.equal(true, `Found and clicked ${col}`);
        }
        await action.pressAndReleaseKeys('ESCAPE');
    }
    await crowTable.refreshHeaders();
    return pageObject;
}
async function clickSortColumn(pageObject, sortButtonSelector, order) {
    expect(order).to.be.oneOf(['ascending', 'descending']);
    let good = false;
    let clickTry = 1;
    while (clickTry <= 5){
        const arrowSel = `i.mdi-arrow-${order === 'ascending' ? 'up' : 'down'}`;
        let sel = mergeSelectors(sortButtonSelector, arrowSel, pageObject);
        sel.timeout = 100
        good = await observer.isElementVisible(this, sel);
        if (good)
            break;
        else{
            await action.click(this, sortButtonSelector);
            clickTry++;
        }
    }
    expect(good).to.equal(true, `Column ${sortButtonSelector.selector} is set to sort in ${order}`);
    return pageObject;
}

module.exports = {
    waitTextNumberGreaterThan,
    waitElementDismissed,
    chooseDateFromCalendar,
    tableOptionTurnOnAllColumns,
    tableOptionTurnOnOnlyColumns,
    tableOptionTurnOnColumnsIfNot,
    clickSortColumn,
}