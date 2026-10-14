/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker on Windows/macOS: file watching through bind mounts needs polling
  webpack: (config, { dev }) => {
    if (dev && process.env.WATCHPACK_POLLING === "true") {
      config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
};

export default nextConfig;
