import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateImage,uploadImage} from './media.js';
test('reject non-image content, SVG, invalid headers and oversized data',()=>{for(const data of ['https://example.com/a.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,aGVsbG8=', 'data:image/jpeg;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64')])assert.throws(()=>validateImage(data));});
test('signed uploads send folder, timestamp and signature only to Cloudinary',async()=>{
 const originalFetch=global.fetch;const keys=['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];const before=keys.map(k=>process.env[k]);keys.forEach((k,i)=>process.env[k]=['test-cloud','test-key','test-secret'][i]);
 global.fetch=async(url,options)=>{assert.equal(url,'https://api.cloudinary.com/v1_1/test-cloud/image/upload');assert.equal(options.body.get('folder'),'vedant-enterprises/test-owner');assert.equal(options.body.get('api_key'),'test-key');assert.match(options.body.get('signature'),/^[a-f0-9]{64}$/);assert.equal(options.body.has('api_secret'),false);return {ok:true,json:async()=>({secure_url:'https://res.cloudinary.com/test-cloud/image/upload/test.png',public_id:'test'})};};
 try{const result=await uploadImage('data:image/png;base64,iVBORw0KGgo=','test-owner');assert.ok(result.url.startsWith('https://'));}finally{global.fetch=originalFetch;keys.forEach((k,i)=>before[i]===undefined?delete process.env[k]:process.env[k]=before[i]);}
});
