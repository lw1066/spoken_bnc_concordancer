import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import useCorpusSearch from "./hooks/useCorpusSearch";
import type { KwicResult } from "./types/corpus";

jest.mock("./hooks/useCorpusSearch", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedModule = jest.requireMock("./hooks/useCorpusSearch") as {
  default: jest.MockedFunction<typeof useCorpusSearch>;
};
const mockUseCorpusSearch = mockedModule.default;

const App = (jest.requireActual("./App") as typeof import("./App")).default;

const mockResult: KwicResult = {
  id: 1,
  text_id: 1,
  corpus_id: "A",
  filename: "TEST.xml",
  genre: "conversation",
  speaker: "PS01",
  utterance_number: 1,
  trans: null,
  who_confidence: null,
  left_context: "I",
  target: "hello",
  right_context: "there",
  utterance: "I hello there",
};

const defaultSearchState = {
  searchType: "word" as const,
  setSearchType: jest.fn(),
  submittedSearchType: "word" as const,
  query: "",
  setQuery: jest.fn(),
  submittedQuery: "",
  pendingWindowSize: 5,
  setPendingWindowSize: jest.fn(),
  limit: 20,
  setLimit: jest.fn(),
  page: 1,
  setPage: jest.fn(),
  totalMatches: 0,
  originalTotalMatches: 0,
  displayedTotalMatches: 0,
  totalPages: 1,
  uniqueWords: [],
  selectedWords: [],
  results: [] as KwicResult[],
  loading: false,
  error: null,
  collocationLeft: 3,
  updateCollocationLeft: jest.fn(),
  collocationRight: 3,
  updateCollocationRight: jest.fn(),
  collocations: [],
  collocationsSearched: false,
  canRunCollocations: false,
  collocationMessage: "",
  collocationsLoading: false,
  collocationsError: null,
  selectedCollocation: null,
  setSelectedCollocation: jest.fn(),
  updateCollocationFilter: jest.fn(),
  fetchCollocations: jest.fn(),
  handleSearch: jest.fn(),
  toggleWordSelection: jest.fn(),
  minCollocationFrequency: 5,
  updateMinCollocationFrequency: jest.fn(),
  collocationFilter: null,
  searchAllVariants: false,
  showAllVariantsOption: false,
  handleSearchAllVariantsChange: jest.fn(),
  resetSearch: jest.fn(),
};

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCorpusSearch.mockReturnValue(
      defaultSearchState as unknown as ReturnType<typeof useCorpusSearch>,
    );
  });

  it("renders the application heading and search controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /spoken bnc2014 explorer/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /find concordances/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("combobox", { name: /search type/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("textbox", { name: /search word token/i }),
    ).toBeInTheDocument();
  });

  it("calls the search handler when a valid search is submitted", () => {
    const handleSearch = jest.fn();

    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      query: "hello",
      handleSearch,
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /find concordances/i }));

    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it("displays a validation message for a multiword word search", () => {
    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      query: "hello world",
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /word search accepts a single word/i,
    );

    expect(
      screen.getByRole("button", { name: /find concordances/i }),
    ).toBeDisabled();
  });

  it("displays a validation message for wildcards in phrase searches", () => {
    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      query: "hello *",
      searchType: "phrase",
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(/no wildcards/i);
  });

  it("displays a validation message when a phrase has fewer than two words", () => {
    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      query: "hello",
      searchType: "phrase",
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /phrase search requires 2 or more words/i,
    );
  });

  it("renders the results heading when results are available", () => {
    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      submittedQuery: "hello",
      results: [mockResult],
      totalMatches: 1,
      displayedTotalMatches: 1,
      originalTotalMatches: 1,
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /results for "hello"/i }),
    ).toBeInTheDocument();

    expect(screen.getByText("hello", { selector: "td" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /details/i }),
    ).toBeInTheDocument();
  });

  it("closes the result details dialog when Escape is pressed", () => {
    mockUseCorpusSearch.mockReturnValue({
      ...defaultSearchState,
      submittedQuery: "hello",
      results: [mockResult],
      totalMatches: 1,
      displayedTotalMatches: 1,
      originalTotalMatches: 1,
    } as unknown as ReturnType<typeof useCorpusSearch>);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /details/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
