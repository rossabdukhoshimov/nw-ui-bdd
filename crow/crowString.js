function assertString(input) {
    if (input === null || input === undefined || typeof input !== 'string') {
        throw new TypeError(`Expected a string but received ${input === null ? 'null' : typeof input}: ${input}`);
    }
}

// String Matching
const optContain = {partial: true, caseless: true, letterNumberOnly: true};
const optEqual = {partial: false, caseless: false, letterNumberOnly: true};
const optEqualCaseless = {partial: false, caseless: true, letterNumberOnly: true};
const optExactEqual = {partial: false, caseless: false, letterNumberOnly: false};
const optOrderless = {partial: false, caseless: true, letterNumberOnly: true, orderless: true};
const optDate = {letterNumberOnly: false, matchDate: true}
const optTime = {letterNumberOnly: false, matchTime: true}
const optDefault = {
    partial: false,
    caseless: false,
    letterNumberOnly: true,
    orderless: false,
    matchTime: false,
    matchDate: false
};
require("chai").config.truncateThreshold = 0; // Disable truncation

function parseOptions(inputOptions = {}, overrideDefaults = {}) {
    return {
        ...optDefault,
        ...overrideDefaults,
        ...inputOptions
    };
}

function normalizeString(string, options = {}) {
    let result = string ? string : ''; // in case string is null or undefined
    const opts = parseOptions(options, optEqualCaseless);
    if (isDate(string) && (opts.matchTime || opts.matchDate)) {
        let date = new Date(string);
        if (opts.matchDate)
            return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        return `${date.getTime()}`;
    }
    if (opts.caseless)
        result = result.toLowerCase();
    if (opts.letterNumberOnly)
        result = alphaNumericOnly(result);
    if (opts.orderless)
        result = result.split('').sort().join('');
    return result;
}

function alphaNumericOnly(string) {
    assertString(string);
    return string.replace(/[^a-zA-Z0-9]/g, '');
}

function stringMatch(originalString, lookupString, options = {}, withLog = false) {
    const opts = parseOptions(options);
    const processed1 = normalizeString(originalString, opts);
    const processed2 = normalizeString(lookupString, opts);
    const matched = opts.partial ? processed1.includes(processed2) : processed1 === processed2
    if (withLog) {
        let msg = `Raw Strings:\n\t- ${originalString}\n\t+ ${lookupString}`
        msg += `\nNormalized:\n\t- ${processed1}\n\t+ ${processed2}`
        msg += `\nMatching Options: ${JSON.stringify(opts)}\nMatched: ${matched}`;
        return {match: matched, log: msg};
    } else
        return matched;
}

function stringInArray(string, array, options = {}) {
    const opts = parseOptions(options);
    return array.some(item => stringMatch(item, string, opts));
}

function assertStringMatch(actualString, expectedString, options = {}, message = undefined, printLog = false) {
    const result = stringMatch(actualString, expectedString, options, true);
    let msg = `\n- actual; + expect\n${result.log}`;
    if (message) msg = `\n${message}${msg}`;
    if (!result.match) throw new Error(fontRed(msg));
    if (printLog) console.log(fontBlue(msg));
}

function titleCase(string, removeSpace = false) {
    return camelCase(string, false, removeSpace ? '' : ' ');
}

function snakeCase(string, connector = '_') {
    assertString(string);
    let str = string.toLowerCase();
    return str.replace(/ /g, connector);
}

function camelCase(inputString, firstLetterLowerCase = true, connector = '', letterNumberOnly = true) {
    assertString(inputString);
    let words;
    if (inputString.includes(' ')) words = inputString.toLowerCase().split(' ');
    else if (inputString.includes('_')) words = inputString.toLowerCase().split('_');
    else if (inputString.includes('-')) words = inputString.toLowerCase().split('-');
    else words = [inputString.toLowerCase()];
    let result = []
    for (const [i, string] of words.entries()) {
        let processed = letterNumberOnly ? alphaNumericOnly(string) : string;
        if (i > 0 || !firstLetterLowerCase)
            processed = processed.charAt(0).toUpperCase() + processed.slice(1);
        result.push(processed)
    }
    return result.join(connector)
}

