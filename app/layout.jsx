import "../styles/globals.css";
import "../styles/overrides.css";
import { EyeControlProvider } from "../components/shared/EyeControlContext";
import { SettingsProvider } from "../components/shared/SettingsContext";
import OfflineBanner from "../components/shared/OfflineBanner";
import AppBackground from "../components/shaders/AppBackground";

export const metadata = {
  title: "Aloud",
  description: "Eye-controlled AAC",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    shortcut: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="shortcut icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#cf5700" />
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' });
                  });
                }
              `,
            }}
          />
        )}
      </head>
      <body>
        <AppBackground />
        {/* Semi-transparent cream gradient — warp field bleeds through from z:-1 */}
        <div className="page-bg-layer" />
        <EyeControlProvider>
          <SettingsProvider>
            <OfflineBanner />
            {children}
          </SettingsProvider>
        </EyeControlProvider>
      </body>
    </html>
  );
}

