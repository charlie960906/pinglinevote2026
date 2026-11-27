/* =========================================================
   共用設定：候選人、開票所、帳號、Firebase
   ========================================================= */

export type Candidate = { no: number; name: string };
export type Station = {
  id: string;        // 資料庫裡的位置：election/stations/<id>
  account: string;   // 回報人員登入時輸入的帳號（輸入 204 或 0204 都可以）
  email: string;     // 這個帳號在 Firebase Authentication 裡的 email（一個帳號只能回報自己的開票所）
  name: string;
  place: string;
  elig: number;      // 對應的 2022 年投票所選舉人數，用來算投票率、得票佔選舉人數 % 與過半門檻
};

export const CONFIG = {
  title: '平林里長開票結果',
  candidates: {
    a: { no: 1, name: '葉秀齢' },
    b: { no: 2, name: '李哲霖' },
  } satisfies Record<'a' | 'b', Candidate>,
  electorateNote: '2022 平林里選舉人數',
  stations: [
    { id: 's1', account: '0204', email: '204@report.com', name: '第 0204 開票所', place: '平林活動中心', elig: 1363 },                              // 2022：0198
    { id: 's2', account: '0205', email: '205@report.com', name: '第 0205 開票所', place: '大林鎮聯合社區活動中心（原大林鎮農業機械站）', elig: 1334 }, // 2022：0199
    { id: 's3', account: '0206', email: '206@report.com', name: '第 0206 開票所', place: '大林鎮老人體育活動中心', elig: 1486 },                    // 2022：0200
    { id: 's4', account: '0207', email: '207@report.com', name: '第 0207 開票所', place: '平林國小', elig: 1587 },                                  // 2022：0201
  ] as Station[],

  // true：用 Firebase（正式）；false：本機測試模式，資料只存在這個瀏覽器
  USE_FIREBASE: true,
  // 本機測試模式專用的測試密碼，四個帳號共用；USE_FIREBASE 為 true 時不會用到
  LOCAL_TEST_PASSWORD: 'test1234',

  firebaseConfig: {
    apiKey: 'AIzaSyBfGktpcTdw0WuaC5AwRAiLCzAwsncK5VU',
    authDomain: 'pinglin-vote2026.firebaseapp.com',
    databaseURL: 'https://pinglin-vote2026-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pinglin-vote2026',
    storageBucket: 'pinglin-vote2026.firebasestorage.app',
    messagingSenderId: '786736769478',
    appId: '1:786736769478:web:d85c23f3202ede8044aac7',
  },
  DB_PATH: 'election/stations', // 資料存放位置：election/stations/s1 ... s4
};

/** 全里選舉人數（各開票所加總） */
export const ELECTORATE = CONFIG.stations.reduce((t, s) => t + s.elig, 0);

/** 「204」「0204」「204@report.com」都整理成 0204 */
export function normAccount(input: string): string {
  const v = String(input || '').trim().toLowerCase();
  const byEmail = CONFIG.stations.find((s) => s.email.toLowerCase() === v);
  if (byEmail) return byEmail.account;
  return /^\d{1,4}$/.test(v) ? v.padStart(4, '0') : v;
}

export const stationOf = (account: string | null | undefined) =>
  CONFIG.stations.find((s) => s.account === account);

export const fmt = (n: number) => Number(n).toLocaleString('zh-TW');
export const tm = (t?: number) => (t ? new Date(t).toLocaleTimeString('zh-TW', { hour12: false }) : '—');
