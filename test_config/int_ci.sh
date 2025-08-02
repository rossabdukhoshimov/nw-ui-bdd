#!/bin/bash
export PAUSE_TIMEOUT='1000'
export NIGHTWATCH_ENV='chromeHeadless'
export BASE_URL='https://sample-int.net/'
export TEST_ENV='int'
export downloadFilePath="$PROJECT_ROOT/nightwatch/downloads/"
export CUCUMBER_TAGS='@regression_ui'
export CUCUMBER_RETRY='1'
export TAKE_FAILURE_SCREENSHOT='true'
export SCREENSHOT_FOLDER="$PROJECT_ROOT/results/screenshots"
export PARALLEL_WORKERS=1
#if LOG_LEVEL has not been set by any other script, set it to info
export LOG_LEVEL=${LOG_LEVEL:-"info"}
export GECKO_PATH="node_modules/.bin/geckodriver"
#export GECKO_FOLDER="$PROJECT_ROOT/geckodriver_executable/ubuntu"
#export PATH="$GECKO_FOLDER:$PATH"
export EDGEDRIVER_PATH="$PROJECT_ROOT/edgedriver_executable/ubuntu/msedgedriver"

mkdir -p "$downloadFilePath"
mkdir -p "$SCREENSHOT_FOLDER"