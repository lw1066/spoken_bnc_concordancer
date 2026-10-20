import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import ResultsToolbar from "./ResultsToolbar";

function renderToolbar(
  overrides: {
    pendingWindowSize?: number;
    limit?: number;
  } = {},
) {
  const onWindowSizeChange = jest.fn();
  const onLimitChange = jest.fn();

  const props = {
    pendingWindowSize: 5,
    limit: 20,
    onWindowSizeChange,
    onLimitChange,
    ...overrides,
  };

  return {
    ...render(<ResultsToolbar {...props} />),
    onWindowSizeChange,
    onLimitChange,
  };
}

describe("ResultsToolbar", () => {
  it("renders the Context Width and Rows Visible controls", () => {
    renderToolbar();

    expect(screen.getByLabelText("Context Width")).toBeInTheDocument();
    expect(screen.getByLabelText("Rows Visible")).toBeInTheDocument();
  });

  it("displays the current context width and word count", () => {
    renderToolbar({ pendingWindowSize: 8 });

    expect(screen.getByRole("slider", { name: "Context Width" })).toHaveValue(
      "8",
    );
    expect(screen.getByText("8 words")).toBeInTheDocument();
  });

  it("sets the context slider range from 1 to 20", () => {
    renderToolbar();

    const slider = screen.getByRole("slider", { name: "Context Width" });

    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "20");
  });

  it("calls onWindowSizeChange with a number when the context width changes", () => {
    const { onWindowSizeChange } = renderToolbar();

    const slider = screen.getByRole("slider", { name: "Context Width" });

    fireEvent.change(slider, { target: { value: "12" } });

    expect(onWindowSizeChange).toHaveBeenCalledWith(12);
  });

  it("displays the selected row limit and all available options", () => {
    renderToolbar({ limit: 50 });

    const select = screen.getByRole("combobox", { name: "Rows Visible" });

    expect(select).toHaveValue("50");
    expect(screen.getByRole("option", { name: "10" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "20" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "50" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "100" })).toBeInTheDocument();
  });

  it("calls onLimitChange with a number when the row limit changes", async () => {
    const user = userEvent.setup();
    const { onLimitChange } = renderToolbar();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Rows Visible" }),
      "100",
    );

    expect(onLimitChange).toHaveBeenCalledWith(100);
  });
});
