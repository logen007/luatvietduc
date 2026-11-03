import path from 'node:path';
import { getPresentationVersion } from '../../modules/shared/presentation-version.mjs';
const revision = getPresentationVersion(path.join(process.cwd(), 'public'));
export const metadata = {
  title: "Luật Việt Đức",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href="/assets/styles.css" />
        <link rel="stylesheet" href="/assets/chat-first.css" />
        <link rel="stylesheet" href={`/design-system.css?v=${revision}`} />
        <link rel="stylesheet" href={`/live.css?v=${revision}`} />
        <link rel="stylesheet" href={`/editorial-ui.css?v=${revision}`} />
      </head>
      <body>{children}</body>
    </html>
  );
}
