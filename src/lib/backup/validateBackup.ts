import { CURRENCIES } from "../../utils/currency";
import type { BackupFile, ValidationResult } from "./types";
import { BACKUP_APP, BACKUP_FORMAT_VERSION } from "./types";

// §61 — complete validation before any import mutation. Every check runs and
// ALL errors are collected so the user sees everything wrong in one pass.

const CURRENCY_CODES = Object.keys(CURRENCIES);
const PAYMENT_METHODS = ["cash", "qr", "card"];
const MOVEMENT_TYPES = ["sale", "adjustment", "manual_add", "manual_reduce"];

type Obj = { [key: string]: unknown };

function isRecord(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function isIso(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

function isDateOnly(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
  );
}

function isNonNegSafeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function isPosInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

function isNullableNonNegSafeInt(v: unknown): boolean {
  return v === null || isNonNegSafeInt(v);
}

function isCurrency(v: unknown): boolean {
  return typeof v === "string" && CURRENCY_CODES.includes(v);
}

function isBase64DataUrl(v: unknown): v is string {
  return (
    typeof v === "string" && /^data:[^,;]+(;[^,;]+)*;base64,/.test(v)
  );
}

function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

function errorIf(errors: string[], ok: boolean, message: string): void {
  if (!ok) errors.push(message);
}

function checkUniqueIds(items: unknown[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (!isRecord(item) || !nonEmptyString(item.id)) return;
    if (seen.has(item.id)) errors.push(`${path}[${i}].id is duplicated.`);
    seen.add(item.id);
  });
}

function checkStall(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("stall must be an object.");
    return;
  }
  errorIf(errors, nonEmptyString(value.id), "stall.id must be a non-empty string.");
  errorIf(errors, nonEmptyString(value.name), "stall.name must be a non-empty string.");
  errorIf(errors, isCurrency(value.currency), "stall.currency must be one of MYR, SGD, PHP, THB, IDR, VND.");
  errorIf(errors, typeof value.businessType === "string", "stall.businessType must be a string.");
  errorIf(errors, isPosInt(value.lowStockThreshold), "stall.lowStockThreshold must be a positive integer.");
  errorIf(errors, value.lowStockAlertsEnabled === undefined || typeof value.lowStockAlertsEnabled === "boolean", "stall.lowStockAlertsEnabled must be a boolean when present.");
  errorIf(errors, isIso(value.onboardingCompletedAt), "stall.onboardingCompletedAt must be a valid ISO date string.");
  errorIf(errors, isIso(value.createdAt), "stall.createdAt must be a valid ISO date string.");
  errorIf(errors, isIso(value.updatedAt), "stall.updatedAt must be a valid ISO date string.");

  const theme = value.theme;
  if (theme !== undefined) {
    if (!isRecord(theme)) {
      errors.push("stall.theme must be an object.");
    } else {
      errorIf(errors, isHexColor(theme.bg), "stall.theme.bg must be a #rrggbb hex color.");
      errorIf(errors, isHexColor(theme.text), "stall.theme.text must be a #rrggbb hex color.");
      errorIf(errors, isHexColor(theme.accent), "stall.theme.accent must be a #rrggbb hex color.");
    }
  }

  const pm = value.paymentMethods;
  if (!isRecord(pm)) {
    errors.push("stall.paymentMethods must be an object.");
    return;
  }
  errorIf(errors, typeof pm.cash === "boolean", "stall.paymentMethods.cash must be a boolean.");
  errorIf(errors, typeof pm.card === "boolean", "stall.paymentMethods.card must be a boolean.");
  const qr = pm.qr;
  if (!isRecord(qr)) {
    errors.push("stall.paymentMethods.qr must be an object.");
    return;
  }
  errorIf(errors, typeof qr.enabled === "boolean", "stall.paymentMethods.qr.enabled must be a boolean.");
  errorIf(errors, qr.image === null || isBase64DataUrl(qr.image), "stall.paymentMethods.qr.image must be a base64 data URL string or null.");
}

function checkProducts(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("products must be an array.");
    return;
  }
  checkUniqueIds(value, "products", errors);
  value.forEach((item, i) => {
    const path = `products[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.name), `${path}.name must be a non-empty string.`);
    errorIf(errors, isNonNegSafeInt(item.sellingPrice), `${path}.sellingPrice must be a non-negative integer.`);
    errorIf(errors, isNullableNonNegSafeInt(item.costPrice), `${path}.costPrice must be a non-negative integer or null.`);
    errorIf(errors, isNonNegSafeInt(item.stock), `${path}.stock must be a non-negative integer.`);
    errorIf(errors, item.category === null || typeof item.category === "string", `${path}.category must be a string or null.`);
    errorIf(errors, typeof item.active === "boolean", `${path}.active must be a boolean.`);
    errorIf(errors, isIso(item.createdAt), `${path}.createdAt must be a valid ISO date string.`);
    errorIf(errors, isIso(item.updatedAt), `${path}.updatedAt must be a valid ISO date string.`);
  });
}

function checkSales(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("sales must be an array.");
    return;
  }
  checkUniqueIds(value, "sales", errors);
  value.forEach((item, i) => {
    const path = `sales[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, isIso(item.timestamp), `${path}.timestamp must be a valid ISO date string.`);
    errorIf(errors, isNonNegSafeInt(item.total), `${path}.total must be a non-negative integer.`);
    errorIf(errors, typeof item.paymentMethod === "string" && PAYMENT_METHODS.includes(item.paymentMethod), `${path}.paymentMethod must be one of cash, qr, card.`);
    errorIf(errors, isCurrency(item.currency), `${path}.currency must be one of MYR, SGD, PHP, THB, IDR, VND.`);
    errorIf(errors, item.notes === undefined || typeof item.notes === "string", `${path}.notes must be a string when present.`);
    errorIf(
      errors,
      item.sessionId === undefined || nonEmptyString(item.sessionId),
      `${path}.sessionId must be a non-empty string when present.`,
    );
  });
}

