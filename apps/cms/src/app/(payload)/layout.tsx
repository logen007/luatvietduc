import {brandMetadata} from '../../modules/shared/brand-metadata';
export const metadata=brandMetadata;
import config from "@payload-config";
import "@payloadcms/next/css";
import path from 'node:path';
import {getPresentationVersion} from '../../modules/shared/presentation-version.mjs';
export const dynamic='force-dynamic';
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import { importMap } from "./admin/importMap";
const serverFunction: ServerFunctionClient = async (args) => {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout
      htmlProps={{ className: "lvd-admin" }}
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      <link rel="preload" href="/fonts/Inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/fonts/Inter-vietnamese.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="stylesheet" precedence="admin" href={'/fonts/inter.css'}/>
      <link rel="stylesheet" precedence="admin" href={'/specialist-inbox.css?v='+getPresentationVersion(path.join(process.cwd(),'public'))}/>
      <link rel="stylesheet" precedence="admin" href={'/admin-theme.css?v='+getPresentationVersion(path.join(process.cwd(),'public'))}/>
      {children}
    </RootLayout>
  );
}
