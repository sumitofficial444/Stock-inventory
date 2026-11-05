export function calculate(items, discount=0) {
  if (!Array.isArray(items)||!items.length) throw Error('Select at least one product');
  if (!Number.isFinite(discount)||discount<0||discount>100) throw Error('Discount must be 0–100%');
  const lines=items.map(i=>{
    if (![i.quantity,i.price,i.gst].every(Number.isFinite)||i.quantity<=0||i.price<0||i.gst<0||i.gst>100) throw Error('Invalid invoice values');
    const base=Math.round((i.quantity*i.price+Number.EPSILON)*100);
    const taxable=Math.round(base*(1-discount/100));
    if(!Number.isSafeInteger(base)||!Number.isSafeInteger(taxable))throw Error('Invoice value is too large');
    return {...i,base:base/100,taxable:taxable/100,tax:Math.round(taxable*i.gst/100)/100};
  });
  const subtotalCents=lines.reduce((s,i)=>s+Math.round(i.base*100),0),taxCents=lines.reduce((s,i)=>s+Math.round(i.tax*100),0),taxableCents=lines.reduce((s,i)=>s+Math.round(i.taxable*100),0);
  if(!Number.isSafeInteger(subtotalCents+taxCents))throw Error('Invoice value is too large');
  return {items:lines,subtotal:subtotalCents/100,discount,discountAmount:(subtotalCents-taxableCents)/100,tax:taxCents/100,total:(taxableCents+taxCents)/100};
}
