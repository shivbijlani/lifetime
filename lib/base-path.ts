const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const usesCustomDomain = Boolean(process.env.CUSTOM_DOMAIN);

const normalizedBasePath =
  !usesCustomDomain && rawBasePath && rawBasePath !== "/"
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
    : "";

export function getBasePath() {
  return normalizedBasePath;
}
