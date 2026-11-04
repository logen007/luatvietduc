import path from 'node:path';
import { getPresentationVersion } from '../../modules/shared/presentation-version.mjs';
// Public CSS snapshots change independently from the application image.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Luật Việt Đức",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  const revision = getPresentationVersion(path.join(process.cwd(), 'public'));
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href={`/design-system.css?v=${revision}`} />
        <link rel="stylesheet" href={`/live.css?v=${revision}`} />
      </head>
      <body>{children}</body>
    </html>
  );
}
