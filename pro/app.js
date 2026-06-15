"use strict";

const DATA = window.MJ_DATA || { organizations: [], players: [] };
const ORGS = {};
DATA.organizations.forEach(o => { ORGS[o.id] = o; });

const state = { org: "all", mleagueC: false, mleagueF: false, mtourn: false, topLeague: false, query: "", selectedId: null };

// Mリーグ 2024-25 現役選手
const MLEAGUE_CURRENT = new Set([
  "園田賢","鈴木たろう","浅見真紀","渡辺太",
  "二階堂亜樹","勝又健志","松ヶ瀬隆弥","二階堂瑠美",
  "内川幸太郎","岡田紗佳","堀慎吾","渋川難波",
  "佐々木寿人","高宮まり","伊達朱里紗","滝沢和典",
  "多井隆晴","白鳥翔","松本吉弘","日向藍子",
  "茅森早香","醍醐大","竹内元太","浅井堂岐",
  "萩原聖人","瀬戸熊直樹","黒沢咲","本田朋広",
  "猿川真寿","菅原千瑛","鈴木大介","中田花奈",
  "小林剛","瑞原明奈","鈴木優","仲林圭",
]);

// Mリーグ 退団済み（歴代）
const MLEAGUE_FORMER = new Set([
  "前原雄大","藤崎智","和久津晶","朝倉康心","石橋伸洋",
  "沢崎誠","近藤誠一","村上淳","丸山奏子","魚谷侑未",
]);

// Mトーナメント出場歴（2023〜2026 団体推薦枠で出場した選手）
const MTOURNAMENT = new Set([
  // 連盟 (鳳凰戦)
  "HIRO柴田","白銀紗希","藤島健二郎","山脇千文美","石立岳大","近藤久春",
  "桑田憲汰","杉浦勘介","三浦智博","西川淳","仲田加南",
  "阿久津翔太","福島佑一","清水香織","前田直哉","東城りお",
  "浜野太陽","紺野真太郎","吉田幸雄","石川正明","渡辺史哉","朝比奈ゆり",
  // 最高位戦
  "醍醐大","竹内元太",
  "浅井裕介","坂本大志","関翔太郎",
  "水巻渉","相川まりえ","有賀一宏",
  "岡本壮平","坂井秀隆","石井一馬","高雲飛",
  "牧野伸彦","今村大樹","鈴木聡一郎","徐曄","羽月まりえ","塩澤彰大","高津柚那","小池諒",
  // 協会
  "浅井堂岐",
  "水崎ともみ","矢島亨","新井啓文","逢川恵夢","真田槐えんじゅ","下石戟","飯田雅貴",
  "西村雄一郎","安藤弘樹","奥村知美","宮崎和樹","御崎千結",
]);

const el = {
  orgFilter: document.getElementById("orgFilter"),
  search: document.getElementById("search"),
  playerCount: document.getElementById("playerCount"),
  playerList: document.getElementById("playerList"),
  detail: document.getElementById("detail"),
};

// --- ユーティリティ ---------------------------------------------------
function tierClass(tier) {
  const c = (tier || "").charAt(0).toUpperCase();
  return ["A", "B", "C", "D", "E", "F"].includes(c) ? "tier-" + c : "tier-other";
}

function fmtPoints(p) {
  if (p === null || p === undefined) return "";
  if (p < 0) return "▲" + Math.abs(p).toFixed(1);
  return p.toFixed(1);
}

function normalize(s) {
  return (s || "").replace(/\s|　/g, "");
}

// --- 選手一覧 ---------------------------------------------------------
function isMleagueC(p)  { return MLEAGUE_CURRENT.has(normalize(p.name)); }
function isMleagueF(p)  { return MLEAGUE_FORMER.has(normalize(p.name)); }
function isMtournament(p) { return MTOURNAMENT.has(normalize(p.name)); }

function isTopLeague(p) {
  if (!p.records || p.records.length === 0) return false;
  const org = ORGS[p.org];
  if (!org) return false;
  const topTier = (org.league.tiers || [])[0];
  // records は term降順で格納されているので [0] が最新期
  return p.records[0].tier === topTier;
}

