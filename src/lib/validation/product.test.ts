import { describe, expect, it } from "vitest";
import { validateProduct, type ProductInput } from "./product";

const valid: ProductInput = {
  name: "Milo",
  sellingPrice: 300,
  costPrice: 100,
  stock: 20,
  category: "Drinks",
  active: true,
};

describe("validateProduct", () => {
  it("accepts a valid product", () => {
    expect(validateProduct(valid)).toEqual([]);
  });

  it("accepts null costPrice and category", () => {
    expect(
      validateProduct({ ...valid, costPrice: null, category: null }),
    ).toEqual([]);
  });

  it("rejects an empty name", () => {
    expect(validateProduct({ ...valid, name: "  " })).toContain(
      "Name is required.",
    );
  });

  it("rejects non-integer or negative selling price", () => {
    expect(validateProduct({ ...valid, sellingPrice: 12.5 })).toContain(
      "Selling price must be a non-negative whole number.",
    );
    expect(validateProduct({ ...valid, sellingPrice: -1 })).toContain(
      "Selling price must be a non-negative whole number.",
    );
  });

  it("rejects non-integer or negative cost price", () => {
    expect(validateProduct({ ...valid, costPrice: 5.5 })).toContain(
      "Cost price must be a non-negative whole number or empty.",
    );
    expect(validateProduct({ ...valid, costPrice: -1 })).toContain(
      "Cost price must be a non-negative whole number or empty.",
    );
  });

  it("rejects non-integer or negative stock", () => {
    expect(validateProduct({ ...valid, stock: 1.5 })).toContain(
      "Stock must be a non-negative whole number.",
    );
    expect(validateProduct({ ...valid, stock: -1 })).toContain(
      "Stock must be a non-negative whole number.",
    );
  });

  it("rejects a non-boolean active flag", () => {
    expect(
      validateProduct({ ...valid, active: "yes" as unknown as boolean }),
    ).toContain("Active must be true or false.");
  });
});
