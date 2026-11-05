import bcrypt from 'bcryptjs';
export const adminEmail=()=>String(process.env.ADMIN_EMAIL||process.env.SETUP_ADMIN_EMAIL||'admin@vedant.local').trim().toLowerCase();
export async function syncAdmin(db){
 const user=await db.collection('users').findOne({email:adminEmail()});
 if(!user)throw Error('Shop admin not found. Run npm run setup:shop first.');
 const password=process.env.SETUP_ADMIN_PASSWORD;
 if(password){
  if(password.length<8||Buffer.byteLength(password)>72)throw Error('Admin password must be 8–72 bytes');
  if(!await bcrypt.compare(password,user.password)){
   await db.collection('users').updateOne({_id:user._id},{$set:{password:await bcrypt.hash(password,12)}});
   await db.collection('sessions').deleteMany({owner:user._id});
  }
 }
 return user._id;
}
