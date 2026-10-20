import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import type { KwicResult } from "../types/corpus";
import ConcordanceTable from "./ConcordanceTable";

const results: KwicResult[] = [
  {
    id: 1,
    text_id: 101,
    corpus_id: "A1B",
    filename: "sample.xml",
    genre: "conversation",
    speaker: "S001",
    utterance_number: 1,
    trans: null,
    who_confidence: null,
    left_context: "I was feeling",
    target: "very",
    right_context: "happy that day",
    utterance: "I was feeling very happy that day.",
  },
  {
    id: 2,
    text_id: 102,
    corpus_id: "C2D",
    filename: "example.xml",
    genre: "spoken",
    speaker: "S002",
    utterance_number: 2,
    trans: null,
    who_confidence: null,
    left_context: "That is a",
    target: "very",
    right_context: "good example",
    utterance: "That is a very good example.",
  },
];

function renderTable(
  overrides: Partial<{
    results: KwicResult[];
    loading: boolean;
  }> = {},
) {
  const props = {
    results,
    loading: false,
    setSelectedResult: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ConcordanceTable {...props} />),
    props,
  };
}

describe("ConcordanceTable", () => {
  it("renders the table headings", () => {
    renderTable();

    expect(
      screen.getByRole("columnheader", { name: "Left Context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Target" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Right Context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Details" }),
    ).toBeInTheDocument();
  });

  it("renders each result's left context, target and right context", () => {
    renderTable();

    expect(screen.getByText("I was feeling")).toBeInTheDocument();
    expect(screen.getAllByText("very")).toHaveLength(2);
    expect(screen.getByText("happy that day")).toBeInTheDocument();

    expect(screen.getByText("That is a")).toBeInTheDocument();
    expect(screen.getByText("good example")).toBeInTheDocument();
  });

  it("renders one Details button for each result", () => {
    renderTable();

    expect(screen.getAllByRole("button", { name: "Details" })).toHaveLength(2);
  });

  it("passes the correct result to setSelectedResult when Details is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderTable();

    const rows = screen.getAllByRole("row");
    const firstResultRow = rows[1];

    await user.click(
      within(firstResultRow).getByRole("button", { name: "Details" }),
    );

    expect(props.setSelectedResult).toHaveBeenCalledTimes(1);
    expect(props.setSelectedResult).toHaveBeenCalledWith(results[0]);
  });

  it("shows a loading message while results are loading", () => {
    renderTable({ loading: true });

    expect(screen.getByText(/Querying SQLite Index.../)).toBeInTheDocument();
    expect(
      screen.queryByText(
        "No active token matches found matching query criteria.",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows an empty-state message when there are no results", () => {
    renderTable({ results: [] });

    expect(
      screen.getByText(
        "No active token matches found matching query criteria.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the loading state instead of results when loading is true", () => {
    renderTable({ loading: true });

    expect(screen.queryByText("I was feeling")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Details" }),
    ).not.toBeInTheDocument();
  });
});
