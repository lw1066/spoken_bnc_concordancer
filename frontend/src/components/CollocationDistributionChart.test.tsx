import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";

type Datum = {
  position: string;
  numericPosition: number;
  frequency: number;
};

jest.doMock("recharts", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  type MockDatum = {
    position: string;
    numericPosition: number;
    frequency: number;
  };

  type MockShapeProps = {
    payload: MockDatum;
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const Context = React.createContext<{ data: MockDatum[] }>({ data: [] });

  function MockResponsiveContainer({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement("div", null, children);
  }

  function MockBarChart({
    data,
    children,
  }: {
    data: MockDatum[];
    children: React.ReactNode;
  }) {
    return React.createElement(
      Context.Provider,
      { value: { data } },
      React.createElement(
        "div",
        { "data-testid": "chart-data" },
        JSON.stringify(data),
      ),
      children,
    );
  }

  function MockBar({
    shape,
  }: {
    shape: (props: MockShapeProps) => React.ReactNode;
  }) {
    const { data } = React.useContext(Context);

    return React.createElement(
      "div",
      null,
      ...data.map((datum, index) =>
        React.createElement(
          React.Fragment,
          { key: datum.position },
          shape({
            payload: datum,
            x: index * 10,
            y: 10,
            width: 8,
            height: datum.frequency,
          }),
        ),
      ),
    );
  }

  function MockRectangle(props: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    role: string;
    tabIndex: number;
    "aria-label": string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
  }) {
    return React.createElement("button", {
      type: "button",
      ...props,
      "data-fill": props.fill,
    });
  }

  return {
    __esModule: true,
    Bar: MockBar,
    BarChart: MockBarChart,
    CartesianGrid: () => null,
    Rectangle: MockRectangle,
    ResponsiveContainer: MockResponsiveContainer,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

const CollocationDistributionChart =
  require("./CollocationDistributionChart").default;

const positions = {
  "-2": 5,
  "-1": 10,
  "1": 15,
  "3": 7,
};

function renderChart(
  overrides: Partial<{
    collocate: string;
    target: string;
    positions: Record<string, number>;
    activePosition: number | null;
    onPositionClick: (position: number) => void;
  }> = {},
) {
  const onPositionClick = jest.fn<(position: number) => void>();

  const props = {
    collocate: "very",
    target: "happy",
    positions,
    activePosition: null,
    onPositionClick,
    ...overrides,
  };

  return {
    ...render(<CollocationDistributionChart {...props} />),
    onPositionClick,
  };
}

function getChartData(): Datum[] {
  const text = screen.getByTestId("chart-data").textContent;

  if (!text) {
    throw new Error("Expected chart data to be rendered");
  }

  return JSON.parse(text) as Datum[];
}

describe("CollocationDistributionChart", () => {
  it("shows the collocate and target in its heading", () => {
    renderChart();

    expect(
      screen.getByRole("heading", {
        name: 'Position of "very" around "happy"',
      }),
    ).toBeInTheDocument();
  });

  it("explains how negative and positive positions relate to the target", () => {
    renderChart();

    expect(
      screen.getByText(
        /negative positions are to the left of the target; positive positions are to the right/i,
      ),
    ).toBeInTheDocument();
  });

  it("builds ordered position data and fills missing positions with zero", () => {
    renderChart();

    expect(screen.getByTestId("chart-data")).toBeInTheDocument();

    expect(getChartData()).toEqual([
      { position: "-2", numericPosition: -2, frequency: 5 },
      { position: "-1", numericPosition: -1, frequency: 10 },
      { position: "+1", numericPosition: 1, frequency: 15 },
      { position: "+2", numericPosition: 2, frequency: 0 },
      { position: "+3", numericPosition: 3, frequency: 7 },
    ]);
  });

  it("handles positions only to the left of the target", () => {
    renderChart({
      positions: { "-2": 3, "-1": 6 },
    });

    expect(getChartData()).toEqual([
      { position: "-2", numericPosition: -2, frequency: 3 },
      { position: "-1", numericPosition: -1, frequency: 6 },
    ]);
  });

  it("handles positions only to the right of the target", () => {
    renderChart({
      positions: { "1": 3, "2": 6 },
    });

    expect(getChartData()).toEqual([
      { position: "+1", numericPosition: 1, frequency: 3 },
      { position: "+2", numericPosition: 2, frequency: 6 },
    ]);
  });

  it("uses accessible labels containing each position and frequency", () => {
    renderChart();

    expect(
      screen.getByRole("button", { name: "Position -2, frequency 5" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Position +1, frequency 15" }),
    ).toBeInTheDocument();
  });

  it("highlights the active position", () => {
    renderChart({ activePosition: -1 });

    expect(
      screen.getByRole("button", { name: "Position -1, frequency 10" }),
    ).toHaveAttribute("data-fill", "#2563eb");

    expect(
      screen.getByRole("button", { name: "Position -2, frequency 5" }),
    ).toHaveAttribute("data-fill", "#94a3b8");
  });

  it("highlights a hovered position and clears the hover highlight on mouse leave", () => {
    renderChart();

    const bar = screen.getByRole("button", {
      name: "Position +1, frequency 15",
    });

    fireEvent.mouseEnter(bar);
    expect(bar).toHaveAttribute("data-fill", "#2563eb");

    fireEvent.mouseLeave(bar);
    expect(bar).toHaveAttribute("data-fill", "#94a3b8");
  });

  it("calls onPositionClick with the numeric position when clicked", () => {
    const { onPositionClick } = renderChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Position -1, frequency 10" }),
    );

    expect(onPositionClick).toHaveBeenCalledWith(-1);
  });

  it("supports keyboard activation with Enter", () => {
    const { onPositionClick } = renderChart();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Position +1, frequency 15" }),
      { key: "Enter" },
    );

    expect(onPositionClick).toHaveBeenCalledWith(1);
  });

  it("supports Space and prevents its default action", () => {
    const { onPositionClick } = renderChart();

    const bar = screen.getByRole("button", {
      name: "Position -2, frequency 5",
    });

    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });

    const preventDefault = jest.spyOn(event, "preventDefault");

    fireEvent(bar, event);

    expect(onPositionClick).toHaveBeenCalledWith(-2);
    expect(preventDefault).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores unrelated keyboard keys", () => {
    const { onPositionClick } = renderChart();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Position -1, frequency 10" }),
      { key: "ArrowRight" },
    );

    expect(onPositionClick).not.toHaveBeenCalled();
  });

  it("allows onPositionClick to be omitted", () => {
    expect(() =>
      render(
        <CollocationDistributionChart
          collocate="very"
          target="happy"
          positions={{ "1": 3 }}
          activePosition={null}
        />,
      ),
    ).not.toThrow();
  });
});
