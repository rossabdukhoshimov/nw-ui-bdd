const fs = require('fs')
const path = require('path')

const localAxeCorePath = path.join(__dirname, '..', '..', 'node_modules', 'axe-core', 'axe.min.js');
const parentAxeCorePath = path.join(__dirname, '..', '..', '..', 'node_modules', 'axe-core', 'axe.min.js');

let axeCoreFilePath;

if (fs.existsSync(localAxeCorePath)) {
    axeCoreFilePath = localAxeCorePath;
} else if (fs.existsSync(parentAxeCorePath)) {
    axeCoreFilePath = parentAxeCorePath;
} else {
    throw new Error('Error: axe-core/axe.min.js not found at expected paths.')
}

module.exports.command = function axeInject() {
    this.injectScript(axeCoreFilePath, function () {
        console.log('Axe-core injected successfully into the browser context.');
    })
    return this;
}