function checkSaleItems(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("saleItems must be an array.");
    return;
  }
  checkUniqueIds(value, "saleItems", errors);
  value.forEach((item, i) => {
    const path = `saleItems[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.saleId), `${path}.saleId must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.productId), `${path}.productId must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.productName), `${path}.productName must be a non-empty string.`);
    errorIf(errors, isPosInt(item.quantity), `${path}.quantity must be a positive integer.`);
    errorIf(errors, isNonNegSafeInt(item.unitPrice), `${path}.unitPrice must be a non-negative integer.`);
    errorIf(errors, isNullableNonNegSafeInt(item.unitCost), `${path}.unitCost must be a non-negative integer or null.`);
    errorIf(errors, isNonNegSafeInt(item.subtotal), `${path}.subtotal must be a non-negative integer.`);
  });
}

function checkStockMovements(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("stockMovements must be an array.");
    return;
  }
  checkUniqueIds(value, "stockMovements", errors);
  value.forEach((item, i) => {
    const path = `stockMovements[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.productId), `${path}.productId must be a non-empty string.`);
    errorIf(errors, typeof item.type === "string" && MOVEMENT_TYPES.includes(item.type), `${path}.type must be one of sale, adjustment, manual_add, manual_reduce.`);
    errorIf(errors, isPosInt(item.quantity), `${path}.quantity must be a positive integer.`);
    errorIf(errors, item.reason === undefined || typeof item.reason === "string", `${path}.reason must be a string when present.`);
    errorIf(errors, isIso(item.timestamp), `${path}.timestamp must be a valid ISO date string.`);
    errorIf(errors, item.saleId === undefined || nonEmptyString(item.saleId), `${path}.saleId must be a non-empty string when present.`);
  });
}

function checkExpenses(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("expenses must be an array.");
    return;
  }
  checkUniqueIds(value, "expenses", errors);
  value.forEach((item, i) => {
    const path = `expenses[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.description), `${path}.description must be a non-empty string.`);
    errorIf(errors, isNonNegSafeInt(item.amount), `${path}.amount must be a non-negative integer.`);
    errorIf(errors, item.category === null || typeof item.category === "string", `${path}.category must be a string or null.`);
    errorIf(errors, isDateOnly(item.date), `${path}.date must be a valid YYYY-MM-DD date.`);
    errorIf(errors, isCurrency(item.currency), `${path}.currency must be one of MYR, SGD, PHP, THB, IDR, VND.`);
    errorIf(
      errors,
      item.paidFromDrawer === undefined || typeof item.paidFromDrawer === "boolean",
      `${path}.paidFromDrawer must be a boolean when present.`,
    );
  });
}

function checkCategories(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("categories must be an array when present.");
    return;
  }
  checkUniqueIds(value, "categories", errors);
  const names = new Set<string>();
  value.forEach((item, i) => {
    const path = `categories[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, nonEmptyString(item.name), `${path}.name must be a non-empty string.`);
    errorIf(errors, isIso(item.createdAt), `${path}.createdAt must be a valid ISO date string.`);
    errorIf(
      errors,
      item.icon === undefined || (typeof item.icon === "string" && item.icon.trim() !== ""),
      `${path}.icon must be a non-empty string when present.`,
    );
    if (nonEmptyString(item.name)) {
      const key = item.name.trim().toLowerCase();
      if (names.has(key)) errors.push(`${path}.name is duplicated (case-insensitive).`);
      names.add(key);
    }
  });
}

