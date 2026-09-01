import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledgerly | Small Business ERP",
  description: "Manage sales, purchasing, inventory, invoicing, and reporting in one place.",
};

// Inline script runs before React hydrates so the saved theme is applied
// immediately and there's no light/dark flash on first paint.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('erp_theme');
    if (t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
