from cucumber_tracker import CucumberTestTracker, NOT_RUN, RUNNING, FAILED, PASSED
import argparse


def str_to_bool(value):
    return str(value).lower() in ('true', '1', 'yes')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run_list', type=str)
    parser.add_argument('link_list', nargs='?', type=str, default='')
    args = parser.parse_args()

    link_list = args.link_list.split(',') if args.link_list else []
    report_txt = f"## **Test Result for {args.project_name}**\n"
    report_txt += "| All Passed | Test Run | Reset Time | Finish Time | Total | Not Run | Running | ❌ Failed | ✅ Passed | Link |\n"
    report_txt += "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n"
    for i, test_run in enumerate(args.test_run_list.split(',')):
        ctt = CucumberTestTracker(args.project_name, test_run)
        result_obj = ctt.json_test_result()
        total = [item.replace('Total:', '').strip() for item in result_obj['summary'] if item.startswith('Total')][0]
        nr = [item.replace(f"{NOT_RUN}:", '').strip() for item in result_obj['summary'] if item.startswith(NOT_RUN)][0]
        rn = [item.replace(f"{RUNNING}:", '').strip() for item in result_obj['summary'] if item.startswith(RUNNING)][0]
        fd = [item.replace(f"{FAILED}:", '').strip() for item in result_obj['summary'] if item.startswith(FAILED)][0]
        pd = [item.replace(f"{PASSED}:", '').strip() for item in result_obj['summary'] if item.startswith(PASSED)][0]
        row_status = "⚠️" if int(fd) > 0 or int(nr) > 0 or int(rn) > 0 else '✅'
        report_txt += (f"|  {row_status} | {test_run} | {result_obj['reset_time']} | {result_obj['finish_time']} "
                       f"| {total} | {nr} | {rn} | {fd} | {pd} "
                       f"| {link_list[i] if i < len(link_list) else ''} |\n")
    report_txt += "---\n"
    print(report_txt)
