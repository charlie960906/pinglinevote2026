/** @type {import('next').NextConfig} */
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const basePath =
  process.env.GITHUB_ACTIONS === 'true' &&
  repositoryName &&
  !repositoryName.endsWith('.github.io')
    ? `/${repositoryName}`
    : '';

const nextConfig = {
  // 輸出成純靜態網頁（out/ 資料夾），可部署到 GitHub Pages 等靜態主機
  output: 'export',
  // GitHub Pages 專案網站會掛在 /<repository-name>/ 子路徑
  basePath,
  // /report 會輸出成 /report/index.html
  trailingSlash: true,
  images: { unoptimized: true },
  // 關掉開發模式（npm run dev）左下角的 Next.js「N」標誌
  devIndicators: false,
};

export default nextConfig;
