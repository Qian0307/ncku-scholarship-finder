/** @type {import('next').NextConfig} */
const nextConfig = {
  // 靜態輸出，部署到 Cloudflare Pages（產出在 out/）
  output: 'export',
  // 靜態輸出無 Image Optimization server，關閉最佳化
  images: { unoptimized: true },
  // 詳情頁網址結尾加斜線，靜態主機相容性較好
  trailingSlash: true,
};

export default nextConfig;
