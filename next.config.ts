import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  /**
   * The resume is read off disk with `process.cwd()` rather than imported, so
   * Next's build-time tracing cannot see it and the serverless bundle would ship
   * without it. Everything works locally, then `POST /api/contact` throws ENOENT
   * in production only — §11 and src/lib/resume.ts.
   */
  outputFileTracingIncludes: {
    "/api/contact": ["./private/**"],
  },
};

export default nextConfig;
