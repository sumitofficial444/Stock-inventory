// Idempotent setup: never resets existing passwords or overwrites existing stock.
import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {uploadImage,cloudinaryConfigured} from './media.js';
import {sampleProducts} from '../src/sample-products.js';

function sampleImage(hex){
 const w=160,h=160,raw=Buffer.alloc((w*4+1)*h);
 const rgb=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let color=[245,247,242];if(x>35&&x<125&&y>45&&y<130)color=rgb;if(x>31&&x<129&&y>40&&y<51)color=[72,95,79];if(x>49&&x<111&&y>70&&y<105)color=[255,255,255];if(y>18&&y<42&&x>51&&x<109&&((y<23)||(x<57)||(x>103)))color=[103,113,104];const i=y*(w*4+1)+1+x*4;raw.set([...color,255],i);}
 function chunk(type,data){const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const b of body){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,body,sum]);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}

try{
 if(!process.env.MONGO_URI||!cloudinaryConfigured())throw Error('Set Atlas and Cloudinary variables in .env first');
 await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:10000});
 const db=mongoose.connection;
 const email=(process.env.SETUP_ADMIN_EMAIL||'admin@vedant.local').trim().toLowerCase();
 let user=await db.collection('users').findOne({email});
 if(!user){
  const password=process.env.SETUP_ADMIN_PASSWORD||crypto.randomBytes(18).toString('base64url');
  let env=fs.readFileSync('.env','utf8');for(const [k,v] of Object.entries({SETUP_ADMIN_EMAIL:email,SETUP_ADMIN_PASSWORD:password})){const re=new RegExp('^'+k+'=.*$','m');env=re.test(env)?env.replace(re,k+'='+v):env+'\n'+k+'='+v;}fs.writeFileSync('.env',env.trim()+'\n');
  const result=await db.collection('users').insertOne({name:'Vedant Admin',email,password:await bcrypt.hash(password,12),profile:{name:'Vedant Enterprises',address:'',phone:'',email:'',gstin:'',footer:'Thank you for shopping with Vedant Enterprises!'}});
  user=await db.collection('users').findOne({_id:result.insertedId});console.log('Shop admin created. Login details are in ignored .env: SETUP_ADMIN_EMAIL and SETUP_ADMIN_PASSWORD.');
 }else console.log('Existing shop admin reused; password and profile unchanged.');
 let added=0;
 for(const p of sampleProducts){
  if(await db.collection('products').findOne({owner:user._id,sku:p.sku}))continue;
  const media=await uploadImage(sampleImage(p.color),user._id.toString());
  await db.collection('products').updateOne({owner:user._id,sku:p.sku},{$setOnInsert:{...p,owner:user._id,hsn:'',image:media.url,createdAt:new Date(),updatedAt:new Date()}},{upsert:true});added++;
 }
 console.log(`Atlas connected. Cloudinary verified. ${added} sample products added; ${await db.collection('products').countDocuments({owner:user._id})} products available for the shop admin.`);
 console.log('Sample names, prices, tax rates and bucket illustrations are for demonstration. Fill actual business details before real billing.');
}catch(error){console.error('Shop setup failed: '+(/Mongo|ServerSelection/.test(error.name)?'Atlas connection or database access failed.':error.message));process.exitCode=1;}finally{await mongoose.disconnect();}
