/**
 * Normalizes phone numbers into clean international format without leading '+' or '00'.
 * Specifically handles local Pakistani formats:
 * - '03058008888' (11 digits starting with 03) -> '923058008888'
 * - '3058008888' (10 digits starting with 3)   -> '923058008888'
 * - '+92 305 8008888'                         -> '923058008888'
 * - '00923058008888'                          -> '923058008888'
 */
const standardizePhone = (phone) => {
  if (!phone) return '';
  let clean = phone.toString().replace(/\D/g, '');
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.substring(1);
  } else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  }
  return clean;
};

/**
 * Formats a phone number for privacy display with masking:
 * e.g., '923058008888' -> '92305••••888'
 */
const maskPhone = (phone) => {
  if (!phone) return '';
  const std = standardizePhone(phone);
  if (std.length <= 6) return std;
  return std.slice(0, 5) + '••••' + std.slice(-3);
};

module.exports = {
  standardizePhone,
  maskPhone,
};
