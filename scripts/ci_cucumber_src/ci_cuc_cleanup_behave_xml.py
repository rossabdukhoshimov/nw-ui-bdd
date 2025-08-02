import defusedxml.ElementTree as element_tree  # Import from defusedxml
import argparse
from pathlib import Path


def clean_up_behave_xml(xml_path, output_path):
    """
    Cleans up a Behave XML report by removing skipped test cases.

    Args:
        xml_path (str): The path to the input XML file.
        output_path (str): The path to save the cleaned XML file.
    """
    try:
        # Load and parse the XML using defusedxml.ElementTree
        # This provides protection against various XML vulnerabilities
        tree = element_tree.parse(xml_path)
        root = tree.getroot()

        # Find and remove all skipped test cases
        # Iterate over a copy of the list to avoid issues when modifying
        # the list while iterating
        for testcase in list(root):
            if testcase.find('skipped') is not None:
                root.remove(testcase)

        # Save cleaned XML
        tree.write(output_path, encoding='utf-8', xml_declaration=True)
        print(f"Successfully cleaned up the XML file: {output_path}")

    except element_tree.ParseError as e:
        print(f"Error parsing XML file {xml_path}: {e}")
    except FileNotFoundError:
        print(f"Error: XML file not found at {xml_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('xml_folder', type=str)
    args = parser.parse_args()

    parent_path = Path(args.xml_folder)
    for file_path in parent_path.rglob('*.xml'):
        print(f"handling {file_path}")
        clean_up_behave_xml(str(file_path), str(file_path))
