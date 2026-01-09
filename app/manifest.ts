import type { MetadataRoute } from "next";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/branding";
import { getBasePath } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = getBasePath();
  const scope = basePath ? `${basePath}/` : "/";

  return {
    name: SITE_TITLE,
    short_name: SITE_TITLE,
    description: SITE_TAGLINE,
    id: scope,
    start_url: scope,
    scope,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: `${basePath}/icons/icon-192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: `${basePath}/icons/icon-512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
