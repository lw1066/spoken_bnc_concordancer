import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import SearchControls from "./SearchControls";
import type { SearchType } from "../types/corpus";

function renderSearchControls(
  overrides: Partial<React.ComponentProps<typeof SearchControls>> = {},
) {
  const props: React.ComponentProps<typeof SearchControls> = {
    searchType: "word",
    query: "",
    loading: false,
    searchLabel: "Search word",
    searchPlaceholder: "Enter a word",
    onSearchTypeChange: jest.fn<(value: SearchType) => void>(),
    onQueryChange: jest.fn<(value: string) => void>(),
    onSearch: jest.fn<() => void>(),
    submittedQuery: "",
    submittedSearchType: "word",
    concordanceCount: 0,
    resetSearch: jest.fn<() => void>(),
    validationMessage: "",
    ...overrides,
  };

  return {
    ...render(<SearchControls {...props} />),
    props,
  };
}

describe("SearchControls", () => {
  it("renders the search type, query field and action buttons", () => {
    renderSearchControls();

    expect(screen.getByLabelText("Search Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Search word")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Find concordances" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("calls onQueryChange when the user types", async () => {
    const user = userEvent.setup();
    const { props } = renderSearchControls();

    await user.type(screen.getByLabelText("Search word"), "h");

    expect(props.onQueryChange).toHaveBeenCalledWith("h");
  });

  it("calls onSearch when the user clicks Find concordances", async () => {
    const user = userEvent.setup();
    const { props } = renderSearchControls({ query: "honestly" });

    await user.click(screen.getByRole("button", { name: "Find concordances" }));

    expect(props.onSearch).toHaveBeenCalledTimes(1);
  });

  it("calls onSearch when the user presses Enter in the query field", async () => {
    const user = userEvent.setup();
    const { props } = renderSearchControls({ query: "honestly" });

    await user.click(screen.getByLabelText("Search word"));
    await user.keyboard("{Enter}");

    expect(props.onSearch).toHaveBeenCalledTimes(1);
  });

  it("disables searching while loading or when validation fails", () => {
    const { rerender, props } = renderSearchControls({
      loading: true,
    });

    expect(screen.getByRole("button", { name: "Searching..." })).toBeDisabled();

    rerender(
      <SearchControls
        {...props}
        loading={false}
        validationMessage="Enter a valid search term."
      />,
    );

    expect(
      screen.getByRole("button", { name: "Find concordances" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid search term.",
    );
    expect(screen.getByLabelText("Search word")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("calls onSearchTypeChange when the search type changes", async () => {
    const user = userEvent.setup();
    const { props } = renderSearchControls();

    await user.selectOptions(screen.getByLabelText("Search Type"), "lemma");

    expect(props.onSearchTypeChange).toHaveBeenCalledWith("lemma");
  });

  it("calls resetSearch when the Reset button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderSearchControls({
      query: "honestly",
    });

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(props.resetSearch).toHaveBeenCalledTimes(1);
  });

  it("displays the concordance count when the current search matches the submitted search", () => {
    renderSearchControls({
      query: "honestly",
      submittedQuery: "honestly",
      searchType: "word",
      submittedSearchType: "word",
      concordanceCount: 12,
    });

    expect(
      screen.getByRole("button", { name: "12 concordances" }),
    ).toBeInTheDocument();
  });
});
