from cucumber_tracker import CucumberTestTracker, NOT_RUN
import argparse
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run', type=str)
    args = parser.parse_args()

    ctt = CucumberTestTracker(args.project_name, args.test_run)
    attempt = 0
    claimed = ''
    while attempt < 100 and claimed == '':
        try:
            test = ctt.random_test_by_status([NOT_RUN])
            if test == {}:
                break
            update_success = ctt.update_test_status(test['scenario_name'], test['example_row'],
                                                    'RUNNING', 'NOT_RUN', False)
            if update_success:
                claimed = json.dumps(test)
            attempt += 1
        except Exception:
            attempt += 1
    print(claimed)

