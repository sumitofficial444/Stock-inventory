import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../src/http.js';
import handler from '../api/index.js';
test('platform text errors produce a useful message instead of a JSON parser exception',async()=>{
 await assert.rejects(readApiResponse(new Response('A server error has occurred',{status:500})),/HTTP 500.*Vercel/);
 assert.deepEqual(await readApiResponse(new Response('{"error":"Missing config"}',{status:503})),{error:'Missing config'});
});
test('missing Vercel settings return JSON without trying to initialize MongoDB',async()=>{
 const names=['MONGO_URI','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];const before=names.map(key=>process.env[key]);names.forEach(key=>delete process.env[key]);
 let status,data;const res={setHeader(){},status(value){status=value;return this;},json(value){data=value;}};
 try{await handler({},res);assert.equal(status,503);assert.equal(data.code,'MISSING_SERVER_ENV');assert.deepEqual(data.missing,names);}finally{names.forEach((key,i)=>before[i]===undefined?delete process.env[key]:process.env[key]=before[i]);}
});
