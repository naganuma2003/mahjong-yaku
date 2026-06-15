"use strict";
// v2026-06-16 女流リーグ成績追加
const DATA = window.MJ_DATA || { organizations: [], players: [] };
const ORGS = {};
DATA.organizations.forEach(o => { ORGS[o.id] = o; });

const state = { org: "all", mleagueC: false, mleagueF: false, mtourn: false, topLeague: false, mcast: false, manalyst: false, mreporter: false, mteam: null, query: "", selectedId: null };

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

// Mリーグ チーム別メンバー（2024-25現役 + 歴代）
const MLEAGUE_TEAMS = [
  { id:"drives",  name:"赤坂ドリブンズ",       short:"ドリブンズ",  color:"#b71c1c",
    current:new Set(["園田賢","鈴木たろう","浅見真紀","渡辺太"]),
    former: new Set(["村上淳","丸山奏子"]) },
  { id:"furin",   name:"EX風林火山",            short:"風林火山",    color:"#4527a0",
    current:new Set(["二階堂亜樹","勝又健志","松ヶ瀬隆弥","二階堂瑠美"]),
    former: new Set(["滝沢和典"]) },
  { id:"sakura",  name:"KADOKAWAサクラナイツ",  short:"サクラナイツ",color:"#ad1457",
    current:new Set(["岡田紗佳","堀慎吾","渋川難波","内川幸太郎"]),
    former: new Set(["沢崎誠"]) },
  { id:"konami",  name:"KONAMI麻雀格闘倶楽部",  short:"格闘倶楽部", color:"#c62828",
    current:new Set(["佐々木寿人","高宮まり","伊達朱里紗","滝沢和典"]),
    former: new Set(["前原雄大","藤崎智"]) },
  { id:"abemas",  name:"渋谷ABEMAS",             short:"ABEMAS",     color:"#0277bd",
    current:new Set(["多井隆晴","白鳥翔","松本吉弘","日向藍子"]),
    former: new Set([]) },
  { id:"phoenix", name:"セガサミーフェニックス",  short:"フェニックス",color:"#e65100",
    current:new Set(["茅森早香","醍醐大","竹内元太","浅井堂岐"]),
    former: new Set(["近藤誠一","魚谷侑未","和久津晶","東城りお"]) },
  { id:"pirates", name:"U-NEXTパイレーツ",       short:"パイレーツ", color:"#1565c0",
    current:new Set(["小林剛","瑞原明奈","鈴木優","仲林圭"]),
    former: new Set(["朝倉康心","石橋伸洋"]) },
  { id:"beast",   name:"BEAST Japanext",          short:"BEAST",      color:"#263238",
    current:new Set(["鈴木大介","中田花奈","猿川真寿","菅原千瑛"]),
    former: new Set([]) },
];

// M関係: 実況
const MCAST = new Set([
  "小林未沙","松嶋桃","日吉辰哉","古橋崇志",
]);

// M関係: 解説（公式解説者 — 現役Mリーガー以外）
const MANALYST = new Set([
  "土田浩翔","藤崎智","河野直也","朝倉康心","石橋伸洋",
  "村上淳","忍田幸夫","沢崎誠","谷井茂文","近藤誠一","前田直哉",
]);

