const {When} = require('@cucumber/cucumber');
const {checkSection508Compliance} = require("../../page_objects/axeControl");

When(/^I run all accessibility rules on this window$/, async ()=> {
    await global.browser.pause(1000); // wait for 2 seconds to let the page settle down
    await checkSection508Compliance('body');
});
