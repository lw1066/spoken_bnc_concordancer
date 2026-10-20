import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import type { KwicResult } from "../types/corpus";
import ResultDetailsModal from "./ResultDetailsModal";

const selectedResult: KwicResult = {
  id: 1,
  text_id: 101,
  corpus_id: "ABC123",
  filename: "sample.xml",
  genre: "conversation",
  speaker: "S001",
  utterance_number: 42,
  trans: "Transcript information",
  who_confidence: "high",
  left_context: "I was feeling",
  target: "very",
  right_context: "happy that day",
  utterance: "I was feeling very happy that day.",
  lemma: "very",
  pos: "ADV",
  class: "adverb",
  usas: "A13.3",
  position: 5,
};

function renderModal(result: KwicResult | null = selectedResult) {
  const setSelectedResult = jest.fn();

  return {
    ...render(
      <ResultDetailsModal
        selectedResult={result}
        setSelectedResult={setSelectedResult}
      />,
    ),
    setSelectedResult,
  };
}

describe("ResultDetailsModal", () => {
  it("renders nothing when there is no selected result", () => {
    const { container } = renderModal(null);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the modal with the correct title and description", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Result Details" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Information about this concordance result"),
    ).toBeInTheDocument();
  });

  it("displays the corpus information", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("sample.xml")).toBeInTheDocument();
    expect(within(dialog).getByText("ABC123")).toBeInTheDocument();
    expect(within(dialog).getByText("S001")).toBeInTheDocument();
    expect(within(dialog).getByText("42")).toBeInTheDocument();
    expect(within(dialog).getByText("conversation")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Transcript information"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("high")).toBeInTheDocument();
    expect(within(dialog).getByText("5")).toBeInTheDocument();
  });

  it("displays the linguistic information", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getAllByText("very")).toHaveLength(2);
    expect(within(dialog).getByText("Lemma")).toBeInTheDocument();
    expect(within(dialog).getByText("ADV")).toBeInTheDocument();
    expect(within(dialog).getByText("adverb")).toBeInTheDocument();
    expect(within(dialog).getByText("A13.3")).toBeInTheDocument();
  });

  it("displays the full utterance", () => {
    renderModal();

    expect(
      screen.getByText("I was feeling very happy that day."),
    ).toBeInTheDocument();
  });

  it("uses an em dash for missing optional metadata", () => {
    const resultWithMissingMetadata: KwicResult = {
      ...selectedResult,
      genre: "",
      trans: null,
      who_confidence: null,
      position: undefined,
      lemma: null,
      pos: null,
      class: null,
      usas: null,
    };

    renderModal(resultWithMissingMetadata);

    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Target")).toBeInTheDocument();
    expect(within(dialog).getByText("Full Utterance")).toBeInTheDocument();
    expect(within(dialog).getAllByText("—")).toHaveLength(8);
  });

  it("closes when the header close button is clicked", async () => {
    const user = userEvent.setup();
    const { setSelectedResult } = renderModal();

    await user.click(screen.getByRole("button", { name: "Close details" }));

    expect(setSelectedResult).toHaveBeenCalledTimes(1);
    expect(setSelectedResult).toHaveBeenCalledWith(null);
  });

  it("closes when the footer Close button is clicked", async () => {
    const user = userEvent.setup();
    const { setSelectedResult } = renderModal();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(setSelectedResult).toHaveBeenCalledTimes(1);
    expect(setSelectedResult).toHaveBeenCalledWith(null);
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { setSelectedResult } = renderModal();

    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(setSelectedResult).toHaveBeenCalledWith(null);
  });

  it("does not close when the modal content is clicked", async () => {
    const user = userEvent.setup();
    const { setSelectedResult } = renderModal();

    await user.click(screen.getByRole("dialog"));

    expect(setSelectedResult).not.toHaveBeenCalled();
  });
});
