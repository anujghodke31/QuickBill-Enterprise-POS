/** Store identity printed on receipts, and the timezone used for daily reporting. */
export const STORE = {
  name: process.env.STORE_NAME ?? 'QuickBill Mart',
  addressLines: (process.env.STORE_ADDRESS ?? 'Shop 4, Baner Road|Pune, Maharashtra 411045').split(
    '|',
  ),
  phone: process.env.STORE_PHONE ?? '+91 20 4000 1234',
  gstin: process.env.STORE_GSTIN ?? '27AABCQ1234F1Z5',
  timezone: process.env.STORE_TIMEZONE ?? 'Asia/Kolkata',
} as const;
