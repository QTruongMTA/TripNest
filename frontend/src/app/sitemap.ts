import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/search", "/properties", "/about"].map((path) => ({ url: `https://tripnest.local${path}`, lastModified: new Date() })); }
