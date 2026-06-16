"use strict";
// v2026-06-16 女流リーグ成績追加
const DATA = window.MJ_DATA || { organizations: [], players: [] };
const ORGS = {};
DATA.organizations.forEach(o => { ORGS[o.id] = o; });

const state = { org: "all", mleagueC: false, mleagueF: false, mtourn: false, topLeague: false, wleague: false, playoff: false, ongoingOnly: false, mcast: false, manalyst: false, mreporter: false, mteam: null, teamOpen: false, query: "", year: "", selectedId: null, sort: "name", favOnly: false, showAll: false };

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
  "沢崎誠","近藤誠一","村上淳","丸山奏子","魚谷侑未","東城りお",
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
  { id:"team9",   name:"新チーム(2025-26)",         short:"新チーム",   color:"#00695c",
    current:new Set(["萩原聖人","瀬戸熊直樹","黒沢咲","本田朋広"]),
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
  sortSelect: document.getElementById("sortSelect"),
  playerCount: document.getElementById("playerCount"),
  playerList: document.getElementById("playerList"),
  detail: document.getElementById("detail"),
};

// --- ユーティリティ ---------------------------------------------------
const TIER_MAP = { "μ": "A", "μ2": "B", "ツアー": "C" };
function tierClass(tier) {
  const t = TIER_MAP[tier] || tier || "";
  const c = t.charAt(0).toUpperCase();
  return ["A", "B", "C", "D", "E", "F"].includes(c) ? "tier-" + c : "tier-other";
}
function tierKey(tier) { return (TIER_MAP[tier] || tier || "").charAt(0); }

function fmtPoints(p) {
  if (p === null || p === undefined) return "";
  if (p < 0) return "▲" + Math.abs(p).toFixed(1);
  return p.toFixed(1);
}

