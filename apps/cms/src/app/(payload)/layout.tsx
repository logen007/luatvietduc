import config from "@payload-config";
import "@payloadcms/next/css";
import "../../presentation/live-css/08-specialist-inbox.css";
import "./admin-custom.css";
import "./admin-dashboard.css";
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
      {children}
    </RootLayout>
  );
}
