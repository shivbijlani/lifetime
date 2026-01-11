const isProd = process.env.NODE_ENV === "production";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const usesCustomDomain = Boolean(process.env.CUSTOM_DOMAIN);
const normalizedBasePath =
  !usesCustomDomain && rawBasePath && rawBasePath !== "/"
    ? rawBasePath.replace(/^\/+|\/+$/g, "")
    : "";

const basePath = normalizedBasePath ? `/${normalizedBasePath}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? basePath : "",
  assetPrefix: isProd ? basePath : "",
};

export default nextConfig;
