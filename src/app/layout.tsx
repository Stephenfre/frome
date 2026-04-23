import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "react-datepicker/dist/react-datepicker.css";

import ConvexClientProvider from "@/components/providers/convex-client-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "ForMe",
  description: "A Mac-first personal command center for your day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
