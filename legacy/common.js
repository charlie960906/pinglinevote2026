/* =========================================================
   共用設定與資料層（計票頁 report.html 與看票頁 index.html 都會載入這個檔）
   ========================================================= */
const CONFIG = {
  title: '平林里長開票結果',
  candidates: { a: { no: 1, name: '葉秀齢' }, b: { no: 2, name: '李哲霖' } },
  electorateNote: '2022 平林里選舉人數',
  stations: [
    // 今年的開票所；elig = 對應的 2022 年投票所選舉人數（依順序對應 0198~0201），用來算投票率、得票佔選舉人數 % 與過半門檻
    // account = 回報人員登入時輸入的帳號（輸入 204 或 0204 都可以）
    // email   = 這個帳號在 Firebase Authentication 裡的 email（一個帳號只能回報自己的開票所）
    { id: 's1', account: '0204', email: '204@report.com', name: '第 0204 開票所', place: '平林活動中心', elig: 1363 },                              // 2022：0198
    { id: 's2', account: '0205', email: '205@report.com', name: '第 0205 開票所', place: '大林鎮聯合社區活動中心（原大林鎮農業機械站）', elig: 1334 }, // 2022：0199
    { id: 's3', account: '0206', email: '206@report.com', name: '第 0206 開票所', place: '大林鎮老人體育活動中心', elig: 1486 },                    // 2022：0200
    { id: 's4', account: '0207', email: '207@report.com', name: '第 0207 開票所', place: '平林國小', elig: 1587 }                                  // 2022：0201
  ],
  // 本機測試模式（USE_FIREBASE: false）專用的測試密碼，四個帳號共用；接上 Firebase 後不會用到
  LOCAL_TEST_PASSWORD: 'test1234',
  // ---- 串接 Firebase 時：把 USE_FIREBASE 改成 true，並填入你專案的設定 ----
  USE_FIREBASE: true,
  firebaseConfig: {
    apiKey: 'AIzaSyBfGktpcTdw0WuaC5AwRAiLCzAwsncK5VU',
    authDomain: 'pinglin-vote2026.firebaseapp.com',
    databaseURL: 'https://pinglin-vote2026-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pinglin-vote2026',
    storageBucket: 'pinglin-vote2026.firebasestorage.app',
    messagingSenderId: '786736769478',
    appId: '1:786736769478:web:d85c23f3202ede8044aac7'
  },
  DB_PATH: 'election/stations'   // 資料存放位置：election/stations/s1 ... s4
};

/* =========================================================
   資料層
   介面：subscribe(cb)  → cb(data) ，data = { s1:{a,b,x,t}, ... }
         save(id, {a,b,x}) → Promise
   ========================================================= */
const Local = {
  KEY: 'election_live_v2',
  listeners: [],
  read() { try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { return {}; } },
  subscribe(cb) {
    this.listeners.push(cb);
    cb(this.read());
    // 本機測試模式：同一台電腦另一個分頁送出時，這裡也會更新
    window.addEventListener('storage', e => { if (e.key === this.KEY) cb(this.read()); });
    return 'local';
  },
  async save(id, v) {
    const all = this.read();
    all[id] = { a: v.a, b: v.b, x: v.x, t: Date.now() };
    try { localStorage.setItem(this.KEY, JSON.stringify(all)); } catch (e) {}
    this.listeners.forEach(cb => cb(all));
  }
};

const FB_VERSION = '10.12.2';
let fbAppPromise = null;
function fbApp() {   // 只初始化一次 Firebase App，資料庫和登入共用
  if (!fbAppPromise) fbAppPromise = import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`)
    .then(m => m.initializeApp(CONFIG.firebaseConfig));
  return fbAppPromise;
}

const Fire = {
  fns: null,
  async init() {
    const a = await fbApp();
    this.fns = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-database.js`);
    this.db = this.fns.getDatabase(a);
  },
  async subscribe(cb) {
    await this.init();
    this.fns.onValue(this.fns.ref(this.db, CONFIG.DB_PATH), snap => cb(snap.val() || {}), err => cb(null, err));
    return 'firebase';
  },
  async save(id, v) {
    await this.fns.set(this.fns.ref(this.db, CONFIG.DB_PATH + '/' + id), { a: v.a, b: v.b, x: v.x, t: Date.now() });
  }
};

