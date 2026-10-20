import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import CollocationControls from "./CollocationControls";

const defaultProps = {
  collocationLeft: 3,
  collocationRight: 3,
  setCollocationLeft: jest.fn(),
  setCollocationRight: jest.fn(),
  fetchCollocations: jest.fn(),
  loading: false,
  canRunCollocations: true,
  collocationMessage: "Select a single word to search for collocations.",
  minCollocationFrequency: 5,
  setMinCollocationFrequency: jest.fn(),
  collocationsSearched: false,
  collocationCount: 0,
  searchAllVariants: false,
  showAllVariantsOption: true,
  handleSearchAllVariantsChange: jest.fn(),
};

function renderControls(overrides: Partial<typeof defaultProps> = {}) {
  const props = {
    ...defaultProps,
    setCollocationLeft: jest.fn(),
    setCollocationRight: jest.fn(),
    fetchCollocations: jest.fn(),
    setMinCollocationFrequency: jest.fn(),
    handleSearchAllVariantsChange: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<CollocationControls {...props} />),
    props,
  };
}

describe("CollocationControls", () => {
  it("renders the heading, window inputs, frequency selector and search button", () => {
    renderControls();

    expect(
      screen.getByRole("heading", { name: "Collocations" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Left")).toHaveValue(3);
    expect(screen.getByLabelText("Right")).toHaveValue(3);
    expect(screen.getByLabelText("Min frequency")).toHaveValue("5");
    expect(
      screen.getByRole("button", { name: "Find collocations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "100 or more" }),
    ).toBeInTheDocument();
  });

  it("shows the message for a single selected variant", () => {
    renderControls({ canRunCollocations: true, searchAllVariants: false });

    expect(
      screen.getByText(/only include the single variant chosen/i),
    ).toBeInTheDocument();
  });

  it("shows the message for all variants", () => {
    renderControls({ searchAllVariants: true });

    expect(
      screen.getByText(/include all grammatical variants/i),
    ).toBeInTheDocument();
  });

  it("shows the supplied message when collocations cannot run", () => {
    renderControls({
      canRunCollocations: false,
      collocationMessage: "Choose one word first.",
    });

    expect(screen.getByText("Choose one word first.")).toBeInTheDocument();
  });

  it("clamps the left window to the range 0–5", () => {
    const { props } = renderControls();

    fireEvent.change(screen.getByLabelText("Left"), {
      target: { value: "-2" },
    });
    expect(props.setCollocationLeft).toHaveBeenCalledWith(0);

    fireEvent.change(screen.getByLabelText("Left"), {
      target: { value: "8" },
    });
    expect(props.setCollocationLeft).toHaveBeenCalledWith(5);
  });

  it("clamps the right window to the range 0–5", () => {
    const { props } = renderControls();

    fireEvent.change(screen.getByLabelText("Right"), {
      target: { value: "-1" },
    });
    expect(props.setCollocationRight).toHaveBeenCalledWith(0);

    fireEvent.change(screen.getByLabelText("Right"), {
      target: { value: "9" },
    });
    expect(props.setCollocationRight).toHaveBeenCalledWith(5);
  });

  it("passes the selected minimum frequency to the setter", () => {
    const { props } = renderControls();

    fireEvent.change(screen.getByLabelText("Min frequency"), {
      target: { value: "20" },
    });

    expect(props.setMinCollocationFrequency).toHaveBeenCalledWith(20);
  });

  it("calls fetchCollocations when the search button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderControls();

    await user.click(screen.getByRole("button", { name: "Find collocations" }));

    expect(props.fetchCollocations).toHaveBeenCalledTimes(1);
  });

  it("disables searching and window inputs when collocations cannot run", () => {
    renderControls({ canRunCollocations: false });

    expect(screen.getByLabelText("Left")).toBeDisabled();
    expect(screen.getByLabelText("Right")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByLabelText("Min frequency")).toBeDisabled();
  });

  it("shows a searching label and disables controls while loading", () => {
    renderControls({ loading: true });

    expect(screen.getByRole("button", { name: "Searching..." })).toBeDisabled();
    expect(screen.getByLabelText("Min frequency")).toBeDisabled();
    expect(screen.getByLabelText("Left")).toBeEnabled();
    expect(screen.getByLabelText("Right")).toBeEnabled();
  });

  it("disables the all-variants checkbox while loading", () => {
    renderControls({ loading: true });

    expect(
      screen.getByRole("checkbox", { name: "Use all variants" }),
    ).toBeDisabled();
  });

  it("calls the all-variants handler when the checkbox changes", async () => {
    const user = userEvent.setup();
    const { props } = renderControls();

    await user.click(
      screen.getByRole("checkbox", { name: "Use all variants" }),
    );

    expect(props.handleSearchAllVariantsChange).toHaveBeenCalledWith(true);
  });

  it("hides the all-variants option when it is not applicable", () => {
    renderControls({ showAllVariantsOption: false });

    expect(
      screen.queryByRole("checkbox", { name: "Use all variants" }),
    ).not.toBeInTheDocument();
  });

  it("shows the collocation count after a search has completed", () => {
    renderControls({
      collocationsSearched: true,
      collocationCount: 42,
    });

    expect(
      screen.getByRole("button", { name: "42 collocations" }),
    ).toBeInTheDocument();
  });
});
