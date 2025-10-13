const repoName = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/^\/+|\/+$/g, "") || "lifetime";
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}` : "",
};

export default nextConfig;
