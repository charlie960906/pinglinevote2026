/** @type {import('next').NextConfig} */
// 網站掛在自訂網域 pinglinvote.hyjdevelop.com 的根目錄，所以不加子路徑。
// 如果改回 <user>.github.io/<repo>/ 這種網址，建置時設 NEXT_BASE_PATH=/<repo>
const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig = {
  // 輸出成純靜態網頁（out/ 資料夾），可部署到 GitHub Pages 等靜態主機
  output: 'export',
  basePath,
  // /report 會輸出成 /report/index.html
  trailingSlash: true,
  images: { unoptimized: true },
  // 關掉開發模式（npm run dev）左下角的 Next.js「N」標誌
  devIndicators: false,
};

export default nextConfig;
