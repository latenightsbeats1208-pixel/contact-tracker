import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sortie autonome (server.js + node_modules tracés) pour l'installeur
  // Windows — voir installer/README.md.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