const DB = CONFIG.USE_FIREBASE ? Fire : Local;

/* =========================================================
   登入（只有計票頁 report.html 會用到）
   介面：onChange(cb) → cb(account 或 null)
         login(account, password) → Promise（失敗會丟出中文錯誤訊息）
         logout() → Promise
   ========================================================= */
// 把使用者輸入的帳號整理成標準格式：「204」「0204」「204@report.com」都會變成 0204
function normAccount(input) {
  const v = String(input || '').trim().toLowerCase();
  const byEmail = CONFIG.stations.find(s => s.email.toLowerCase() === v);
  if (byEmail) return byEmail.account;
  return /^\d{1,4}$/.test(v) ? v.padStart(4, '0') : v;
}
const stationOf = acc => CONFIG.stations.find(s => s.account === acc);

// 本機測試用：帳號 0204~0207，密碼 CONFIG.LOCAL_TEST_PASSWORD。沒有真正的安全性，只是讓你先試流程。
const LocalAuth = {
  KEY: 'election_login',
  cbs: [],
  get() { try { return sessionStorage.getItem(this.KEY); } catch (e) { return null; } },
  onChange(cb) { this.cbs.push(cb); cb(this.get()); },
  emit() { this.cbs.forEach(cb => cb(this.get())); },
  async login(acc, pw) {
    if (!stationOf(acc) || pw !== CONFIG.LOCAL_TEST_PASSWORD) throw new Error('帳號或密碼錯誤');
    try { sessionStorage.setItem(this.KEY, acc); } catch (e) {}
    this.emit();
  },
  async logout() { try { sessionStorage.removeItem(this.KEY); } catch (e) {} this.emit(); }
};

// 正式：Firebase Authentication（電子郵件/密碼）。帳號密碼在 Firebase 主控台建立，不寫在程式裡。
const FireAuth = {
  fns: null, auth: null,
  async init() {
    if (this.auth) return;
    const a = await fbApp();
    this.fns = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth.js`);
    this.auth = this.fns.getAuth(a);
  },
  async onChange(cb) {
    await this.init();
    this.fns.onAuthStateChanged(this.auth, u => {
      if (!u) return cb(null);
      const s = CONFIG.stations.find(z => z.email.toLowerCase() === (u.email || '').toLowerCase());
      cb(s ? s.account : (u.email || u.uid));   // 不在名單內的帳號會被 report.html 自動登出
    });
  },
  async login(acc, pw) {
    await this.init();
    const s = stationOf(acc);
    if (!s) throw new Error('帳號或密碼錯誤');
    try {
      await this.fns.signInWithEmailAndPassword(this.auth, s.email, pw);
    } catch (e) {
      const c = e.code || '';
      if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) throw new Error('帳號或密碼錯誤');
      if (/too-many-requests/.test(c)) throw new Error('嘗試太多次，請稍後再試');
      if (/network/.test(c)) throw new Error('網路連線失敗，請檢查網路');
      throw new Error(e.message || c);
    }
  },
  async logout() { await this.init(); await this.fns.signOut(this.auth); }
};

const Auth = CONFIG.USE_FIREBASE ? FireAuth : LocalAuth;

/* 小工具 */
const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString('zh-TW');
const tm = t => t ? new Date(t).toLocaleTimeString('zh-TW', { hour12: false }) : '—';

/* 啟動連線：onData(data) 每次資料變動都會被呼叫；狀態文字寫進 #conn */
async function connect(onData) {
  onData({});
  try {
    const mode = await DB.subscribe((d, err) => {
      if (err) { $('conn').textContent = '連線失敗：' + err.message; return; }
      onData(d || {});
    });
    $('conn').textContent = mode === 'firebase' ? '● 已連線 Firebase，即時同步' : '本機測試模式（資料只存在這個瀏覽器）';
  } catch (e) {
    $('conn').textContent = 'Firebase 載入失敗：' + e.message;
  }
}
