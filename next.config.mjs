const isProd = process.env.NODE_ENV === "production";

const normalizedBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== "/"
    ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/^\/+|\/+$/g, "")
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
