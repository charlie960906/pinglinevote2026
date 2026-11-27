/** @type {import('next').NextConfig} */
const nextConfig = {
  // 輸出成純靜態網頁（out/ 資料夾），直接放到 Firebase Hosting，不需要伺服器
  output: 'export',
  // /report 會輸出成 /report/index.html，Firebase Hosting 直接就找得到
  trailingSlash: true,
  images: { unoptimized: true },
  // 關掉開發模式（npm run dev）左下角的 Next.js「N」標誌
  devIndicators: false,
};

export default nextConfig;
