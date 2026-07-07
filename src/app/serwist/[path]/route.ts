import { createSerwistRoute } from "@serwist/turbopack";

// Compiles src/app/sw.ts into the service worker served at /serwist/sw.js.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
