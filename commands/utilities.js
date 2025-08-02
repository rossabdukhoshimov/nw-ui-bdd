const {spawnSync} = require("child_process");

function splitParam(string, separator = ',') {
    let result = string.split(separator);
    return result.map(item => item.trim());
}

function comboTodayDateString(useUTC = false) {
    if (useUTC) {
        let dt = new Date().toUTCString().split(' ');
        let onlyDate = new Date().getUTCDate();
        return `${dt[2]} ${onlyDate}, ${dt[3]}`
    } else {
        let dt = new Date().toDateString().split(' ');
        let onlyDate = new Date().getDate();
        return `${dt[1]} ${onlyDate}, ${dt[3]}`
    }

    // the above way generate single digit day like this: Oct 3, 2024
    // the following way generate like this Oct 03, 2024

    // const currentDate = new Date();
    // const formattedDate = currentDate.toLocaleDateString('en-US', {
    //     month: 'short',
    //     day: '2-digit',
    //     year: 'numeric'
    // });
}

function runShell(command, params) {
    try {
        const result = spawnSync(command, params, {stdio: 'inherit'});
        return result.status === 0;
    } catch (error) {
        console.error("Error executing shell command:", error);
        return false;
    }
}
module.exports = {
    splitParam,
    comboTodayDateString,
    runShell,
}
