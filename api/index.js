// Catch startup failures too: a static re-export bypasses Express's error handler.
let application;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const required=['MONGO_URI','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];
 const missing=required.filter(key=>!process.env[key]?.trim());
 if(missing.length)return res.status(503).json({error:'Vercel server settings are missing. Add these Environment Variables for Production and redeploy: '+missing.join(', '),code:'MISSING_SERVER_ENV',missing});
 try{
  application||=import('../server/index.js').then(module=>module.default);
  const app=await application;
  return app(req,res);
 }catch(error){
  application=undefined;
  const message=String(error?.message||'');
  const publicMessage=message.startsWith('Cannot connect to MongoDB')?'Cannot connect to Atlas. Check MONGO_URI, database credentials and Atlas network access for Vercel.':message.startsWith('Shop admin not found')?'Shop admin was not found in the configured database. Check the database name in MONGO_URI and ADMIN_EMAIL.':message.startsWith('Admin password must')?message:'The API could not start. Check Vercel Runtime Logs and server Environment Variables, then redeploy.';
  console.error('API startup failed:',error?.name||'Error');
  if(!res.headersSent)return res.status(503).json({error:publicMessage,code:'API_STARTUP_FAILED'});
 }
}
