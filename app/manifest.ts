import type { MetadataRoute } from "next";

/**
 * ሳይቱ በስልክ ላይ እንደ አፕ እንዲጫን (PWA)፦ "Add to Home Screen" ሲባል በራሱ አዶ ሙሉ ስክሪን ይከፈታል።
 * ለPlay Store (Trusted Web Activity) መሰረቱም ይሄው ነው።
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ethio Computer",
    short_name: "Ethio Computer",
    description: "Buy and sell social media accounts safely: verified sellers, payment held until handover.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["business", "shopping", "social"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Market", url: "/accounts", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Sell an account", url: "/sell", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Wallet", url: "/dashboard/wallet", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
