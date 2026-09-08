import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

describe("App routing shell", () => {
  it("renders the POS page at /pos", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/pos"]}>
        <App />
      </MemoryRouter>
    );
    expect(getByText("POS")).toBeTruthy();
  });
});
