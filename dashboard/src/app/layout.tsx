import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0e14",
};

export const metadata: Metadata = {
  title: {
    default: "VVSC - VAI VAi Servicing Center",
    template: "%s | VVSC",
  },
  applicationName: "VVSC",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VVSC",
  },
  description: "Modern POS Dashboard",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VVSC" />
        <meta name="application-name" content="VVSC" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { 
              function regSW() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
              }
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                regSW();
              } else {
                window.addEventListener('load', regSW);
              }
            }`,
          }}
        />
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




