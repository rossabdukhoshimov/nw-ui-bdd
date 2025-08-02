#!/bin/bash

CI_CUC_FOLDER="$(cd "$(dirname "${BASH_SOURCE:-$0}")" &> /dev/null && pwd)"
# If the above code does not work in your bash platform, use the following one instead. It's much slower though
# CI_CUC_FOLDER=$(dirname -- "$(find "$PROJECT_ROOT" -name "ci_cucumber.sh" -print -quit)")


export PROJECT_ROOT=$(git rev-parse --show-toplevel)
export PROJECT_NAME='sample' # It's the key prefix of your test run in the Dynamodb test metadata table, you can use the same project name for all of your test runs
export CUCUMBER_LANGUAGE='nodejs' # accept [ruby, python, nodejs]
export FEATURE_FOLDER="$PROJECT_ROOT/features/feature_files" # Replace the NEET_SETUP with the path to the root of the feature files, so ci_cuc can scan your feature files.
export CUCUMBER_REQUIRES="$PROJECT_ROOT/features/step_definitions,$PROJECT_ROOT/features/support,cucumber.conf.js" # Need to specify your hook file, step definition files, support files and all other required files. for python, this var will not be used, put whatever value
export RESULT_PATH="$PROJECT_ROOT/cucumber_results"

export REPORTS_S3_PATH='bdd-test-data/ci_cuc_test_reports'

assert_configured () {
  missing_envs=()
  for env_name in "$@"; do
    if [ -z "${!env_name}" ]; then missing_envs+=("$env_name"); fi;
  done;
  if [ ${#missing_envs[@]} -ne 0 ]; then
    echo "***************** ci_cucumber configuration ERROR *****************"
    echo "The following ci_cucumber required ENV are not set. Please open ci_cucumber.sh to find more information"
    for var in "${missing_envs[@]}"; do
      echo "  - $var"
    done
    echo "*******************************************************************"
    return 1
  fi
}

## Set the PROJECT_NAME value. This is used to switch the context of the ci_cuc calls,
## for example, previously the functions are for THIRD_PARTY project, now you use this command to change to sample
# Argument 1: Project Name -- required
ci_cuc_set_project () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Project Name), Found 0' && return 1; fi
  export PROJECT_NAME="$1"
}

## This command runs a mini cycle of the whole process to make sure the AWS keys in the current environment are valid
## Strongly recommend to run this command at the beginning of the CI build
ci_cuc_validate_aws_keys () {
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_validate_aws_keys.py"
}

## Scan feature files, find the tests match given tags, reset the test metadata in DynamoDB for a given test run
## It add new tests to the test run, delete the tests that do not match the given tag anymore
## It update the test names, example rows, test locations
## It set the status of all the tests to NOT_RUN
## This command is used before you start a new full cycle tests for the given test run
# Argument 1: Test Run Name -- required
# Argument 2: Include Tags, comma delimited -- optional
# Argument 3: Exclude Tags, comma delimited -- optional
ci_cuc_reset_test_run () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME" "PROJECT_ROOT" "FEATURE_FOLDER"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_reset_test_run.py" "$PROJECT_NAME" "$PROJECT_ROOT" "$FEATURE_FOLDER" "$1" "RUNNING,FAILED,PASSED" "$2" "$3"
}

## A command that is very similar with ci_cuc_reset_test_run. The difference is:
## For each test in the DynamoDB, if the metadata (name, example row, location) is not changed AND the status is PASSED, keep it as is.
## This command is used before you start the re-run cycle tests for the given test run
## Since the PASSED tests (if metadata is not changed) remain PASSED, those will be skipped
# Argument 1: Test Run Name -- required
# Argument 2: Include Tags, comma delimited -- optional
# Argument 3: Exclude Tags, comma delimited -- optional
ci_cuc_reset_test_run_keep_passed () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME" "PROJECT_ROOT" "FEATURE_FOLDER"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_reset_test_run.py" "$PROJECT_NAME" "$PROJECT_ROOT" "$FEATURE_FOLDER" "$1" "RUNNING,FAILED" "$2" "$3"
}

## Generate a markdown format report for the given test run. It includes reset and finish time, test numbers by status, test list by status
## This can be used in Github Action step summary
# Argument 1: Test Run Name -- required
# Argument 2: Print the detail for the specified statuses, comma delimited -- optional
ci_cuc_markdown_test_report () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then STATUS_LIST="$2"; else STATUS_LIST='FAILED'; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_test_report.py" "$PROJECT_NAME" "$1" "markdown" "$STATUS_LIST"
}

