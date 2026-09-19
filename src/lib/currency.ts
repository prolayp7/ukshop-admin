// Set NEXT_PUBLIC_PAYMENT_CURRENCY to match the API's PAYMENT_CURRENCY (INR sandbox, EUR production).
export const CURRENCY = (process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || "GBP").toUpperCase();
export const CURRENCY_SYMBOL =
  new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? CURRENCY;
