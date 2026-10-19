import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import Pagination from "./Pagination";

function renderPagination({
  page = 2,
  totalPages = 5,
}: {
  page?: number;
  totalPages?: number;
} = {}) {
  const onPageChange = jest.fn<(page: number) => void>();

  return {
    ...render(
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />,
    ),
    onPageChange,
  };
}

describe("Pagination", () => {
  it("displays the current page and total pages", () => {
    renderPagination({ page: 2, totalPages: 5 });

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.replace(/\s+/g, " ").trim() ===
            "Showing page 2 of 5 total blocks",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Page 2 / 5")).toBeInTheDocument();
  });

  it("requests the previous page when Previous is clicked", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({
      page: 3,
      totalPages: 5,
    });

    const previousButtons = screen.getAllByRole("button", {
      name: "Previous",
    });

    await user.click(previousButtons[0]);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("requests the next page when Next is clicked", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({
      page: 3,
      totalPages: 5,
    });

    const nextButtons = screen.getAllByRole("button", {
      name: /Next/,
    });

    await user.click(nextButtons[0]);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables previous navigation on the first page", () => {
    renderPagination({ page: 1, totalPages: 5 });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "◀ Prev" })).toBeDisabled();
  });

  it("disables next navigation on the last page", () => {
    renderPagination({ page: 5, totalPages: 5 });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "Next ▶" })).toBeDisabled();
  });

  it("clamps the previous page to 1 when page is below 1", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({
      page: 0,
      totalPages: 5,
    });

    const navigation = screen.getByRole("navigation", {
      name: "Pagination",
    });

    await user.click(
      within(navigation).getByRole("button", {
        name: "◀ Prev",
      }),
    );

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("requests the last page rather than going beyond it", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination({
      page: 4,
      totalPages: 5,
    });

    const navigation = screen.getByRole("navigation", {
      name: "Pagination",
    });

    await user.click(
      within(navigation).getByRole("button", {
        name: "Next ▶",
      }),
    );

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(5);
    expect(onPageChange).not.toHaveBeenCalledWith(6);
  });

  it("disables both directions when there is only one page", () => {
    renderPagination({ page: 1, totalPages: 1 });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    expect(screen.getByText("Page 1 / 1")).toBeInTheDocument();
  });
});
