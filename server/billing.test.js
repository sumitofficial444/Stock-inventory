import {test} from 'node:test';import assert from 'node:assert/strict';import {calculate} from './billing.js';
test('fractional units, discount before GST and total',()=>{const b=calculate([{quantity:2.5,price:100,gst:18}],10);assert.equal(b.subtotal,250);assert.equal(b.tax,40.5);assert.equal(b.total,265.5);});
test('reject invalid discounts and quantities',()=>{assert.throws(()=>calculate([{quantity:-1,price:1,gst:0}]));assert.throws(()=>calculate([{quantity:1,price:1,gst:0}],101));});
test('line rounding matches the sum displayed on the invoice',()=>{const b=calculate([{quantity:1,price:0.03,gst:18},{quantity:1,price:0.03,gst:18}]);assert.equal(b.total,0.08);assert.equal(b.total,b.items.reduce((s,i)=>s+i.taxable+i.tax,0));});
test('discount amount reconciles to rounded taxable lines',()=>{const b=calculate([{quantity:3,price:19.99,gst:18},{quantity:0.125,price:50,gst:5}],7.5);assert.equal(Math.round((b.subtotal-b.discountAmount+b.tax)*100),Math.round(b.total*100));});