function filteredPlayers() {
  const q = normalize(state.query);
  return DATA.players
    .filter(p => state.org === "all" || p.org === state.org)
    .filter(p => {
      if (!state.mleagueC && !state.mleagueF && !state.mtourn) return true;
      const n = normalize(p.name);
      return (state.mleagueC && MLEAGUE_CURRENT.has(n)) ||
             (state.mleagueF && MLEAGUE_FORMER.has(n)) ||
             (state.mtourn  && MTOURNAMENT.has(n));
    })
    .filter(p => !state.topLeague || isTopLeague(p))
    .filter(p => !q || normalize(p.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function renderOrgFilter() {
  const opts = [{ id: "all", shortName: "すべて" }].concat(DATA.organizations);
  el.orgFilter.innerHTML = "";
  opts.forEach(o => {
    const b = document.createElement("button");
    b.className = "org-btn" + (state.org === o.id ? " active" : "");
    b.textContent = o.shortName || o.name;
    b.onclick = () => { state.org = o.id; renderOrgFilter(); renderList(); };
    el.orgFilter.appendChild(b);
  });

  // 独立トグル（Mリーガー / 最高リーグ）
  const sep = document.createElement("span");
  sep.className = "filter-sep";
  el.orgFilter.appendChild(sep);

  const mc = document.createElement("button");
  mc.className = "org-btn mleague-btn" + (state.mleagueC ? " active" : "");
  mc.textContent = "現Mリーガー";
  mc.onclick = () => { state.mleagueC = !state.mleagueC; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(mc);

  const mf = document.createElement("button");
  mf.className = "org-btn mleague-former-btn" + (state.mleagueF ? " active" : "");
  mf.textContent = "旧Mリーガー";
  mf.onclick = () => { state.mleagueF = !state.mleagueF; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(mf);

  const mt = document.createElement("button");
  mt.className = "org-btn mtourn-btn" + (state.mtourn ? " active" : "");
  mt.textContent = "Mトーナメント";
  mt.onclick = () => { state.mtourn = !state.mtourn; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(mt);

  const tb = document.createElement("button");
  tb.className = "org-btn topleague-btn" + (state.topLeague ? " active" : "");
  tb.textContent = "最高リーグ";
  tb.onclick = () => { state.topLeague = !state.topLeague; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(tb);
}

function renderList() {
  const list = filteredPlayers();
  el.playerCount.textContent = list.length + " 名";
  el.playerList.innerHTML = "";
  list.forEach(p => {
    const li = document.createElement("li");
    if (p.id === state.selectedId) li.className = "selected";
    const org = ORGS[p.org];
    li.innerHTML =
      '<span class="pname">' + p.name + "</span>" +
      '<span class="porg">' + (org ? org.shortName : "") + "</span>";
    li.onclick = () => { state.selectedId = p.id; renderList(); renderDetail(p); };
    el.playerList.appendChild(li);
  });
}

// --- 年表 -------------------------------------------------------------
function renderDetail(p) {
  const org = ORGS[p.org] || {};
  const league = org.league || {};
  const recs = p.records.slice().sort((a, b) => b.term - a.term);

  const terms = recs.map(r => r.term);
  const span = terms.length ? Math.max(...terms) - Math.min(...terms) + 1 : 0;
  const playoffs = recs.filter(r => r.category === "playoff" || r.category === "champion").length;
  const topTier = recs
    .map(r => r.tier)
    .sort((a, b) => (league.tiers || []).indexOf(a) - (league.tiers || []).indexOf(b))[0] || "-";

  let html = "";
  html += '<div class="detail-head">';
  html += "<h2>" + p.name + "</h2>";
  html += '<span class="org-name">' + (org.name || "") + "</span>";
  html += "</div>";
  html += '<div class="detail-head"><span class="league-name">' +
          (league.name || "") + " 成績</span></div>";

  html += '<div class="summary">';
  html += stat(recs.length, "出場期数");
  html += stat(topTier, "最高到達");
  html += stat(playoffs, "決定戦/優勝");
  html += "</div>";

  html += chartSvg(recs, p.org);

  // ギャップ行を含む表示リストを構築（期の昇順→降順で表示）
  const termsSorted = recs.slice().sort((a, b) => a.term - b.term);
  const displayItems = [];
  for (let i = 0; i < termsSorted.length; i++) {
    if (i > 0) {
      const prev = termsSorted[i - 1].term;
      const curr = termsSorted[i].term;
      if (curr - prev > 1) {
        displayItems.push({ gap: true, from: prev + 1, to: curr - 1 });
      }
    }
    displayItems.push({ gap: false, rec: termsSorted[i] });
  }
  displayItems.reverse();

  html += '<table class="timeline"><thead><tr>' +
          "<th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th>" +
          "</tr></thead><tbody>";
  displayItems.forEach(item => {
    if (item.gap) {
      const count = item.to - item.from + 1;
      const label = item.from === item.to
        ? "第" + item.from + "期"
        : "第" + item.from + "期〜第" + item.to + "期";
      const note = count >= 3 ? "休戦の可能性" : "データなし";
      html += '<tr class="gap-row">' +
        '<td class="term">' + label + "</td>" +
        '<td colspan="3">' + note + "（" + count + "期分）</td>" +
        "</tr>";
    } else {
      const r = item.rec;
      const rowCls = r.ongoing ? ' class="ongoing"' : "";
      const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
      const rankHtml = (r.rank !== undefined && r.rank !== null)
        ? ' <span class="rank">' + r.rank + "位</span>" : "";
      const halfHtml = (r.half && r.half !== "annual")
        ? ' <span class="half">' + r.half + "</span>" : "";
      const resultText = (r.result || "") + rankHtml + halfHtml || "—";
      html += "<tr" + rowCls + ">" +
        '<td class="term">第' + r.term + "期</td>" +
        '<td><span class="tier-badge ' + tierClass(r.tier) + '">' + r.tier + "</span></td>" +
        '<td class="result-' + r.category + '">' + resultText + "</td>" +
        '<td class="points ' + ptsCls + '">' + fmtPoints(r.points) + "</td>" +
        "</tr>";
    }
  });
  html += "</tbody></table>";

  if (p.sourceUrl) {
    html += '<div class="source-link">出典: <a href="' + p.sourceUrl +
            '" target="_blank" rel="noopener">' + p.sourceUrl + "</a></div>";
  }
  el.detail.innerHTML = html;
}

function stat(num, lbl) {
  return '<div class="stat"><div class="num">' + num +
         '</div><div class="lbl">' + lbl + "</div></div>";
}

// 期 → 西暦変換（団体別）
function termToYear(orgId, term) {
  if (orgId === "renmei") return 1983 + term;
  return term;
}

// 期ごとのポイント推移（軸付き）
function chartSvg(recs, orgId) {
  const pts = recs.filter(r => r.points !== null)
                  .map(r => ({ year: termToYear(orgId, r.term), p: r.points }))
                  .sort((a, b) => a.year - b.year);
  if (pts.length < 2) return "";

  const W = 600, H = 180;
  const padL = 50, padR = 16, padT = 14, padB = 34;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const years = pts.map(d => d.year);
  const minYr = Math.min(...years), maxYr = Math.max(...years);
  const vals = pts.map(d => d.p);
  const dataMin = Math.min(...vals, 0), dataMax = Math.max(...vals, 0);
  const padV = (dataMax - dataMin) * 0.08 || 20;
  const vMin = dataMin - padV, vMax = dataMax + padV;

  const xFn = yr => padL + (maxYr === minYr ? chartW / 2 : (yr - minYr) / (maxYr - minYr)) * chartW;
  const yFn = v  => padT  + (1 - (v - vMin) / (vMax - vMin)) * chartH;

  // Y軸の目盛り間隔（きりのよい数値）
  function niceStep(range, n) {
    if (!range) return 10;
    const r = range / n;
    const mag = Math.pow(10, Math.floor(Math.log10(r)));
    const norm = r / mag;
    return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  }
  const yStep = niceStep(vMax - vMin, 5);
  const yTicks = [];
  for (let v = Math.ceil(vMin / yStep) * yStep; v <= vMax + 0.001; v = Math.round((v + yStep) * 100) / 100) {
    yTicks.push(v);
    if (yTicks.length > 10) break;
  }

  // X軸の目盛り（西暦）
  const yearRange = maxYr - minYr;
  const xStep = yearRange > 20 ? 5 : yearRange > 10 ? 2 : 1;
  const xTicks = [];
  for (let yr = Math.ceil(minYr / xStep) * xStep; yr <= maxYr; yr += xStep) xTicks.push(yr);

  const axisY = H - padB;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';

  // Y軸グリッド＋ラベル
  yTicks.forEach(v => {
    const cy = yFn(v).toFixed(1);
    const isZero = v === 0;
    svg += '<line x1="' + padL + '" y1="' + cy + '" x2="' + (W - padR) + '" y2="' + cy +
           '" stroke="' + (isZero ? '#aaa' : '#e9ebee') + '"' + (isZero ? ' stroke-dasharray="3 3"' : '') + '/>';
    const lbl = v === 0 ? '0' : (v > 0 ? '+' + Math.round(v) : String(Math.round(v)));
    svg += '<text x="' + (padL - 5) + '" y="' + (parseFloat(cy) + 4) +
           '" text-anchor="end" font-size="10" fill="#8a93a2">' + lbl + '</text>';
  });

  // X軸ライン
  svg += '<line x1="' + padL + '" y1="' + axisY + '" x2="' + (W - padR) + '" y2="' + axisY + '" stroke="#ccc"/>';

  // X軸目盛り＋ラベル
  xTicks.forEach(yr => {
    if (yr < minYr || yr > maxYr) return;
    const cx = xFn(yr).toFixed(1);
    svg += '<line x1="' + cx + '" y1="' + axisY + '" x2="' + cx + '" y2="' + (axisY + 4) + '" stroke="#aaa"/>';
    svg += '<text x="' + cx + '" y="' + (axisY + 16) +
           '" text-anchor="middle" font-size="10" fill="#8a93a2">' + yr + '</text>';
  });

  // データ折れ線
  const path = pts.map((d, i) => (i ? 'L' : 'M') + xFn(d.year).toFixed(1) + ' ' + yFn(d.p).toFixed(1)).join(' ');
  svg += '<path d="' + path + '" fill="none" stroke="#2c5fa8" stroke-width="1.5"/>';

  // ドット
  pts.forEach(d => {
    svg += '<circle cx="' + xFn(d.year).toFixed(1) + '" cy="' + yFn(d.p).toFixed(1) +
           '" r="2.5" fill="' + (d.p < 0 ? '#c0392b' : '#2c5fa8') + '"/>';
  });

  svg += '</svg>';
  return '<div class="chart">' + svg + '</div>';
}

// --- 起動 -------------------------------------------------------------
el.search.addEventListener("input", e => { state.query = e.target.value; renderList(); });
renderOrgFilter();
renderList();
