export async function readApiResponse(response){
 const body=await response.text();
 let data;
 try{data=JSON.parse(body);}catch{
  throw Error(`The server returned an invalid API response (HTTP ${response.status}). Check Vercel Runtime Logs and Environment Variables, then redeploy.`);
 }
 if(!data||typeof data!=='object')throw Error('The API returned an invalid response. Check the deployment configuration.');
 return data;
}
