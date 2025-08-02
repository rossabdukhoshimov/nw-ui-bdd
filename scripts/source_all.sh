#!/usr/bin/env bash
export REPO_ROOT=$(git rev-parse --show-toplevel)
export PROJECT_ROOT=$REPO_ROOT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE:-$0}")" &> /dev/null && pwd)"
# If the above code does not work in your bash platform, use the following one instead. It's much slower though
# export SCRIPT_DIR=$(dirname -- "$(find "$PROJECT_ROOT" -name "source_all.sh" -print -quit)")


source "$SCRIPT_DIR/test_run.sh"
source "$SCRIPT_DIR/cicd_functions.sh"
source "$SCRIPT_DIR/ci_cucumber.sh"

echo "Please make sure your local dependencies are up to date, run <pip install -r \"requirements.txt\"> and <bundle install>"

lowerGIT="$(echo "$GITHUB_ACTIONS" | tr '[:upper:]' '[:lower:]')"
lowerTravis="$(echo "$TRAVIS" | tr '[:upper:]' '[:lower:]')"
if [[ "$lowerGIT" == "true" || "$lowerTravis" == "true" ]]; then
  export IN_CI='TRUE'
fi