function normalize(s) {
  // スペース除去 + カタカナ→ひらがな変換（どちらで検索しても一致するよう）
  return (s || "").replace(/\s|　/g, "")
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
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
function isTopLeague(p) {
  if (!p.records || p.records.length === 0) return false;
  return p.records.some(r => {
    const orgId = r.orgId || p.org;
    const org = ORGS[orgId];
    if (!org) return false;
    const topTier = (org.league.tiers || [])[0];
    const tier = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
    return tier === topTier;
  });
}

// 選手がチームに所属（現役/元）しているか返す
function playerTeamStatus(name, team) {
  const n = normalize(name);
  if (team.current.has(n)) return "current";
  if (team.former.has(n))  return "former";
  return null;
}

function resetAndRenderList() { state.showAll = false; renderList(); }

function filteredPlayers() {
  const q = normalize(state.query);
  const activeTeam = state.mteam ? MLEAGUE_TEAMS.find(t => t.id === state.mteam) : null;
  const favs = state.favOnly ? getFavs() : null;

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
    .filter(p => !state.wleague || (p.wrecords && p.wrecords.length > 0))
    .filter(p => !state.favOnly || (favs && favs.has(p.id)))
    .filter(p => !state.playoff || (p.records || []).some(r => r.category === "playoff") || (p.wrecords || []).some(r => r.category === "playoff"))
    .filter(p => !state.ongoingOnly || (p.records || []).some(r => r.ongoing) || (p.wrecords || []).some(r => r.ongoing))
    .filter(p => {
      if (!state.year) return true;
      const yr = parseInt(state.year, 10);
      if (!yr) return true;
      return (p.records || []).some(r => termToYear(r.orgId || p.org, r.term) === yr) ||
             (p.wrecords || []).some(r => wTermToYear(p.wleague || {}, r.term) === yr);
    })
    .filter(p => {
      if (!q) return true;
      if (normalize(p.name).includes(q)) return true;
      const titles = (p.profile && p.profile.titles) ? p.profile.titles.join("") : "";
      if (titles.includes(q)) return true;
      const nick = (p.profile && p.profile.nickname) ? normalize(p.profile.nickname) : "";
      if (nick.includes(q)) return true;
      // 団体名検索（「連盟」「協会」「最高位」等）
      const orgIds = playerOrgIds(p);
      return orgIds.some(oid => {
        const org = ORGS[oid] || {};
        return (org.name || "").includes(q) || (org.shortName || "").includes(q) ||
               ((org.league || {}).name || "").includes(q);
      }) || ((p.wleague || {}).name || "").includes(q);
    })
    .sort((a, b) => {
      // 検索クエリがある場合は名前の前方一致を優先
      if (q) {
        const an = normalize(a.name), bn = normalize(b.name);
        const aStart = an.startsWith(q) ? 0 : 1;
        const bStart = bn.startsWith(q) ? 0 : 1;
        if (aStart !== bStart) return aStart - bStart;
      }
      // チーム絞り込み中は現役メンバーを先頭に
      if (activeTeam) {
        const sa = playerTeamStatus(normalize(a.name), activeTeam);
        const sb = playerTeamStatus(normalize(b.name), activeTeam);
        if (sa !== sb) return sa === "current" ? -1 : 1;
      }
      if (state.sort === "records") {
        return (b.records.length + (b.wrecords ? b.wrecords.length : 0)) -
               (a.records.length + (a.wrecords ? a.wrecords.length : 0));
      }
      if (state.sort === "recent") {
        const latestYear = p => {
          if ((p.records || []).some(r => r.ongoing) || (p.wrecords || []).some(r => r.ongoing)) return 9999;
          const years = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term))
            .concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)))
            .filter(y => y > 1000);
          return years.length ? Math.max(...years) : 0;
        };
        return latestYear(b) - latestYear(a);
      }
      if (state.sort === "debut") {
        const debutYear = p => {
          const years = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term))
            .concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)))
            .filter(y => y > 1000);
          return years.length ? Math.min(...years) : 9999;
        };
        return debutYear(a) - debutYear(b);
      }
      if (state.sort === "pts") {
        const ongoingPts = p => {
          const r = (p.records || []).find(x => x.ongoing) || (p.wrecords || []).find(x => x.ongoing);
          return r && r.points != null ? r.points : -Infinity;
        };
        return ongoingPts(b) - ongoingPts(a);
      }
      if (state.sort === "avgpts") {
        const avgPts = p => {
          const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
          return recs.length >= 3 ? recs.reduce((s, r) => s + r.points, 0) / recs.length : -Infinity;
        };
        return avgPts(b) - avgPts(a);
      }
      if (state.sort === "totalpts") {
        const totalPts = p => {
          const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
          return recs.length >= 2 ? recs.reduce((s, r) => s + r.points, 0) : -Infinity;
        };
        return totalPts(b) - totalPts(a);
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
    b.onclick = () => { state.org = o.id; renderOrgFilter(); resetAndRenderList(); };
    el.orgFilter.appendChild(b);
  });

  // 独立トグル（Mリーガー / 最高リーグ）
  const sep = document.createElement("span");
  sep.className = "filter-sep";
  el.orgFilter.appendChild(sep);

  const mc = document.createElement("button");
  mc.className = "org-btn mleague-btn" + (state.mleagueC ? " active" : "");
  mc.textContent = "現Mリーガー";
  mc.onclick = () => { state.mleagueC = !state.mleagueC; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mc);

  const mf = document.createElement("button");
  mf.className = "org-btn mleague-former-btn" + (state.mleagueF ? " active" : "");
  mf.textContent = "旧Mリーガー";
  mf.onclick = () => { state.mleagueF = !state.mleagueF; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mf);

  const mt = document.createElement("button");
  mt.className = "org-btn mtourn-btn" + (state.mtourn ? " active" : "");
  mt.textContent = "Mトーナメント";
  mt.onclick = () => { state.mtourn = !state.mtourn; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mt);

  const tb = document.createElement("button");
  tb.className = "org-btn topleague-btn" + (state.topLeague ? " active" : "");
  tb.textContent = "最高リーグ"; tb.title = "各団体の最高位リーグに在籍経験あり";
  tb.onclick = () => { state.topLeague = !state.topLeague; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(tb);

  const wb = document.createElement("button");
  wb.className = "org-btn wleague-btn" + (state.wleague ? " active" : "");
  wb.textContent = "女流あり"; wb.title = "女流リーグの成績データあり";
  wb.onclick = () => { state.wleague = !state.wleague; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(wb);

  const favBtn = document.createElement("button");
  favBtn.className = "org-btn fav-btn" + (state.favOnly ? " active" : "");
  favBtn.textContent = "☆ お気に入り"; favBtn.title = "お気に入り登録した選手のみ表示";
  favBtn.onclick = () => { state.favOnly = !state.favOnly; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(favBtn);

  const poBtn = document.createElement("button");
  poBtn.className = "org-btn playoff-btn" + (state.playoff ? " active" : "");
  poBtn.textContent = "★ 決定戦経験"; poBtn.title = "決定戦（プレーオフ）進出経験あり";
  poBtn.onclick = () => { state.playoff = !state.playoff; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(poBtn);

  const onBtn = document.createElement("button");
  onBtn.className = "org-btn ongoing-filter-btn" + (state.ongoingOnly ? " active" : "");
  onBtn.textContent = "今期出場中"; onBtn.title = "今シーズン現在リーグ出場中の選手";
  onBtn.onclick = () => { state.ongoingOnly = !state.ongoingOnly; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(onBtn);

  // M関係セクション
  const mlabel = document.createElement("span");
  mlabel.className = "filter-section-label";
  mlabel.textContent = "M関係";
  el.orgFilter.appendChild(mlabel);

  const cast = document.createElement("button");
  cast.className = "org-btn mcast-btn" + (state.mcast ? " active" : "");
  cast.textContent = "実況";
  cast.onclick = () => { state.mcast = !state.mcast; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(cast);

  const analyst = document.createElement("button");
  analyst.className = "org-btn manalyst-btn" + (state.manalyst ? " active" : "");
  analyst.textContent = "解説";
  analyst.onclick = () => { state.manalyst = !state.manalyst; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(analyst);

  const reporter = document.createElement("button");
  reporter.className = "org-btn mreporter-btn" + (state.mreporter ? " active" : "");
  reporter.textContent = "リポーター";
  reporter.onclick = () => { state.mreporter = !state.mreporter; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(reporter);

  // Mチームセクション（折りたたみ）
  const teamOpen = state.teamOpen || !!state.mteam;
  const tlabel = document.createElement("button");
  tlabel.className = "filter-section-label filter-section-toggle";
  tlabel.textContent = (teamOpen ? "▲" : "▼") + " Mチーム";
  tlabel.onclick = () => {
    state.teamOpen = !state.teamOpen;
    renderOrgFilter();
  };
  el.orgFilter.appendChild(tlabel);

  const teamWrap = document.createElement("div");
  teamWrap.id = "teamFilterWrap";
  teamWrap.style.cssText = "display:" + (teamOpen ? "flex" : "none") + ";flex-wrap:wrap;gap:6px;width:100%";
  el.orgFilter.appendChild(teamWrap);

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
    teamWrap.appendChild(b);
  });

  // モバイル用フィルタートグルボタンのラベルを更新
  const activeCount = [state.org !== "all", state.mleagueC, state.mleagueF, state.mtourn,
    state.topLeague, state.wleague, state.playoff, state.ongoingOnly, state.mcast, state.manalyst, state.mreporter, !!state.mteam, !!state.year, state.favOnly]
    .filter(Boolean).length;
  const toggleBtn = document.getElementById("filterToggle");
  if (toggleBtn) {
    const isOpen = el.orgFilter.classList.contains("open");
    toggleBtn.textContent = (isOpen ? "▲ 絞り込みを隠す" : "▼ 絞り込みを表示") +
      (activeCount ? " (" + activeCount + ")" : "");
  }

  // フィルタークリアボタン
  const anyActive = activeCount > 0;
  if (anyActive) {
    const clr = document.createElement("button");
    clr.className = "org-btn clear-btn";
    clr.textContent = "✕ フィルタークリア";
    clr.onclick = () => {
      Object.assign(state, { org:"all", mleagueC:false, mleagueF:false, mtourn:false,
        topLeague:false, wleague:false, playoff:false, ongoingOnly:false, mcast:false, manalyst:false, mreporter:false, mteam:null, year:"", favOnly:false });
      document.getElementById("yearFilter").value = "";
      renderOrgFilter(); renderList();
    };
    el.orgFilter.appendChild(clr);
  }
}

function highlightName(name, q) {
  if (!q) return name;
  const norm = normalize(name);
  const idx = norm.indexOf(q);
  if (idx < 0) return name;
  return name.slice(0, idx) + '<mark class="hl">' + name.slice(idx, idx + q.length) + '</mark>' + name.slice(idx + q.length);
}

function renderList() {
  const _favs = getFavs(); // キャッシュ（localStorage読み込みを1回に）
  const list = filteredPlayers();
  const _q = normalize(state.query);
  const total = DATA.players.length;
  const filterTags = [];
  if (state.org !== "all") { const o = ORGS[state.org]; if (o) filterTags.push(o.shortName); }
  if (state.mleagueC) filterTags.push("Mリーグ現役");
  if (state.mleagueF) filterTags.push("Mリーグ元");
  if (state.mtourn)   filterTags.push("Mトーナメント");
  if (state.mteam)    { const t = MLEAGUE_TEAMS.find(x => x.id === state.mteam); if (t) filterTags.push(t.short); }
  if (state.topLeague) filterTags.push("最高リーグ");
  if (state.wleague)   filterTags.push("女流あり");
  if (state.playoff)   filterTags.push("決定戦経験");
  if (state.ongoingOnly) filterTags.push("今期出場中");
  if (state.favOnly)   filterTags.push("お気に入り");
  if (state.year)      filterTags.push(state.year + "年");
  const countText = list.length < total ? list.length + " / " + total + " 名" : total + " 名";
  el.playerCount.textContent = filterTags.length ? countText + " ・ " + filterTags.join("・") : countText;
  el.playerList.innerHTML = "";
  if (!list.length) {
    const li = document.createElement("li");
    li.style.cssText = "color:var(--muted);font-size:13px;justify-content:center;cursor:default;white-space:normal;text-align:center;line-height:1.6";
    li.textContent = state.favOnly
      ? "お気に入りがまだありません。選手詳細の ☆ ボタンで追加できます"
      : "該当する選手がいません";
    el.playerList.appendChild(li);
    return;
  }
  const LIST_CAP = 200;
  const activeTeam = state.mteam ? MLEAGUE_TEAMS.find(t => t.id === state.mteam) : null;
  // 選択中の選手が表示範囲外にある場合はその位置まで表示
  const selectedIdx = state.selectedId ? list.findIndex(p => p.id === state.selectedId) : -1;
  const capEnd = state.showAll ? list.length : Math.max(LIST_CAP, selectedIdx + 1);
  const visibleList = list.length > capEnd ? list.slice(0, capEnd) : list;
  visibleList.forEach(p => {
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
    // 今期出場中
    const ongoingRec = (p.records || []).find(r => r.ongoing) || (p.wrecords || []).find(r => r.ongoing);
    const hasOngoing = !!ongoingRec;
    const ongoingBadge = hasOngoing ? '<span class="p-ongoing">今期</span>' : "";
    // 今期のポイント（ongoingフィルターON時のみ表示）
    let ongoingPts = "";
    if (state.ongoingOnly && ongoingRec && ongoingRec.points != null) {
      const pts = ongoingRec.points;
      const sign = pts >= 0 ? "+" : "";
      ongoingPts = '<span class="p-pts' + (pts >= 0 ? " pos" : " neg") + '">' + sign + pts.toFixed(1) + '</span>';
    }
    // 最新のティアを取得
    const latestRec = (p.records || []).filter(r => !r.ongoing)
      .sort((a, b) => termToYear(b.orgId || p.org, b.term) - termToYear(a.orgId || p.org, a.term))[0];
    const latestTier = latestRec
      ? ((latestRec.tier === "後期" || latestRec.tier === "前期") ? (latestRec.result || latestRec.tier) : latestRec.tier)
      : null;
    const tierBadge = latestTier
      ? '<span class="ptier tier-badge ' + tierClass(latestTier) + '">' + latestTier + '</span>'
      : "";
    // 昇降級トレンドアイコン
    let trendIcon = "";
    if (latestRec) {
      if (latestRec.category === "promotion") trendIcon = '<span class="p-trend trend-up" title="昇級">↑</span>';
      else if (latestRec.category === "demotion") trendIcon = '<span class="p-trend trend-dn" title="降級">↓</span>';
    }
    // M関係ロールラベル（成績なし選手のみ）
    let roleLabel = "";
    if (!latestRec && !curOrg) {
      const pn = normalize(p.name);
      if (MCAST.has(pn))     roleLabel = '<span class="prole role-cast">実況</span>';
      else if (MANALYST.has(pn))  roleLabel = '<span class="prole role-analyst">解説</span>';
      else if (MREPORTER.has(pn)) roleLabel = '<span class="prole role-reporter">リポーター</span>';
    }
    const favStar = _favs.has(p.id) ? '<span class="p-fav">★</span>' : "";
    li.innerHTML =
      '<span class="pname">' + highlightName(p.name, _q) + "</span>" +
      '<span class="pright">' +
      '<span class="porg' + (isTransfer ? " transfer" : "") + '">' +
      (curOrg ? curOrg.shortName : "") + (isTransfer ? "↩" : "") + "</span>" +
      ongoingBadge + tierBadge + trendIcon + roleLabel + teamBadge + ongoingPts + favStar +
      '</span>';
    li.onclick = () => { state.selectedId = p.id; renderList(); renderDetail(p); };
    el.playerList.appendChild(li);
  });
  if (visibleList.length < list.length) {
    const more = document.createElement("li");
    more.style.cssText = "justify-content:center;cursor:pointer;color:var(--accent);font-size:13px;font-weight:600";
    more.textContent = "もっと見る（残り " + (list.length - visibleList.length) + " 名）";
    more.onclick = () => { state.showAll = true; renderList(); };
    el.playerList.appendChild(more);
    // スクロールで自動展開
    if (window.IntersectionObserver) {
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { obs.disconnect(); state.showAll = true; renderList(); }
      }, { threshold: 0.1 });
      obs.observe(more);
    }
  }
}

// --- 年表 -------------------------------------------------------------
function scrollToSelected() {
  const li = el.playerList.querySelector("li.selected");
  if (li) li.scrollIntoView({ block: "nearest" });
}

function renderDetail(p) {
  const url = "?p=" + encodeURIComponent(p.id);
  if (location.search !== url) history.pushState({ playerId: p.id }, "", url);
  document.title = p.name + " - 麻雀プロ検索";
  const allRecs = (p.records || []).slice().sort((a, b) =>
    termToYear(b.orgId || p.org, b.term) - termToYear(a.orgId || p.org, a.term) || b.term - a.term);

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

  const totalPlayoffs = allRecs.filter(r => r.category === "playoff").length +
    (p.wrecords || []).filter(r => r.category === "playoff").length;

  // Mリーグチーム情報
  const playerTeams = MLEAGUE_TEAMS.filter(t => playerTeamStatus(p.name, t) !== null);

  const isOngoing = allRecs.some(r => r.ongoing);
  let html = '<button class="back-to-list" onclick="document.querySelector(\'.sidebar\').scrollIntoView({behavior:\'smooth\'})">← 一覧に戻る</button>';
  const isFav = getFavs().has(p.id);
  html += '<div class="detail-head"><h2>' + p.name + "</h2>" +
    (isOngoing ? '<span class="ongoing-badge">開催中</span>' : '') +
    (totalPlayoffs > 0 ? '<span class="playoff-badge" title="決定戦進出' + totalPlayoffs + '回">★決定戦×' + totalPlayoffs + '</span>' : '') +
    '<button class="fav-toggle-btn' + (isFav ? " active" : "") + '" id="favToggleBtn" title="お気に入り">' + (isFav ? "★" : "☆") + '</button>' +
    '<button class="copy-link-btn" onclick="copyPlayerLink()" title="URLをコピー">🔗</button>';
  if (isMultiOrg) {
    html += '<span class="transfer-badge">移籍歴あり</span>';
  } else {
    const org = ORGS[p.org] || {};
    html += '<span class="org-name">' + (org.name || "") + "</span>";
  }
  playerTeams.forEach(t => {
    const status = playerTeamStatus(p.name, t);
    const label = status === "current" ? t.name : t.name + "（元）";
    html += '<span class="mteam-badge" style="background:' + t.color + '">' + label + '</span>';
  });
  const n = normalize(p.name);
  if (MCAST.has(n))     html += '<span class="role-badge role-cast">実況</span>';
  if (MANALYST.has(n))  html += '<span class="role-badge role-analyst">解説</span>';
  if (MREPORTER.has(n)) html += '<span class="role-badge role-reporter">リポーター</span>';
  html += "</div>";

  html += renderProfile(p);

  if (isMultiOrg) {
    html += '<div class="summary">';
    html += stat(allRecs.length, "総出場期数");
    html += stat(totalPlayoffs, "決定戦進出");
    html += "</div>";
  }

  orgIds.forEach((oid, idx) => {
    const org = ORGS[oid] || {};
    const league = org.league || {};
    const groupRecs = orgGroups[oid].slice().sort((a, b) => b.term - a.term);
    const groupPlayoffs = groupRecs.filter(r => r.category === "playoff").length;
    const topTier = groupRecs
      .map(r => (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier)
      .filter(t => (league.tiers || []).includes(t))
      .sort((a, b) => (league.tiers || []).indexOf(a) - (league.tiers || []).indexOf(b))[0] ||
      groupRecs.map(r => r.tier)[0] || "-";

    const groupYears = groupRecs.map(r => termToYear(oid, r.term)).filter(y => y > 1000);
    const yearMin = groupYears.length ? Math.min(...groupYears) : null;
    const yearMax = groupYears.length ? Math.max(...groupYears) : null;
    const yearRange = yearMin
      ? (yearMin === yearMax ? yearMin + "年" : yearMin + "〜" + yearMax + "年")
      : "-";
    const recsWithPts = groupRecs.filter(r => !r.ongoing && r.points != null);
    const latestCompleted = recsWithPts
      .slice().sort((a, b) => termToYear(oid, b.term) - termToYear(oid, a.term))[0];
    const latestPtsStr = latestCompleted ? fmtPoints(latestCompleted.points) + "pt" : null;
    const avgPts = recsWithPts.length >= 3
      ? (recsWithPts.reduce((s, r) => s + r.points, 0) / recsWithPts.length)
      : null;
    const avgPtsStr = avgPts != null ? fmtPoints(avgPts) + "pt" : null;
    const bestPts = recsWithPts.length
      ? recsWithPts.reduce((max, r) => r.points > max ? r.points : max, -Infinity)
      : null;
    const bestPtsStr = bestPts != null && bestPts > -Infinity ? fmtPoints(bestPts) + "pt" : null;
    const totalPts = recsWithPts.length >= 2 ? recsWithPts.reduce((s, r) => s + r.points, 0) : null;
    const totalPtsStr = totalPts != null ? fmtPoints(totalPts) + "pt" : null;
    const topTierName = (league.tiers || [])[0];
    const topFirstYear = topTierName
      ? groupRecs
          .filter(r => (r.tier === "後期" || r.tier === "前期" ? r.result : r.tier) === topTierName)
          .map(r => termToYear(r.orgId || oid, r.term))
          .filter(y => y > 1000)
          .reduce((min, y) => Math.min(min, y), Infinity)
      : Infinity;
    const topFirstYearStr = topFirstYear < Infinity ? topFirstYear + "年" : "-";

    // 最長連続出場
    const sortedTerms = groupRecs.map(r => r.term).sort((a, b) => a - b);
    let maxStreak = 1, curStreak = 1;
    for (let i = 1; i < sortedTerms.length; i++) {
      if (sortedTerms[i] === sortedTerms[i - 1] + 1) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
      else curStreak = 1;
    }
    const streakStr = sortedTerms.length > 1 && maxStreak >= 3 ? maxStreak + "期" : null;

    if (isMultiOrg) {
      html += '<div class="org-section' + (idx === 0 ? " org-section-first" : "") + '">';
      html += '<div class="org-section-head">';
      html += '<span class="org-name">' + (org.name || "") + "</span>";
      html += '<span class="league-name">' + (league.name || "") + "</span>";
      html += "</div>";
      html += '<div class="summary summary-sm">';
      html += stat(groupRecs.length, "出場期数");
      html += stat(topTier, "最高到達");
      if (topFirstYearStr !== "-") html += stat(topFirstYearStr, "最高リーグ初年");
      html += stat(groupPlayoffs, "決定戦進出");
      if (streakStr) html += stat(streakStr, "最長連続");
      if (totalPtsStr) html += stat(totalPtsStr, "通算pt");
      if (bestPtsStr) html += stat(bestPtsStr, "最高pt");
      if (avgPtsStr) html += stat(avgPtsStr, "平均pt");
      if (latestPtsStr) html += stat(latestPtsStr, "直近pt");
      html += stat(yearRange, "活動期間");
      html += "</div>";
    } else {
      html += '<div class="detail-head"><span class="league-name">' + (league.name || "") + " 成績</span></div>";
      html += '<div class="summary">';
      html += stat(groupRecs.length, "出場期数");
      html += stat(topTier, "最高到達");
      if (topFirstYearStr !== "-") html += stat(topFirstYearStr, "最高リーグ初年");
      html += stat(groupPlayoffs, "決定戦進出");
      if (streakStr) html += stat(streakStr, "最長連続");
      if (totalPtsStr) html += stat(totalPtsStr, "通算pt");
      if (bestPtsStr) html += stat(bestPtsStr, "最高pt");
      if (avgPtsStr) html += stat(avgPtsStr, "平均pt");
      if (latestPtsStr) html += stat(latestPtsStr, "直近pt");
      html += stat(yearRange, "活動期間");
      html += "</div>";
    }

    html += chartSvg(groupRecs, oid);

    // ティア別集計
    const tierCounts = {};
    groupRecs.forEach(r => {
      const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    });
    const tierOrder = (league.tiers || []).concat(
      Object.keys(tierCounts).filter(t => !(league.tiers || []).includes(t))
    );
    const tierBreakdown = tierOrder.filter(t => tierCounts[t]).map(t =>
      '<span class="tb-item"><span class="tier-badge ' + tierClass(t) + ' tb-tier">' + t + '</span><span class="tb-cnt">' + tierCounts[t] + '</span></span>'
    ).join("");
    if (tierBreakdown) html += '<div class="tier-breakdown">' + tierBreakdown + '</div>';

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
        const gyrFrom = termToYear(oid, item.from);
        const gyrTo   = termToYear(oid, item.to);
        const gyrStr  = gyrFrom > 1000 ? (gyrFrom === gyrTo ? gyrFrom : gyrFrom + "〜" + gyrTo) + "年 " : "";
        const label = item.from === item.to
          ? "第" + item.from + "期"
          : "第" + item.from + "期〜第" + item.to + "期";
        const note = count >= 3 ? "休戦の可能性" : "データなし";
        html += '<tr class="gap-row"><td class="term">' + label + '</td><td colspan="3">' + gyrStr + note + "（" + count + "期分）</td></tr>";
      } else {
        const r = item.rec;
        const rowCls = r.ongoing ? ' class="ongoing"' : "";
        const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
        const rankHtml = (r.rank !== undefined && r.rank !== null) ? ' <span class="rank">' + r.rank + "位</span>" : "";
        const halfHtml = (r.half && r.half !== "annual") ? ' <span class="half">' + r.half + "</span>" : "";
        const resultText = (r.result || "") + rankHtml + halfHtml || "—";
        const yr = termToYear(r.orgId || oid, r.term);
        const yrHtml = yr > 1000 ? '<span class="rec-year">' + yr + '</span>' : '';
        const isYearMatch = state.year && yr === parseInt(state.year, 10);
        if (isYearMatch) { rowCls = ' class="year-match"'; }
        const catIcon = r.category === "promotion" ? '<span class="cat-icon cat-up">↑</span>'
                      : r.category === "demotion"  ? '<span class="cat-icon cat-dn">↓</span>'
                      : r.category === "playoff"   ? '<span class="cat-icon cat-po">★</span>'
                      : "";
        // 後期/前期ティアは result をティア名として表示
        const isHalfSeason = r.tier === "後期" || r.tier === "前期";
        const displayTier = isHalfSeason && r.result ? r.result : r.tier;
        const halfLabel = isHalfSeason ? '<span class="half">' + r.tier + '</span>' : "";
        const displayResult = isHalfSeason ? "" : resultText;
        html += "<tr" + rowCls + ">" +
          '<td class="term">第' + r.term + "期" + yrHtml + "</td>" +
          '<td><span class="tier-badge ' + tierClass(displayTier) + '">' + displayTier + "</span>" + halfLabel + "</td>" +
          '<td class="result-' + r.category + '">' + catIcon + displayResult + "</td>" +
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

  // チームメイトセクション
  if (playerTeams.length) {
    playerTeams.forEach(team => {
      const myStatus = playerTeamStatus(p.name, team);
      const currentMates = [...team.current].filter(name => normalize(name) !== normalize(p.name));
      const formerMates  = [...team.former].filter(name => normalize(name) !== normalize(p.name));
      const allMates = myStatus === "current"
        ? currentMates
        : [...currentMates.map(n => ({ name: n, label: "現役" })),
           ...formerMates.map(n => ({ name: n, label: "元" }))];
      if (!allMates.length) return;
      html += '<div class="teammates-section">';
      const headLabel = myStatus === "current" ? "チームメイト" : "チームメンバー";
      html += '<div class="teammates-head"><span style="color:' + team.color + ';font-weight:700">' + team.name + '</span> ' + headLabel + '</div>';
      html += '<div class="teammates-list">';
      allMates.forEach(item => {
        const name = typeof item === "string" ? item : item.name;
        const sub  = typeof item === "object" ? '<span class="mate-sub">' + item.label + '</span>' : "";
        const mate = DATA.players.find(x => normalize(x.name) === normalize(name));
        let tierTag = "";
        if (mate) {
          const mLatest = (mate.records || []).filter(r => !r.ongoing)
            .sort((a, b) => termToYear(b.orgId || mate.org, b.term) - termToYear(a.orgId || mate.org, a.term))[0];
          const mTier = mLatest ? ((mLatest.tier === "後期" || mLatest.tier === "前期") ? (mLatest.result || mLatest.tier) : mLatest.tier) : null;
          if (mTier) tierTag = '<span class="tier-badge ' + tierClass(mTier) + ' tb-tier" style="margin-left:3px">' + mTier + '</span>';
          html += '<button class="teammate-btn" data-id="' + mate.id + '" style="border-color:' + team.color + ';color:' + team.color + '">' + name + sub + tierTag + '</button>';
        } else {
          html += '<span class="teammate-btn" style="border-color:#ccc;color:#999">' + name + sub + '</span>';
        }
      });
      html += '</div></div>';
    });
  }

  if (p.wrecords && p.wrecords.length) {
    html += '<hr class="section-divider">';
    html += renderWleagueSection(p);
  }

  // 同期デビュー選手セクション
  const pDebutYears = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term)).filter(y => y > 1000);
  if (pDebutYears.length) {
    const pDebutYear = Math.min(...pDebutYears);
    const sameDebutOrg = (p.records || [])[0] && (p.records.find(r => termToYear(r.orgId||p.org,r.term) === pDebutYear) || {}).orgId || p.org;
    const peers = DATA.players.filter(x => x.id !== p.id && (x.records||[]).some(r => {
      const yr = termToYear(r.orgId||x.org, r.term);
      return yr === pDebutYear && (r.orgId||x.org) === sameDebutOrg;
    })).slice(0, 6);
    if (peers.length >= 2) {
      html += '<div class="recent-section"><div class="recent-head">' + pDebutYear + '年 同期（' + (ORGS[sameDebutOrg] || {}).shortName + '）</div><div class="recent-list">';
      peers.forEach(q => { html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + '</button>'; });
      html += '</div></div>';
    }
  }

  html += renderRecentHistory();
  addToHistory(p);

  el.detail.innerHTML = html;
  if (state.year) {
    const matchRow = el.detail.querySelector("tr.year-match");
    if (matchRow) setTimeout(() => matchRow.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }
  const favToggle = document.getElementById("favToggleBtn");
  if (favToggle) {
    favToggle.addEventListener("click", () => {
      const nowFav = toggleFav(p.id);
      favToggle.textContent = nowFav ? "★" : "☆";
      favToggle.classList.toggle("active", nowFav);
      renderList();
    });
  }
  el.detail.querySelectorAll(".recent-btn[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mate = DATA.players.find(x => x.id === btn.dataset.id);
      if (mate) { state.selectedId = mate.id; renderList(); scrollToSelected(); renderDetail(mate); }
    });
  });
  el.detail.querySelectorAll(".chart").forEach(chart => {
    const tip = chart.querySelector(".chart-tip");
    chart.querySelectorAll("circle[data-tip]").forEach(c => {
      function showTip() {
        // data-tip形式: "2024年 A1(後期) 3位 +123.4pt ★決定戦" → 整形して表示
        const raw = c.dataset.tip || "";
        const parts = raw.split(" ").filter(Boolean);
        tip.innerHTML = parts.map((s, i) => i === 0 ? '<strong>' + s + '</strong>' : s).join(' ');
        tip.style.display = "block";
        const rect = chart.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        let left = cr.left - rect.left + cr.width / 2;
        const tipW = 160;
        if (left + tipW > rect.width) left = Math.max(0, rect.width - tipW);
        tip.style.left = left + "px";
        tip.style.top  = (cr.top  - rect.top - 4) + "px";
      }
      c.addEventListener("mouseenter", showTip);
      c.addEventListener("mouseleave", () => { tip.style.display = "none"; });
      c.addEventListener("touchstart", e => { e.preventDefault(); showTip(); }, { passive: false });
      c.addEventListener("touchend", () => { setTimeout(() => { tip.style.display = "none"; }, 1500); });
    });
  });
  el.detail.querySelectorAll(".teammate-btn[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mate = DATA.players.find(x => x.id === btn.dataset.id);
      if (mate) { state.selectedId = mate.id; renderList(); scrollToSelected(); renderDetail(mate); }
    });
  });
  if (window.innerWidth <= 760) {
    el.detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function stat(num, lbl) {
  const numStr = String(num);
  const cls = numStr.length > 6 ? " sm" : "";
  return '<div class="stat"><div class="num' + cls + '">' + numStr +
         '</div><div class="lbl">' + lbl + "</div></div>";
}

function renderProfile(p) {
  const pf = p.profile;
  if (!pf) return "";
  let html = '<div class="profile-card">';
  if (pf.nickname) html += '<div class="profile-nickname">' + pf.nickname + '</div>';

  html += '<div class="profile-grid">';
  if (pf.birth) {
    const bd = pf.birth.split("-");
    const birthStr = bd.length === 3
      ? bd[0] + "年" + parseInt(bd[1]) + "月" + parseInt(bd[2]) + "日"
      : pf.birth;
    html += profileRow("生年月日", birthStr);
  }
  if (pf.hometown) html += profileRow("出身", pf.hometown);
  if (pf.education) html += profileRow("学歴", pf.education);
  if (pf.proYear) html += profileRow("プロ入会", pf.proYear + "年");
  if (pf.org) html += profileRow("所属団体", pf.org);
  if (pf.team) html += profileRow("Mリーグ", pf.team);
  if (pf.titles && pf.titles.length) {
    const badges = pf.titles.map(t => '<span class="title-badge">' + t + '</span>').join(" ");
    html += profileRow("主要タイトル", badges);
  }
  if (pf.jantama) html += profileRow("雀魂", pf.jantama);
  html += '</div>';

  const links = [];
  if (pf.x_url) links.push('<a href="' + pf.x_url + '" target="_blank" rel="noopener">𝕏</a>');
  if (pf.youtube_url) links.push('<a href="' + pf.youtube_url + '" target="_blank" rel="noopener">YouTube</a>');
  if (pf.instagram_url) links.push('<a href="' + pf.instagram_url + '" target="_blank" rel="noopener">Instagram</a>');
  if (links.length) html += '<div class="profile-links">' + links.join(' ') + '</div>';

  html += '</div>';
  return html;
}

function profileRow(label, value) {
  return '<div class="profile-label">' + label + '</div><div class="profile-value">' + value + '</div>';
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

  const regularTerms = new Set(recs.filter(r => r.tier !== "後期" && r.tier !== "前期").map(r => r.term));
  const pts = recs
    .filter(r => !r.ongoing)
    .filter(r => {
      const isHalf = r.tier === "後期" || r.tier === "前期";
      return !isHalf || !regularTerms.has(r.term); // 同期の通常レコードがあれば後期を除外
    })
    .map(r => {
      const isHalf = r.tier === "後期" || r.tier === "前期";
      const tier = isHalf ? (r.result || r.tier) : r.tier;
      return { year: termToYear(r.orgId || orgId, r.term), tier, rank: r.rank || null,
               points: r.points, result: isHalf ? r.tier : r.result,
               playoff: r.category === "playoff", half: isHalf };
    })
    .filter(d => tiers.includes(d.tier))
    .sort((a, b) => a.year - b.year);
  if (!pts.length) return "";

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
    const c = TC[tierKey(tier)] || '#8a93a2';
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

  if (pts.length >= 2) {
    // 連続区間は実線、ギャップ（年が2以上離れた区間）は点線
    let solidPath = '', dashPaths = [];
    for (let i = 0; i < pts.length; i++) {
      const v = toV(pts[i].tier, pts[i].rank);
      const cx = xFn(pts[i].year).toFixed(1), cy = yFn(v).toFixed(1);
      if (i === 0) { solidPath = 'M' + cx + ' ' + cy; continue; }
      const gap = pts[i].year - pts[i - 1].year > 1;
      if (gap) {
        const pv = toV(pts[i - 1].tier, pts[i - 1].rank);
        const px = xFn(pts[i - 1].year).toFixed(1), py = yFn(pv).toFixed(1);
        dashPaths.push('M' + px + ' ' + py + ' L' + cx + ' ' + cy);
        solidPath += ' M' + cx + ' ' + cy;
      } else {
        solidPath += ' L' + cx + ' ' + cy;
      }
    }
    svg += '<path d="' + solidPath + '" fill="none" stroke="#555" stroke-width="1.5"/>';
    dashPaths.forEach(d => {
      svg += '<path d="' + d + '" fill="none" stroke="#aaa" stroke-width="1" stroke-dasharray="4 3"/>';
    });
  }

  pts.forEach(d => {
    const v = toV(d.tier, d.rank);
    const c = TC[tierKey(d.tier)] || '#8a93a2';
    const cx = xFn(d.year).toFixed(1), cy = yFn(v).toFixed(1);
    const tip = d.year + '年 ' + d.tier + (d.half ? '(' + d.result + ')' : '') +
                (d.rank ? ' ' + d.rank + '位' : '') +
                (d.points != null ? ' ' + fmtPoints(d.points) + 'pt' : '') +
                (!d.half && d.result ? ' ' + d.result : '') +
                (d.playoff ? ' ★決定戦' : '');
    if (d.playoff) {
      // 決定戦進出は外周リング付きで強調
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="none" stroke="' + c + '" stroke-width="2" opacity="0.6"/>';
    }
    svg += '<circle cx="' + cx + '" cy="' + cy +
           '" r="5" fill="' + c + '" data-tip="' + tip.replace(/"/g, '&quot;') + '" style="cursor:pointer"/>';
  });

  svg += '</svg><div class="chart-tip"></div>';
  const usedKeys = [...new Set(pts.map(d => tierKey(d.tier)))].filter(k => TC[k]);
  const legend = usedKeys.map(k => '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + TC[k] + '"></span>' + k + 'リーグ</span>').join('');
  const hasPlayoff = pts.some(d => d.playoff);
  const legendHtml = (legend || hasPlayoff)
    ? '<div class="chart-legend">' + legend + (hasPlayoff ? '<span class="chart-legend-item"><span class="chart-legend-ring"></span>決定戦</span>' : '') + '</div>' : '';
  return '<div class="chart">' + svg + legendHtml + '</div>';
}

// 女流リーグ用折れ線グラフ（wleague設定を使用）
function wchartSvg(wrecords, wleague) {
  const tiers = (wleague || {}).tiers || [];
  if (!tiers.length) return "";

  const pts = wrecords
    .filter(r => tiers.includes(r.tier) && !r.ongoing)
    .map(r => ({ year: wTermToYear(wleague, r.term), tier: r.tier, rank: r.rank || null,
                 points: r.points, result: r.result, playoff: r.category === "playoff" }))
    .sort((a, b) => a.year - b.year);
  if (!pts.length) return "";

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
    const c = TC[tierKey(tier)] || '#8a93a2';
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

  if (pts.length >= 2) {
    let solidPath = '', dashPaths = [];
    for (let i = 0; i < pts.length; i++) {
      const v = toV(pts[i].tier, pts[i].rank);
      const cx = xFn(pts[i].year).toFixed(1), cy = yFn(v).toFixed(1);
      if (i === 0) { solidPath = 'M' + cx + ' ' + cy; continue; }
      const gap = pts[i].year - pts[i - 1].year > 1;
      if (gap) {
        const pv = toV(pts[i - 1].tier, pts[i - 1].rank);
        const px = xFn(pts[i - 1].year).toFixed(1), py = yFn(pv).toFixed(1);
        dashPaths.push('M' + px + ' ' + py + ' L' + cx + ' ' + cy);
        solidPath += ' M' + cx + ' ' + cy;
      } else {
        solidPath += ' L' + cx + ' ' + cy;
      }
    }
    svg += '<path d="' + solidPath + '" fill="none" stroke="#d08090" stroke-width="1.5"/>';
    dashPaths.forEach(d => {
      svg += '<path d="' + d + '" fill="none" stroke="#e0a0b0" stroke-width="1" stroke-dasharray="4 3"/>';
    });
  }

  pts.forEach(d => {
    const v = toV(d.tier, d.rank);
    const c = TC[tierKey(d.tier)] || '#d08090';
    const cx = xFn(d.year).toFixed(1), cy = yFn(v).toFixed(1);
    const tip = d.year + '年 ' + d.tier + (d.rank ? ' ' + d.rank + '位' : '') +
                (d.points != null ? ' ' + fmtPoints(d.points) + 'pt' : '') +
                (d.result ? ' ' + d.result : '') +
                (d.playoff ? ' ★決定戦' : '');
    if (d.playoff) {
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="none" stroke="' + c + '" stroke-width="2" opacity="0.6"/>';
    }
    svg += '<circle cx="' + cx + '" cy="' + cy +
           '" r="5" fill="' + c + '" data-tip="' + tip.replace(/"/g, '&quot;') + '" style="cursor:pointer"/>';
  });

  svg += '</svg><div class="chart-tip"></div>';
  const wUsedKeys = [...new Set(pts.map(d => tierKey(d.tier)))].filter(k => TC[k]);
  const wLegend = wUsedKeys.map(k => '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + TC[k] + '"></span>' + k + 'リーグ</span>').join('');
  const wHasPlayoff = pts.some(d => d.playoff);
  const wLegendHtml = (wLegend || wHasPlayoff)
    ? '<div class="chart-legend">' + wLegend + (wHasPlayoff ? '<span class="chart-legend-item"><span class="chart-legend-ring"></span>決定戦</span>' : '') + '</div>' : '';
  return '<div class="chart">' + svg + wLegendHtml + '</div>';
}

// 女流リーグ表示セクション（renderDetail内で呼ぶ）
function renderWleagueSection(p) {
  const wl = p.wleague || {};
  const wrecords = (p.wrecords || []).slice().sort((a, b) => b.term - a.term);
  if (!wrecords.length) return "";

  const tiers = wl.tiers || [];
  const topTier = wrecords
    .map(r => r.tier)
    .filter(t => tiers.includes(t))
    .sort((a, b) => tiers.indexOf(a) - tiers.indexOf(b))[0] ||
    wrecords.map(r => r.tier)[0] || "-";

  let html = '<div class="wleague-section">';
  html += '<div class="wleague-head"><span class="wleague-name">' +
          (wl.name || "女流リーグ") + ' 成績</span></div>';

  const wYears = wrecords.map(r => wTermToYear(wl, r.term)).filter(y => y > 1000);
  const wYearRange = wYears.length
    ? (Math.min(...wYears) === Math.max(...wYears)
        ? Math.min(...wYears) + "年"
        : Math.min(...wYears) + "〜" + Math.max(...wYears) + "年")
    : "-";
  html += '<div class="summary">';
  const wPlayoffs = wrecords.filter(r => r.category === "playoff").length;
  const wSortedTerms = wrecords.map(r => r.term).sort((a, b) => a - b);
  let wMaxStreak = 1, wCurStreak = 1;
  for (let i = 1; i < wSortedTerms.length; i++) {
    if (wSortedTerms[i] === wSortedTerms[i - 1] + 1) { wCurStreak++; wMaxStreak = Math.max(wMaxStreak, wCurStreak); }
    else wCurStreak = 1;
  }
  const wStreakStr = wSortedTerms.length > 1 && wMaxStreak >= 3 ? wMaxStreak + "期" : null;
  const wRecsWithPts = wrecords.filter(r => !r.ongoing && r.points != null);
  const wBestPts = wRecsWithPts.length ? wRecsWithPts.reduce((m, r) => r.points > m ? r.points : m, -Infinity) : null;
  const wBestPtsStr = wBestPts != null && wBestPts > -Infinity ? fmtPoints(wBestPts) + "pt" : null;
  const wAvgPts = wRecsWithPts.length >= 3 ? (wRecsWithPts.reduce((s, r) => s + r.points, 0) / wRecsWithPts.length) : null;
  const wAvgPtsStr = wAvgPts != null ? fmtPoints(wAvgPts) + "pt" : null;
  const wTotalPts = wRecsWithPts.length >= 2 ? wRecsWithPts.reduce((s, r) => s + r.points, 0) : null;
  const wTotalPtsStr = wTotalPts != null ? fmtPoints(wTotalPts) + "pt" : null;
  const wLatestPts = wRecsWithPts.slice().sort((a, b) => wTermToYear(wl, b.term) - wTermToYear(wl, a.term))[0];
  const wLatestPtsStr = wLatestPts ? fmtPoints(wLatestPts.points) + "pt" : null;
  html += stat(wrecords.length, "出場期数");
  html += stat(topTier, "最高到達");
  html += stat(wPlayoffs, "決定戦進出");
  if (wStreakStr) html += stat(wStreakStr, "最長連続");
  if (wTotalPtsStr) html += stat(wTotalPtsStr, "通算pt");
  if (wBestPtsStr) html += stat(wBestPtsStr, "最高pt");
  if (wAvgPtsStr) html += stat(wAvgPtsStr, "平均pt");
  if (wLatestPtsStr) html += stat(wLatestPtsStr, "直近pt");
  html += stat(wYearRange, "活動期間");
  html += '</div>';

  html += wchartSvg(wrecords, wl);

  // 女流ティア別集計
  const wTierCounts = {};
  wrecords.forEach(r => { wTierCounts[r.tier] = (wTierCounts[r.tier] || 0) + 1; });
  const wTierOrder = tiers.concat(Object.keys(wTierCounts).filter(t => !tiers.includes(t)));
  const wTierBreakdown = wTierOrder.filter(t => wTierCounts[t]).map(t =>
    '<span class="tb-item"><span class="tier-badge ' + tierClass(t) + ' tb-tier">' + t + '</span><span class="tb-cnt">' + wTierCounts[t] + '</span></span>'
  ).join("");
  if (wTierBreakdown) html += '<div class="tier-breakdown">' + wTierBreakdown + '</div>';

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
      const gyrFrom = wTermToYear(wl, item.from);
      const gyrTo   = wTermToYear(wl, item.to);
      const gyrStr  = gyrFrom > 1000 ? (gyrFrom === gyrTo ? gyrFrom : gyrFrom + "〜" + gyrTo) + "年 " : "";
      const note = count >= 3 ? "休戦の可能性" : "データなし";
      html += '<tr class="gap-row">' +
        '<td class="term">' + label + '</td>' +
        '<td colspan="3">' + gyrStr + note + "（" + count + '期分）</td>' +
        '</tr>';
    } else {
      const r = item.rec;
      const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
      const rankHtml = (r.rank !== undefined && r.rank !== null)
        ? ' <span class="rank">' + r.rank + '位</span>' : "";
      const tierLabel = r.tier.length <= 2 ? "女流" + r.tier : r.tier;
      const wyr = wTermToYear(wl, r.term);
      const wyrHtml = wyr > 1000 ? '<span class="rec-year">' + wyr + '</span>' : '';
      const wCatIcon = r.category === "promotion" ? '<span class="cat-icon cat-up">↑</span>'
                     : r.category === "demotion"  ? '<span class="cat-icon cat-dn">↓</span>'
                     : r.category === "playoff"   ? '<span class="cat-icon cat-po">★</span>'
                     : "";
      html += '<tr>' +
        '<td class="term">第' + r.term + '期' + wyrHtml + '</td>' +
        '<td><span class="tier-badge ' + tierClass(r.tier) + '">' + tierLabel + '</span></td>' +
        '<td class="result-' + r.category + '">' + wCatIcon + (r.result || "—") + rankHtml + '</td>' +
        '<td class="points ' + ptsCls + '">' + fmtPoints(r.points) + '</td>' +
        '</tr>';
    }
  });
  html += '</tbody></table>';
  html += '</div>';
  return html;
}

// --- 閲覧履歴 ---------------------------------------------------------
const HISTORY_KEY = "mj_recent";
const HISTORY_MAX = 8;
const FAV_KEY = "mj_favs";

function getFavs() { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch(e) { return new Set(); } }
function toggleFav(id) {
  try {
    const favs = getFavs();
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    return favs.has(id);
  } catch(e) { return false; }
}

function addToHistory(p) {
  try {
    let hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    hist = hist.filter(id => id !== p.id);
    hist.unshift(p.id);
    if (hist.length > HISTORY_MAX) hist = hist.slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch (e) {}
}

function renderRecentHistory() {
  try {
    const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (hist.length < 2) return "";
    const players = hist
      .map(id => DATA.players.find(x => x.id === id))
      .filter(Boolean)
      .filter(x => x.id !== state.selectedId);
    if (!players.length) return "";
    let html = '<div class="recent-section"><div class="recent-head">最近閲覧</div><div class="recent-list">';
    players.forEach(q => {
      html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + '</button>';
    });
    html += '</div></div>';
    return html;
  } catch (e) { return ""; }
}

// --- 起動 -------------------------------------------------------------
let _searchTimer = null;
el.search.addEventListener("input", e => {
  state.query = e.target.value;
  state.showAll = false;
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(renderList, 80);
});
document.getElementById("yearFilter").addEventListener("input", e => { state.year = e.target.value; renderList(); });
el.search.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const items = filteredPlayers();
    if (!items.length) return;
    const p = items[0];
    state.selectedId = p.id;
    renderList();
    scrollToSelected();
    renderDetail(p);
    el.search.blur();
  }
});
el.sortSelect.addEventListener("change", e => { state.sort = e.target.value; renderList(); });
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement !== el.search) {
    e.preventDefault(); el.search.focus(); el.search.select();
    return;
  }
  if (e.key === "?" && document.activeElement !== el.search) {
    const panel = document.getElementById("helpPanel");
    if (panel) panel.style.display = panel.style.display === "none" ? "flex" : "none";
    return;
  }
  if (e.key === "f" && document.activeElement !== el.search && state.selectedId) {
    const p = DATA.players.find(x => x.id === state.selectedId);
    if (p) {
      const nowFav = toggleFav(p.id);
      const btn = document.getElementById("favToggleBtn");
      if (btn) { btn.textContent = nowFav ? "★" : "☆"; btn.classList.toggle("active", nowFav); }
      renderList();
    }
    return;
  }
  if (e.key === "Escape" && state.selectedId) {
    state.selectedId = null;
    history.replaceState(null, "", location.pathname);
    document.title = "麻雀プロ検索";
    renderList();
    el.detail.innerHTML = '<div class="placeholder">← 選手を選択してください</div>';
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") {
    const items = filteredPlayers();
    if (!items.length) return;
    const curIdx = items.findIndex(p => p.id === state.selectedId);
    const step = (e.key === "PageDown" || e.key === "PageUp") ? 10 : 1;
    const nextIdx = (e.key === "ArrowDown" || e.key === "PageDown")
      ? Math.min(curIdx + step, items.length - 1)
      : Math.max(curIdx - step, 0);
    if (nextIdx !== curIdx) {
      e.preventDefault();
      const p = items[nextIdx];
      state.selectedId = p.id;
      renderList();
      renderDetail(p);
      // スクロール
      const li = el.playerList.querySelector("li.selected");
      if (li) li.scrollIntoView({ block: "nearest" });
    }
  }
});
renderOrgFilter();
renderList();

