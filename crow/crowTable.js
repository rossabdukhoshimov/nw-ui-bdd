const log = require('./crowLog')
const {normalizeSelector, addDescendant, mergeSelectors} = require('./crowSelector')
const {
    getAllTexts, getElementsCount, assertEachTextMatch,
    assertTextsContainArray, assertTextsSorted, assertEachTextInArray
} = require('./crowObservations')
const {forEachText, forAllTexts} = require('./crowCore')
const {
    normalizeString, stringMatch, assertStringMatch, optEqualCaseless
} = require('./crowString')
const {expect} = require("chai");

function toMapArray(arrayOfObjects, convertKeysToLowercase) {
    return arrayOfObjects.map(obj => {
        const lowerKeyMap = new Map();
        for (const [key, value] of Object.entries(obj))
            lowerKeyMap.set(convertKeysToLowercase ? key.toLowerCase() : key, value);
        return lowerKeyMap;
    });
}

class crowTable {
    constructor(page,
                tableWrapperSelector,
                headerTag = 'th',
                rowTag = 'tr',
                columnTag = 'td') {
        this.page = page;
        this.tableSelector = normalizeSelector(page, tableWrapperSelector);
        this.headerTag = headerTag;
        this.rowTag = rowTag;
        this.columnTag = columnTag;
        this.headerList = [];
    }

    async refreshHeaders() {
        let selector = await this.selectorForHeaders();
        selector.needVisible = false;
        // columns could be hidden, but still present, so getAllTexts need to consider invisible ones (needVisible = false)
        this.headerList = await getAllTexts(this.page, selector);
        return this.headerList;
    }

    async headers(refreshHeaders = false, allLowerCase = false) {
        if (this.headerList.length < 1 || refreshHeaders)
            await this.refreshHeaders();
        return allLowerCase ? this.headerList.map(str => str.toLowerCase()) : this.headerList;
    }

    async columnNumberByHeader(header, headerMatchOptions = optEqualCaseless) {
        let headers = await this.headers(true);
        headers = headers.map(str => normalizeString(str, headerMatchOptions));
        const expHeader = normalizeString(header, headerMatchOptions);
        const columnNumber = headers.indexOf(expHeader) + 1
        if (columnNumber < 1)
            log.error(`Header ${header} is not in the headers ${headers}`, true)
        return columnNumber;
    }

    async columnTexts(header, headerMatchOptions = optEqualCaseless) {
        const selector = await this.selectorForCellsInColumn(header, headerMatchOptions);
        return await getAllTexts(this.page, selector);
    }

    async rowHash(rowNumber, lowerCaseKey = false) {
        let headers = await this.headers(true, lowerCaseKey);
        let selector = await this.selectorForCellsInRow(rowNumber);
        selector.needVisible = false; // column could be hidden
        const rowTexts = await getAllTexts(this.page, selector);
        let resultMap = new Map();
        for (const [i, header] of headers.entries())
            resultMap.set(header, rowTexts.at(i));
        return Object.fromEntries(resultMap);
    }

    async rowCount() {
        const selector = await this.selectorForWholeRows();
        return await getElementsCount(this.page, selector);
    }

    async tableData() {
        let result = [];
        const rows = await this.rowCount();
        for (let i = 0; i < rows; i++)
            result.push(await this.rowHash(i + 1))
        return result;
    }

    async findRowByText(lookupText, matchOptions = optEqualCaseless) {
        const list = (typeof lookupText !== 'object') ? [`${lookupText}`] : lookupText;
        let rows = await this.tableData();
        for (const [i, row] of rows.entries()) {
            const rowTexts = Object.values(row);
            let match = list.every(keyword =>
                rowTexts.some(text => stringMatch(text, keyword, matchOptions))
            );
            // log.debug(`findRowByText: keyword ${list.join(', ')}, rowTexts: ${rowTexts.join(', ')}`);
            if (match) return (i + 1)
        }
        return null;
    }

