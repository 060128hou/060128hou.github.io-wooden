import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "千年木艺 · 桌面营造工坊",
  description: "从一座木构建筑出发。浏览古建模型，自由搭建桌面作品，选择纹饰，跟随装配教程，让想法落在木头上。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
