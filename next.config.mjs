import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    // El driver local devuelve rutas relativas y no necesita entrada aca; esto
    // es solo para las URLs del CDN de Vercel Blob.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};

export default withNextIntl(nextConfig);