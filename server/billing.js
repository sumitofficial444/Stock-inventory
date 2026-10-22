export function calculate(items, discount=0) {
  if (!Array.isArray(items)||!items.length) throw Error('Select at least one product');
  if (!Number.isFinite(discount)||discount<0||discount>100) throw Error('Discount must be 0–100%');
  const lines=items.map(i=>{
    if (![i.quantity,i.price,i.gst].every(Number.isFinite)||i.quantity<=0||i.price<0||i.gst<0||i.gst>100) throw Error('Invalid invoice values');
    const taxable=i.quantity*i.price*(1-discount/100);
    return {...i,taxable:Math.round(taxable*100)/100,tax:Math.round(taxable*i.gst)/100};
  });
  const subtotal=items.reduce((s,i)=>s+i.quantity*i.price,0),tax=lines.reduce((s,i)=>s+i.tax,0);
  return {items:lines,subtotal,discount,discountAmount:subtotal*discount/100,tax,total:Math.round((lines.reduce((s,i)=>s+i.taxable,0)+tax)*100)/100};
}
