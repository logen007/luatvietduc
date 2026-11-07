import config from "@payload-config";
import {brandMetadata} from "../../../../modules/shared/brand-metadata";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { importMap } from "../importMap";
type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};
export const generateMetadata = async ({ params, searchParams }: Args) => ({
  ...await generatePageMetadata({ config, params, searchParams }),
  ...brandMetadata,
});
export default function Page({ params, searchParams }: Args) {
  return RootPage({ config, params, searchParams, importMap });
}
