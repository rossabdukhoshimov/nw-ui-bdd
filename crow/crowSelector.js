const log = require('./crowLog')
const {normalizeString} = require("./crowString");
const SELECTOR_TYPES = {
    xpath: 'xpath',
    css: 'css selector',
    unknown: 'unknown'
};

function verifySelAttr(attribute) {
    return ['selector', 'locateStrategy', 'index', 'abortOnFailure', 'timeout', 'retryInterval',
        'suppressNotFoundErrors', 'needVisible', 'needHighlight'].includes(attribute);
}

function selectorType(selectorString) {
    // Regular expressions for identifying XPath expressions
    const xpathRegexes = [
        /^\/\//,         // Relative path
        /^\/[^/]/,       // Absolute path
        /\/\//,          // Double slashes in the path
        /@\w+/,          // Attribute selector
        /::/,            // Axes
        /\[\d+]/,       // Predicates
        /text\(\)/,      // Text node
        /contains\(/,    // Contains function
        /\|/,            // Union operator
        /ancestor::/,    // Ancestor axis
        /descendant::/,  // Descendant axis
        /following::/,   // Following axis
        /preceding::/,   // Preceding axis
        /self::/         // Self axis
    ];

    // Check against XPath regexes first
    if (xpathRegexes.some(regex => regex.test(selectorString))) {
        return SELECTOR_TYPES.xpath;
    }

    // Regular expressions for identifying CSS selectors
    const cssRegexes = [
        /\./,            // Class selector
        /#/,             // ID selector
        /\[.+?]/,       // Attribute selector
        /::?[\w-]+/,     // Pseudo-class or pseudo-element
        />/,             // Child combinator
        /\+/,            // Adjacent sibling combinator
        /~/,             // General sibling combinator
        /\s/             // Descendant combinator (space)
    ];

    // Check against CSS regexes
    if (cssRegexes.some(regex => regex.test(selectorString))) {
        return SELECTOR_TYPES.css;
    }

    // If no matches found
    return SELECTOR_TYPES.unknown;
}


function xpathContainText(text, caseless, letterNumberOnly, parentPath = '') {
    let exp = caseless ? "translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')" : 'text()'
    if (letterNumberOnly)
        exp = `translate(text(), translate(${exp}, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', ''), '')`
    const containText = normalizeString(text, {caseless: caseless, letterNumberOnly: letterNumberOnly});
    return {selector: `${parentPath}//*[contains(${exp}, '${containText}')]`, locateStrategy: 'xpath'}
}

function selectorName(selector, index = 1) {
    const sel = typeof selector === "string" ? {selector: selector} : selector;
    let result = `${sel.selector}`
    if (sel.name)
        return `${sel.name} (${result}) #${index}`
    else
        return `${result} #${index}`
}

function getSelectorAttribute(selector, attributeName) {
    if (selector !== null && typeof selector === 'object' && verifySelAttr(attributeName))
        // eslint-disable-next-line security/detect-object-injection
        return selector[attributeName]
    else
        return null
}

function setSelectorAttribute(selector, attributeName, value) {
    if (verifySelAttr(attributeName)) {
        let sel = (selector !== null && typeof selector === 'object') ? selector : {selector: selector}
        // eslint-disable-next-line security/detect-object-injection
        sel[attributeName] = value;
        return sel;
    } else {
        throw new Error(`setSelectorAttribute: ${attributeName} is not a valid selector attribute`);
    }
}

function extractPageSelector(page, selectorString) {
    if (selectorString.startsWith('@') && page !== null) {
        if (typeof page === "object" && typeof page['elements'] === "object") {
            // const result = page['elements'][selectorString.slice(1)];
            // Don't use the above way!!
            // in this way, the result is a reference of the page property,
            // what ever later change in the result object also change the value in the page elements.
            // we need a copy. use the way in the below
            if (!Object.prototype.hasOwnProperty.call(page['elements'], selectorString.slice(1)))
                log.error(`extractPageSelector: Cannot find ${selectorString} in ${Object.keys(page.elements)}`, true);
            const result = Object.assign({}, page['elements'][selectorString.slice(1)]);
            result['selector'] = result.__selector;
            if (!result.selector)
                log.error(`extractPageSelector: Cannot find ${selectorString} in ${Object.keys(page.elements)}`, true);
            result['name'] = selectorString;
            if (parseInt(result.__index, 10) >= 0) result['index'] = result.__index;
            return result;
        } else
            log.error(`extractPageSelector: When convert ${selectorString}, no "elements" in page ${page}`, true);
    }
    return {selector: selectorString};
}

// cases of different selector
// 1. raw string "div.class > a"
// 2. page symbol string "@username", where page raw is string "#input-username"
// 3. page symbol string "@username", where page raw is object {selector: "#input-username", timeout: 3000}
// 4. raw object {selector: "div.class > a", index: 2}
// 5. object with page symbol {selector: "@column1Rows", index: 3}, where page raw is string "table td:nth-child(1)"
// 6. object with page symbol {selector: "@column1Rows", index: 3, timeout: 3000}, where page raw is object ,{selector: "table td:nth-child(1)", locateStrategy: "css selector", timeout: 200}
function normalizeSelector(page, selector) {
    let result = {};
    if (typeof selector === 'string') {
        result = extractPageSelector(page, selector);
    } else if (typeof selector === 'object') {
        let pageSelector = extractPageSelector(page, selector.selector);
        for (let key in selector)
            // eslint-disable-next-line security/detect-object-injection
            if (verifySelAttr(key) && key !== 'selector') pageSelector[key] = selector[key];
        result = pageSelector;
    } else
        log.error(`Expect selector is string or object, Got ${typeof selector}`, true);
    if (![SELECTOR_TYPES.css, SELECTOR_TYPES.xpath].includes(result.locateStrategy))
        result['locateStrategy'] = selectorType(result.selector)
    return {...{needHighlight: true, needVisible: true}, ...result};
}

function addChild(selector, childString, childIndex = null, page = null) {
    let result = normalizeSelector(page, selector);
    const connector = result.locateStrategy === SELECTOR_TYPES.xpath ? '/' : ' > ';
    result['selector'] = `${result.selector}${connector}${childString}`;
    return addElementIndex(result, childIndex);
}

function addDescendant(selector, descendantString, descendantIndex = null, page = null) {
    let result = normalizeSelector(page, selector);
    const connector = result.locateStrategy === SELECTOR_TYPES.xpath ? '//' : ' ';
    result['selector'] = `${result.selector}${connector}${descendantString}`;
    return addElementIndex(result, descendantIndex);
}

function addElementIndex(selector, index, page = null) {
    let result = normalizeSelector(page, selector);
    if (index) {
        let string = result.locateStrategy === SELECTOR_TYPES.xpath ? `[${index}]` : `:nth-of-type(${index})`;
        result['selector'] = `${result.selector}${string}`;
    }
    return result;
}

function mergeSelectors(selector1,
                        selector2,
                        page = null,
                        isDirectChild = false,
                        overrideAttributes = {}) {
    let sel1 = normalizeSelector(page, selector1);
    let sel2 = normalizeSelector(page, selector2);
    // make a copy, otherwise the further operation may change the selector2 values
    let result = Object.assign({}, sel2);
    // if both are unknown (both are basic html tags (button, div, ul...), use css,
    // if one is unknown, use the other's,
    // if both not unknown and different, raise error
    if (result.locateStrategy === SELECTOR_TYPES.unknown)
        result['locateStrategy'] = sel1.locateStrategy === SELECTOR_TYPES.unknown ? SELECTOR_TYPES.css : sel1.locateStrategy;
    else if (result.locateStrategy !== sel1.locateStrategy) {
        let error = 'mergeSelectors: cannot merge two selectors with different locateStrategy values'
        error += `\n\tselector 1: ${selectorName(sel1)}: ${sel1.locateStrategy}`;
        error += `\n\tselector 2: ${selectorName(sel2)}: ${sel2.locateStrategy}`;
        log.error(error, true)
    }
    let keys = Object.keys(overrideAttributes);
    for (const key of keys)
        if (verifySelAttr(key))
            // eslint-disable-next-line security/detect-object-injection
            result[key] = overrideAttributes[key];
    let connector = result.locateStrategy === SELECTOR_TYPES.xpath ? '//' : ' ';
    if (isDirectChild) connector = result.locateStrategy === SELECTOR_TYPES.xpath ? '/' : ' > ';
    result['selector'] = `${sel1.selector}${connector}${sel2.selector}`;
    return result;
}

module.exports = {
    xpathContainText,
    selectorName,
    getAttribute: getSelectorAttribute,
    normalizeSelector,
    setSelectorAttribute,
    addChild,
    addDescendant,
    addElementIndex,
    mergeSelectors,
}


// class crowSelector {
//     constructor(selectorString, locateStrategy) {
//         this.selector = selectorString;
//         this.type = locateStrategy.toLowerCase();
//         if (!SELECTOR_TYPES.includes(this.type))
//             log.error(`locateStrategy ${locateStrategy} is not one of ${SELECTOR_TYPES}`, true)
//     }
//
//     anyChild(tag) {
//     }
//
//     atIndex(number) {
//
//     }
// }


// // Example usage:
// const selectors = [
//     'table[summary="Assignment Reports Pending Review"] > tbody > tr:nth-child(3) > td:nth-child(4)',
//     '//table[@summary="Assignment Reports Pending Review"]/tbody/tr[3]/td[4]',
//     '.className',
//     '#idName',
//     'div > p',
//     '//div[contains(@class, "example")]',
//     '/html/body/div'
// ];
//
// selectors.forEach(selector => {
//     console.log(`Selector: ${selector} - Type: ${selectorType(selector)}`);
// });
