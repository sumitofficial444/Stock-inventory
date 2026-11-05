import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import path from 'node:path';
import {calculate} from './billing.js';
import {cloudinaryConfigured,uploadImage} from './media.js';
const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.MONGO_URI||!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||!cloudinaryConfigured()))throw Error('Production requires MONGO_URI, a JWT_SECRET of at least 32 characters, and all Cloudinary settings');
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'});if(production)res.set('Strict-Transport-Security','max-age=31536000');if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');next();});
app.use(express.json({limit:'4mb'}));
mongoose.set('bufferCommands',false);
await mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/vedant-enterprises',{serverSelectionTimeoutMS:10000,maxPoolSize:10}).catch(()=>{throw Error('Cannot connect to MongoDB. Check the server URI, database user and network access.');});
const secret=process.env.JWT_SECRET||crypto.randomBytes(48).toString('hex');
const User=mongoose.model('User',new mongoose.Schema({name:String,email:{type:String,unique:true},password:String,profile:{type:Object,default:{}}}));
const Product=mongoose.model('Product',new mongoose.Schema({owner:mongoose.Schema.Types.ObjectId,name:String,sku:String,category:String,unit:String,size:String,hsn:String,image:String,price:Number,cost:Number,stock:Number,lowStock:Number,gst:Number},{timestamps:true}));
const invoiceSchema=new mongoose.Schema({owner:mongoose.Schema.Types.ObjectId,requestKey:String,requestHash:String,number:String,customer:String,phone:String,payment:String,business:Object,items:Array,subtotal:Number,discount:Number,discountAmount:Number,tax:Number,total:Number},{timestamps:true});
invoiceSchema.index({owner:1,requestKey:1},{unique:true,partialFilterExpression:{requestKey:{$type:'string'}}});
const Invoice=mongoose.model('Invoice',invoiceSchema);
const Counter=mongoose.model('Counter',new mongoose.Schema({_id:String,value:Number}));
app.get('/api/health',(_,res)=>res.status(mongoose.connection.readyState===1?200:503).json({app:'vedant-enterprises',database:mongoose.connection.readyState===1?'connected':'disconnected'}));
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const attempts=new Map();const cleanup=setInterval(()=>{for(const [key,value] of attempts)if(value.until<Date.now())attempts.delete(key);},60000);cleanup.unref();
app.use('/api/auth',(req,res,next)=>{const key=req.ip;const now=Date.now();let entry=attempts.get(key);if(!entry||entry.until<now){entry={count:0,until:now+15*60000};attempts.set(key,entry);}if(++entry.count>40)return res.status(429).json({error:'Too many sign-in attempts. Try again later.'});next();});
app.post('/api/auth/:action',wrap(async(req,res)=>{
 const {name,email,password}=req.body;
 if(typeof email!=='string'||typeof password!=='string'||!/^\S+@\S+\.\S+$/.test(email)||password.length>72) throw Error('Enter a valid email and a password up to 72 characters');
 let user;
 if(req.params.action==='register'){
  if(process.env.ALLOW_REGISTRATION==='false')return res.status(403).json({error:'Registration is closed. Contact the business administrator.'});
  if(!name||password.length<8) throw Error('Enter your name and a password of at least 8 characters');
  user=await User.create({name,email:email.toLowerCase().trim(),password:await bcrypt.hash(password,12)});
 } else if(req.params.action==='login'){
  user=await User.findOne({email:email.toLowerCase().trim()});
  if(!user||!await bcrypt.compare(password,user.password)) return res.status(401).json({error:'Incorrect email or password'});
 } else return res.sendStatus(404);
 res.json({token:jwt.sign({id:user.id},secret,{expiresIn:'7d'}),user:{name:user.name,email:user.email,profile:user.profile}});
}));
app.use('/api',wrap(async(req,res,next)=>{try{req.owner=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),secret).id;}catch{return res.status(401).json({error:'Please sign in'});}next();}));
app.post('/api/media',wrap(async(req,res)=>res.json(await uploadImage(req.body.image,req.owner))));
app.get('/api/data',wrap(async(req,res)=>{const [user,products,invoices]=await Promise.all([User.findById(req.owner).select('-password'),Product.find({owner:req.owner}).sort({createdAt:-1}),Invoice.find({owner:req.owner}).sort({createdAt:-1})]);res.json({user,products,invoices});}));
app.put('/api/profile',wrap(async(req,res)=>{await User.updateOne({_id:req.owner},{$set:{profile:req.body}});res.json({ok:true});}));
function productData(b){const data={}; for(const key of ['name','sku','category','unit','size','hsn','image'])data[key]=String(b[key]||''); if(!data.name.trim())throw Error('Product name is required');for(const key of ['price','cost','stock','lowStock','gst']){data[key]=Number(b[key]||0);if(!Number.isFinite(data[key])||data[key]<0)throw Error('Values must be positive numbers');}if(data.gst>100)throw Error('Invalid GST');return data;}
app.post('/api/products',wrap(async(req,res)=>res.json(await Product.create({...productData(req.body),owner:req.owner}))));
app.put('/api/products/:id',wrap(async(req,res)=>{const data=productData(req.body);delete data.stock;const p=await Product.findOneAndUpdate({_id:req.params.id,owner:req.owner},{$set:data},{new:true});if(!p)return res.sendStatus(404);res.json(p);}));
app.post('/api/products/:id/stock',wrap(async(req,res)=>{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)throw Error('Restock amount must be greater than zero');const p=await Product.findOneAndUpdate({_id:req.params.id,owner:req.owner},{$inc:{stock:amount}},{new:true});if(!p)return res.sendStatus(404);res.json(p);}));
app.delete('/api/products/:id',wrap(async(req,res)=>{await Product.deleteOne({_id:req.params.id,owner:req.owner});res.json({ok:true});}));
app.post('/api/invoices',wrap(async(req,res)=>{
 const requestKey=req.get('Idempotency-Key');
 if(typeof requestKey!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(requestKey))throw Error('A valid invoice request key is required. Refresh the app and try again.');
 const requestHash=crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
 const existing=await Invoice.findOne({owner:req.owner,requestKey});
 if(existing){if(existing.requestHash!==requestHash)return res.status(409).json({error:'This invoice request has changed. Start a new bill.'});return res.json(existing);}
 const requested=req.body.items;if(!Array.isArray(requested)||!requested.length)throw Error('Select products');
 if(requested.length>200)throw Error('A bill can contain up to 200 products');
 if(new Set(requested.map(i=>i.id)).size!==requested.length)throw Error('Duplicate products');
 const products=await Product.find({owner:req.owner,_id:{$in:requested.map(i=>i.id)}});
 const items=requested.map(i=>{const p=products.find(p=>p.id===i.id);const quantity=Number(i.quantity);if(!p||!Number.isFinite(quantity)||quantity<=0||quantity>p.stock)throw Error('Invalid quantity or insufficient stock');return {productId:p.id,name:p.name,hsn:p.hsn,unit:p.unit,size:p.size,price:p.price,gst:p.gst,quantity};});
 const totals=calculate(items,Number(req.body.discount||0));const user=await User.findById(req.owner);if(!user)return res.status(401).json({error:'Please sign in again'});
 const topology=mongoose.connection.getClient().topology.description.type;
 const transactional=topology==='ReplicaSetWithPrimary'||topology==='Sharded';
 if(!transactional&&(production||process.env.REQUIRE_TRANSACTIONS==='true'))return res.status(503).json({error:'Billing requires a MongoDB replica set or Atlas for reliable stock transactions.'});
 const reserved=[];let invoice;
 const perform=async session=>{
  for(const i of items){const p=await Product.findOneAndUpdate({_id:i.productId,owner:req.owner,stock:{$gte:i.quantity}},{$inc:{stock:-i.quantity}},{session});if(!p)throw Error('Stock changed. Please refresh and try again');if(!session)reserved.push(i);}
  const now=new Date();const year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',year:'numeric'}).format(now));const month=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',month:'numeric'}).format(now));const fy=month>=4?year:year-1;
  const counter=await Counter.findOneAndUpdate({_id:`${req.owner}:${fy}`},{$inc:{value:1}},{upsert:true,new:true,session});
  if(counter.value>999999)throw Error('Annual invoice sequence limit reached');
  const number=`${fy.toString().slice(-2)}${(fy+1).toString().slice(-2)}/${String(counter.value).padStart(6,'0')}`;
  [invoice]=await Invoice.create([{...totals,owner:req.owner,requestKey,requestHash,number,business:user.profile,customer:String(req.body.customer||'Walk-in customer'),phone:String(req.body.phone||''),payment:['Cash','UPI','Card','Credit'].includes(req.body.payment)?req.body.payment:'Cash'}],{session});
 };
 try{
  if(transactional){const session=await mongoose.startSession();try{await session.withTransaction(()=>perform(session));}finally{await session.endSession();}}else await perform(null);
  res.json(invoice);
 }catch(error){
  for(const i of reserved)await Product.updateOne({_id:i.productId},{$inc:{stock:i.quantity}});
  if(error.code===11000){const saved=await Invoice.findOne({owner:req.owner,requestKey});if(saved&&saved.requestHash===requestHash)return res.json(saved);}
  throw error;
 }
}));
app.use('/api',(_,res)=>res.status(404).json({error:'API endpoint not found'}));
app.use(express.static(path.resolve('dist')));app.get('*',(_,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((err,req,res,next)=>{console.error(err.name||'Request error');res.status(err.status||400).json({error:err.code===11000?'This record already exists':err.type==='entity.too.large'?'Upload is too large':production&&/Mongo|Cast|Validation/.test(err.name)?'Invalid data or database temporarily unavailable':err.message});});
await Promise.all([User.init(),Product.init(),Invoice.init(),Counter.init()]);
const port=process.env.PORT||5051;
if(!process.env.VERCEL){
 const server=app.listen(port,'0.0.0.0',()=>console.log(`Vedant Enterprises: http://localhost:${port}`));
 process.on('SIGTERM',()=>server.close(()=>mongoose.disconnect().then(()=>process.exit(0))));
}
export default app;