## Generate a human readable format report for the given test run. It includes reset and finish time, test numbers by status, test list by status
## This can be used in local
## The report is realtime updated. You don't have to wait the test run to be finished. The command can be called during the tests are running.
# Argument 1: Test Run Name -- required
# Argument 2: Print the detail for the specified statuses, comma delimited -- optional
ci_cuc_plain_txt_test_report () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then STATUS_LIST="$2"; else STATUS_LIST='FAILED'; fi

  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_test_report.py" "$PROJECT_NAME" "$1" "plain" "$STATUS_LIST"
}

## Generate a brief report in markdown table format for the given test run. It includes reset and finish time, test numbers by status
## This can be used in Github Action step summary
# Argument 1: The list of test run name -- required
ci_cuc_markdown_test_summary_table () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run List), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then LINK_LIST="$2"; else LINK_LIST=''; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_markdown_test_summary_table.py" "$PROJECT_NAME" "$1" "$LINK_LIST"
}

## Print "true" if all tests have status PASSED in a given test run
## Can be used in CI to determine the final result of a test run
# Argument 1: Test Run Name -- required
ci_cuc_test_run_passed() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_test_run_passed.py" "$PROJECT_NAME" "$1"
}


## Print the number of the tests with status NOT_RUN in a given test run
## This command can be used in CI after the "reset_test_run" command, indicates how many tests will be executed
# Argument 1: Test Run Name -- required
ci_cuc_count_of_not_run_tests () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_test_count_by_status.py" "$PROJECT_NAME" "$1" "NOT_RUN"
}

## Randomly pick one NOT_RUN test, set the status to RUNNING, print the test metadata
## This command is used by the multi-thread parallel test runner.
## It's atomic, so it make sure there always be only one thread can claim a test, avoiding the race condition.
## Why it only pick NOT_RUN test? If it also picks FAILED/RUNNING tests, it would cause infinite loop or race condition.
# Argument 1: Test Run Name -- required
ci_cuc_claim_not_run_test () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_claim_not_run_test.py" "$PROJECT_NAME" "$1"
}

## Set the status of a given test from RUNNING to PASSED or FAILED
## This command is used in the multi-thread parallel test runner. Settling down the terminate status of a test
# Argument 1: Test Run Name -- required
# Argument 2: Test Scenario Name -- required
# Argument 3: Test Scenario Example Row Number -- required
# Argument 4: Test Result -- required
ci_cuc_update_test_result () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (Test Scenario Name), Found 0' && return 1; fi
  if [[ -z "$3" ]]; then echo 'Expected the 3rd argument (Test Scenario Example Row Number), Found 0' && return 1; fi
  if [[ -z "$4" ]]; then echo 'Expected the 4nd argument (Test Result), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME"
  export TEST_RUN_NAME="$1"
  escaped_scenario_name=$(printf '%s' "$2" | sed 's/"/\\"/g')
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_update_test_result.py" "$PROJECT_NAME" "$TEST_RUN_NAME" "$escaped_scenario_name" "$3" "$4"
}

## Run cucumber test by provided location
# Argument 1: Test Case location -- required. Must follow the pattern: {feature_path}:{line_number}
ci_cuc_run_by_location() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Cucumber Scenario Location), Found 0' && return 1; fi
  assert_configured "PROJECT_ROOT" "CUCUMBER_LANGUAGE" "CUCUMBER_REQUIRES"
  cd "$PROJECT_ROOT" || return 1
  local location="$1"
  local resultPath="$RESULT_PATH/cucumber-result-$(echo "${location##*/}" | sed 's/:/-/g; s/.feature/_feature/')"
  IFS=',' read -ra requiresArray <<< "$CUCUMBER_REQUIRES"
  # New directory for persistent logs
  local DEPRECATION_LOG_DIR="$PROJECT_ROOT/deprecation_logs"
  if [[ ! -d "$DEPRECATION_LOG_DIR" ]]; then mkdir -p "$DEPRECATION_LOG_DIR"; fi

  local cucCmd
  if [[ "$CUCUMBER_LANGUAGE" == 'ruby' ]]; then
    cucCmd="bundle exec cucumber \"$location\" -f progress --format junit --out \"$resultPath\" --expand --color"
    for req in "${requiresArray[@]}"; do cucCmd+=" -r \"$req\""; done
    RUBYOPT='-W:deprecated' eval "$cucCmd" 2>&1 | tee "$DEPRECATION_LOG_DIR/deprecation_log_${location##*/}.txt"
  elif [[ "$CUCUMBER_LANGUAGE" == 'python' ]]; then
    cucCmd="behave \"$location\" --format progress --junit --junit-directory \"$resultPath\" --no-source"
    eval "$cucCmd" 2>&1 | tee "$DEPRECATION_LOG_DIR/deprecation_log_${location##*/}.txt"
  elif [[ "$CUCUMBER_LANGUAGE" == 'nodejs' ]]; then
    cucCmd="./node_modules/.bin/cucumber-js \"$location\" -f junit:\"$resultPath.xml\" --no-strict"
    for req in "${requiresArray[@]}"; do cucCmd+=" -r \"$req\""; done
    NODE_OPTIONS="--pending-deprecation --trace-deprecation --trace-warnings" eval "$cucCmd" 2>&1 | tee "$DEPRECATION_LOG_DIR/deprecation_log_${location##*/}.txt"
  else
    echo "CUCUMBER_LANGUAGE:$CUCUMBER_LANGUAGE is one of these [ruby, python, nodejs]"
    return 1
  fi

  TEST_RESULT=${PIPESTATUS[0]}
  if [[ "$CUCUMBER_LANGUAGE" == 'python' ]]; then python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_cleanup_behave_xml.py" "$resultPath"; fi
  return $TEST_RESULT
}