// 初期プレースホルダー（閲覧履歴があれば表示）
(function() {
  try {
    const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (hist.length) {
      const players = hist.map(id => DATA.players.find(x => x.id === id)).filter(Boolean);
      if (players.length) {
        let html = '<div class="placeholder"><div style="margin-bottom:12px;color:var(--muted);font-size:13px">最近閲覧した選手</div>';
        html += '<div class="recent-list" style="justify-content:center">';
        players.forEach(q => {
          html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + '</button>';
        });
        html += '</div><div style="margin-top:20px;font-size:13px;color:var(--muted)">または ← 選手を選択してください</div></div>';
        el.detail.innerHTML = html;
        el.detail.querySelectorAll(".recent-btn[data-id]").forEach(btn => {
          btn.addEventListener("click", () => {
            const p = DATA.players.find(x => x.id === btn.dataset.id);
            if (p) { state.selectedId = p.id; renderList(); scrollToSelected(); renderDetail(p); }
          });
        });
      }
    }
  } catch (e) {}
})();

// URLパラメータで選手を直接選択（シェアリンク対応）
(function() {
  const params = new URLSearchParams(location.search);
  const pid = params.get("p");
  if (pid) {
    const p = DATA.players.find(x => x.id === pid || normalize(x.name) === pid);
    if (p) {
      history.replaceState({ playerId: p.id }, "", location.search);
      state.selectedId = p.id; renderList(); renderDetail(p);
    }
  }
})();

// ブラウザの「戻る」ボタン対応
window.addEventListener("popstate", function(e) {
  const pid = e.state && e.state.playerId;
  if (pid) {
    const p = DATA.players.find(x => x.id === pid);
    if (p) { state.selectedId = p.id; renderList(); scrollToSelected(); renderDetail(p); return; }
  }
  state.selectedId = null;
  document.title = "麻雀プロ検索";
  renderList();
  el.detail.innerHTML = '<div class="placeholder">← 選手を選択してください</div>';
});
