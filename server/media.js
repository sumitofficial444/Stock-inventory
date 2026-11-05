import crypto from 'node:crypto';
export function validateImage(data) {
  if(typeof data!=='string')throw Error('Choose a PNG, JPEG or WebP image');
  const match=data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw Error('Choose a PNG, JPEG or WebP image');
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length||bytes.length>2*1024*1024)throw Error('Use an image smaller than 2 MB');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)throw Error('The file contents are not a valid image');
  return data;
}
export function cloudinaryConfigured(){return ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].every(k=>Boolean(process.env[k]?.trim()));}
export async function uploadImage(data,owner){
  validateImage(data);
  if(!cloudinaryConfigured()){const e=Error('Image uploads are not configured. Add the Cloudinary settings on the server.');e.status=503;throw e;}
  const timestamp=Math.floor(Date.now()/1000),folder=`vedant-enterprises/${owner}`;
  const signature=crypto.createHash('sha256').update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest('hex');
  const body=new FormData();for(const [key,value] of Object.entries({file:data,folder,timestamp,api_key:process.env.CLOUDINARY_API_KEY,signature}))body.set(key,String(value));
  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/upload`,{method:'POST',body,signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok||!result.secure_url){const e=Error('Cloudinary upload failed. Check the account settings and try again.');e.status=502;throw e;}
  return {url:result.secure_url,publicId:result.public_id};
}
