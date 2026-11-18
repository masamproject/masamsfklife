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
  async headers() {
    return [
      {
        // Servis çalışanı hep taze alınsın ki güncellemeler gecikmesin
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
