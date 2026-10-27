import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ledgerly ERP", template: "%s | Ledgerly ERP" },
  description:
    "Secure multi-tenant ERP with inventory and packaging control. Designed and Developed by ABHIJIT KUMAR MISRA",
  applicationName: "Ledgerly ERP",
  authors: [{ name: "ABHIJIT KUMAR MISRA" }],
  creator: "ABHIJIT KUMAR MISRA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
