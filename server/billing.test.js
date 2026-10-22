import {test} from 'node:test';import assert from 'node:assert/strict';import {calculate} from './billing.js';
test('fractional units, discount before GST and total',()=>{const b=calculate([{quantity:2.5,price:100,gst:18}],10);assert.equal(b.subtotal,250);assert.equal(b.tax,40.5);assert.equal(b.total,265.5);});
test('reject invalid discounts and quantities',()=>{assert.throws(()=>calculate([{quantity:-1,price:1,gst:0}]));assert.throws(()=>calculate([{quantity:1,price:1,gst:0}],101));});
