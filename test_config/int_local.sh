#!/bin/bash
export PAUSE_TIMEOUT='1000'
export NIGHTWATCH_ENV='chrome'
export BASE_URL='https://sample-int.net/'
export TEST_ENV='int'
export downloadFilePath="$PROJECT_ROOT/nightwatch/downloads/"
export CUCUMBER_TAGS='@local'
export CUCUMBER_RETRY='0'
export SCREENSHOT_FOLDER="$PROJECT_ROOT/results/screenshots"
export TAKE_FAILURE_SCREENSHOT='true'
export PARALLEL_WORKERS=1
export LOG_LEVEL='debug'
export GECKO_PATH="$PROJECT_ROOT/geckodriver_executable/macos/geckodriver"
export EDGEDRIVER_PATH="$PROJECT_ROOT/edgedriver_executable/macos/msedgedriver"

mkdir -p "$downloadFilePath"
mkdir -p "$SCREENSHOT_FOLDER"