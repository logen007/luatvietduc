/** Offline-only initial account provisioning. JSON arrives on stdin, never argv/logs. */
import { getPayload } from 'payload'
import config from '../src/payload.config'
let input=''
for await (const chunk of process.stdin) { input+=chunk; if(input.length>8192) throw new Error('Input too large') }
const data=JSON.parse(input)
if(typeof data.email!=='string'||typeof data.password!=='string'||data.password.length<16||typeof data.name!=='string') throw new Error('Email, name and password (16+ characters) required')
const payload=await getPayload({config})
try {
 const existing=await payload.count({collection:'users',overrideAccess:true})
 if(existing.totalDocs!==0) throw new Error('Bootstrap requires an empty users collection')
 await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{email:data.email,password:data.password,name:data.name,role:'owner'}})
 console.log('Initial owner provisioned')
} finally {await payload.destroy()}
