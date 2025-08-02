import json
from cucumber_tracker import CucumberTestTracker
import argparse

JIRA_ENDPOINT = 'https://bioappdev.atlassian.net/browse'

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run_list', type=str)
    parser.add_argument('tickets', type=str)
    parser.add_argument('title', nargs='?', type=str, default='current sprint')
    parser.add_argument('format', nargs='?', type=str, default='json')
    args = parser.parse_args()

    ticket_tag_prefix = 'JIRA-'
    ticket_list = [f"{ticket_tag_prefix}{ticket.strip()}" for ticket in args.tickets.split(',')] if args.tickets else []
    is_markdown = args.format.lower() != 'json'
    test_run_list = args.test_run_list.split(',') if args.test_run_list else []

    content = {}
    for test_run in test_run_list:
        ctt = CucumberTestTracker(args.project_name, test_run)
        tests = ctt.tests_by_tags(ticket_list)
        for ticket in ticket_list:
            test_list = []
            for actual_test in tests:
                if ticket in actual_test['scenario_tags']:
                    this_test = [t for t in test_list if t['scenario_name'] == actual_test['scenario_name']]
                    if len(this_test) == 0:
                        test_list.append({'scenario_name': actual_test['scenario_name'], 'count': 1})
                    else:
                        this_test[0]['count'] += 1
            test_str_list = [
                f"{test_run}: {t['scenario_name']} ({t['count']} exmaples)"
                if t['count'] > 1
                else f"{test_run}: {t['scenario_name']}"
                for t in test_list
            ]
            if len(test_str_list) > 0:
                ticket_key = ticket.replace(ticket_tag_prefix, '')
                new_ticket_tests = content.get(ticket_key, []) + test_str_list
                content[ticket_key] = new_ticket_tests
    if is_markdown:
        markdown_table = "|         Ticket         | Tests |\n| --- | --- |\n"
        for ticket, tests in content.items():
            ticket_link = f"[{ticket}]({JIRA_ENDPOINT}/{ticket})"
            tests_formatted = "<br>".join([f"\u2022 {test}" for test in tests])
            markdown_table += f"| {ticket_link} | {tests_formatted} |\n"
        content = f"{markdown_table}\n---\n"
    if isinstance(content, dict):
        content = json.dumps(content, indent=2)
    print(f"## **Test Cases that are associated with the JIRA tickets for {args.title}:**\n{content}")
