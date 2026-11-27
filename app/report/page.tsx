import type { Metadata } from 'next';
import ReportForm from '@/components/ReportForm';

export const metadata: Metadata = {
  title: '平林里長計票回報',
  robots: { index: false, follow: false },   // 不讓搜尋引擎收錄回報頁
};

export default function Page() {
  return <ReportForm />;
}
