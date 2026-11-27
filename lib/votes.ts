'use client';
/* =========================================================
   票數資料：即時訂閱 + 送出回報
   ========================================================= */
import { useEffect, useState } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { CONFIG } from './config';
import { fbDb } from './firebase';

export type Report = { a: number; b: number; x: number; t: number };
export type VoteData = Record<string, Report>;

const LOCAL_KEY = 'election_live_v2';
const LOCAL_EVENT = 'election-local-update';

function readLocal(): VoteData {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}

/** 即時取得各開票所的票數。loaded = 是否已經拿到第一份資料 */
export function useVotes() {
  const [data, setData] = useState<VoteData>({});
  const [loaded, setLoaded] = useState(false);
  const [conn, setConn] = useState('連線中…');

  useEffect(() => {
    if (!CONFIG.USE_FIREBASE) {
      const update = () => { setData(readLocal()); setLoaded(true); };
      const onStorage = (e: StorageEvent) => { if (e.key === LOCAL_KEY) update(); };
      update();
      setConn('本機測試模式（資料只存在這個瀏覽器）');
      window.addEventListener('storage', onStorage);   // 同一台電腦的其他分頁
      window.addEventListener(LOCAL_EVENT, update);    // 這個分頁
      return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(LOCAL_EVENT, update); };
    }
    try {
      return onValue(
        ref(fbDb(), CONFIG.DB_PATH),
        (snap) => { setData(snap.val() || {}); setLoaded(true); setConn('● 已連線 Firebase，即時同步'); },
        (err) => setConn('連線失敗：' + err.message),
      );
    } catch (e) {
      setConn('Firebase 載入失敗：' + (e as Error).message);
    }
  }, []);

  return { data, loaded, conn };
}

/** 送出某個開票所目前累計的票數（會覆蓋上一次） */
export async function saveVotes(id: string, v: { a: number; b: number; x: number }) {
  const rec: Report = { a: v.a, b: v.b, x: v.x, t: Date.now() };
  if (!CONFIG.USE_FIREBASE) {
    const all = readLocal();
    all[id] = rec;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch {}
    window.dispatchEvent(new Event(LOCAL_EVENT));
    return;
  }
  await set(ref(fbDb(), `${CONFIG.DB_PATH}/${id}`), rec);
}
