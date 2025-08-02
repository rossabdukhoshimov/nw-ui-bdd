from cucumber_tracker import CucumberTestTracker, STATUSES
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run', type=str)
    parser.add_argument('statuses', type=str)
    args = parser.parse_args()

    ctt = CucumberTestTracker(args.project_name, args.test_run)
    status_list = []
    if args.statuses:
        for status in args.statuses.split(','):
            processed_status = status.strip().upper()
            if processed_status not in STATUSES:
                raise Exception('ci_cuc_test_count_by_status.py -- Invalid status: ' + status)
            status_list.append(processed_status)
    print(len(ctt.tests_by_status(status_list)))
