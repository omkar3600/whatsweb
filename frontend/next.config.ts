import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@xyflow/react",
      "@base-ui/react",
      "xlsx",
    ],
  },
};

export default nextConfig;
