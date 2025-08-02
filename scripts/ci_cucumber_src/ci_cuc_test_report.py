from cucumber_tracker import CucumberTestTracker
import argparse
import json


def str_to_bool(value):
    return str(value).lower() in ('true', '1', 'yes')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run', type=str)
    parser.add_argument('report_type', type=str)
    parser.add_argument('show_detail', nargs='?', type=str, default='')
    args = parser.parse_args()

    ctt = CucumberTestTracker(args.project_name, args.test_run)
    detail_statues = args.show_detail.split(',') if args.show_detail else []
    if args.report_type == 'plain':
        print(ctt.plain_text_test_result(detail_statues))
    elif args.report_type == 'markdown':
        print(ctt.markdown_test_result(detail_statues))
    elif args.report_type == 'json':
        print(json.dumps(ctt.json_test_result(), indent=2))
    else:
        raise ValueError(f"Invalid report type, expect ['plain', 'markdown', 'json'], got {args.report_type}")