// M関係: リポーター
const MREPORTER = new Set([
  "松本圭世","襟川麻衣子",
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

// 選手が所属（または過去に所属）していた全団体IDを返す
function playerOrgIds(p) {
  const ids = new Set([p.org]);
  (p.records || []).forEach(r => { if (r.orgId) ids.add(r.orgId); });
  return [...ids];
}

// 最新レコードの団体（移籍後が最新）
function currentOrgId(p) {
  if (!p.records || p.records.length === 0) return p.org;
  const latest = p.records.slice().sort((a, b) => {
    const ya = termToYear(a.orgId || p.org, a.term);
    const yb = termToYear(b.orgId || p.org, b.term);
    return yb - ya;
  })[0];
  return latest.orgId || p.org;
}

// --- 選手一覧 ---------------------------------------------------------
function isMleagueC(p)  { return MLEAGUE_CURRENT.has(normalize(p.name)); }
function isMleagueF(p)  { return MLEAGUE_FORMER.has(normalize(p.name)); }
function isMtournament(p) { return MTOURNAMENT.has(normalize(p.name)); }

function isTopLeague(p) {
  if (!p.records || p.records.length === 0) return false;
  const latest = p.records.slice().sort((a, b) => {
    const ya = termToYear(a.orgId || p.org, a.term);
    const yb = termToYear(b.orgId || p.org, b.term);
    return yb - ya;
  })[0];
  const orgId = latest.orgId || p.org;
  const org = ORGS[orgId];
  if (!org) return false;
  const topTier = (org.league.tiers || [])[0];
  return latest.tier === topTier;
}

// 選手がチームに所属（現役/元）しているか返す
function playerTeamStatus(name, team) {
  const n = normalize(name);
  if (team.current.has(n)) return "current";
  if (team.former.has(n))  return "former";
  return null;
}

function filteredPlayers() {
  const q = normalize(state.query);
  const activeTeam = state.mteam ? MLEAGUE_TEAMS.find(t => t.id === state.mteam) : null;

  return DATA.players
    .filter(p => state.org === "all" || playerOrgIds(p).includes(state.org))
    .filter(p => {
      if (!state.mleagueC && !state.mleagueF && !state.mtourn && !state.mcast && !state.manalyst && !state.mreporter && !activeTeam) return true;
      const n = normalize(p.name);
      return (state.mleagueC  && MLEAGUE_CURRENT.has(n))      ||
             (state.mleagueF  && MLEAGUE_FORMER.has(n))        ||
             (state.mtourn    && MTOURNAMENT.has(n))            ||
             (state.mcast     && MCAST.has(n))                  ||
             (state.manalyst  && MANALYST.has(n))               ||
             (state.mreporter && MREPORTER.has(n))              ||
             (activeTeam      && playerTeamStatus(n, activeTeam) !== null);
    })
    .filter(p => !state.topLeague || isTopLeague(p))
    .filter(p => !q || normalize(p.name).includes(q))
    .sort((a, b) => {
      // チーム絞り込み中は現役メンバーを先頭に
      if (activeTeam) {
        const sa = playerTeamStatus(normalize(a.name), activeTeam);
        const sb = playerTeamStatus(normalize(b.name), activeTeam);
        if (sa !== sb) return sa === "current" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "ja");
    });
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

  // M関係セクション
  const mlabel = document.createElement("span");
  mlabel.className = "filter-section-label";
  mlabel.textContent = "M関係";
  el.orgFilter.appendChild(mlabel);

  const cast = document.createElement("button");
  cast.className = "org-btn mcast-btn" + (state.mcast ? " active" : "");
  cast.textContent = "実況";
  cast.onclick = () => { state.mcast = !state.mcast; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(cast);

  const analyst = document.createElement("button");
  analyst.className = "org-btn manalyst-btn" + (state.manalyst ? " active" : "");
  analyst.textContent = "解説";
  analyst.onclick = () => { state.manalyst = !state.manalyst; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(analyst);

  const reporter = document.createElement("button");
  reporter.className = "org-btn mreporter-btn" + (state.mreporter ? " active" : "");
  reporter.textContent = "リポーター";
  reporter.onclick = () => { state.mreporter = !state.mreporter; renderOrgFilter(); renderList(); };
  el.orgFilter.appendChild(reporter);

  // Mチームセクション
  const tlabel = document.createElement("span");
  tlabel.className = "filter-section-label";
  tlabel.textContent = "Mチーム";
  el.orgFilter.appendChild(tlabel);

  MLEAGUE_TEAMS.forEach(t => {
    const b = document.createElement("button");
    const isActive = state.mteam === t.id;
    b.className = "org-btn team-btn";
    b.textContent = t.short;
    b.style.borderColor = t.color;
    b.style.color = isActive ? "#fff" : t.color;
    b.style.background = isActive ? t.color : "#fff";
    b.onclick = () => {
      state.mteam = state.mteam === t.id ? null : t.id;
      renderOrgFilter();
      renderList();
    };
    el.orgFilter.appendChild(b);
  });
}

function renderList() {
  const list = filteredPlayers();
  el.playerCount.textContent = list.length + " 名";
  el.playerList.innerHTML = "";
  const activeTeam = state.mteam ? MLEAGUE_TEAMS.find(t => t.id === state.mteam) : null;
  list.forEach(p => {
    const li = document.createElement("li");
    if (p.id === state.selectedId) li.className = "selected";
    const curOrg = ORGS[currentOrgId(p)];
    const isTransfer = playerOrgIds(p).length > 1;
    let teamBadge = "";
    if (activeTeam) {
      const status = playerTeamStatus(normalize(p.name), activeTeam);
      if (status === "current") teamBadge = '<span class="pteam pteam-current">現役</span>';
      else if (status === "former") teamBadge = '<span class="pteam pteam-former">元</span>';
    }
    li.innerHTML =
      '<span class="pname">' + p.name + "</span>" +
      '<span class="porg' + (isTransfer ? " transfer" : "") + '">' +
      (curOrg ? curOrg.shortName : "") + (isTransfer ? "↩" : "") + "</span>" +
      teamBadge;
    li.onclick = () => { state.selectedId = p.id; renderList(); renderDetail(p); };
    el.playerList.appendChild(li);
  });
}

// --- 年表 -------------------------------------------------------------
function renderDetail(p) {
  const allRecs = p.records.slice().sort((a, b) => b.term - a.term);

  // 団体ごとにグループ分け
  const orgGroups = {};
  allRecs.forEach(r => {
    const oid = r.orgId || p.org;
    if (!orgGroups[oid]) orgGroups[oid] = [];
    orgGroups[oid].push(r);
  });
  const orgIds = Object.keys(orgGroups).sort((a, b) => {
    const minA = Math.min(...orgGroups[a].map(r => termToYear(a, r.term)));
    const minB = Math.min(...orgGroups[b].map(r => termToYear(b, r.term)));
    return minA - minB;
  });
  const isMultiOrg = orgIds.length > 1;

  const totalPlayoffs = allRecs.filter(r => r.category === "playoff" || r.category === "champion").length;

  let html = '<div class="detail-head"><h2>' + p.name + "</h2>";
  if (isMultiOrg) {
    html += '<span class="transfer-badge">移籍歴あり</span>';
  } else {
    const org = ORGS[p.org] || {};
    html += '<span class="org-name">' + (org.name || "") + "</span>";
  }
  html += "</div>";

  if (isMultiOrg) {
    html += '<div class="summary">';
    html += stat(allRecs.length, "総出場期数");
    html += stat(totalPlayoffs, "決定戦/優勝");
    html += "</div>";
  }

  orgIds.forEach((oid, idx) => {
    const org = ORGS[oid] || {};
    const league = org.league || {};
    const groupRecs = orgGroups[oid].slice().sort((a, b) => b.term - a.term);
    const groupPlayoffs = groupRecs.filter(r => r.category === "playoff" || r.category === "champion").length;
    const topTier = groupRecs
      .map(r => r.tier)
      .sort((a, b) => (league.tiers || []).indexOf(a) - (league.tiers || []).indexOf(b))[0] || "-";

    if (isMultiOrg) {
      html += '<div class="org-section' + (idx === 0 ? " org-section-first" : "") + '">';
      html += '<div class="org-section-head">';
      html += '<span class="org-name">' + (org.name || "") + "</span>";
      html += '<span class="league-name">' + (league.name || "") + "</span>";
      html += "</div>";
      html += '<div class="summary summary-sm">';
      html += stat(groupRecs.length, "出場期数");
      html += stat(topTier, "最高到達");
      html += stat(groupPlayoffs, "決定戦/優勝");
      html += "</div>";
    } else {
      html += '<div class="detail-head"><span class="league-name">' + (league.name || "") + " 成績</span></div>";
      html += '<div class="summary">';
      html += stat(groupRecs.length, "出場期数");
      html += stat(topTier, "最高到達");
      html += stat(groupPlayoffs, "決定戦/優勝");
      html += "</div>";
    }

    html += chartSvg(groupRecs, oid);

    const termsSorted = groupRecs.slice().sort((a, b) => a.term - b.term);
    const displayItems = [];
    for (let i = 0; i < termsSorted.length; i++) {
      if (i > 0) {
        const prev = termsSorted[i - 1].term;
        const curr = termsSorted[i].term;
        if (curr - prev > 1) displayItems.push({ gap: true, from: prev + 1, to: curr - 1 });
      }
      displayItems.push({ gap: false, rec: termsSorted[i] });
    }
    displayItems.reverse();

    html += '<table class="timeline"><thead><tr><th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th></tr></thead><tbody>';
    displayItems.forEach(item => {
      if (item.gap) {
        const count = item.to - item.from + 1;
        const label = item.from === item.to
          ? "第" + item.from + "期"
          : "第" + item.from + "期〜第" + item.to + "期";
        const note = count >= 3 ? "休戦の可能性" : "データなし";
        html += '<tr class="gap-row"><td class="term">' + label + "</td><td colspan='3'>" + note + "（" + count + "期分）</td></tr>";
      } else {
        const r = item.rec;
        const rowCls = r.ongoing ? ' class="ongoing"' : "";
        const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
        const rankHtml = (r.rank !== undefined && r.rank !== null) ? ' <span class="rank">' + r.rank + "位</span>" : "";
        const halfHtml = (r.half && r.half !== "annual") ? ' <span class="half">' + r.half + "</span>" : "";
        const resultText = (r.result || "") + rankHtml + halfHtml || "—";
        html += "<tr" + rowCls + ">" +
          '<td class="term">第' + r.term + "期</td>" +
          '<td><span class="tier-badge ' + tierClass(r.tier) + '">' + r.tier + "</span></td>" +
          '<td class="result-' + r.category + '">' + resultText + "</td>" +
          '<td class="points ' + ptsCls + '">' + fmtPoints(r.points) + "</td></tr>";
      }
    });
    html += "</tbody></table>";

    if (isMultiOrg) html += "</div>";
  });

  if (!allRecs.length) {
    html += '<p style="color:var(--muted);margin-top:16px">リーグ成績データなし</p>';
  }

  if (p.sourceUrl) {
    html += '<div class="source-link">出典: <a href="' + p.sourceUrl + '" target="_blank" rel="noopener">' + p.sourceUrl + "</a></div>";
  }

  if (p.wrecords && p.wrecords.length) {
    html += '<hr class="section-divider">';
    html += renderWleagueSection(p);
  }

  el.detail.innerHTML = html;
}

function stat(num, lbl) {
  return '<div class="stat"><div class="num">' + num +
         '</div><div class="lbl">' + lbl + "</div></div>";
}

// 期 → 西暦変換（団体別）
function termToYear(orgId, term) {
  if (orgId === "renmei")     return 1983 + term; // 第1期=1984
  if (orgId === "saikouisen") return 1975 + term; // 第1期=1976
  if (orgId === "kyokai")     return 2000 + term; // 第1期=2001
  if (orgId === "rmu")        return 2006 + term; // 第1期=2007
  if (orgId === "mu")         return 2002 + term; // 第1期=2003
  return term;
}

// 女流リーグ用 期 → 西暦変換（wleague.termOffset を使用）
function wTermToYear(wleague, term) {
  const offset = (wleague && wleague.termOffset) ? wleague.termOffset : 0;
  return offset ? offset + term : term;
}

// 期ごとのリーグ・順位推移（上位リーグ＝上、同リーグ内は順位で調整）
function chartSvg(recs, orgId) {
  const org = ORGS[orgId] || {};
  const tiers = (org.league || {}).tiers || [];
  if (!tiers.length) return "";

  const pts = recs
    .filter(r => tiers.includes(r.tier))
    .map(r => ({ year: termToYear(orgId, r.term), tier: r.tier, rank: r.rank || null }))
    .sort((a, b) => a.year - b.year);
  if (pts.length < 2) return "";

  // 表示tier範囲（実績±1）
  const usedIdx = pts.map(d => tiers.indexOf(d.tier));
  const showMin = Math.max(0, Math.min(...usedIdx) - 1);
  const showMax = Math.min(tiers.length - 1, Math.max(...usedIdx) + 1);
  const numBands = showMax - showMin + 1;

  const W = 600, H = 200;
  const padL = 48, padR = 16, padT = 12, padB = 34;
  const chartH = H - padT - padB;

  const MAX_RANK = 16;
  function toV(tier, rank) {
    const i = tiers.indexOf(tier) - showMin;
    const adj = rank != null ? (MAX_RANK - Math.min(rank, MAX_RANK)) / MAX_RANK : 0.5;
    return (numBands - 1 - i) + adj;
  }

  const years = pts.map(d => d.year);
  const minYr = Math.min(...years), maxYr = Math.max(...years);
  const xFn = yr => padL + (maxYr === minYr ? (W - padL - padR) / 2
                           : (yr - minYr) / (maxYr - minYr)) * (W - padL - padR);
  const yFn = v  => padT + (1 - v / numBands) * chartH;

  const yearRange = maxYr - minYr;
  const xStep = yearRange > 20 ? 5 : yearRange > 10 ? 2 : 1;
  const xTicks = [];
  for (let yr = Math.ceil(minYr / xStep) * xStep; yr <= maxYr; yr += xStep) xTicks.push(yr);

  const axisY = padT + chartH;
  const TC = { A: '#c0392b', B: '#2c5fa8', C: '#3a8c4f', D: '#7d5ba6', E: '#c77f1a' };

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';

  tiers.slice(showMin, showMax + 1).forEach((tier, i) => {
    const top = yFn(numBands - i).toFixed(1);
    const bot = yFn(numBands - i - 1).toFixed(1);
    const c = TC[tier.charAt(0)] || '#8a93a2';
    svg += '<rect x="' + padL + '" y="' + top + '" width="' + (W - padL - padR) +
           '" height="' + (parseFloat(bot) - parseFloat(top)).toFixed(1) +
           '" fill="' + c + '" fill-opacity="0.05"/>';
    svg += '<line x1="' + padL + '" y1="' + top + '" x2="' + (W - padR) + '" y2="' + top + '" stroke="#e2e5ea"/>';
    const midY = ((parseFloat(top) + parseFloat(bot)) / 2 + 4).toFixed(1);
    svg += '<text x="' + (padL - 5) + '" y="' + midY +
           '" text-anchor="end" font-size="11" fill="' + c + '" font-weight="700">' + tier + '</text>';
  });
  svg += '<line x1="' + padL + '" y1="' + yFn(0).toFixed(1) + '" x2="' + (W - padR) +
         '" y2="' + yFn(0).toFixed(1) + '" stroke="#e2e5ea"/>';

  svg += '<line x1="' + padL + '" y1="' + axisY + '" x2="' + (W - padR) + '" y2="' + axisY + '" stroke="#ccc"/>';
  xTicks.forEach(yr => {
    if (yr < minYr || yr > maxYr) return;
    const cx = xFn(yr).toFixed(1);
    svg += '<line x1="' + cx + '" y1="' + axisY + '" x2="' + cx + '" y2="' + (axisY + 4) + '" stroke="#aaa"/>';
    svg += '<text x="' + cx + '" y="' + (axisY + 16) +
           '" text-anchor="middle" font-size="10" fill="#8a93a2">' + yr + '</text>';
  });

  const path = pts.map((d, i) => {
    const v = toV(d.tier, d.rank);
    return (i ? 'L' : 'M') + xFn(d.year).toFixed(1) + ' ' + yFn(v).toFixed(1);
  }).join(' ');
  svg += '<path d="' + path + '" fill="none" stroke="#555" stroke-width="1.5"/>';

  pts.forEach(d => {
    const v = toV(d.tier, d.rank);
    const c = TC[d.tier.charAt(0)] || '#8a93a2';
    svg += '<circle cx="' + xFn(d.year).toFixed(1) + '" cy="' + yFn(v).toFixed(1) +
           '" r="3" fill="' + c + '"/>';
  });

  svg += '</svg>';
  return '<div class="chart">' + svg + '</div>';
}

// 女流リーグ用折れ線グラフ（wleague設定を使用）
function wchartSvg(wrecords, wleague) {
  const tiers = (wleague || {}).tiers || [];
  if (!tiers.length) return "";

  const pts = wrecords
    .filter(r => tiers.includes(r.tier))
    .map(r => ({ year: wTermToYear(wleague, r.term), tier: r.tier, rank: r.rank || null }))
    .sort((a, b) => a.year - b.year);
  if (pts.length < 2) return "";

  const usedIdx = pts.map(d => tiers.indexOf(d.tier));
  const showMin = Math.max(0, Math.min(...usedIdx) - 1);
  const showMax = Math.min(tiers.length - 1, Math.max(...usedIdx) + 1);
  const numBands = showMax - showMin + 1;

  const W = 600, H = 160;
  const padL = 52, padR = 16, padT = 12, padB = 34;
  const chartH = H - padT - padB;

  const MAX_RANK = 12;
  function toV(tier, rank) {
    const i = tiers.indexOf(tier) - showMin;
    const adj = rank != null ? (MAX_RANK - Math.min(rank, MAX_RANK)) / MAX_RANK : 0.5;
    return (numBands - 1 - i) + adj;
  }

  const years = pts.map(d => d.year);
  const minYr = Math.min(...years), maxYr = Math.max(...years);
  const xFn = yr => padL + (maxYr === minYr ? (W - padL - padR) / 2
                           : (yr - minYr) / (maxYr - minYr)) * (W - padL - padR);
  const yFn = v  => padT + (1 - v / numBands) * chartH;

  const yearRange = maxYr - minYr;
  const xStep = yearRange > 20 ? 5 : yearRange > 10 ? 2 : 1;
  const xTicks = [];
  for (let yr = Math.ceil(minYr / xStep) * xStep; yr <= maxYr; yr += xStep) xTicks.push(yr);

  const axisY = padT + chartH;
  const TC = { A: '#c0392b', B: '#2c5fa8', C: '#3a8c4f', D: '#7d5ba6', E: '#c77f1a' };

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';

  tiers.slice(showMin, showMax + 1).forEach((tier, i) => {
    const top = yFn(numBands - i).toFixed(1);
    const bot = yFn(numBands - i - 1).toFixed(1);
    const c = TC[tier.charAt(0)] || '#8a93a2';
    svg += '<rect x="' + padL + '" y="' + top + '" width="' + (W - padL - padR) +
           '" height="' + (parseFloat(bot) - parseFloat(top)).toFixed(1) +
           '" fill="' + c + '" fill-opacity="0.05"/>';
    svg += '<line x1="' + padL + '" y1="' + top + '" x2="' + (W - padR) + '" y2="' + top + '" stroke="#e2e5ea"/>';
    const midY = ((parseFloat(top) + parseFloat(bot)) / 2 + 4).toFixed(1);
    const label = tier.length > 2 ? tier : "女流" + tier;
    svg += '<text x="' + (padL - 5) + '" y="' + midY +
           '" text-anchor="end" font-size="10" fill="' + c + '" font-weight="700">' + label + '</text>';
  });
  svg += '<line x1="' + padL + '" y1="' + yFn(0).toFixed(1) + '" x2="' + (W - padR) +
         '" y2="' + yFn(0).toFixed(1) + '" stroke="#e2e5ea"/>';

  svg += '<line x1="' + padL + '" y1="' + axisY + '" x2="' + (W - padR) + '" y2="' + axisY + '" stroke="#ccc"/>';
  xTicks.forEach(yr => {
    if (yr < minYr || yr > maxYr) return;
    const cx = xFn(yr).toFixed(1);
    svg += '<line x1="' + cx + '" y1="' + axisY + '" x2="' + cx + '" y2="' + (axisY + 4) + '" stroke="#aaa"/>';
    svg += '<text x="' + cx + '" y="' + (axisY + 16) +
           '" text-anchor="middle" font-size="10" fill="#8a93a2">' + yr + '</text>';
  });

  const path = pts.map((d, i) => {
    const v = toV(d.tier, d.rank);
    return (i ? 'L' : 'M') + xFn(d.year).toFixed(1) + ' ' + yFn(v).toFixed(1);
  }).join(' ');
  svg += '<path d="' + path + '" fill="none" stroke="#d08090" stroke-width="1.5"/>';

  pts.forEach(d => {
    const v = toV(d.tier, d.rank);
    const c = TC[d.tier.charAt(0)] || '#d08090';
    svg += '<circle cx="' + xFn(d.year).toFixed(1) + '" cy="' + yFn(v).toFixed(1) +
           '" r="3" fill="' + c + '"/>';
  });

  svg += '</svg>';
  return '<div class="chart">' + svg + '</div>';
}

// 女流リーグ表示セクション（renderDetail内で呼ぶ）
function renderWleagueSection(p) {
  const wl = p.wleague || {};
  const wrecords = (p.wrecords || []).slice().sort((a, b) => b.term - a.term);
  if (!wrecords.length) return "";

  const tiers = wl.tiers || [];
  const topTier = wrecords
    .map(r => r.tier)
    .sort((a, b) => tiers.indexOf(a) - tiers.indexOf(b))[0] || "-";

  let html = '<div class="wleague-section">';
  html += '<div class="wleague-head"><span class="wleague-name">' +
          (wl.name || "女流リーグ") + ' 成績</span></div>';

  html += '<div class="summary">';
  html += stat(wrecords.length, "出場期数");
  html += stat(topTier, "最高到達");
  html += '</div>';

  html += wchartSvg(wrecords, wl);

  const termsSorted = wrecords.slice().sort((a, b) => a.term - b.term);
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
          '<th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th>' +
          '</tr></thead><tbody>';
  displayItems.forEach(item => {
    if (item.gap) {
      const count = item.to - item.from + 1;
      const label = item.from === item.to
        ? "第" + item.from + "期"
        : "第" + item.from + "期〜第" + item.to + "期";
      html += '<tr class="gap-row">' +
        '<td class="term">' + label + '</td>' +
        '<td colspan="3">データなし（' + count + '期分）</td>' +
        '</tr>';
    } else {
      const r = item.rec;
      const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
      const rankHtml = (r.rank !== undefined && r.rank !== null)
        ? ' <span class="rank">' + r.rank + '位</span>' : "";
      const tierLabel = r.tier.length <= 2 ? "女流" + r.tier : r.tier;
      html += '<tr>' +
        '<td class="term">第' + r.term + '期</td>' +
        '<td><span class="tier-badge ' + tierClass(r.tier) + '">' + tierLabel + '</span></td>' +
        '<td class="result-' + r.category + '">' + (r.result || "—") + rankHtml + '</td>' +
        '<td class="points ' + ptsCls + '">' + fmtPoints(r.points) + '</td>' +
        '</tr>';
    }
  });
  html += '</tbody></table>';
  html += '</div>';
  return html;
}

// --- 起動 -------------------------------------------------------------
el.search.addEventListener("input", e => { state.query = e.target.value; renderList(); });
renderOrgFilter();
renderList();
