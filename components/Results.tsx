'use client';
/* 開票結果頁（/）：總計、過半門檻、選舉概況表 */
import { CONFIG, ELECTORATE, fmt, tm, type Candidate } from '@/lib/config';
import { useVotes } from '@/lib/votes';

const pct = (v: number, total: number, digits = 2) => (total > 0 ? (v / total * 100).toFixed(digits) + '%' : '—');

export default function Results() {
  const { data, conn } = useVotes();
  const C = CONFIG.candidates;

  // 加總已回報的開票所
  let A = 0, B = 0, X = 0, E = 0, n = 0;
  for (const s of CONFIG.stations) {
    const r = data[s.id];
    if (r) { A += +r.a || 0; B += +r.b || 0; X += +r.x || 0; E += s.elig; n++; }
  }
  const T = A + B;
  const EL = ELECTORATE;
  const NEED = Math.floor(EL / 2) + 1; // 過半門檻：選舉人數一半再加 1 票
  const last = Math.max(0, ...CONFIG.stations.map((s) => data[s.id]?.t || 0));

  return (
    <main className="dash">
      {/* 上方：加總 */}
      <div className="card c-sum">
        <h1>{CONFIG.title}</h1>
        <div className="sub">{conn}</div>
        {/* 最上面：整條＝全部選舉人，中線＝一半；候選人資料直接疊在條上，票從兩邊往中間長 */}
        <Tug A={A} B={B} T={T} EL={EL || T} need={NEED} />
        <div className="meta">
          <span>有效票 {fmt(T)}　無效票 {fmt(X)}　投票數 {fmt(T + X)}</span>
          <span>已回報 {n} / {CONFIG.stations.length} 個開票所</span>
        </div>
        {EL > 0 && (
          <div className="maj">
            <div className="hd">
              <span>{CONFIG.electorateNote} <b>{fmt(EL)}</b> 人</span>
              <span>過半門檻 <b>{fmt(NEED)}</b> 票（{pct(NEED, EL)}）</span>
            </div>
            <MajorityRow k="a" c={C.a} v={A} need={NEED} />
            <MajorityRow k="b" c={C.b} v={B} need={NEED} />
            <div className="hd" style={{ marginTop: 8 }}><span>目前投票數佔選舉人 {pct(T + X, EL)}</span></div>
          </div>
        )}
      </div>

      {/* 選舉概況 */}
      <div className="card c-tbl">
        <b>選舉概況</b>
        <div className="tblwrap">
          <OverviewTable data={data} A={A} B={B} X={X} E={E || EL} last={last} />
        </div>
      </div>

    </main>
  );
}

function Tug({ A, B, T, EL, need }: { A: number; B: number; T: number; EL: number; need: number }) {
  const C = CONFIG.candidates;
  const w = (v: number) => (EL > 0 ? Math.min(100, v / EL * 100) : 0) + '%';
  return (
    <div className="tug">
      <div className="tug-bar">
        <i className="fill a" style={{ width: w(A) }} />
        <i className="fill b" style={{ width: w(B) }} />
        <span className="mid"><em>過半 {fmt(need)}</em></span>
        <Side k="a" c={C.a} v={A} total={T} lead={A > B} won={A >= need} />
        <Side k="b" c={C.b} v={B} total={T} lead={B > A} won={B >= need} />
      </div>
    </div>
  );
}

function Side({ k, c, v, total, lead, won }: { k: 'a' | 'b'; c: Candidate; v: number; total: number; lead: boolean; won: boolean }) {
  return (
    <div className={`side ${k}${lead ? ' lead' : ''}${won ? ' won' : ''}`}><div className="in">
      <div className="no">{c.no} 號{won && <span className="ok">已過半</span>}</div>
      <div className="nm">{c.name}</div>
      <div className="v">{fmt(v)}</div>
      <div className="p">
        {pct(v, total, 1)}
        <div className="pe">佔選舉人 {pct(v, ELECTORATE)}</div>
      </div>
    </div></div>
  );
}

function MajorityRow({ k, c, v, need }: { k: 'a' | 'b'; c: Candidate; v: number; need: number }) {
  const left = need - v;
  return (
    <div className={`row ${k}`}>
      <span>{c.no}號 {c.name}</span>
      <div className="bar"><i style={{ width: Math.min(100, v / need * 100) + '%' }} /></div>
      <span className="r">
        {left > 0 ? `達成 ${(v / need * 100).toFixed(1)}%，差 ${fmt(left)} 票` : <span className="won">已過半</span>}
      </span>
    </div>
  );
}

function OverviewTable({ data, A, B, X, E, last }: {
  data: ReturnType<typeof useVotes>['data']; A: number; B: number; X: number; E: number; last: number;
}) {
  const C = CONFIG.candidates;
  // 欄位名稱；手機版每一格會用 data-label 顯示欄名（表格變成一張張卡片）
  const H = ['投開票所', `${C.a.no}號 ${C.a.name}`, `${C.b.no}號 ${C.b.name}`, '有效票數', '無效票數', '投票數', '選舉人數', '投票率', '最後更新'];
  const Row = ({ cells, cls, bold }: { cells: string[]; cls?: string; bold?: boolean }) => (
    <tr className={cls}>
      {cells.map((c, i) => <td key={i} data-label={H[i]}>{bold ? <b>{c}</b> : c}</td>)}
    </tr>
  );
  const T = A + B;

  return (
    <table className="ov">
      <thead><tr>{H.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {CONFIG.stations.map((s) => {
          const r = data[s.id];
          if (!r) return <Row key={s.id} cls="empty" cells={[s.place, '—', '—', '—', '—', '—', fmt(s.elig), '—', '—']} />;
          const v = (+r.a || 0) + (+r.b || 0), x = +r.x || 0;
          return <Row key={s.id} cells={[s.place, fmt(r.a), fmt(r.b), fmt(v), fmt(x), fmt(v + x), fmt(s.elig), pct(v + x, s.elig), tm(r.t)]} />;
        })}
        <Row cls="sum" bold cells={['合計', fmt(A), fmt(B), fmt(T), fmt(X), fmt(T + X), fmt(E), pct(T + X, E), tm(last)]} />
      </tbody>
    </table>
  );
}
