/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'image.tmdb.org',
      'lh3.googleusercontent.com',
      'api.dicebear.com',
      'cdn-images.dzcdn.net',  // Deezer CDN for album covers
      'e-cdns-images.dzcdn.net', // Alternative Deezer CDN
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
