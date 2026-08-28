import "../styles/globals.css";
import "../styles/overrides.css";
import { EyeControlProvider } from "../components/shared/EyeControlContext";
import { SettingsProvider } from "../components/shared/SettingsContext";
import OfflineBanner from "../components/shared/OfflineBanner";
import ShaderDebugBar from "../components/shaders/ShaderDebugBar";

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
        <ShaderDebugBar />
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

