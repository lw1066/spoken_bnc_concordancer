import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import useCorpusSearch from "./useCorpusSearch";
import type { ApiResponse, KwicResult } from "../types/corpus";

const mockResult: KwicResult = {
  id: 1,
  text_id: 1,
  corpus_id: "BNC",
  filename: "TEST.xml",
  genre: "spoken",
  speaker: "S001",
  utterance_number: 1,
  trans: null,
  who_confidence: null,
  left_context: "I think",
  target: "honestly",
  right_context: "it is useful",
  utterance: "I think honestly it is useful.",
  lemma: "honestly",
  pos: "AV0",
  class: null,
  usas: null,
  position: 3,
};

const mockApiResponse = (
  overrides: Partial<ApiResponse> = {},
): ApiResponse => ({
  status: "success",
  total_matches: 1,
  page: 1,
  limit: 20,
  unique_words: [
    {
      word: "honestly",
      count: 1,
      pos: "AV0",
      wordClass: null,
    },
  ],
  results: [mockResult],
  ...overrides,
});

const mockFetchResponse = (
  body: unknown = mockApiResponse(),
  options: {
    ok?: boolean;
    status?: number;
  } = {},
) =>
  jest.fn<typeof fetch>().mockResolvedValue({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body,
  } as Response);

describe("useCorpusSearch", () => {
  let fetchMock: jest.Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockFetchResponse();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("initialises with the expected default state", () => {
    const { result } = renderHook(() => useCorpusSearch());

    expect(result.current.searchType).toBe("word");
    expect(result.current.submittedSearchType).toBe("word");
    expect(result.current.query).toBe("");
    expect(result.current.submittedQuery).toBe("");
    expect(result.current.windowSize).toBe(5);
    expect(result.current.pendingWindowSize).toBe(5);
    expect(result.current.limit).toBe(20);
    expect(result.current.page).toBe(1);
    expect(result.current.totalMatches).toBe(0);
    expect(result.current.uniqueWords).toEqual([]);
    expect(result.current.selectedWords).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
    expect(result.current.collocations).toEqual([]);
    expect(result.current.collocationsLoading).toBe(false);
    expect(result.current.collocationsError).toBe("");
    expect(result.current.collocationsSearched).toBe(false);
  });

  it("submits a word search and fetches corpus results", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(result.current.results).toEqual([mockResult]);
    });

    expect(result.current.submittedQuery).toBe("honestly");
    expect(result.current.submittedSearchType).toBe("word");

    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("/api/search");
    expect(requestUrl).toContain("query=honestly");
  });

  it("submits a lemma search with the lemma parameter", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setSearchType("lemma");
      result.current.setQuery("go");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(result.current.results).toEqual([mockResult]);
    });

    expect(result.current.submittedSearchType).toBe("lemma");
    expect(result.current.submittedQuery).toBe("go");

    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("lemma=go");
  });

  it("submits a phrase search with the phrase search type", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setSearchType("phrase");
      result.current.setQuery("in fact");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(result.current.results).toEqual([mockResult]);
    });

    expect(result.current.submittedSearchType).toBe("phrase");
    expect(result.current.submittedQuery).toBe("in fact");

    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("search_type=phrase");
    expect(requestUrl).toContain("query=in");
  });

  it("rejects a word search containing multiple words", () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("two words");
    });

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.error).not.toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a phrase search containing fewer than two words", () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setSearchType("phrase");
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.error).not.toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears search results when the query is empty", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([mockResult]);
    });

    fetchMock.mockClear();

    act(() => {
      result.current.setQuery("");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.submittedQuery).toBe("");
      expect(result.current.results).toEqual([]);
    });

    expect(result.current.totalMatches).toBe(0);
    expect(result.current.uniqueWords).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sets an error when the fetch request fails", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchMock = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Network failure"));

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.error).not.toBe("");
      expect(result.current.loading).toBe(false);
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Network failure" }),
    );
  });

  it("sets an error when the server responds unsuccessfully", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchMock = mockFetchResponse(
      { error: "Server error" },
      { ok: false, status: 500 },
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.error).not.toBe("");
      expect(result.current.loading).toBe(false);
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "HTTP 500" }),
    );
  });

  it("updates the page when pagination is changed", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([mockResult]);
    });

    fetchMock.mockClear();

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(result.current.page).toBe(2);

    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("page=2");
  });

  it("can fetch collocations for a single available word", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([mockResult]);
    });

    fetchMock.mockClear();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        collocations: [
          {
            word: "think",
            frequency: 5,
            positions: { "-1": 3, "1": 2 },
          },
        ],
      }),
    } as Response);

    await act(async () => {
      await result.current.fetchCollocations();
    });

    expect(fetchMock).toHaveBeenCalled();

    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("/api/collocations");
    expect(requestUrl).toContain("query=honestly");
  });

  it("resets the search state", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    act(() => {
      result.current.handleSearch();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([mockResult]);
    });

    act(() => {
      result.current.setQuery("another");
      result.current.setSearchType("lemma");
    });

    act(() => {
      result.current.resetSearch();
    });

    expect(result.current.query).toBe("");
    expect(result.current.submittedQuery).toBe("");
    expect(result.current.searchType).toBe("word");
    expect(result.current.submittedSearchType).toBe("word");
    expect(result.current.results).toEqual([]);
    expect(result.current.uniqueWords).toEqual([]);
    expect(result.current.selectedWords).toEqual([]);
    expect(result.current.totalMatches).toBe(0);
    expect(result.current.error).toBe("");
  });

  it("updates submitted state and triggers the search effect", async () => {
    const { result } = renderHook(() => useCorpusSearch());

    act(() => {
      result.current.setQuery("honestly");
    });

    expect(result.current.query).toBe("honestly");
    expect(result.current.submittedQuery).toBe("");

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.submittedQuery).toBe("honestly");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
