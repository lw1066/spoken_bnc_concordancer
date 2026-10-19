import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import type { Collocation } from "../types/corpus";

jest.doMock("./CollocationDistributionChart", () => ({
  __esModule: true,
  default: ({
    collocate,
    target,
    positions,
    activePosition,
    onPositionClick,
  }: {
    collocate: string;
    target: string;
    positions: Record<string, number>;
    activePosition: number | null;
    onPositionClick: (position: number) => void;
  }) => {
    const React = jest.requireActual<typeof import("react")>("react");

    return React.createElement(
      "div",
      { "data-testid": "distribution-chart" },
      React.createElement("span", null, `Chart: ${collocate} / ${target}`),
      React.createElement(
        "span",
        null,
        `Active position: ${activePosition ?? "none"}`,
      ),
      ...Object.keys(positions).map((position) =>
        React.createElement(
          "button",
          {
            key: position,
            type: "button",
            onClick: () => onPositionClick(Number(position)),
          },
          `Position ${position}`,
        ),
      ),
    );
  },
}));

// Load the component after registering the mock.
const CollocationsPanel = jest.requireActual<
  typeof import("./CollocationsPanel")
>("./CollocationsPanel").default;

const collocations: Collocation[] = [
  {
    word: "very",
    frequency: 42,
    positions: {
      "-1": 20,
      "1": 22,
    },
  },
  {
    word: "good",
    frequency: 18,
    positions: {
      "1": 18,
    },
  },
];

type TestProps = {
  collocations: Collocation[];
  collocationsLoading: boolean;
  collocationsError: string | null;
  selectedCollocation: string | null;
  collocationTarget: string;
  setPage: jest.Mock;
  updateCollocationFilter: jest.Mock;
  setSelectedCollocation: jest.Mock;
  activeCollocate: string | null;
  activePosition: number | null;
};

const defaultProps: TestProps = {
  collocations,
  collocationsLoading: false,
  collocationsError: null,
  selectedCollocation: null,
  collocationTarget: "happy",
  setPage: jest.fn(),
  updateCollocationFilter: jest.fn(),
  setSelectedCollocation: jest.fn(),
  activeCollocate: null,
  activePosition: null,
};

function renderPanel(overrides: Partial<TestProps> = {}) {
  const props: TestProps = {
    ...defaultProps,
    setPage: jest.fn(),
    updateCollocationFilter: jest.fn(),
    setSelectedCollocation: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<CollocationsPanel {...props} />),
    props,
  };
}

describe("CollocationsPanel", () => {
  it("renders the heading and collocation results", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Collocation Results" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "very" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "good" })).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("shows a loading message while collocations are loading", () => {
    renderPanel({
      collocationsLoading: true,
      collocations: [],
    });

    expect(screen.getByText(/querying sqlite index/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when no collocations are found", () => {
    renderPanel({ collocations: [] });

    expect(screen.getByText(/no collocations found/i)).toBeInTheDocument();
  });

  it("displays an error message when the request fails", () => {
    renderPanel({
      collocationsError: "Unable to load collocations",
    });

    expect(screen.getByText("Unable to load collocations")).toBeInTheDocument();
  });

  it("expands and collapses the panel", async () => {
    const user = userEvent.setup();
    renderPanel();

    const toggle = screen.getByRole("button", {
      name: /collocation results/i,
    });

    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("resets to page 1 and filters when a collocate is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.click(screen.getByRole("button", { name: "very" }));

    expect(props.setPage).toHaveBeenCalledWith(1);
    expect(props.updateCollocationFilter).toHaveBeenCalledWith({
      word: "very",
      position: null,
    });
  });

  it("shows Distribution only for collocations with multiple positions", () => {
    renderPanel();

    expect(
      screen.getAllByRole("button", { name: "Distribution" }),
    ).toHaveLength(1);

    const goodButton = screen.getByRole("button", { name: "good" });
    const goodRow = goodButton.closest("tr");

    expect(goodRow).not.toBeNull();
    expect(
      within(goodRow as HTMLElement).queryByRole("button", {
        name: "Distribution",
      }),
    ).not.toBeInTheDocument();
  });

  it("requests the selected collocation to be toggled when Distribution is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Distribution" }));

    expect(props.setSelectedCollocation).toHaveBeenCalledWith(
      expect.any(Function),
    );

    const updater = props.setSelectedCollocation.mock.calls[0][0] as (
      current: string | null,
    ) => string | null;

    expect(updater(null)).toBe("very");
    expect(updater("very")).toBeNull();
  });

  it("renders the selected distribution chart", () => {
    renderPanel({
      selectedCollocation: "very",
    });

    const chart = screen.getByTestId("distribution-chart");

    expect(chart).toBeInTheDocument();
    expect(within(chart).getByText("Chart: very / happy")).toBeInTheDocument();
    expect(
      within(chart).getByText("Active position: none"),
    ).toBeInTheDocument();
  });

  it("closes the chart when Close graph is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel({
      selectedCollocation: "very",
    });

    await user.click(screen.getByRole("button", { name: "Close graph" }));

    expect(props.setSelectedCollocation).toHaveBeenCalledWith(
      expect.any(Function),
    );

    const updater = props.setSelectedCollocation.mock.calls[0][0] as (
      current: string | null,
    ) => string | null;

    expect(updater("very")).toBeNull();
  });

  it("resets to page 1 and filters by the clicked distribution position", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel({
      selectedCollocation: "very",
    });

    const chart = screen.getByTestId("distribution-chart");

    await user.click(
      within(chart).getByRole("button", { name: "Position -1" }),
    );

    expect(props.setPage).toHaveBeenCalledWith(1);
    expect(props.updateCollocationFilter).toHaveBeenCalledWith({
      word: "very",
      position: -1,
    });
  });

  it("passes the active position only when the active collocate matches", () => {
    const { rerender } = renderPanel({
      selectedCollocation: "very",
      activeCollocate: "very",
      activePosition: -1,
    });

    expect(screen.getByText("Active position: -1")).toBeInTheDocument();

    rerender(
      <CollocationsPanel
        {...defaultProps}
        selectedCollocation="very"
        activeCollocate="good"
        activePosition={-1}
      />,
    );

    expect(screen.getByText("Active position: none")).toBeInTheDocument();
  });
});
