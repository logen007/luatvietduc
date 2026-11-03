import { buildConfig, type Access, type CollectionConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import {articleWorkflow, createArticle, readArticles, scopedStaff} from './access/articles'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dirname = path.dirname(fileURLToPath(import.meta.url))
const owner: Access = ({ req }) => req.user?.role === 'owner'
const Users: CollectionConfig = {
 slug: 'users', auth: {maxLoginAttempts:5,lockTime:600000,cookies:{sameSite:'Lax',secure:process.env.NODE_ENV==='production'}},
 hooks:{beforeChange:[({req,operation,data})=>{if(operation==='create' && req.user?.role!=='owner' && req.context.bootstrapOwner!==true) throw new Error('Offline owner provisioning required');return data}]},
 access: { create: owner, read: ({req}) => req.user?.role === 'owner' ? true : req.user ? {id:{equals:req.user.id}} : false, update: owner, delete: owner, admin: ({req}) => Boolean(req.user && req.user.role !== 'member') },
 fields: [{name:'name',type:'text',required:true},{name:'role',type:'select',required:true,defaultValue:'member',options:['owner','operations','editor','reviewer','publisher','knowledge','support','member'],access:{create:({req})=>req.user?.role==='owner',update:({req})=>req.user?.role==='owner'}},{name:'jurisdictions',type:'select',hasMany:true,options:['VN','DE']}],
}
const Articles: CollectionConfig = {
 slug:'articles', versions:{drafts:true},
 access:{create:createArticle,read:readArticles,update:scopedStaff,delete:owner,readVersions:scopedStaff},
 hooks:{beforeChange:[articleWorkflow]},
 fields:[{name:'title',type:'text',required:true},{name:'slug',type:'text',required:true,unique:true},{name:'body',type:'textarea',required:true},{name:'jurisdiction',type:'select',required:true,options:['VN','DE']},{name:'language',type:'select',required:true,options:['vi','de']},{name:'sourceUrl',type:'text'},{name:'reviewState',type:'select',defaultValue:'draft',options:['draft','pending','approved','withdrawn'],access:{create:({req})=>['owner','editor'].includes(req.user?.role || ''),update:({req})=>['owner','editor','reviewer'].includes(req.user?.role || '')}},{name:'aiAllowed',type:'checkbox',defaultValue:false,access:{create:({req})=>req.user?.role==='owner',update:({req})=>req.user?.role==='owner'}}],
}
export default buildConfig({
 secret: process.env.PAYLOAD_SECRET || '',
 admin:{user:'users',importMap:{baseDir:path.resolve(dirname)}},
 db:postgresAdapter({pool:{connectionString:process.env.DATABASE_URL || ''},push:false}),
 collections:[Users,Articles],
 globals:[{slug:'site-settings',access:{read:owner,update:owner},fields:[{name:'siteName',type:'text',defaultValue:'Luật Việt Đức'},{name:'socialLinks',type:'array',fields:[{name:'label',type:'text',required:true},{name:'url',type:'text',required:true,validate:(v:unknown)=>{try {return new URL(String(v)).protocol==='https:' || 'HTTPS required'}catch{return 'Valid HTTPS URL required'}}}]},{name:'publicIndexingEnabled',type:'checkbox',defaultValue:false}]}],
 typescript:{outputFile:path.resolve(dirname,'payload-types.ts')},
 graphQL:{disable:true},
})
