/* Firebase 只在瀏覽器裡初始化一次，資料庫和登入共用 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from 'firebase/auth';
import { CONFIG } from './config';

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(CONFIG.firebaseConfig);
}

export const fbDb = (): Database => getDatabase(app());
export const fbAuth = (): Auth => getAuth(app());
