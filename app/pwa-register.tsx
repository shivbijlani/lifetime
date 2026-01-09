"use client";

import { useEffect } from "react";
import { getBasePath } from "@/lib/base-path";

export function PwaRegister() {
  const basePath = getBasePath();
  const scope = basePath ? `${basePath}/` : "/";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope })
        .catch(() => undefined);
    }
  }, [basePath, scope]);

  return null;
}
