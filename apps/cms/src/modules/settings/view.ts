import type {SiteSetting} from '../../payload-types';
import {heroBanner} from './hero-banner';
// The public contract is deliberately separate from the owner-only global and provider vault.
export function publicSettings(settings:SiteSetting){
 return {
  siteName:settings.siteName,logo:typeof settings.logo==='object'&&settings.logo?.visibility==='public'?settings.logo.url:null,
  headerLogoHeight:settings.headerLogoHeight,footerLogoHeight:settings.footerLogoHeight,
  heroBanner:heroBanner(settings),
  privacyText:settings.privacyText,maxMessageLength:settings.maxMessageLength,tagline:settings.tagline,
  socialLinks:settings.socialLinks,navigation:settings.navigation,footerText:settings.footerText,
  supportNotice:settings.supportNotice,officeHours:settings.officeHours,timeZone:settings.timeZone,
  accentColor:settings.accentColor,chatEnabled:settings.chatEnabled,publicIndexingEnabled:settings.publicIndexingEnabled,
  customerAIEnabled:settings.customerAIEnabled,
 };
}
export type PublicSettings=ReturnType<typeof publicSettings>;
