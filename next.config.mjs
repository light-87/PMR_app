/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Public AdBlue/DEF slide deck. The file lives at public/deck/index.html;
      // this serves it from a clean, shareable /deck link. Middleware skips the
      // path entirely — see the matcher in src/middleware.ts — so it needs no session.
      { source: '/deck', destination: '/deck/index.html' },
    ];
  },
};

export default nextConfig;
