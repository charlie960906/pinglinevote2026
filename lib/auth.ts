'use client';
/* =========================================================
   登入（只有計票頁 /report 會用到）
   正式：Firebase Authentication（電子郵件/密碼），帳號密碼在 Firebase 主控台建立，不寫在程式裡。
   本機測試：帳號 204~207，密碼 CONFIG.LOCAL_TEST_PASSWORD（沒有真正的安全性，只用來試流程）。
   ========================================================= */
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { CONFIG, stationOf } from './config';
import { fbAuth } from './firebase';

const LOCAL_KEY = 'election_login';
const LOCAL_EVENT = 'election-login-change';

function readLocal(): string | null {
  try { return sessionStorage.getItem(LOCAL_KEY); } catch { return null; }
}

/**
 * 目前登入的帳號。
 * undefined = 還在確認中；null = 沒登入；字串 = 帳號（例如 0204），
 * 不在 4 個開票所名單內的帳號會回傳它的 email，讓畫面把它登出。
 */
export function useAccount() {
  const [account, setAccount] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!CONFIG.USE_FIREBASE) {
      const update = () => setAccount(readLocal());
      update();
      window.addEventListener(LOCAL_EVENT, update);
      return () => window.removeEventListener(LOCAL_EVENT, update);
    }
    return onAuthStateChanged(fbAuth(), (u) => {
      if (!u) return setAccount(null);
      const s = CONFIG.stations.find((z) => z.email.toLowerCase() === (u.email || '').toLowerCase());
      setAccount(s ? s.account : u.email || u.uid);
    });
  }, []);

  return account;
}

/** 登入；失敗時丟出中文錯誤訊息 */
export async function login(account: string, password: string) {
  const s = stationOf(account);
  if (!s) throw new Error('帳號或密碼錯誤');

  if (!CONFIG.USE_FIREBASE) {
    if (password !== CONFIG.LOCAL_TEST_PASSWORD) throw new Error('帳號或密碼錯誤');
    try { sessionStorage.setItem(LOCAL_KEY, account); } catch {}
    window.dispatchEvent(new Event(LOCAL_EVENT));
    return;
  }

  try {
    await signInWithEmailAndPassword(fbAuth(), s.email, password);
  } catch (e) {
    const code = (e as { code?: string }).code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) throw new Error('帳號或密碼錯誤');
    if (/too-many-requests/.test(code)) throw new Error('嘗試太多次，請稍後再試');
    if (/network/.test(code)) throw new Error('網路連線失敗，請檢查網路');
    throw new Error((e as Error).message || code);
  }
}

export async function logout() {
  if (!CONFIG.USE_FIREBASE) {
    try { sessionStorage.removeItem(LOCAL_KEY); } catch {}
    window.dispatchEvent(new Event(LOCAL_EVENT));
    return;
  }
  await signOut(fbAuth());
}
