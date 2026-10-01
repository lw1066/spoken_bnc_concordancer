import os
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

CORPUS_PATH = "./corpus_files"


def inspect_corpus():
    element_counts = Counter()
    element_attributes = defaultdict(Counter)
    element_text_examples = defaultdict(list)
    element_attribute_examples = defaultdict(list)

    files_processed = 0
    files_failed = 0

    print("=" * 70)
    print("Spoken BNC2014 XML Inspector")
    print("=" * 70)
    print(f"Corpus directory: {CORPUS_PATH}")
    print()

    for root, _, files in os.walk(CORPUS_PATH):

        for filename in files:

            if not filename.lower().endswith(".xml"):
                continue

            filepath = os.path.join(root, filename)

            try:
                tree = ET.parse(filepath)
                xml_root = tree.getroot()

                files_processed += 1

                for element in xml_root.iter():

                    # Remove XML namespace if one exists.
                    tag = element.tag

                    if "}" in tag:
                        tag = tag.split("}", 1)[1]

                    element_counts[tag] += 1

                    # ---------------------------------------------
                    # Record attributes
                    # ---------------------------------------------
                    for attribute, value in element.attrib.items():

                        element_attributes[tag][attribute] += 1

                        # Keep a few examples of actual values.
                        if len(element_attribute_examples[(tag, attribute)]) < 5:
                            example = (filename, value)

                            if example not in element_attribute_examples[
                                (tag, attribute)
                            ]:
                                element_attribute_examples[
                                    (tag, attribute)
                                ].append(example)

                    # ---------------------------------------------
                    # Record text
                    # ---------------------------------------------
                    text = element.text

                    if text and text.strip():

                        cleaned = " ".join(text.split())

                        if len(element_text_examples[tag]) < 5:
                            if cleaned not in element_text_examples[tag]:
                                element_text_examples[tag].append(cleaned)

            except ET.ParseError as error:

                files_failed += 1

                print(
                    f"XML ERROR: {filename}"
                )
                print(f"  {error}")
                print()

            except Exception as error:

                files_failed += 1

                print(
                    f"ERROR: {filename}"
                )
                print(f"  {error}")
                print()

    # =========================================================
    # SUMMARY
    # =========================================================

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print(f"XML files processed: {files_processed:,}")
    print(f"XML files failed:    {files_failed:,}")
    print(f"Unique elements:     {len(element_counts):,}")
    print()

    # =========================================================
    # ELEMENTS
    # =========================================================

    print("=" * 70)
    print("ALL XML ELEMENTS")
    print("=" * 70)

    print(
        f"{'Element':<20}"
        f"{'Count':>12}"
        f"{'Has attributes':>18}"
        f"{'Has text':>12}"
    )

    print("-" * 70)

    for tag, count in sorted(
        element_counts.items(),
        key=lambda item: item[1],
        reverse=True
    ):

        has_attributes = "yes" if tag in element_attributes else "no"
        has_text = "yes" if tag in element_text_examples else "no"

        print(
            f"{tag:<20}"
            f"{count:>12,}"
            f"{has_attributes:>18}"
            f"{has_text:>12}"
        )

    # =========================================================
    # ATTRIBUTES
    # =========================================================

    print()
    print("=" * 70)
    print("ELEMENT ATTRIBUTES")
    print("=" * 70)

    if not element_attributes:

        print("No attributes found.")

    else:

        for tag in sorted(element_attributes):

            print()
            print(f"<{tag}>")

            for attribute, count in sorted(
                element_attributes[tag].items(),
                key=lambda item: item[1],
                reverse=True
            ):

                print(
                    f"  {attribute:<20}"
                    f"{count:>10,} occurrences"
                )

                examples = element_attribute_examples[
                    (tag, attribute)
                ]

                for filename, value in examples:

                    print(
                        f"      {filename}: {value!r}"
                    )

    # =========================================================
    # TEXT-BEARING ELEMENTS
    # =========================================================

    print()
    print("=" * 70)
    print("TEXT-BEARING ELEMENTS")
    print("=" * 70)

    for tag in sorted(element_text_examples):

        print()
        print(f"<{tag}>")

        for example in element_text_examples[tag]:

            print(f"  {example!r}")

    print()
    print("=" * 70)
    print("Inspection complete")
    print("=" * 70)


if __name__ == "__main__":
    inspect_corpus()