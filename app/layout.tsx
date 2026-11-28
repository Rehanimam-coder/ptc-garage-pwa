import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "PTC Garage Management",
  description: "Vehicle and parts operations portal",
  manifest: "/manifest.json",
  themeColor: "#10243e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PTC Garage",
  },
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PWARegister />{children}</body></html>;
}
