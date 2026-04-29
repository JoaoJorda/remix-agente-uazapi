/**
 * Normalizes Brazilian phone numbers to E.164 format without the '+' sign,
 * as expected by Evolution API (e.g. "5511999998888").
 *
 * Handles all common Brazilian formats:
 *   "+55 (11) 9 9999-8888"  → "5511999998888"
 *   "5511999998888"          → "5511999998888"
 *   "11 999998888"           → "5511999998888"
 *   "1199998888"             → "5511999998888"  (adds missing 9th digit)
 *   "551199998888"           → "5511999998888"  (adds missing 9th digit)
 *   "11 3333-4444"           → "551133334444"   (landline, no 9 added)
 */
export function normalizeBrazilianPhone(raw: string): string | null {
  // Strip all non-digit characters
  let digits = raw.replace(/\D/g, '');

  // Remove leading country code 55 if the result would still leave a local number
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  // Expect 10 or 11 local digits (DDD + 8 or 9 digit number)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  // 10 digits → DDD (2) + 8-digit number — check if mobile (missing 9th digit)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    const firstDigit = parseInt(number[0], 10);
    // Mobile ranges: first digit 6–9. Landlines (2–5) stay as 10 digits.
    if (firstDigit >= 6) {
      digits = ddd + '9' + number; // → 11 digits
    }
  }

  return '55' + digits;
}

/**
 * Returns true if the string looks like a valid Brazilian phone (raw input accepted).
 */
export function isValidBrazilianPhone(raw: string): boolean {
  return normalizeBrazilianPhone(raw) !== null;
}