## Run all of the "NOT_RUN" tests in a given test run in multi-threads
# Argument 1: Test Run Name -- required
# Argument 2: Teci_cuc_test_run_in_parallelst Threads -- required
ci_cuc_test_run_in_parallel() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run Name), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (Test Threads), Found 0' && return 1; fi
  if [[ -n "$3" ]]; then IGNORE_FAILURES="$3"; else IGNORE_FAILURES="false"; fi
  assert_configured "PROJECT_ROOT"
  failure_file="ci_cuc_test_failure_$1.txt"
  rm -f "$failure_file"
  export CUCUMBER_TOTAL_WORKERS=$2
  for ((i = 1; i <= CUCUMBER_TOTAL_WORKERS; i++)); do
    (
      cd "$PROJECT_ROOT" || return 1
      export CUCUMBER_WORKER_ID=$i
      echo "ci_cuc_test_run_in_parallel: running thread $CUCUMBER_WORKER_ID, total is $CUCUMBER_TOTAL_WORKERS"
      # If github action step install gems by restoring from cache, point to the cached path
      cached_gem_path="vendor/bundle"
      if [ -d "$cached_gem_path" ]; then bundle config set --local path "$cached_gem_path"; fi
      set +e
      while true; do
        test_json=$(ci_cuc_claim_not_run_test "$1")
        this_test_result="PASSED"
        if [ -z "$test_json" ]; then
          echo "No more test with NOT_RUN status, quiting the test runner #$CUCUMBER_WORKER_ID"
          break
        else
          test_location=$(echo "$test_json" | jq -r '.test_location')
          scenario_name=$(echo "$test_json" | jq -r '.scenario_name')
          example_row=$(echo "$test_json" | jq -r '.example_row')
          test_name_example_row=$(echo "$test_json" | jq -r '.test_name_example_row')
          echo "Test runner #$CUCUMBER_WORKER_ID claimed test: <$test_name_example_row>"
        fi
        ci_cuc_run_by_location "$test_location"
        if [[ $? -ne 0 ]]; then
          this_test_result="FAILED"
          if [ ! -f "$failure_file" ]; then echo "1" > "$failure_file"; fi
        fi
        ci_cuc_update_test_result "$1" "$scenario_name" "$example_row" "$this_test_result"
      done
    ) &
  done
  wait
  echo "Tests are finished, checking if there is any thread that has failure"
  if [[ -f "$failure_file" ]]; then
    echo "There were failures in one or more threads." >&2
    if [[ "$IGNORE_FAILURES" == 'true' ]]; then return 0; else return 1; fi
  else
    echo "All tests that ran in this session passed"
    return 0
  fi
}

## Print a markdown table or json to describe the test scenarios with tag @JIRA- for each given ticket number
# Argument 1: The list of test run name
# Argument 2: Ticket list
# Argument 3: Title: any string that describe what are these tickets for, default to "current sprint" -- optional
# Argument 4: Format: accept "markdown" "json", any value that is not json will be considered as "markdown" -- optional
ci_cuc_test_summary_for_tickets () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Run List), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (Ticket List), Found 0' && return 1; fi
  assert_configured "PROJECT_NAME"
  python3 "$CI_CUC_FOLDER/ci_cucumber_src/ci_cuc_test_summary_for_tickets.py" "$PROJECT_NAME" "$1" "$2" "$3" "$4"
}

# This function sets up the results folder under the PROJECT_ROOT
ci_cuc_setup_results_directory() {
  rm -rf "$RESULT_PATH"
  mkdir -p "$RESULT_PATH"
  echo "Created cucumber result folder: $RESULT_PATH"
}