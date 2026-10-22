import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import path from 'node:path';
import {calculate} from './billing.js';
const app=express(); app.use(express.json({limit:'8mb'}));
mongoose.set('bufferCommands',false);
const secret=process.env.JWT_SECRET||crypto.randomBytes(48).toString('hex');
const User=mongoose.model('User',new mongoose.Schema({name:String,email:{type:String,unique:true},password:String,profile:{type:Object,default:{}}}));
const Product=mongoose.model('Product',new mongoose.Schema({owner:mongoose.Schema.Types.ObjectId,name:String,sku:String,category:String,unit:String,size:String,hsn:String,image:String,price:Number,cost:Number,stock:Number,lowStock:Number,gst:Number},{timestamps:true}));
const Invoice=mongoose.model('Invoice',new mongoose.Schema({owner:mongoose.Schema.Types.ObjectId,number:String,customer:String,phone:String,payment:String,business:Object,items:Array,subtotal:Number,discount:Number,discountAmount:Number,tax:Number,total:Number},{timestamps:true}));
app.get('/api/health',(_,res)=>res.json({database:mongoose.connection.readyState===1?'connected':'disconnected'}));
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
app.post('/api/auth/:action',wrap(async(req,res)=>{
 const {name,email,password}=req.body;
 if(!email||!password) throw Error('Email and password are required');
 let user;
 if(req.params.action==='register'){
  if(!name||password.length<8) throw Error('Enter your name and a password of at least 8 characters');
  user=await User.create({name,email:email.toLowerCase().trim(),password:await bcrypt.hash(password,12)});
 } else if(req.params.action==='login'){
  user=await User.findOne({email:email.toLowerCase().trim()});
  if(!user||!await bcrypt.compare(password,user.password)) return res.status(401).json({error:'Incorrect email or password'});
 } else return res.sendStatus(404);
 res.json({token:jwt.sign({id:user.id},secret,{expiresIn:'7d'}),user:{name:user.name,email:user.email,profile:user.profile}});
}));
app.use('/api',wrap(async(req,res,next)=>{try{req.owner=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),secret).id;}catch{return res.status(401).json({error:'Please sign in'});}next();}));
app.get('/api/data',wrap(async(req,res)=>{const [user,products,invoices]=await Promise.all([User.findById(req.owner).select('-password'),Product.find({owner:req.owner}).sort({createdAt:-1}),Invoice.find({owner:req.owner}).sort({createdAt:-1})]);res.json({user,products,invoices});}));
app.put('/api/profile',wrap(async(req,res)=>{await User.updateOne({_id:req.owner},{$set:{profile:req.body}});res.json({ok:true});}));
function productData(b){const data={}; for(const key of ['name','sku','category','unit','size','hsn','image'])data[key]=String(b[key]||''); if(!data.name.trim())throw Error('Product name is required');for(const key of ['price','cost','stock','lowStock','gst']){data[key]=Number(b[key]||0);if(!Number.isFinite(data[key])||data[key]<0)throw Error('Values must be positive numbers');}if(data.gst>100)throw Error('Invalid GST');return data;}
app.post('/api/products',wrap(async(req,res)=>res.json(await Product.create({...productData(req.body),owner:req.owner}))));
app.put('/api/products/:id',wrap(async(req,res)=>{const data=productData(req.body);delete data.stock;const p=await Product.findOneAndUpdate({_id:req.params.id,owner:req.owner},{$set:data},{new:true});if(!p)return res.sendStatus(404);res.json(p);}));
app.post('/api/products/:id/stock',wrap(async(req,res)=>{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)throw Error('Restock amount must be greater than zero');const p=await Product.findOneAndUpdate({_id:req.params.id,owner:req.owner},{$inc:{stock:amount}},{new:true});if(!p)return res.sendStatus(404);res.json(p);}));
app.delete('/api/products/:id',wrap(async(req,res)=>{await Product.deleteOne({_id:req.params.id,owner:req.owner});res.json({ok:true});}));
app.post('/api/invoices',wrap(async(req,res)=>{
 const requested=req.body.items;if(!Array.isArray(requested)||!requested.length)throw Error('Select products');
 if(new Set(requested.map(i=>i.id)).size!==requested.length)throw Error('Duplicate products');
 const products=await Product.find({owner:req.owner,_id:{$in:requested.map(i=>i.id)}});
 const items=requested.map(i=>{const p=products.find(p=>p.id===i.id);const quantity=Number(i.quantity);if(!p||!Number.isFinite(quantity)||quantity<=0||quantity>p.stock)throw Error('Invalid quantity or insufficient stock');return {productId:p.id,name:p.name,hsn:p.hsn,unit:p.unit,size:p.size,price:p.price,gst:p.gst,quantity};});
 const totals=calculate(items,Number(req.body.discount||0));const reserved=[];
 try{
  for(const i of items){const p=await Product.findOneAndUpdate({_id:i.productId,owner:req.owner,stock:{$gte:i.quantity}},{$inc:{stock:-i.quantity}});if(!p)throw Error('Stock changed. Please refresh and try again');reserved.push(i);}
  const user=await User.findById(req.owner);const invoice=await Invoice.create({...totals,owner:req.owner,number:`INV-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,business:user.profile,customer:String(req.body.customer||'Walk-in customer'),phone:String(req.body.phone||''),payment:['Cash','UPI','Card','Credit'].includes(req.body.payment)?req.body.payment:'Cash'});res.json(invoice);
 }catch(error){for(const i of reserved)await Product.updateOne({_id:i.productId},{$inc:{stock:i.quantity}});throw error;}
}));
app.use(express.static(path.resolve('dist')));app.get('*',(_,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((err,req,res,next)=>{console.error(err.message);res.status(400).json({error:err.code===11000?'This email is already registered':err.message});});
await mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/vyapventory',{serverSelectionTimeoutMS:5000}).catch(e=>console.error('MongoDB unavailable. Start MongoDB locally:',e.message));
app.listen(process.env.PORT||5000,()=>console.log('Vyapventory API: http://localhost:5000'));