    async findRowByTextInColumn(headerName, lookupText, textMatchOptions = optEqualCaseless, headerMatchOptions = optEqualCaseless) {
        let list = await this.columnTexts(headerName, headerMatchOptions);
        for (const [i, item] of list.entries())
            if (stringMatch(item, lookupText, textMatchOptions)) return (i + 1);
        return null;
    }

    async forEachTextInColumn(header, callback, headerMatchOptions = optEqualCaseless) {
        const selector = await this.selectorForCellsInColumn(header, headerMatchOptions);
        return await forEachText(this.page, selector, '',
            callback);
    }

    async forEachRowHash(callback, lowerCaseKey = false) {
        let headers = await this.headers(true, lowerCaseKey);
        const rowCount = await this.rowCount();
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const thisRowSel = await this.selectorForCellsInRow(rowIndex + 1);
            thisRowSel.needVisible = false;
            await forAllTexts(this.page, thisRowSel, '', async rowTexts => {
                const rowDataMap = new Map();
                for (const [i, header] of headers.entries())
                    rowDataMap.set(header, rowTexts.at(i));
                await callback(Object.fromEntries(rowDataMap.entries()), rowIndex);
            });
        }
    }

    async assertHeaderExist(header, headerMatchOptions = optEqualCaseless) {
        const list = Array.isArray(header) ? header : [header];
        const sel = await this.selectorForHeaders();
        await assertTextsContainArray(this.page, sel, list, headerMatchOptions);
    }

    async assertCellTextMatch(header, rowNumber, expectText, textMatchOptions = optEqualCaseless, headerMatchOptions = optEqualCaseless) {
        const selector = await this.selectorForCell(header, rowNumber, headerMatchOptions);
        if (Array.isArray(expectText))
            await assertEachTextInArray(this.page, selector, expectText, textMatchOptions);
        else
            await assertEachTextMatch(this.page, selector, expectText, textMatchOptions);
    }

    async assertTableMatch(rowHashes, matchOptions = optEqualCaseless, orderless = false, headerCaseless = true) {
        await this.assertRowCount(rowHashes.length);
        const keys = Object.keys(rowHashes[0]);
        await this.assertHeaderExist(keys);
        const expRowMaps = toMapArray(rowHashes, headerCaseless);
        if (orderless) {
            const unmatchedExpRowMaps = [...expRowMaps];
            await this.forEachRowHash((actRow) => {
                const matchIndex = unmatchedExpRowMaps.findIndex((expRowMap) => {
                    let thisRowMatch = true
                    for (const [key, actValue] of Object.entries(actRow)) {
                        if (expRowMap.has(key)) {
                            const expValue = expRowMap.get(key);
                            thisRowMatch = thisRowMatch && stringMatch(actValue, expValue, matchOptions);
                        }
                    }
                    return thisRowMatch;
                });
                if (matchIndex !== -1)
                    unmatchedExpRowMaps.splice(matchIndex, 1); // Remove the matched row
                else
                    throw new Error(`assertTableMatch: Row ${JSON.stringify(actRow)} did not match any expected rows.`);
            }, headerCaseless);

            if (unmatchedExpRowMaps.length > 0)
                throw new Error(`Unmatched rows: ${JSON.stringify(unmatchedExpRowMaps)}`);
        } else {
            await this.forEachRowHash((actualRow, index) => {
                const expRowMap = expRowMaps.at(index);
                for (const [key, actValue] of Object.entries(actualRow)) {
                    if (expRowMap.has(key)) {
                        const expValue = expRowMap.get(key);
                        log.debug(`assertTableMatch: key ${key}, actValue: ${actValue}, expValue: ${expValue}`);
                        assertStringMatch(actValue, expValue, matchOptions,
                            `row ${index + 1} column ${key}`);
                    }
                }
            }, headerCaseless);
        }
    }

    async assertEachTextInColumnMatch(header, expectText, textMatchOptions = optEqualCaseless, headerMatchOptions = optEqualCaseless) {
        const selector = await this.selectorForCellsInColumn(header, headerMatchOptions);
        if (Array.isArray(expectText)) {
            await this.forEachTextInColumn(header, uiText => {
                const pass = expectText.some(exp => stringMatch(uiText, exp, textMatchOptions));
                if (!pass) new Error(`Failed: UI text: ${uiText} match any of [${expectText.join(', ')}]`);
            })
        } else
            await assertEachTextMatch(this.page, selector, expectText, textMatchOptions);
    }

    async assertEachRowContainsArray(expectArray, matchOptions = optEqualCaseless) {
        const rowCount = await this.rowCount();
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const thisRowSel = await this.selectorForCellsInRow(rowIndex + 1);
            await assertTextsContainArray(this.page, thisRowSel, expectArray, matchOptions);
        }
    }

    async assertColumnSorted(header, order, emptyValuesLast = false, headerMatchOptions = optEqualCaseless) {
        const selector = await this.selectorForCellsInColumn(header, headerMatchOptions);
        await assertTextsSorted(this.page, selector, order, true, emptyValuesLast);
    }

    async assertRowCount(count) {
        const actual = await this.rowCount();
        const msg = `crowTable assertRowCount: ${this.tableSelector.selector}`
        expect(actual).to.equal(count, msg);
    }

    async selectorForHeaders() {
        return addDescendant(this.tableSelector.selector, this.headerTag);
    }

    async selectorForHeader(headerName, headerMatchOptions = optEqualCaseless) {
        const columnNumber = await this.columnNumberByHeader(headerName, headerMatchOptions);
        return addDescendant(this.tableSelector.selector, this.headerTag,
            columnNumber);
    }

    async selectorForCell(headerNameOrNumber, rowNumber, headerMatchOptions = optEqualCaseless) {
        let columnNumber = headerNameOrNumber;
        if (!Number.isInteger(columnNumber))
            columnNumber = await this.columnNumberByHeader(headerNameOrNumber, headerMatchOptions);
        let result = addDescendant(this.tableSelector.selector, 'tbody');
        result = addDescendant(result, this.rowTag, rowNumber);
        return addDescendant(result, this.columnTag, columnNumber);
    }

    async selectorForCellButton(headerNameOrNumber, lookupWords, buttonSelector, headerMatchOptions = optEqualCaseless) {
        const keywords = (typeof lookupWords === 'object') ? lookupWords : [lookupWords];
        const row = await this.findRowByText(keywords);
        expect(row, `row number for ${lookupWords.join(', ')}`).not.to.be.null;
        const cellSel = await this.selectorForCell(headerNameOrNumber, row, headerMatchOptions);
        return mergeSelectors(cellSel, buttonSelector, this.page);
    }

    async selectorForCellsInRow(rowNumber) {
        let result = addDescendant(this.tableSelector.selector, 'tbody');
        result = addDescendant(result, this.rowTag, rowNumber);
        return addDescendant(result, this.columnTag);
    }

    async selectorForWholeRows() {
        let result = addDescendant(this.tableSelector.selector, 'tbody');
        return addDescendant(result, this.rowTag);
    }

    async selectorForWholeRow(rowNumber) {
        let result = addDescendant(this.tableSelector.selector, 'tbody');
        return addDescendant(result, this.rowTag, rowNumber);
    }

    async selectorForCellsInColumn(headerName, headerMatchOptions = optEqualCaseless) {
        const columnNumber = await this.columnNumberByHeader(headerName, headerMatchOptions);
        let result = addDescendant(this.tableSelector.selector, 'tbody');
        result = addDescendant(result, this.rowTag);
        return addDescendant(result, this.columnTag, columnNumber);
    }
}


module.exports = crowTable;

