// Exercise the actual Vercel function entry point with production configuration.
import 'dotenv/config';
import http from 'node:http';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';
import handler from '../api/index.js';
process.env.VERCEL='1';
process.env.NODE_ENV='production';
const server=http.createServer(handler);
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 process.env.API_BASE_URL=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(process.env.API_BASE_URL+'/api/health');
 const data=await response.json();
 assert.equal(response.status,200,JSON.stringify(data));
 assert.equal(data.database,'connected');
 await import('./access-smoke.js');
 console.log('PASS: Vercel entry point, production startup, Atlas connection and private admin session checks.');
}finally{
 await new Promise(resolve=>server.close(resolve));
 await mongoose.disconnect();
}
