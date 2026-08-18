import "../styles/globals.css";
import "../styles/overrides.css";
import { EyeControlProvider } from "../components/shared/EyeControlContext";
import { SettingsProvider } from "../components/shared/SettingsContext";

export const metadata = { title: "Aloud", description: "Eye-controlled AAC" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EyeControlProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </EyeControlProvider>
      </body>
    </html>
  );
}

