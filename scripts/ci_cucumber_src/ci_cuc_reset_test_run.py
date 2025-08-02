from cucumber_tracker import CucumberTestTracker, STATUSES, NOT_RUN
from feature_scanner import FeatureScanner
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('project_root', type=str)
    parser.add_argument('feature_folder', type=str)
    parser.add_argument('test_run', type=str)
    parser.add_argument('reset_statuses', type=str)
    parser.add_argument('in_tags', type=str)
    parser.add_argument('ex_tags', nargs='?', type=str, default='')
    parser.add_argument('new_status', nargs='?', type=str, default=NOT_RUN)
    args = parser.parse_args()

    # Do not include @ in the test run name, standardize the test run name,
    # avoiding the case that sometimes you use @tag, sometimes you use just tag
    test_name = args.test_run.replace('@', '')

    in_tags = [tag.strip() for tag in args.in_tags.split(',')] if args.in_tags else []
    ex_tags = [tag.strip() for tag in args.ex_tags.split(',')] if args.ex_tags else []
    reset_list = []
    if args.reset_statuses:
        for status in args.reset_statuses.split(','):
            processed_status = status.strip().upper()
            if processed_status not in STATUSES:
                raise Exception('ci_cuc_reset_test_run.py -- Invalid status: ' + status)
            reset_list.append(processed_status)
    print(
        f"Building test run <{test_name}> for inclusion tags \"{args.in_tags}\" and exclusion tags \"{args.ex_tags}\"")
    fs = FeatureScanner(args.project_root, args.feature_folder, in_tags, ex_tags)
    ctt = CucumberTestTracker(args.project_name, test_name)
    ctt.sync_tests_in_test_run(fs.run(), reset_list, args.new_status)
    print(
        f"Test run <{test_name}> for inclusion tags \"{args.in_tags}\" and exclusion tags \"{args.ex_tags}\" is built successfully.")
