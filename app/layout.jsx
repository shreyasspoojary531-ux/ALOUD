import "../styles/globals.css";
import "../styles/overrides.css";
import { EyeControlProvider } from "../components/shared/EyeControlContext";
import { SettingsProvider } from "../components/shared/SettingsContext";
import OfflineBanner from "../components/shared/OfflineBanner";

export const metadata = { title: "Aloud", description: "Eye-controlled AAC" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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

