const {fontBlue, fontRed, styleBold, styleUnderlined, backgroundYellow} = require("./crowString");

const LOG_LEVELS = ['debug', 'info', 'warning', 'error', 'mute'];
const DEFAULT_LOG_LEVEL = 'info';

function needPrint(logLevel) {
    const threshold = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toLowerCase() : DEFAULT_LOG_LEVEL;
    const thresholdNumber = LOG_LEVELS.indexOf(threshold);
    const actualNumber = LOG_LEVELS.indexOf(logLevel);
    return actualNumber >= thresholdNumber;
}

function debug(string) {
    if (needPrint('debug'))
        console.log(fontBlue(string));
}

function info(string) {
    if (needPrint('info'))
        console.log(string)
}

function error(string, throwException) {
    if (needPrint('error'))
        if (throwException)
            throw new Error(string)
        else
            console.log(styleBold(fontRed(string)));
}

function warning(string) {
    if (needPrint('warning'))
        console.log(styleUnderlined(backgroundYellow(string)));
}

module.exports = {
    debug,
    info,
    warning,
    error
}
