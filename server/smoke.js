// Run against the local API: node server/smoke.js. Removes only its own test records.
import 'dotenv/config';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';
let token,owner;
async function request(url,method='GET',body){const r=await fetch('http://localhost:5000/api'+url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});const d=await r.json();return {status:r.status,data:d};}
try{
 const auth=await request('/auth/register','POST',{name:'Smoke Test',email:`smoke-${Date.now()}@test.invalid`,password:'TestOnly-12345678'});assert.equal(auth.status,200);token=auth.data.token;
 const initial=await request('/data');owner=initial.data.user._id;
 const product=await request('/products','POST',{name:'Test Rice',unit:'kg',price:100,stock:10,gst:18});assert.equal(product.status,200);
 const invoice=await request('/invoices','POST',{items:[{id:product.data._id,quantity:2.5}],discount:10});assert.equal(invoice.status,200);assert.equal(invoice.data.total,265.5);
 const data=await request('/data');assert.equal(data.data.products[0].stock,7.5);assert.equal(data.data.invoices.length,1);
 const oversell=await request('/invoices','POST',{items:[{id:product.data._id,quantity:100}]});assert.equal(oversell.status,400);
 const unauth=await fetch('http://localhost:5000/api/data');assert.equal(unauth.status,401);
 console.log('PASS: registration, authenticated inventory, fractional sale, discount/GST, persisted invoice, stock deduction, oversell rejection, access protection');
}finally{
 if(owner){await mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/vyapventory');const id=new mongoose.Types.ObjectId(owner);await mongoose.connection.collection('products').deleteMany({owner:id});await mongoose.connection.collection('invoices').deleteMany({owner:id});await mongoose.connection.collection('users').deleteOne({_id:id});await mongoose.disconnect();console.log('Test account and test records removed.');}
}
