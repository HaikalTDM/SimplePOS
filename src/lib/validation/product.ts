export interface ProductInput {
  name: string;
  /** Integer minor units. */
  sellingPrice: number;
  /** Integer minor units or null. */
  costPrice: number | null;
  stock: number;
  category: string | null;
  active: boolean;
}

/** Returns a list of error messages; empty means valid. */
export function validateProduct(input: ProductInput): string[] {
  const errors: string[] = [];

  if (typeof input.name !== "string" || input.name.trim() === "") {
    errors.push("Name is required.");
  }
  if (!Number.isInteger(input.sellingPrice) || input.sellingPrice < 0) {
    errors.push("Selling price must be a non-negative whole number.");
  }
  if (
    input.costPrice !== null &&
    (!Number.isInteger(input.costPrice) || input.costPrice < 0)
  ) {
    errors.push("Cost price must be a non-negative whole number or empty.");
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    errors.push("Stock must be a non-negative whole number.");
  }
  if (input.category !== null && typeof input.category !== "string") {
    errors.push("Category must be text or empty.");
  }
  if (typeof input.active !== "boolean") {
    errors.push("Active must be true or false.");
  }
  return errors;
}
