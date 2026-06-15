"use strict";

const DATA = window.MJ_DATA || { organizations: [], players: [] };
const ORGS = {};
DATA.organizations.forEach(o => { ORGS[o.id] = o; });

const state = { org: "all", mleague: false, query: "", selectedId: null };

// Mリーガー（現役2024-25 + 歴代）スペースなし正規化
const MLEAGUE_NAMES = new Set([
  // 2024-25現役
  "園田賢","鈴木たろう","浅見真紀","渡辺太",
  "二階堂亜樹","勝又健志","松ヶ瀬隆弥","二階堂瑠美",
  "内川幸太郎","岡田紗佳","堀慎吾","渋川難波",
  "佐々木寿人","高宮まり","伊達朱里紗","滝沢和典",
  "多井隆晴","白鳥翔","松本吉弘","日向藍子",
  "茅森早香","醍醐大","竹内元太","浅井堂岐",
  "萩原聖人","瀬戸熊直樹","黒沢咲","本田朋広",
  "猿川真寿","菅原千瑛","鈴木大介","中田花奈",
  "小林剛","瑞原明奈","鈴木優","仲林圭",
  // 歴代（退団済み）
  "前原雄大","藤崎智","和久津晶","朝倉康心","石橋伸洋",
  "沢崎誠","近藤誠一","村上淳","丸山奏子","魚谷侑未",
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
function isMleague(p) {
  return MLEAGUE_NAMES.has(normalize(p.name));
}

function filteredPlayers() {
  const q = normalize(state.query);
  return DATA.players
    .filter(p => state.org === "all" || p.org === state.org)
    .filter(p => !state.mleague || isMleague(p))
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

  // Mリーガーボタン（団体フィルタとは独立してトグル）
  const sep = document.createElement("span");
  sep.className = "filter-sep";
  el.orgFilter.appendChild(sep);

  const mb = document.createElement("button");
  mb.className = "org-btn mleague-btn" + (state.mleague ? " active" : "");
  mb.textContent = "Mリーガー";
  mb.onclick = () => { state.mleague = !state.mleague; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(mb);
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

  html += chartSvg(recs);

  html += '<table class="timeline"><thead><tr>' +
          "<th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th>" +
          "</tr></thead><tbody>";
  recs.forEach(r => {
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

// 期ごとのポイント推移（取得できた値のみ）
function chartSvg(recs) {
  const pts = recs.filter(r => r.points !== null)
                  .map(r => ({ term: r.term, p: r.points }))
                  .sort((a, b) => a.term - b.term);
  if (pts.length < 2) return "";
  const W = 600, H = 140, pad = 24;
  const terms = pts.map(d => d.term);
  const vals = pts.map(d => d.p);
  const minT = Math.min(...terms), maxT = Math.max(...terms);
  const minV = Math.min(...vals, 0), maxV = Math.max(...vals, 0);
  const x = t => pad + (maxT === minT ? 0 : (t - minT) / (maxT - minT)) * (W - pad * 2);
  const y = v => H - pad - (maxV === minV ? 0 : (v - minV) / (maxV - minV)) * (H - pad * 2);

  const zeroY = y(0);
  let path = pts.map((d, i) => (i ? "L" : "M") + x(d.term).toFixed(1) + " " + y(d.p).toFixed(1)).join(" ");
  let dots = pts.map(d =>
    '<circle cx="' + x(d.term).toFixed(1) + '" cy="' + y(d.p).toFixed(1) +
    '" r="2.5" fill="' + (d.p < 0 ? "#c0392b" : "#2c5fa8") + '"/>').join("");

  return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
    '<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W - pad) +
    '" y2="' + zeroY.toFixed(1) + '" stroke="#ccc" stroke-dasharray="3 3"/>' +
    '<path d="' + path + '" fill="none" stroke="#2c5fa8" stroke-width="1.5"/>' +
    dots + "</svg></div>";
}

// --- 起動 -------------------------------------------------------------
el.search.addEventListener("input", e => { state.query = e.target.value; renderList(); });
renderOrgFilter();
renderList();
