import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  description: "Modern POS Dashboard",
  manifest: "/api/manifest",
  icons: {
    icon: "/api/favicon",
    apple: "/api/favicon",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} bg-background min-h-screen w-full flex text-foreground`} suppressHydrationWarning>
        <AuthWrapper>
          {children}
          <Toaster position="top-center" toastOptions={{ style: { background: '#161925', color: '#fff', border: '1px solid #1f2937' } }} />
        </AuthWrapper>
      </body>
    </html>
  );
}




