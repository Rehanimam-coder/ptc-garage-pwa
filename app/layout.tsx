import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTC Garage Management",
  description: "Vehicle and parts operations portal",
  manifest: "/manifest.json",
  themeColor: "#10243e"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}