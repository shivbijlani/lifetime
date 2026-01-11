import fs from "node:fs";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";
const rootDir = process.cwd();
const hasCname =
  fs.existsSync(path.join(rootDir, "CNAME")) ||
  fs.existsSync(path.join(rootDir, "public", "CNAME"));

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const usesCustomDomain = Boolean(process.env.CUSTOM_DOMAIN) || hasCname;
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
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
