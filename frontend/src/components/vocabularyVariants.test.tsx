import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import VocabularyVariants from "./VocabularyVariants";
import type { UniqueWord, SelectedVariant } from "../types/corpus";

const uniqueWords: UniqueWord[] = [
  { word: "run", count: 5, pos: "VVB", wordClass: "VERB" },
  { word: "run", count: 3, pos: "NN1", wordClass: "NOUN" },
  { word: "walk", count: 2, pos: "VVB", wordClass: "VERB" },
];

function renderVocabularyVariants(
  overrides: Partial<{
    showVocabularyVariants: boolean;
    uniqueWords: UniqueWord[];
    selectedWords: SelectedVariant[];
    toggleWordSelection: (variant: SelectedVariant) => void;
  }> = {},
) {
  const props = {
    showVocabularyVariants: true,
    uniqueWords,
    selectedWords: [] as SelectedVariant[],
    toggleWordSelection: jest.fn<(variant: SelectedVariant) => void>(),
    ...overrides,
  };

  return {
    ...render(<VocabularyVariants {...props} />),
    props,
  };
}

describe("VocabularyVariants", () => {
  it("renders the heading, distinct word count and vocabulary variants", () => {
    renderVocabularyVariants();

    expect(
      screen.getByRole("heading", { name: "Vocabulary Variants" }),
    ).toBeInTheDocument();

    expect(screen.getByText("3 distinct words found")).toBeInTheDocument();

    expect(screen.getByTitle("Show walk")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /run/ })).toHaveLength(2);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not render when vocabulary variants are hidden", () => {
    renderVocabularyVariants({ showVocabularyVariants: false });

    expect(
      screen.queryByRole("heading", { name: "Vocabulary Variants" }),
    ).not.toBeInTheDocument();
  });

  it("does not render when there are no vocabulary variants", () => {
    renderVocabularyVariants({ uniqueWords: [] });

    expect(
      screen.queryByRole("heading", { name: "Vocabulary Variants" }),
    ).not.toBeInTheDocument();
  });

  it("calls toggleWordSelection with the clicked variant", async () => {
    const user = userEvent.setup();
    const { props } = renderVocabularyVariants();

    await user.click(screen.getByTitle("Show walk"));

    expect(props.toggleWordSelection).toHaveBeenCalledTimes(1);
    expect(props.toggleWordSelection).toHaveBeenCalledWith({
      word: "walk",
      pos: "VVB",
      wordClass: "VERB",
    });
  });

  it("marks a selected variant as pressed and gives it a removal title", () => {
    renderVocabularyVariants({
      selectedWords: [{ word: "run", pos: "VVB", wordClass: "VERB" }],
    });

    expect(screen.getByTitle("Remove run")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(screen.getByTitle("Show run")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("distinguishes variants with the same spelling but different parts of speech", () => {
    renderVocabularyVariants({
      selectedWords: [{ word: "run", pos: "NN1", wordClass: "NOUN" }],
    });

    expect(screen.getByTitle("Show run")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    expect(screen.getByTitle("Remove run")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
