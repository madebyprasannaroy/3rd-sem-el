// Next.js config: keeps sharp (native image library) out of the bundler so server routes can use it.
/** @type {import('next').NextConfig} */
const nextConfig = { experimental: { serverComponentsExternalPackages: ["sharp"] } };
export default nextConfig;
