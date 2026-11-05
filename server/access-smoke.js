import 'dotenv/config';
import assert from 'node:assert/strict';
const base=process.env.API_BASE_URL||'http://127.0.0.1:5051';
async function request(path,method='GET',body,cookie){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
for(const [path,method,body] of [['/data','GET'],['/products','POST',{}],['/profile','PUT',{}],['/invoices','POST',{}],['/media','POST',{}]])assert.equal((await request(path,method,body)).status,401,path+' must require login');
assert.equal((await request('/auth/register','POST',{email:'not-admin@test.invalid',password:'NotAnAdmin123'})).status,403);
assert.equal((await request('/auth/login','POST',{email:'not-admin@test.invalid',password:'NotAnAdmin123'})).status,401);
const login=await request('/auth/login','POST',{email:process.env.ADMIN_EMAIL||process.env.SETUP_ADMIN_EMAIL||'admin@vedant.local',password:process.env.SETUP_ADMIN_PASSWORD});assert.equal(login.status,200,JSON.stringify(login.data));assert.equal('token' in login.data,false);assert.match(login.cookie,/HttpOnly/i);assert.match(login.cookie,/SameSite=Strict/i);const cookie=login.cookie.split(';')[0];
const data=await request('/data','GET',undefined,cookie);assert.equal(data.status,200);assert.equal(data.data.user.profile.name,'Vedant Enterprises');
assert.equal((await request('/auth/logout','POST',{},cookie)).status,200);
assert.equal((await request('/data','GET',undefined,cookie)).status,401,'Logged-out cookie cannot be reused');
console.log('PASS: private APIs require login; registration disabled; non-admin login denied; current .env admin password works; HttpOnly session; inventory access; logout revokes session. No stock or invoices changed.');
