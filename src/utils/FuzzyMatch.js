/**
 * Typo-tolerant search: every word typed must match the invoice text exactly or with a small
 * spelling mistake.
 *
 * Forgiving search: every word the user types must match somewhere in the
 * invoice, either as a substring or as a close-enough word (small typos OK).
 *
 * Used by: pages/InvoiceListPage.jsx
 */

const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const digitsOnly = (text) => String(text ?? "").replace(/\D/g, "");

// Levenshtein distance with an early exit once it passes `max`.
const editDistance = (source, target, max) => {
  if (Math.abs(source.length - target.length) > max) return max + 1;
  let prev = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let i = 1; i <= source.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= target.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (source[i - 1] === target[j - 1] ? 0 : 1)
      );
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[target.length];
};

const allowedTypos = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

const tokenMatches = (token, haystack, words) => {
  if (haystack.includes(token)) return true;
  const max = allowedTypos(token.length);
  if (max === 0) return false;
  return words.some((word) => {
    // Compare against the word, and against its prefix (user still typing).
    if (editDistance(token, word, max) <= max) return true;
    if (word.length > token.length) {
      return editDistance(token, word.slice(0, token.length), max) <= max;
    }
    return false;
  });
};

/**
 * Joins the given fields into one normalised, searchable string.
 *
 * @param {Array<string|undefined>} fields
 * @returns {string}
 */
export const buildSearchText = (fields) => normalize(fields.filter(Boolean).join(" "));

/**
 * True when every word of the query appears in the text, exactly or with a small typo. Digit-only
 * queries also match phone / invoice numbers.
 *
 * @param {string} query What the user typed.
 * @param {string} haystackText Text from buildSearchText().
 * @param {string} [rawDigits=""] Digits of phone and invoice numbers.
 * @returns {boolean}
 */
export const fuzzyMatch = (query, haystackText, rawDigits = "") => {
  const searchText = normalize(query);
  if (!searchText) return true;

  // Phone / invoice number searches: match on digits, ignoring spaces & dashes.
  const qDigits = digitsOnly(query);
  if (qDigits.length >= 4 && qDigits.length === query.replace(/[\s\-+#()]/g, "").length) {
    return rawDigits.includes(qDigits);
  }

  const words = haystackText.split(" ");
  return searchText.split(" ").every((token) => tokenMatches(token, haystackText, words));
};

/**
 * Builds the searchable text and digits for one invoice (customer, contact, GSTIN, number ...).
 *
 * @param {object} invoice
 * @returns {{ text: string, digits: string }}
 */
export const invoiceSearchIndex = (invoice) => {
  const text = buildSearchText([
    invoice.billTo?.companyName,
    invoice.billTo?.contactPerson,
    invoice.billTo?.contactNumber,
    invoice.billTo?.gstin,
    invoice.billTo?.address,
    invoice.invoiceNumber,
    invoice.orderNumber,
    invoice.customerNo,
    invoice.clientId,
    invoice.customerServiceRep,
    invoice.agentName,
  ]);
  const digits = [
    invoice.billTo?.contactNumber,
    invoice.invoiceNumber,
    invoice.orderNumber,
    invoice.customerNo,
    invoice.clientId,
  ]
    .map(digitsOnly)
    .join(" ");
  return { text, digits };
};
