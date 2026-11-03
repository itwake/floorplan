/* Monetary calculations use integer cents. Shared by the page and regression checks. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PurchaseBudget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  function money(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return { cents: null, invalid: false };
    if (!/^\d+(?:\.\d{0,2})?$/.test(raw)) return { cents: null, invalid: true };
    const [whole, fraction = ''] = raw.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return { cents: cents <= 1000000000 ? cents : null, invalid: cents > 1000000000 };
  }
  function line(row, products) {
    const product = products.get(row.productId);
    const explicit = String(row.unitPrice ?? '').trim() !== '';
    const unit = money(explicit ? row.unitPrice : product?.price);
    const fee = money(row.fee);
    const qty = /^[1-9]\d{0,2}$/.test(String(row.quantity)) ? Number(row.quantity) : null;
    const goods = unit.cents !== null && qty !== null ? unit.cents * qty : null;
    const invalid = unit.invalid || fee.invalid || qty === null;
    const known = (goods ?? 0) + (fee.cents ?? 0);
    return {
      product, unit: unit.cents, fee: fee.cents, quantity: qty, goods, known, invalid,
      missingPrice: unit.cents === null, missingFee: fee.cents === null,
      basis: explicit ? '自填单价' : product?.price !== null && product?.price !== undefined ? '历史/公开参考价' : '待询价',
      total: !invalid && goods !== null && fee.cents !== null ? known : null,
    };
  }
  function summary(plan, products) {
    const rows = plan.rows.filter(r => r.included).map(row => ({ row, ...line(row, products) }));
    const invalid = rows.filter(r => r.invalid).length;
    const goods = rows.reduce((sum, r) => sum + (r.goods ?? 0), 0);
    const fees = rows.reduce((sum, r) => sum + (r.fee ?? 0), 0);
    const missingPrices = rows.filter(r => r.missingPrice).length;
    const missingFees = rows.filter(r => r.missingFee).length;
    const referenceRows = rows.filter(r => r.basis === '历史/公开参考价').length;
    const limit = money(plan.limit);
    const known = goods + fees;
    return { rows, goods, fees, known, invalid, missingPrices, missingFees, referenceRows,
      pieces: rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0),
      complete: rows.length > 0 && !invalid && !missingPrices && !missingFees,
      limit: limit.cents, invalidLimit: limit.invalid,
      remaining: limit.cents !== null ? limit.cents - known : null };
  }
  return { money, line, summary };
});
