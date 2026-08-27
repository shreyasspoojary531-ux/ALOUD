import "../styles/globals.css";
import "../styles/overrides.css";
import { EyeControlProvider } from "../components/shared/EyeControlContext";
import { SettingsProvider } from "../components/shared/SettingsContext";
import OfflineBanner from "../components/shared/OfflineBanner";

export const metadata = {
  title: "Aloud",
  description: "Eye-controlled AAC",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#cf5700" />
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
      </head>
      <body>
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

