'use client';
/* 計票回報頁（/report）：登入 → 只能回報自己帳號對應的開票所 */
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CONFIG, fmt, normAccount, stationOf, tm } from '@/lib/config';
import { useVotes, saveVotes } from '@/lib/votes';
import { login, logout, useAccount } from '@/lib/auth';
import { VoteBar } from '@/components/Results';

type Msg = { ok: boolean; text: string } | null;

export default function ReportForm() {
  const account = useAccount();
  const station = stationOf(account);
  const { conn, data } = useVotes();
  const [loginMsg, setLoginMsg] = useState<Msg>(null);

  // 登入的帳號不在 4 個開票所名單內 → 自動登出
  useEffect(() => {
    if (account && !station) {
      logout();
      setLoginMsg({ ok: false, text: '這個帳號沒有對應的開票所' });
    }
  }, [account, station]);

  const onLogout = async () => { if (confirm('確定要登出嗎？')) await logout(); };

  return (
    <main>
      <div className="card">
        <div className="hdr">
          <div>
            <h1>平林里長計票回報</h1>
            <div className="sub">{conn}</div>
          </div>
          {station && <button className="logout" onClick={onLogout}>登出</button>}
        </div>
        {/* 上方：目前兩方總票數 */}
        <VoteBar data={data} />
      </div>

      {account === undefined ? (
        <div className="card sub">載入中…</div>
      ) : station ? (
        <StationForm key={station.id} stationId={station.id} />
      ) : (
        <LoginForm msg={loginMsg} setMsg={setLoginMsg} />
      )}

      <div className="foot"><Link href="/">看開票結果 ›</Link></div>
    </main>
  );
}

function LoginForm({ msg, setMsg }: { msg: Msg; setMsg: (m: Msg) => void }) {
  const [acc, setAcc] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const a = normAccount(acc);
    if (!stationOf(a)) { setMsg({ ok: false, text: '沒有這個帳號，請輸入開票所編號，例如 204' }); return; }
    setBusy(true);
    try { await login(a, pw); setPw(''); }
    catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    setBusy(false);
  };

  return (
    <form className="card login" onSubmit={submit} autoComplete="on">
      <b>回報人員登入</b>
      <p className="sub" style={{ margin: '4px 0 14px' }}>請用你負責的開票所帳號登入，登入後只能回報自己的開票所。</p>
      <label htmlFor="uAcc">帳號（開票所編號）</label>
      <input id="uAcc" name="username" autoComplete="username" inputMode="numeric" placeholder="例如 204" required
        value={acc} onChange={(e) => setAcc(e.target.value)} />
      <label htmlFor="uPw">密碼</label>
      <input id="uPw" name="password" type="password" autoComplete="current-password" required
        value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="send" type="submit" disabled={busy}>{busy ? '登入中…' : '登入'}</button>
      {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
      {!CONFIG.USE_FIREBASE && <p className="sub">本機測試模式：帳號 204～207，密碼 {CONFIG.LOCAL_TEST_PASSWORD}</p>}
    </form>
  );
}

type Field = 'a' | 'b' | 'x';

function StationForm({ stationId }: { stationId: string }) {
  const s = CONFIG.stations.find((z) => z.id === stationId)!;
  const C = CONFIG.candidates;
  const { data, loaded } = useVotes();
  const r = data[stationId];

  const [v, setV] = useState<Record<Field, string>>({ a: '0', b: '0', x: '0' });
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // 第一次拿到資料時，把上次回報的數字帶進輸入框（之後不再覆蓋正在輸入的數字）
  useEffect(() => {
    if (filled || !loaded) return;
    if (r) setV({ a: String(r.a), b: String(r.b), x: String(r.x || 0) });
    setFilled(true);
  }, [loaded, r, filled]);

  const num = (f: Field) => +v[f] || 0;
  const bump = (f: Field, d: number) => setV((p) => ({ ...p, [f]: String(Math.max(0, (parseInt(p[f]) || 0) + d)) }));
  const total = num('a') + num('b') + num('x');

  const send = async () => {
    const a = Number(v.a), b = Number(v.b), x = Number(v.x);
    if ([a, b, x].some((n) => !Number.isInteger(n) || n < 0) || v.a === '' || v.b === '' || v.x === '') {
      setMsg({ ok: false, text: '票數必須是 0 以上的整數' }); return;
    }
    if (a + b + x > s.elig) {
      setMsg({ ok: false, text: `投票數 ${fmt(a + b + x)} 超過選舉人數 ${fmt(s.elig)}，請檢查` }); return;
    }
    setBusy(true);
    try {
      await saveVotes(stationId, { a, b, x });
      setMsg({ ok: true, text: `已送出（${tm(Date.now())}），開票結果頁會即時更新` });
    } catch (e) {
      const t = String((e as { code?: string }).code || (e as Error).message || e);
      setMsg({ ok: false, text: '送出失敗：' + (/permission/i.test(t) ? '沒有權限回報這個開票所，請重新登入' : t) });
    }
    setBusy(false);
  };

  const Input = ({ f, cls, label }: { f: Field; cls: string; label: string }) => (
    <div className={`f ${cls}`}>
      <label htmlFor={'i' + f}>{label}</label>
      <input id={'i' + f} type="number" inputMode="numeric" min={0} step={1}
        value={v[f]} onChange={(e) => setV((p) => ({ ...p, [f]: e.target.value }))} />
      <div className="step">
        <button type="button" onClick={() => bump(f, -1)}>−1</button>
        <button type="button" onClick={() => bump(f, 1)}>+1</button>
        <button type="button" onClick={() => bump(f, 10)}>+10</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="sub">已登入：{s.account}</div>
      <h1>{s.name}｜{s.place}</h1>
      <div className="sub">
        {r?.t ? `上次回報：${tm(r.t)}（${C.a.no}號 ${r.a}、${C.b.no}號 ${r.b}、無效 ${r.x || 0}）` : '尚未回報過'}
      </div>
      <div className="fields">
        {Input({ f: 'a', cls: 'a', label: `${C.a.no} 號 ${C.a.name} 目前票數` })}
        {Input({ f: 'b', cls: 'b', label: `${C.b.no} 號 ${C.b.name} 目前票數` })}
      </div>
      {Input({ f: 'x', cls: 'x', label: '無效票數' })}
      <div className="sub" style={{ margin: '12px 0' }}>
        有效票 {fmt(num('a') + num('b'))}　投票數 {fmt(total)}　投票率 {(total / s.elig * 100).toFixed(2)}%
      </div>
      <button className="send" onClick={send} disabled={busy}>{busy ? '送出中…' : '送出回報'}</button>
      {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
      <p className="sub">填的是這個開票所「目前累計」的票數，再次送出會覆蓋上一次的數字。</p>
    </div>
  );
}
