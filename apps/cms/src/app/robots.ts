import type {MetadataRoute} from 'next'
import {getPayload} from 'payload'
import config from '@payload-config'
export const dynamic='force-dynamic'
export default async function robots():Promise<MetadataRoute.Robots>{const payload=await getPayload({config});const settings=await payload.findGlobal({slug:'site-settings',overrideAccess:true});return {rules:{userAgent:'*',disallow:settings.publicIndexingEnabled?['/admin','/service','/api','/auth','/tai-khoan','/chuyen-vien','/quan-tri','/tro-chuyen','/kien-thuc']:'/'}}}
