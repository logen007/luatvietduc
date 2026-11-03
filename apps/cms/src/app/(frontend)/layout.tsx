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
        <link rel="stylesheet" href="/live.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