function checkSessions(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("sessions must be an array when present.");
    return;
  }
  checkUniqueIds(value, "sessions", errors);
  value.forEach((item, i) => {
    const path = `sessions[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    errorIf(errors, nonEmptyString(item.id), `${path}.id must be a non-empty string.`);
    errorIf(errors, isIso(item.openedAt), `${path}.openedAt must be a valid ISO date string.`);
    errorIf(
      errors,
      item.closedAt === null || isIso(item.closedAt),
      `${path}.closedAt must be a valid ISO date string or null.`,
    );
    errorIf(
      errors,
      item.openingFloat === null || isNonNegSafeInt(item.openingFloat),
      `${path}.openingFloat must be a non-negative integer or null.`,
    );
    errorIf(
      errors,
      item.countedCash === null || isNonNegSafeInt(item.countedCash),
      `${path}.countedCash must be a non-negative integer or null.`,
    );
    errorIf(
      errors,
      item.expectedCash === null || isNonNegSafeInt(item.expectedCash),
      `${path}.expectedCash must be a non-negative integer or null.`,
    );
    errorIf(errors, isNonNegSafeInt(item.expenseTotal), `${path}.expenseTotal must be a non-negative integer.`);
    errorIf(errors, item.notes === undefined || typeof item.notes === "string", `${path}.notes must be a string when present.`);
    errorIf(errors, isCurrency(item.currency), `${path}.currency must be one of MYR, SGD, PHP, THB, IDR, VND.`);

    const totals = item.totals;
    if (!isRecord(totals)) {
      errors.push(`${path}.totals must be an object.`);
    } else {
      errorIf(errors, isNonNegSafeInt(totals.sales), `${path}.totals.sales must be a non-negative integer.`);
      errorIf(errors, isNonNegSafeInt(totals.transactions), `${path}.totals.transactions must be a non-negative integer.`);
      errorIf(errors, isNonNegSafeInt(totals.items), `${path}.totals.items must be a non-negative integer.`);
    }
    const payments = item.payments;
    if (!isRecord(payments)) {
      errors.push(`${path}.payments must be an object.`);
    } else {
      errorIf(errors, isNonNegSafeInt(payments.cash), `${path}.payments.cash must be a non-negative integer.`);
      errorIf(errors, isNonNegSafeInt(payments.qr), `${path}.payments.qr must be a non-negative integer.`);
      errorIf(errors, isNonNegSafeInt(payments.card), `${path}.payments.card must be a non-negative integer.`);
    }
  });
}

function checkRelationships(data: Obj, errors: string[]): void {
  const products = data.products;
  const sales = data.sales;
  const saleItems = data.saleItems;
  const movements = data.stockMovements;
  const sessions = data.sessions;
  if (
    !Array.isArray(products) ||
    !Array.isArray(sales) ||
    !Array.isArray(saleItems) ||
    !Array.isArray(movements)
  ) {
    return;
  }
  const productIds = new Set<string>();
  for (const p of products) if (isRecord(p) && nonEmptyString(p.id)) productIds.add(p.id);
  const saleIds = new Set<string>();
  for (const s of sales) if (isRecord(s) && nonEmptyString(s.id)) saleIds.add(s.id);
  const sessionIds = new Set<string>();
  if (Array.isArray(sessions)) {
    for (const s of sessions) if (isRecord(s) && nonEmptyString(s.id)) sessionIds.add(s.id);
  }

  sales.forEach((sale, i) => {
    if (!isRecord(sale)) return;
    if (
      typeof sale.sessionId === "string" &&
      !sessionIds.has(sale.sessionId)
    ) {
      errors.push(`sales[${i}].sessionId references a missing session.`);
    }
  });

  saleItems.forEach((item, i) => {
    if (!isRecord(item)) return;
    if (typeof item.saleId === "string" && !saleIds.has(item.saleId))
      errors.push(`saleItems[${i}].saleId references a missing sale.`);
    if (typeof item.productId === "string" && !productIds.has(item.productId))
      errors.push(`saleItems[${i}].productId references a missing product.`);
  });
  movements.forEach((item, i) => {
    if (!isRecord(item)) return;
    if (typeof item.productId === "string" && !productIds.has(item.productId))
      errors.push(`stockMovements[${i}].productId references a missing product.`);
    if (typeof item.saleId === "string" && !saleIds.has(item.saleId))
      errors.push(`stockMovements[${i}].saleId references a missing sale.`);
  });
}

export function validateBackup(json: unknown): ValidationResult {
  let data = json;
  if (typeof json === "string") {
    try {
      data = JSON.parse(json);
    } catch {
      return { ok: false, errors: ["Backup file is not valid JSON."] };
    }
  }
  if (!isRecord(data)) {
    return { ok: false, errors: ["Backup must be a JSON object."] };
  }

  const errors: string[] = [];
  errorIf(errors, data.app === BACKUP_APP, `app must be "${BACKUP_APP}".`);
  errorIf(errors, data.formatVersion === BACKUP_FORMAT_VERSION, `formatVersion must be "${BACKUP_FORMAT_VERSION}".`);
  errorIf(errors, isIso(data.exportedAt), "exportedAt must be a valid ISO date string.");

  checkStall(data.stall, errors);
  checkProducts(data.products, errors);
  checkSales(data.sales, errors);
  checkSaleItems(data.saleItems, errors);
  checkStockMovements(data.stockMovements, errors);
  checkExpenses(data.expenses, errors);
  // Optional — categories predates the categories store, so absent is valid.
  if (data.categories !== undefined) checkCategories(data.categories, errors);
  // Optional — sessions predates the sessions store, so absent is valid.
  if (data.sessions !== undefined) checkSessions(data.sessions, errors);
  checkRelationships(data, errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, backup: data as unknown as BackupFile };
}
