// The invoice itself is created and kept in sync entirely by the backend
// now (see manualOrder.service.js -> generateInvoiceForOrder /
// resyncInvoiceForOrder), and every order carries the real invoice's id
// directly on order.invoiceId. This file used to ALSO build and create an
// invoice from the frontend, tagging its id into the order's notes — that
// meant every order silently ended up with two separate Invoice documents,
// and whichever one got shown depended on which screen you were looking
// at. That whole path has been removed; only the credit-tracking helpers
// below (an unrelated, still-needed mechanism) remain.

// "This order used ₹X credit sourced from order Y" — so a NEW order's own
// detail page can show where its discount actually came from, not just a
// bare number in the discount field. Multiple tags possible if credit was
// drawn from more than one source order.
const CREDIT_TAG_REGEX = /\[Credit:([^:\]]+):([0-9.]+)\]/g;

export const extractAppliedCredits = (notes) => {
  const text = notes || "";
  const matches = [];
  let m;
  CREDIT_TAG_REGEX.lastIndex = 0;
  while ((m = CREDIT_TAG_REGEX.exec(text)) !== null) {
    matches.push({ sourceOrderId: m[1], amount: Number(m[2]) });
  }
  return matches;
};

export const tagNotesWithAppliedCredit = (notes, sourceOrderId, amount) => {
  const base = notes || "";
  const tag = `[Credit:${sourceOrderId}:${amount}]`;
  return base ? `${base}\n${tag}` : tag;
};
