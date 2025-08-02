
function getSource(page, section) {
    page.getAttribute(section, 'outerHTML', function (result) {
        console.log('*******ELEMENT ', section, ' SOURCE********');
        console.log(result.value);
        console.log('*******END SOURCE********');
    });
    return page;
}

function checkAxeRule(page, rule = [], sel='body'){
    page.axeInject()
        .axeRun(sel, {
            runOnly: rule,
            rules: {}
        });
    return page;
}

function excludeElement(page, sel){
    console.log(sel)
    page.axeInject()
        .axeRun('body', {
            exclude: [[sel]]
            }
        )
}

function excludeRules(page, rule, sel = 'body'){
    page.axeInject()
        .axeRun(sel,{
            rules: rule
            }
        )
}

function checkRulesByTag(page, tags=[], sel='body'){
    page.axeInject()
        .axeRun(sel, {
            runOnly: {
                type: 'tag',
                // Tag values can be found in /axe/rule-descriptions.md table Tags column
                values: tags
            },
            rules: {}
        })
}
function checkCompliance(page, sel) {
    page.axeInject()
        .axeRun(sel, {
            timeout: 60000,
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag2aaa'] // Web Content Accessibility standards
            },
            rules: {}
        });
    return page;
}


function checkAllRules(page, sel='body', ) {
    page.axeInject()
        .axeRun(sel, {
            rules: {}
        });
    return page;
}


function checkAccessibleHeaders(page) {
    page.axeInject()
        .axeRun('body', {
            runOnly: ['empty-heading', 'heading-order', 'page-has-heading-one',
                'p-as-heading']
        });
    return page;
}

function checkAriaHiddenFocusable(page, sel = 'body') {
    page.axeInject()
        .axeRun(sel, {
            runOnly: ['aria-hidden-focus']
        });
    return page;
}

function checkAutocompleteValid(page, sel='body'){
    page.axeInject()
        .axeRun(sel, {
            runOnly: ['autocomplete-valid']
        });
    return page;
}

function checkAccessibleKeyboard(page, sel='body') {
    page.axeInject()
        .axeRun(sel, {
            runOnly: ['scrollable-region-focusable', 'accesskeys', 'region', 'skip-link',
                'tabindex']
        });
    return page;
}


module.exports = {
    getSource,
    checkCompliance,
    checkAccessibleKeyboard,
    checkAllRules,
    excludeElement,
    excludeRules,
    checkAccessibleHeaders,
    checkAriaHiddenFocusable,
    checkAutocompleteValid,
    checkAxeRule,
    checkRulesByTag,

}