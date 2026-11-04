import type {MetadataRoute} from 'next'
import {publicSiteSettings} from '../modules/public-site/server'
import {privatePaths,siteOrigin} from '../modules/public-site/seo'
export const dynamic='force-dynamic'
export default async function robots():Promise<MetadataRoute.Robots>{const settings=await publicSiteSettings();return {rules:{userAgent:'*',...(settings.publicIndexingEnabled?{allow:'/',disallow:privatePaths}:{disallow:'/'})},...(settings.publicIndexingEnabled?{sitemap:siteOrigin()+'/sitemap.xml'}:{})}}
