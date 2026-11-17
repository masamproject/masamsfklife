/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/pano", destination: "/gorevler", permanent: false },
      { source: "/liste", destination: "/gorevler", permanent: false },
      { source: "/notlar", destination: "/toplanti", permanent: false },
      { source: "/cop-kutusu", destination: "/cop", permanent: false },
    ];
  },
};

export default nextConfig;