function isNumeric(string) {
    if (string === null || string === undefined || typeof string !== 'string') return false;
    const parsedValue = string.replace(/,/g, ''); // convert 1,234,567.89 to 1234567.89
    return !isNaN(parsedValue) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(parsedValue)) // ...and ensure strings of whitespace fail
}

function isDate(string) {
    if (string === null || string === undefined || typeof string !== 'string') return false;
    const date = new Date(string);
    return !isNaN(date) && string.trim() !== "" && date.toString() !== "Invalid Date";
}

function replaceAll(string, find, replace) {
    assertString(string);
    return string.replace(new RegExp(find, 'g'), replace);
}

// String Styling
const styleCodeBold = "\x1b[1m";
const styleCodeUnderlined = "\x1b[4m";
const resetAll = "\x1b[0m";
const fontCode = "\x1b[3";
const bgCode = "\x1b[4";
const colorBlack = '0m';
const colorRed = '1m';
const colorGreen = '2m';
const colorYellow = '3m';
const colorBlue = '4m';
const colorMagenta = '5m';
const colorCyan = '6m';

function addResetAll(string) {
    assertString(string);
    return string.endsWith(resetAll) ? string : `${string}${resetAll}`;
}

function fontBlack(string) {
    assertString(string);
    let result = `${fontCode}${colorBlack}${string}`;
    return addResetAll(result);
}

function fontRed(string) {
    assertString(string);
    let result = `${fontCode}${colorRed}${string}`;
    return addResetAll(result);
}

function fontGreen(string) {
    assertString(string);
    let result = `${fontCode}${colorGreen}${string}`;
    return addResetAll(result);
}

function fontYellow(string) {
    assertString(string);
    let result = `${fontCode}${colorYellow}${string}`;
    return addResetAll(result);
}

function fontBlue(string) {
    assertString(string);
    let result = `${fontCode}${colorBlue}${string}`;
    return addResetAll(result);
}

function fontMagenta(string) {
    assertString(string);
    let result = `${fontCode}${colorMagenta}${string}`;
    return addResetAll(result);
}

function fontCyan(string) {
    assertString(string);
    let result = `${fontCode}${colorCyan}${string}`;
    return addResetAll(result);
}

function backgroundBlack(string) {
    assertString(string);
    let result = `${bgCode}${colorBlack}${string}`;
    return addResetAll(result);
}

function backgroundRed(string) {
    assertString(string);
    let result = `${bgCode}${colorRed}${string}`;
    return addResetAll(result);
}

function backgroundGreen(string) {
    assertString(string);
    let result = `${bgCode}${colorGreen}${string}`;
    return addResetAll(result);
}

function backgroundYellow(string) {
    assertString(string);
    let result = `${bgCode}${colorYellow}${string}`;
    return addResetAll(result);
}

function backgroundBlue(string) {
    assertString(string);
    let result = `${bgCode}${colorBlue}${string}`;
    return addResetAll(result);
}

function backgroundMagenta(string) {
    assertString(string);
    let result = `${bgCode}${colorMagenta}${string}`;
    return addResetAll(result);
}

function backgroundCyan(string) {
    assertString(string);
    let result = `${bgCode}${colorCyan}${string}`;
    return addResetAll(result);
}

function styleBold(string) {
    assertString(string);
    let result = `${styleCodeBold}${string}`;
    return addResetAll(result)
}

function styleUnderlined(string) {
    assertString(string);
    let result = `${styleCodeUnderlined}${string}`
    return addResetAll(result)
}

module.exports = {
    fontBlack,
    fontRed,
    fontGreen,
    fontYellow,
    fontBlue,
    fontMagenta,
    fontCyan,
    backgroundBlack,
    backgroundRed,
    backgroundGreen,
    backgroundYellow,
    backgroundBlue,
    backgroundMagenta,
    backgroundCyan,
    styleBold,
    styleUnderlined,
    alphaNumericOnly,
    titleCase,
    snakeCase,
    camelCase,
    isNumeric,
    isDate,
    replaceAll,
    normalizeString,
    stringMatch,
    stringInArray,
    assertStringMatch,
    optContain,
    optEqual,
    optEqualCaseless,
    optExactEqual,
    optOrderless,
    optDate,
    optTime,
}