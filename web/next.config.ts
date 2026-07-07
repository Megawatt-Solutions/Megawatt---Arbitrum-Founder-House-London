import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Pin the workspace root to web/ (a stray lockfile in $HOME otherwise
  // confuses Turbopack's root inference).
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  // File-watch events get dropped on this machine (fsevents and
  // WATCHPACK_POLLING both miss changes), so dev runs webpack with
  // explicit stat polling — see package.json "dev".
  webpack: (config, { dev }) => {
    if (dev) config.watchOptions = { poll: 700, aggregateTimeout: 200 };
    return config;
  },
};

export default nextConfig;
