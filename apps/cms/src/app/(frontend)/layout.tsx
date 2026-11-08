import {readPublicCopy} from '../../modules/shared/public-copy.server';
import {brandMetadata} from '../../modules/shared/brand-metadata';
import {cookies} from 'next/headers';
import {publicSiteSettings} from '../../modules/public-site/server';
import {PublicSettingsProvider} from '../../modules/settings/client';
import {LocaleProvider} from '../../modules/shared/locale';
import path from 'node:path';
import {googleMeasurement} from '../../modules/measurement/server';
import {Measurement} from '../../modules/measurement/Measurement';
import { getPresentationVersion } from '../../modules/shared/presentation-version.mjs';
// Public CSS snapshots change independently from the application image.
export const dynamic = "force-dynamic";
export async function generateMetadata(){const {verification}=await googleMeasurement();return {
  ...brandMetadata,
  title: "Luật Việt Đức",
  robots: { index: false, follow: false },
  ...(verification?{verification:{google:verification}}:{}),
};}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const [settings,jar,measurement]=await Promise.all([publicSiteSettings(),cookies(),googleMeasurement()]);
  const language=jar.get('lvd-lang')?.value==='de'?'de':'vi';
  const assetVersion=(file:string)=>getPresentationVersion(path.join(process.cwd(),'public'),[file]);
  return (
    <html lang={language} data-lvd-native="true">
      <head>
        {/* Keep the document canvas stable before streamed stylesheets arrive. */}
        <style>{'body{margin:0;background:#fff;color:#0b0b0b;font:400 16px/1.5 var(--lvd-font);-webkit-font-smoothing:antialiased}'}</style>
        <link rel="preload" href="/fonts/Inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Inter-vietnamese.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Articulat-web.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href={`/fonts/inter.css?v=${assetVersion('fonts/inter.css')}`} />
        <link rel="stylesheet" href={`/design-system.css?v=${assetVersion('design-system.css')}`} />
        <link rel="stylesheet" href={`/live.css?v=${assetVersion('live.css')}`} />
      </head>
      <body><LocaleProvider language={language} copy={readPublicCopy()}><PublicSettingsProvider settings={settings}>{children}<Measurement config={{gtmId:measurement.gtmId,gaId:measurement.gaId}}/></PublicSettingsProvider></LocaleProvider></body>
    </html>
  );
}
