"use strict";
// v2026-06-16w ティア別集計をスタックドバーで視覚化・org別トップ表示
const DATA = window.MJ_DATA || { organizations: [], players: [] };
const ORGS = {};
DATA.organizations.forEach(o => { ORGS[o.id] = o; });
const WLEAGUE_COUNT = DATA.players.filter(p => p.wrecords && p.wrecords.length > 0).length;
// 全選手の平均ptをソートしてパーセンタイル計算用にキャッシュ
const _allAvgPts = DATA.players.map(p => {
  const recs = (p.records||[]).concat(p.wrecords||[]).filter(r => !r.ongoing && r.points != null);
  return recs.length >= 3 ? recs.reduce((s,r)=>s+r.points,0)/recs.length : null;
}).filter(v => v !== null).sort((a,b)=>a-b);
function avgPtsPercentile(avg) {
  if (avg == null || !_allAvgPts.length) return null;
  const rank = _allAvgPts.filter(v => v <= avg).length;
  return Math.round(rank / _allAvgPts.length * 100);
}
// 通算ptランキング（5期以上出場選手中）
const _totalPtsRanking = DATA.players
  .map(p => {
    const recs = (p.records||[]).concat(p.wrecords||[]).filter(r => !r.ongoing && r.points != null);
    return recs.length >= 5 ? { id: p.id, total: recs.reduce((s,r)=>s+r.points,0) } : null;
  })
  .filter(Boolean)
  .sort((a,b)=>b.total-a.total);
function totalPtsRank(id) {
  const idx = _totalPtsRanking.findIndex(x => x.id === id);
  return idx >= 0 ? idx + 1 : null;
}
// 団体別通算ptランキング
const _orgPtsRanking = {};
["saikouisen","renmei","kyokai","rmu","mu"].forEach(oid => {
  _orgPtsRanking[oid] = DATA.players
    .map(p => {
      const recs = (p.records||[]).filter(r => (r.orgId||p.org)===oid && !r.ongoing && r.points!=null);
      return recs.length >= 3 ? { id: p.id, total: recs.reduce((s,r)=>s+r.points,0) } : null;
    })
    .filter(Boolean)
    .sort((a,b)=>b.total-a.total);
});
function orgPtsRank(id, oid) {
  const ranking = _orgPtsRanking[oid];
  if (!ranking) return null;
  const idx = ranking.findIndex(x => x.id === id);
  return idx >= 0 ? idx + 1 : null;
}
// 決定戦進出回数ランキング（2回以上）
const _playoffRanking = DATA.players
  .map(p => {
    const n = (p.records||[]).filter(r=>r.category==="playoff").length + (p.wrecords||[]).filter(r=>r.category==="playoff").length;
    return n >= 2 ? { id: p.id, n } : null;
  })
  .filter(Boolean)
  .sort((a,b)=>b.n-a.n);
function playoffRank(id) {
  const idx = _playoffRanking.findIndex(x => x.id === id);
  return idx >= 0 ? idx + 1 : null;
}
const ONGOING_COUNT = DATA.players.filter(p => (p.records || []).some(r => r.ongoing) || (p.wrecords || []).some(r => r.ongoing)).length;
const PLAYOFF_COUNT = DATA.players.filter(p =>
  (p.records || []).some(r => r.category === "playoff") || (p.wrecords || []).some(r => r.category === "playoff")
).length;
const TOPLEAGUE_COUNT = DATA.players.filter(p => {
  if (!p.records || !p.records.length) return false;
  return p.records.some(r => {
    const oid = r.orgId || p.org;
    const org = ORGS[oid];
    if (!org) return false;
    const topTier = ((org.league || {}).tiers || [])[0];
    const tier = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
    return tier === topTier;
  });
}).length;

const state = { org: "all", mleagueC: true, mleagueF: false, mtourn: false, topLeague: false, wleague: false, playoff: false, ongoingOnly: false, mRelated: false, mteam: null, teamOpen: false, query: "", year: "", selectedId: null, sort: "name", favOnly: false, showAll: false, debutDecade: null, positivePts: false, recentActive: false, hasTitle: false, ageMin: null, ageMax: null, minRec: null, extraOpen: false };

// Mリーグ 2024-25 現役選手
const MLEAGUE_CURRENT = new Set([
  "園田賢","鈴木たろう","浅見真紀","渡辺太",
  "二階堂亜樹","勝又健志","永井孝典","内川幸太郎",
  "岡田紗佳","堀慎吾","渋川難波","阿久津翔太",
  "佐々木寿人","高宮まり","伊達朱里紗","滝沢和典",
  "多井隆晴","白鳥翔","松本吉弘","日向藍子",
  "茅森早香","醍醐大","竹内元太","浅井堂岐",
  "萩原聖人","瀬戸熊直樹","黒沢咲","本田朋広",
  "鈴木大介","中田花奈","下石戟","東城りお",
  "小林剛","瑞原明奈","鈴木優","仲林圭",
  "石井一馬","三浦智博","逢川恵夢","HIRO柴田",
]);

// Mリーグ 退団済み（歴代）
const MLEAGUE_FORMER = new Set([
  "前原雄大","藤崎智","和久津晶","朝倉康心","石橋伸洋",
  "沢崎誠","近藤誠一","村上淳","丸山奏子","魚谷侑未",
  "松ヶ瀬隆弥","二階堂瑠美","猿川真寿","菅原千瑛",
]);

// Mリーグ チーム別メンバー（2025-26現役 + 歴代）
const MLEAGUE_TEAMS = [
  { id:"drives",  name:"赤坂ドリブンズ",       short:"ドリブンズ",  color:"#006400",
    current:new Set(["園田賢","鈴木たろう","浅見真紀","渡辺太"]),
    former: new Set(["村上淳","丸山奏子"]) },
  { id:"furin",   name:"EX風林火山",            short:"風林火山",    color:"#8B0023",
    current:new Set(["二階堂亜樹","勝又健志","永井孝典","内川幸太郎"]),
    former: new Set(["滝沢和典","松ヶ瀬隆弥","二階堂瑠美"]) },
  { id:"sakura",  name:"KADOKAWAサクラナイツ",  short:"サクラナイツ",color:"#E8739A",
    current:new Set(["岡田紗佳","堀慎吾","渋川難波","阿久津翔太"]),
    former: new Set(["沢崎誠","内川幸太郎"]) },
  { id:"konami",  name:"KONAMI麻雀格闘倶楽部",  short:"格闘倶楽部", color:"#CC0000",
    current:new Set(["佐々木寿人","高宮まり","伊達朱里紗","滝沢和典"]),
    former: new Set(["前原雄大","藤崎智"]) },
  { id:"abemas",  name:"渋谷ABEMAS",             short:"ABEMAS",     color:"#D4A017",
    current:new Set(["多井隆晴","白鳥翔","松本吉弘","日向藍子"]),
    former: new Set([]) },
  { id:"phoenix", name:"セガサミーフェニックス",  short:"フェニックス",color:"#E86C00",
    current:new Set(["茅森早香","醍醐大","竹内元太","浅井堂岐"]),
    former: new Set(["近藤誠一","魚谷侑未","和久津晶","東城りお"]) },
  { id:"pirates", name:"U-NEXTパイレーツ",       short:"パイレーツ", color:"#001F5B",
    current:new Set(["小林剛","瑞原明奈","鈴木優","仲林圭"]),
    former: new Set(["朝倉康心","石橋伸洋"]) },
  { id:"raiden",  name:"TEAM RAIDEN/雷電",       short:"雷電",       color:"#FFD700",
    current:new Set(["萩原聖人","瀬戸熊直樹","黒沢咲","本田朋広"]),
    former: new Set([]) },
  { id:"beast",   name:"BEAST X",                short:"BEAST X",    color:"#1A1A1A",
    current:new Set(["鈴木大介","中田花奈","下石戟","東城りお"]),
    former: new Set(["猿川真寿","菅原千瑛","萩原聖人"]) },
  { id:"earthjets", name:"EARTH JETS",           short:"アースジェッツ", color:"#228B22",
    current:new Set(["石井一馬","三浦智博","逢川恵夢","HIRO柴田"]),
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

let _filteredCache = null, _filteredStateKey = null;
function filteredPlayers() {
  const favsKey = state.favOnly ? [...getFavs()].sort().join(",") : "";
  const stateKey = JSON.stringify([state.org, state.mleagueC, state.mleagueF, state.mtourn,
    state.topLeague, state.wleague, state.playoff, state.ongoingOnly, state.mRelated,
    state.mteam, state.year, state.favOnly, state.debutDecade, state.positivePts, state.recentActive, state.hasTitle, state.ageMin, state.ageMax, state.minRec, state.query, state.sort, favsKey]);
  if (_filteredStateKey === stateKey && _filteredCache) return _filteredCache;
  _filteredStateKey = stateKey;
  // スペース区切りでAND検索（各語を個別にnormalize）
  const rawTerms = state.query.trim().split(/\s+|　+/).filter(Boolean);
  const qTerms = rawTerms.map(normalize).filter(Boolean);
  const q = qTerms.join(""); // 後方互換: ハイライト用の連結クエリ
  const activeTeam = state.mteam ? MLEAGUE_TEAMS.find(t => t.id === state.mteam) : null;
  const favs = state.favOnly ? getFavs() : null;

  const result = DATA.players
    .filter(p => state.org === "all" || playerOrgIds(p).includes(state.org))
    .filter(p => {
      if (!state.mleagueC && !state.mleagueF && !state.mtourn && !state.mRelated && !activeTeam) return true;
      const n = normalize(p.name);
      return (state.mleagueC  && MLEAGUE_CURRENT.has(n))      ||
             (state.mleagueF  && MLEAGUE_FORMER.has(n))        ||
             (state.mtourn    && MTOURNAMENT.has(n))            ||
             (state.mRelated  && (MCAST.has(n) || MANALYST.has(n) || MREPORTER.has(n))) ||
             (activeTeam      && playerTeamStatus(n, activeTeam) !== null);
    })
    .filter(p => !state.topLeague || isTopLeague(p))
    .filter(p => !state.wleague || (p.wrecords && p.wrecords.length > 0))
    .filter(p => !state.favOnly || (favs && favs.has(p.id)))
    .filter(p => !state.playoff || (p.records || []).some(r => r.category === "playoff") || (p.wrecords || []).some(r => r.category === "playoff"))
    .filter(p => !state.ongoingOnly || (p.records || []).some(r => r.ongoing) || (p.wrecords || []).some(r => r.ongoing))
    .filter(p => {
      if (!state.positivePts) return true;
      const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
      if (recs.length < 2) return false;
      return recs.reduce((s, r) => s + r.points, 0) > 0;
    })
    .filter(p => {
      if (!state.recentActive) return true;
      const RECENT_CUTOFF = 2026 - 5;
      const yrs = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term))
        .concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)))
        .filter(y => y > 1000);
      return yrs.some(y => y >= RECENT_CUTOFF) || (p.records || []).some(r => r.ongoing) || (p.wrecords || []).some(r => r.ongoing);
    })
    .filter(p => !state.hasTitle || (p.profile && p.profile.titles && p.profile.titles.length > 0))
    .filter(p => {
      if (state.ageMin == null && state.ageMax == null) return true;
      if (!p.profile || !p.profile.birth) return false;
      const bd = p.profile.birth.split("-");
      if (bd.length < 1) return false;
      const now = new Date();
      const age = now.getFullYear() - parseInt(bd[0]) - (now < new Date(parseInt(bd[0]), parseInt(bd[1]||1) - 1, parseInt(bd[2]||1)) ? 1 : 0);
      return (state.ageMin == null || age >= state.ageMin) && (state.ageMax == null || age <= state.ageMax);
    })
    .filter(p => {
      if (!state.debutDecade) return true;
      const yrs = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term))
        .concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)))
        .filter(y => y > 1000);
      if (!yrs.length) return false;
      const debut = Math.min(...yrs);
      return Math.floor(debut / 10) * 10 === state.debutDecade;
    })
    .filter(p => {
      if (!state.minRec) return true;
      const cnt = (p.records || []).length + (p.wrecords || []).length;
      return cnt >= state.minRec;
    })
    .filter(p => {
      if (!state.year) return true;
      const yr = parseInt(state.year, 10);
      if (!yr) return true;
      return (p.records || []).some(r => termToYear(r.orgId || p.org, r.term) === yr) ||
             (p.wrecords || []).some(r => wTermToYear(p.wleague || {}, r.term) === yr);
    })
    .filter(p => {
      if (!qTerms.length) return true;
      const pName = normalize(p.name);
      const titles = (p.profile && p.profile.titles) ? p.profile.titles.join("") : "";
      const nick = (p.profile && p.profile.nickname) ? normalize(p.profile.nickname) : "";
      const orgIds = playerOrgIds(p);
      const orgText = orgIds.map(oid => {
        const org = ORGS[oid] || {};
        return (org.name || "") + (org.shortName || "") + ((org.league || {}).name || "");
      }).join("") + ((p.wleague || {}).name || "");
      // 最新ティア（検索用）
      const latestRecQ = (p.records || []).filter(r => !r.ongoing)
        .sort((a, b) => termToYear(b.orgId || p.org, b.term) - termToYear(a.orgId || p.org, a.term))[0];
      const latestTierQ = latestRecQ ? normalize((latestRecQ.tier === "後期" || latestRecQ.tier === "前期") ? (latestRecQ.result || latestRecQ.tier) : latestRecQ.tier) : "";
      // 全語がいずれかのフィールドにマッチ（AND）
      return qTerms.every(term =>
        pName.includes(term) || titles.includes(term) || nick.includes(term) || orgText.includes(term) || latestTierQ === term
      );
    })
    .sort((a, b) => {
      // 検索クエリがある場合は名前の前方一致を優先（最初の語で判定）
      if (qTerms.length) {
        const firstTerm = qTerms[0];
        const an = normalize(a.name), bn = normalize(b.name);
        const aStart = an.startsWith(firstTerm) ? 0 : 1;
        const bStart = bn.startsWith(firstTerm) ? 0 : 1;
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
      if (state.sort === "avgrank") {
        const avgRank = p => {
          const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.rank != null);
          return recs.length >= 3 ? recs.reduce((s, r) => s + r.rank, 0) / recs.length : Infinity;
        };
        return avgRank(a) - avgRank(b); // 小さい順位（1位=最高）を先頭に
      }
      if (state.sort === "career") {
        const careerYears = p => {
          const years = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term))
            .concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)))
            .filter(y => y > 1000);
          return years.length > 1 ? Math.max(...years) - Math.min(...years) + 1 : (years.length ? 1 : 0);
        };
        return careerYears(b) - careerYears(a);
      }
      if (state.sort === "tier") {
        const bestTierIdx = p => {
          let best = 9999;
          (p.records || []).forEach(r => {
            const oid = r.orgId || p.org;
            const org = ORGS[oid];
            if (!org) return;
            const tiers = (org.league || {}).tiers || [];
            const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
            const idx = tiers.indexOf(t);
            if (idx >= 0 && idx < best) best = idx;
          });
          return best;
        };
        return bestTierIdx(a) - bestTierIdx(b);
      }
      if (state.sort === "playoff") {
        const playoffCount = p =>
          (p.records || []).filter(r => r.category === "playoff").length +
          (p.wrecords || []).filter(r => r.category === "playoff").length;
        return playoffCount(b) - playoffCount(a);
      }
      if (state.sort === "totalpts") {
        const totalPts = p => {
          const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
          return recs.length >= 2 ? recs.reduce((s, r) => s + r.points, 0) : -Infinity;
        };
        return totalPts(b) - totalPts(a);
      }
      if (state.sort === "titles") {
        const titleCount = p => (p.profile && p.profile.titles) ? p.profile.titles.length : 0;
        return titleCount(b) - titleCount(a);
      }
      if (state.sort === "recentavg") {
        const recentAvg = p => {
          const recs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null)
            .sort((a, b2) => {
              const ya = termToYear(a.orgId || p.org, a.term) || wTermToYear(p.wleague || {}, a.term);
              const yb = termToYear(b2.orgId || p.org, b2.term) || wTermToYear(p.wleague || {}, b2.term);
              return yb - ya;
            }).slice(0, 5);
          return recs.length >= 2 ? recs.reduce((s, r) => s + r.points, 0) / recs.length : -Infinity;
        };
        return recentAvg(b) - recentAvg(a);
      }
      return a.name.localeCompare(b.name, "ja");
    });
  _filteredCache = result;
  return result;
}

function renderOrgFilter() {
  el.orgFilter.innerHTML = "";

  // 1. 現Mリーガー
  const mc = document.createElement("button");
  mc.className = "org-btn mleague-btn" + (state.mleagueC ? " active" : "");
  mc.textContent = "現Mリーガー";
  mc.onclick = () => { state.mleagueC = !state.mleagueC; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mc);

  // 2. 最高リーグ
  const tb = document.createElement("button");
  tb.className = "org-btn topleague-btn" + (state.topLeague ? " active" : "");
  tb.textContent = "最高リーグ (" + TOPLEAGUE_COUNT + ")"; tb.title = "各団体の最高位リーグに在籍経験あり";
  tb.onclick = () => { state.topLeague = !state.topLeague; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(tb);

  // 3. 3団体（すべて + 各団体）
  const opts = [{ id: "all", shortName: "すべて" }].concat(DATA.organizations);
  opts.forEach(o => {
    const b = document.createElement("button");
    b.className = "org-btn" + (state.org === o.id ? " active" : "");
    const cnt = o.id === "all" ? DATA.players.length : DATA.players.filter(p => playerOrgIds(p).includes(o.id)).length;
    b.innerHTML = (o.shortName || o.name) + (o.id !== "all" ? '<span class="org-cnt">' + cnt + '</span>' : '');
    b.onclick = () => { state.org = o.id; renderOrgFilter(); resetAndRenderList(); };
    el.orgFilter.appendChild(b);
  });

  // 4. お気に入り
  const favBtn = document.createElement("button");
  favBtn.className = "org-btn fav-btn" + (state.favOnly ? " active" : "");
  const favCount = getFavs().size;
  favBtn.textContent = "☆ お気に入り" + (favCount ? " (" + favCount + ")" : ""); favBtn.title = "お気に入り登録した選手のみ表示";
  favBtn.onclick = () => { state.favOnly = !state.favOnly; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(favBtn);

  // 4. 決定戦経験
  const poBtn = document.createElement("button");
  poBtn.className = "org-btn playoff-btn" + (state.playoff ? " active" : "");
  poBtn.textContent = "★ 決定戦経験 (" + PLAYOFF_COUNT + ")"; poBtn.title = "決定戦（プレーオフ）進出経験あり";
  poBtn.onclick = () => { state.playoff = !state.playoff; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(poBtn);

  // 5. 旧Mリーガー
  const mf = document.createElement("button");
  mf.className = "org-btn mleague-former-btn" + (state.mleagueF ? " active" : "");
  mf.textContent = "旧Mリーガー";
  mf.onclick = () => { state.mleagueF = !state.mleagueF; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mf);

  // 6. Mトーナメント
  const mt = document.createElement("button");
  mt.className = "org-btn mtourn-btn" + (state.mtourn ? " active" : "");
  mt.textContent = "Mトーナメント";
  mt.onclick = () => { state.mtourn = !state.mtourn; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mt);

  // 7. M関係
  const mrel = document.createElement("button");
  mrel.className = "org-btn mcast-btn" + (state.mRelated ? " active" : "");
  mrel.textContent = "M関係（実況・解説等）";
  mrel.onclick = () => { state.mRelated = !state.mRelated; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(mrel);

  // 8. 今期出場中
  const onBtn = document.createElement("button");
  onBtn.className = "org-btn ongoing-filter-btn" + (state.ongoingOnly ? " active" : "");
  onBtn.textContent = "今期出場中 (" + ONGOING_COUNT + ")"; onBtn.title = "今シーズン現在リーグ出場中の選手";
  onBtn.onclick = () => { state.ongoingOnly = !state.ongoingOnly; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(onBtn);

  // 女流あり
  const wb = document.createElement("button");
  wb.className = "org-btn wleague-btn" + (state.wleague ? " active" : "");
  wb.textContent = "女流あり (" + WLEAGUE_COUNT + ")"; wb.title = "女流リーグの成績データあり";
  wb.onclick = () => { state.wleague = !state.wleague; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(wb);

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
    const lightText = ["#FFD700","#D4A017","#E8739A"].includes(t.color);
    b.style.color = isActive ? (lightText ? "#000" : "#fff") : t.color;
    b.style.background = isActive ? t.color : "var(--bg)";
    b.onclick = () => {
      state.mteam = state.mteam === t.id ? null : t.id;
      renderOrgFilter();
      renderList();
    };
    teamWrap.appendChild(b);
  });

  // モバイル用フィルタートグルボタンのラベルを更新
  const ppBtn = document.createElement("button");
  ppBtn.className = "org-btn pospts-btn" + (state.positivePts ? " active" : "");
  ppBtn.textContent = "通算プラス"; ppBtn.title = "2期以上のデータで通算ポイントがプラスの選手";
  ppBtn.onclick = () => { state.positivePts = !state.positivePts; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(ppBtn);

  const raBtn = document.createElement("button");
  raBtn.className = "org-btn" + (state.recentActive ? " active" : "");
  raBtn.textContent = "直近5年"; raBtn.title = "2022年以降にリーグ出場がある選手";
  raBtn.onclick = () => { state.recentActive = !state.recentActive; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(raBtn);

  const htBtn = document.createElement("button");
  htBtn.className = "org-btn" + (state.hasTitle ? " active" : "");
  htBtn.textContent = "タイトル保有"; htBtn.title = "雀王・最高位・鳳凰位などのタイトルを持つ選手";
  htBtn.onclick = () => { state.hasTitle = !state.hasTitle; renderOrgFilter(); resetAndRenderList(); };
  el.orgFilter.appendChild(htBtn);

  // 詳細フィルター（折りたたみ: デビュー年代・年齢・出場期数）
  const extraOpen = state.extraOpen || !!state.debutDecade || state.ageMin != null || state.minRec != null;
  const extraLabel = document.createElement("button");
  extraLabel.className = "filter-section-label filter-section-toggle";
  extraLabel.textContent = (extraOpen ? "▲" : "▼") + " デビュー年代・年齢・期数";
  extraLabel.onclick = () => { state.extraOpen = !state.extraOpen; renderOrgFilter(); };
  el.orgFilter.appendChild(extraLabel);

  const extraWrap = document.createElement("div");
  extraWrap.style.cssText = "display:" + (extraOpen ? "block" : "none") + ";width:100%";
  el.orgFilter.appendChild(extraWrap);

  // デビュー年代
  const decLabel = document.createElement("span");
  decLabel.className = "filter-section-label";
  decLabel.textContent = "デビュー年代";
  extraWrap.appendChild(decLabel);
  const decWrap = document.createElement("div");
  decWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;width:100%";
  extraWrap.appendChild(decWrap);
  [1970, 1980, 1990, 2000, 2010, 2020].forEach(dec => {
    const db = document.createElement("button");
    db.className = "org-btn" + (state.debutDecade === dec ? " active" : "");
    db.textContent = (dec % 100) + "年代";
    db.title = dec + "〜" + (dec + 9) + "年デビュー";
    db.onclick = () => {
      state.debutDecade = state.debutDecade === dec ? null : dec;
      renderOrgFilter(); resetAndRenderList();
    };
    decWrap.appendChild(db);
  });

  // 年齢
  const ageLabel = document.createElement("div");
  ageLabel.className = "filter-section-label";
  ageLabel.textContent = "現在の年齢";
  ageLabel.style.marginTop = "8px";
  extraWrap.appendChild(ageLabel);
  const ageWrap = document.createElement("div");
  ageWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;width:100%";
  extraWrap.appendChild(ageWrap);
  [
    { label: "20代", min: 20, max: 29 },
    { label: "30代", min: 30, max: 39 },
    { label: "40代", min: 40, max: 49 },
    { label: "50代+", min: 50, max: 999 },
  ].forEach(bracket => {
    const ab = document.createElement("button");
    const isActive = state.ageMin === bracket.min && state.ageMax === bracket.max;
    ab.className = "org-btn" + (isActive ? " active" : "");
    ab.textContent = bracket.label;
    ab.title = bracket.min + "〜" + (bracket.max === 999 ? "" : bracket.max) + "歳（生年月日登録選手のみ）";
    ab.onclick = () => {
      if (isActive) { state.ageMin = null; state.ageMax = null; }
      else { state.ageMin = bracket.min; state.ageMax = bracket.max; }
      renderOrgFilter(); resetAndRenderList();
    };
    ageWrap.appendChild(ab);
  });

  // 出場期数
  const recLabel = document.createElement("div");
  recLabel.className = "filter-section-label";
  recLabel.textContent = "出場期数";
  recLabel.style.marginTop = "8px";
  extraWrap.appendChild(recLabel);
  const recWrap = document.createElement("div");
  recWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;width:100%";
  extraWrap.appendChild(recWrap);
  [{ label: "5期+", min: 5 }, { label: "10期+", min: 10 }, { label: "20期+", min: 20 }, { label: "30期+", min: 30 }].forEach(br => {
    const rb = document.createElement("button");
    rb.className = "org-btn" + (state.minRec === br.min ? " active" : "");
    rb.textContent = br.label;
    rb.title = br.min + "期以上出場した選手";
    rb.onclick = () => { state.minRec = state.minRec === br.min ? null : br.min; renderOrgFilter(); resetAndRenderList(); };
    recWrap.appendChild(rb);
  });

  const activeCount = [state.org !== "all", state.mleagueC, state.mleagueF, state.mtourn,
    state.topLeague, state.wleague, state.playoff, state.ongoingOnly, state.mRelated, !!state.mteam, !!state.year, state.favOnly, !!state.debutDecade, state.positivePts, state.recentActive, state.hasTitle, state.ageMin != null, state.minRec != null]
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
        topLeague:false, wleague:false, playoff:false, ongoingOnly:false, mRelated:false, mteam:null, year:"", favOnly:false, debutDecade:null, positivePts:false, recentActive:false, hasTitle:false, ageMin:null, ageMax:null, minRec:null });
      document.getElementById("yearFilter").value = "";
      renderOrgFilter(); renderList();
    };
    el.orgFilter.appendChild(clr);
  }
}

function highlightName(name, terms) {
  if (!terms || !terms.length) return name;
  const termList = Array.isArray(terms) ? terms : [terms];
  if (!termList.length) return name;
  // 各語を順に適用（最初にマッチした語をハイライト）
  const norm = normalize(name);
  for (const q of termList) {
    if (!q) continue;
    const idx = norm.indexOf(q);
    if (idx >= 0) {
      return name.slice(0, idx) + '<mark class="hl">' + name.slice(idx, idx + q.length) + '</mark>' + name.slice(idx + q.length);
    }
  }
  return name;
}

function renderList() {
  const _favs = getFavs(); // キャッシュ（localStorage読み込みを1回に）
  const list = filteredPlayers();
  const _qTerms = state.query.trim().split(/\s+|　+/).filter(Boolean).map(normalize).filter(Boolean);
  const total = DATA.players.length;
  const filterTags = []; // {label, key, val}
  if (state.org !== "all") { const o = ORGS[state.org]; if (o) filterTags.push({label: o.shortName, key: "org", val: "all"}); }
  if (state.mleagueC) filterTags.push({label: "Mリーグ現役", key: "mleagueC", val: false});
  if (state.mleagueF) filterTags.push({label: "Mリーグ元", key: "mleagueF", val: false});
  if (state.mtourn)   filterTags.push({label: "Mトーナメント", key: "mtourn", val: false});
  if (state.mteam)    { const t = MLEAGUE_TEAMS.find(x => x.id === state.mteam); if (t) filterTags.push({label: t.short, key: "mteam", val: null}); }
  if (state.mRelated) filterTags.push({label: "M関係", key: "mRelated", val: false});
  if (state.topLeague) filterTags.push({label: "最高リーグ", key: "topLeague", val: false});
  if (state.wleague)   filterTags.push({label: "女流あり", key: "wleague", val: false});
  if (state.playoff)   filterTags.push({label: "決定戦経験", key: "playoff", val: false});
  if (state.ongoingOnly) filterTags.push({label: "今期出場中", key: "ongoingOnly", val: false});
  if (state.favOnly)   filterTags.push({label: "お気に入り", key: "favOnly", val: false});
  if (state.year)      filterTags.push({label: state.year + "年", key: "year", val: ""});
  if (state.debutDecade) filterTags.push({label: (state.debutDecade % 100) + "年代デビュー", key: "debutDecade", val: null});
  if (state.positivePts) filterTags.push({label: "通算プラス", key: "positivePts", val: false});
  if (state.recentActive) filterTags.push({label: "直近5年", key: "recentActive", val: false});
  if (state.hasTitle) filterTags.push({label: "タイトル保有", key: "hasTitle", val: false});
  if (state.ageMin != null) filterTags.push({label: state.ageMin + (state.ageMax === 999 ? "歳以上" : "〜" + state.ageMax + "歳"), key: "ageMin", val: null});
  if (state.minRec != null) filterTags.push({label: state.minRec + "期以上", key: "minRec", val: null});
  const countText = list.length < total ? list.length + " / " + total + " 名" : total + " 名";
  if (filterTags.length) {
    const tagHtml = filterTags.map(f => '<button class="filter-chip" data-fkey="' + f.key + '" title="このフィルターを解除">× ' + f.label + '</button>').join('');
    const clearAll = filterTags.length >= 2 ? '<button class="filter-chip filter-clear-all" title="すべてのフィルターを解除">✕ 全解除</button>' : '';
    const yearSortHint = state.year && state.sort !== "pts" && list.some(p => (p.records||[]).concat(p.wrecords||[]).some(r => !r.ongoing && r.points != null))
      ? '<button class="filter-chip" id="yearSortHint" style="background:#2a7a3a" title="この年のポイント順で並べ替え">pt順で見る</button>' : '';
    el.playerCount.innerHTML = '<span class="count-text">' + countText + '</span>' + tagHtml + clearAll + yearSortHint;
  } else {
    el.playerCount.textContent = countText;
  }
  // フィルター状態をタイトル・URLに反映（選手詳細非表示時）
  if (!state.selectedId) {
    document.title = filterTags.length ? filterTags.join("・") + " - 麻雀プロ検索" : "麻雀プロ検索";
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.org !== "all") params.set("org", state.org);
    if (state.sort !== "name") params.set("sort", state.sort);
    if (state.mteam) params.set("mteam", state.mteam);
    if (state.mleagueC) params.set("mlc", "1");
    if (state.mleagueF) params.set("mlf", "1");
    if (state.ongoingOnly) params.set("ongoing", "1");
    if (state.favOnly) params.set("fav", "1");
    if (state.year) params.set("yr", state.year);
    if (state.hasTitle) params.set("titled", "1");
    if (state.positivePts) params.set("pos", "1");
    const qs = params.toString();
    const newUrl = location.pathname + (qs ? "?" + qs : "");
    if (location.href !== location.origin + newUrl) history.replaceState(null, "", newUrl);
  }
  // フィルターチップのクリックで個別解除
  const yearSortHintBtn = el.playerCount.querySelector("#yearSortHint");
  if (yearSortHintBtn) {
    yearSortHintBtn.addEventListener("click", () => {
      state.sort = "pts";
      const sel = document.getElementById("sortSelect"); if (sel) sel.value = "pts";
      resetAndRenderList();
    });
  }
  const clearAllBtn = el.playerCount.querySelector(".filter-clear-all");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      Object.assign(state, {org:"all",mleagueC:false,mleagueF:false,mtourn:false,topLeague:false,wleague:false,playoff:false,ongoingOnly:false,favOnly:false,year:"",debutDecade:null,positivePts:false,recentActive:false,hasTitle:false,mteam:null,mRelated:false,ageMin:null,ageMax:null,minRec:null});
      const yf = document.getElementById("yearFilter"); if (yf) yf.value = "";
      renderOrgFilter(); resetAndRenderList();
    });
  }
  el.playerCount.querySelectorAll(".filter-chip[data-fkey]").forEach(chip => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.fkey;
      const defaults = {org:"all",mleagueC:false,mleagueF:false,mtourn:false,topLeague:false,wleague:false,playoff:false,ongoingOnly:false,favOnly:false,year:"",debutDecade:null,positivePts:false,recentActive:false,hasTitle:false,mteam:null,mRelated:false,ageMin:null,ageMax:null};
      if (key === "ageMin") { state.ageMin = null; state.ageMax = null; renderOrgFilter(); resetAndRenderList(); return; }
      if (key === "minRec") { state.minRec = null; renderOrgFilter(); resetAndRenderList(); return; }
      if (key in defaults) {
        state[key] = defaults[key];
        if (key === "year") document.getElementById("yearFilter").value = "";
        renderOrgFilter();
        resetAndRenderList();
      }
    });
  });
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
  const showRank = ["pts", "totalpts", "avgpts", "avgrank", "playoff", "career", "tier", "titles", "recentavg"].includes(state.sort);
  visibleList.forEach((p, listIdx) => {
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
    const titlesBadge = state.sort === "titles" && p.profile && p.profile.titles && p.profile.titles.length
      ? '<span class="p-titles-cnt" title="' + p.profile.titles.join('、') + '">🏆' + p.profile.titles.length + '</span>'
      : "";
    // ソート順に応じたコンテキストバッジ
    let contextBadge = "";
    if (state.sort === "totalpts" || state.sort === "avgpts" || state.sort === "avgrank" || state.sort === "debut" || state.sort === "career" || state.sort === "records" || state.sort === "name" || state.sort === "recentavg") {
      const allRecs2 = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
      if (state.sort === "totalpts" && allRecs2.length >= 2) {
        const tot = allRecs2.reduce((s, r) => s + r.points, 0);
        const sign = tot >= 0 ? "+" : "";
        contextBadge = '<span class="p-ctx' + (tot >= 0 ? " pos" : " neg") + '">' + sign + tot.toFixed(0) + '</span>';
      } else if (state.sort === "avgpts" && allRecs2.length >= 3) {
        const avg = allRecs2.reduce((s, r) => s + r.points, 0) / allRecs2.length;
        const sign = avg >= 0 ? "+" : "";
        contextBadge = '<span class="p-ctx' + (avg >= 0 ? " pos" : " neg") + '">' + sign + avg.toFixed(1) + 'avg</span>';
      } else if (state.sort === "name") {
        // 直近3期平均ptを表示
        const recent3 = allRecs2.slice().sort((a, b) => {
          const ya = termToYear(a.orgId || p.org, a.term) || wTermToYear(p.wleague || {}, a.term);
          const yb = termToYear(b.orgId || p.org, b.term) || wTermToYear(p.wleague || {}, b.term);
          return yb - ya;
        }).slice(0, 3);
        if (recent3.length >= 2) {
          const r3avg = recent3.reduce((s, r) => s + r.points, 0) / recent3.length;
          const sign = r3avg >= 0 ? "+" : "";
          contextBadge = '<span class="p-ctx' + (r3avg >= 0 ? " pos" : " neg") + '" title="直近' + recent3.length + '期平均">' + sign + r3avg.toFixed(1) + '</span>';
        }
      } else if (state.sort === "avgrank") {
        const rankRecs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.rank != null);
        if (rankRecs.length >= 2) {
          const avg = rankRecs.reduce((s, r) => s + r.rank, 0) / rankRecs.length;
          contextBadge = '<span class="p-ctx neu">平均' + avg.toFixed(2) + '位</span>';
        }
      } else if (state.sort === "debut") {
        const ys = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term)).concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term))).filter(y => y > 1000);
        if (ys.length) contextBadge = '<span class="p-ctx neu">' + Math.min(...ys) + '年〜</span>';
      } else if (state.sort === "career") {
        const ys2 = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term)).concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term))).filter(y => y > 1000);
        if (ys2.length > 1) {
          const span = Math.max(...ys2) - Math.min(...ys2) + 1;
          contextBadge = '<span class="p-ctx neu">' + span + '年</span>';
        }
      } else if (state.sort === "records") {
        const cnt = (p.records || []).length + (p.wrecords || []).length;
        if (cnt) contextBadge = '<span class="p-ctx neu">' + cnt + '期</span>';
      } else if (state.sort === "recentavg" && allRecs2.length >= 2) {
        const recent5 = allRecs2.slice().sort((a, b) => {
          const ya = termToYear(a.orgId || p.org, a.term) || wTermToYear(p.wleague || {}, a.term);
          const yb = termToYear(b.orgId || p.org, b.term) || wTermToYear(p.wleague || {}, b.term);
          return yb - ya;
        }).slice(0, 5);
        const r5avg = recent5.reduce((s, r) => s + r.points, 0) / recent5.length;
        const sign = r5avg >= 0 ? "+" : "";
        contextBadge = '<span class="p-ctx' + (r5avg >= 0 ? " pos" : " neg") + '" title="直近' + recent5.length + '期平均">' + sign + r5avg.toFixed(1) + '</span>';
      }
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
    // 最高到達ティア（最新と異なる場合のみ表示）
    let bestTierBadge = "";
    {
      const orgForTiers = ORGS[latestRec ? (latestRec.orgId || p.org) : p.org] || {};
      const tiers = (orgForTiers.league || {}).tiers || [];
      if (tiers.length && latestTier) {
        const normTier = t => (t === "後期" || t === "前期") ? null : t;
        const tierIdx = t => { const i = tiers.indexOf(t); return i >= 0 ? i : 9999; };
        const allTiers = (p.records || []).map(r => normTier((r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier)).filter(Boolean);
        const bestTier = allTiers.sort((a, b) => tierIdx(a) - tierIdx(b))[0];
        if (bestTier && bestTier !== latestTier && tierIdx(bestTier) < tierIdx(latestTier)) {
          bestTierBadge = '<span class="ptier tier-badge best-tier ' + tierClass(bestTier) + '" title="最高到達: ' + bestTier + '">▲' + bestTier + '</span>';
        }
      }
    }
    // 昇降級トレンドアイコン（直近3期）
    let trendIcon = "";
    {
      const pRecs = (p.records || []).map(r => ({ r, yr: termToYear(r.orgId || p.org, r.term) }));
      const wRecs = (p.wrecords || []).map(r => ({ r, yr: wTermToYear(p.wleague || {}, r.term) }));
      const trendRecs = [...pRecs, ...wRecs]
        .filter(({ r }) => !r.ongoing && (r.category === "promotion" || r.category === "demotion" || r.category === "stay" || r.category === "playoff"))
        .sort((a, b) => b.yr - a.yr)
        .map(({ r }) => r)
        .slice(0, 3);
      if (trendRecs.length >= 2) {
        const arrows = trendRecs.map(r => {
          if (r.category === "promotion") return '<span class="trend-up">↑</span>';
          if (r.category === "demotion")  return '<span class="trend-dn">↓</span>';
          if (r.category === "playoff")   return '<span class="trend-po">★</span>';
          return '<span class="trend-st">—</span>';
        }).reverse().join("");
        trendIcon = '<span class="p-trend" title="直近3期の昇降級">' + arrows + '</span>';
      } else if (trendRecs.length === 1) {
        const r = trendRecs[0];
        if (r.category === "promotion") trendIcon = '<span class="p-trend trend-up" title="昇級">↑</span>';
        else if (r.category === "demotion") trendIcon = '<span class="p-trend trend-dn" title="降級">↓</span>';
      }
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
    // ホバーtitleに要約情報
    const titleParts = [];
    if (p.profile && p.profile.nickname) titleParts.push('"' + p.profile.nickname + '"');
    if (latestTier) titleParts.push("直近: " + latestTier);
    const debutYr = (() => { const ys = (p.records||[]).map(r=>termToYear(r.orgId||p.org,r.term)).concat((p.wrecords||[]).map(r=>wTermToYear(p.wleague||{},r.term))).filter(y=>y>1000); return ys.length ? Math.min(...ys) : null; })();
    if (debutYr) titleParts.push(debutYr + "年〜");
    const totalRecCount = (p.records || []).length + (p.wrecords || []).length;
    if (totalRecCount) titleParts.push(totalRecCount + "期");
    const playoffCount = (p.records || []).filter(r => r.category === "playoff").length + (p.wrecords || []).filter(r => r.category === "playoff").length;
    if (playoffCount) titleParts.push("決定戦" + playoffCount + "回");
    const allPtsRecs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
    if (allPtsRecs.length >= 2) {
      const tot = allPtsRecs.reduce((s, r) => s + r.points, 0);
      titleParts.push("通算" + (tot >= 0 ? "+" : "") + tot.toFixed(1) + "pt");
    }
    if (titleParts.length) li.title = titleParts.join(" / ");
    const rankMedal = showRank && listIdx < 3 ? ["🥇","🥈","🥉"][listIdx] : null;
    const rankNum = showRank ? '<span class="list-rank" title="' + (listIdx + 1) + '位">' + (rankMedal || (listIdx + 1)) + '</span>' : "";
    li.innerHTML =
      rankNum + '<span class="pname">' + highlightName(p.name, _qTerms) + "</span>" +
      '<span class="pright">' +
      '<span class="porg' + (isTransfer ? " transfer" : "") + '">' +
      (curOrg ? curOrg.shortName : "") + (isTransfer ? "↩" : "") + "</span>" +
      ongoingBadge + tierBadge + bestTierBadge + trendIcon + roleLabel + teamBadge + ongoingPts + titlesBadge + contextBadge + favStar +
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
  const playoffYears = allRecs.filter(r => r.category === "playoff")
    .map(r => termToYear(r.orgId || p.org, r.term)).filter(y => y > 1000)
    .concat((p.wrecords || []).filter(r => r.category === "playoff").map(r => wTermToYear(p.wleague || {}, r.term)).filter(y => y > 1000))
    .sort((a, b) => a - b);

  // Mリーグチーム情報
  const playerTeams = MLEAGUE_TEAMS.filter(t => playerTeamStatus(p.name, t) !== null);

  const isOngoing = allRecs.some(r => r.ongoing);
  const debutYears = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term)).filter(y => y > 1000);
  const wDebutYears = (p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term)).filter(y => y > 1000);
  const debutYear = [...debutYears, ...wDebutYears].length ? Math.min(...debutYears, ...wDebutYears) : null;
  const currentYear = 2026;
  const careerYrs = debutYear ? currentYear - debutYear + 1 : null;
  const filtList = filteredPlayers();
  const listPos = filtList.findIndex(x => x.id === p.id);
  const posLabel = listPos >= 0 ? '<span class="list-pos" title="現在の並び順">' + (listPos + 1) + '/' + filtList.length + '</span>' : "";
  const prevPlayer = listPos > 0 ? filtList[listPos - 1] : null;
  const nextPlayer = listPos >= 0 && listPos < filtList.length - 1 ? filtList[listPos + 1] : null;
  const prevBtn = prevPlayer ? '<button class="nav-btn prev-btn" data-nav-id="' + prevPlayer.id + '" title="' + prevPlayer.name + '">‹ ' + prevPlayer.name + '</button>' : '<span class="nav-btn nav-disabled"></span>';
  const nextBtn = nextPlayer ? '<button class="nav-btn next-btn" data-nav-id="' + nextPlayer.id + '" title="' + nextPlayer.name + '">' + nextPlayer.name + ' ›</button>' : '<span class="nav-btn nav-disabled"></span>';
  let html = '<div class="detail-nav">' +
    '<button class="back-to-list" onclick="document.querySelector(\'.sidebar\').scrollIntoView({behavior:\'smooth\'})">← 一覧</button>' +
    prevBtn + nextBtn +
    '</div>';
  const isFav = getFavs().has(p.id);
  const ptRank = totalPtsRank(p.id);
  const ptRankLabel = ptRank ? '<span class="list-pos" title="5期以上出場選手中の通算pt順位（' + _totalPtsRanking.length + '人中）">通算pt ' + ptRank + '位</span>' : '';
  html += '<div class="detail-head"><h2>' + p.name + "</h2>" + posLabel + ptRankLabel +
    (debutYear ? '<span class="debut-year" title="デビュー年">' + debutYear + '年デビュー' + (careerYrs && careerYrs > 0 ? '（' + careerYrs + '年目）' : '') + '</span>' : '') +
    (isOngoing ? (() => {
      // 今期の団体内ランキング
      const ongoingRec = allRecs.find(r => r.ongoing && r.points != null);
      if (ongoingRec) {
        const oid = ongoingRec.orgId || p.org;
        const orgName2 = (ORGS[oid] || {}).shortName || oid;
        const tier = ongoingRec.tier;
        const sameOrg = DATA.players.filter(op => op.id !== p.id && (op.records||[]).some(r => r.ongoing && (r.orgId||op.org) === oid && r.tier === tier && r.points != null));
        const myPts = ongoingRec.points;
        const rank = sameOrg.filter(op => {
          const rec = (op.records||[]).find(r => r.ongoing && (r.orgId||op.org) === oid && r.tier === tier);
          return rec && rec.points > myPts;
        }).length + 1;
        const total = sameOrg.length + 1;
        return '<span class="ongoing-badge" title="今期' + orgName2 + ' ' + tier + ' ' + rank + '/' + total + '位">' +
          '開催中 <span style="font-size:9px">' + rank + '/' + total + '位</span></span>';
      }
      return '<span class="ongoing-badge">開催中</span>';
    })() : '') +
    (totalPlayoffs > 0 ? (() => { const pr = playoffRank(p.id); const prStr = pr && pr <= 20 ? ' 全体' + pr + '位' : ''; return '<span class="playoff-badge" title="決定戦進出' + totalPlayoffs + '回: ' + playoffYears.join('、') + '年' + prStr + '">★決定戦×' + totalPlayoffs + (pr && pr <= 20 ? '<span style="font-size:9px;margin-left:2px">全体' + pr + '位</span>' : '') + '</span>'; })() : '') +
    '<button class="fav-toggle-btn' + (isFav ? " active" : "") + '" id="favToggleBtn" title="お気に入り">' + (isFav ? "★" : "☆") + '</button>' +
    '<button class="copy-link-btn" onclick="copyPlayerLink()" title="URLをコピー">🔗</button>' +
    '<button class="copy-link-btn" id="copyStatsBtn" onclick="copyPlayerStats()" title="成績をテキストコピー">📄</button>' +
    '<a class="x-share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(p.name + ' - 麻雀プロ検索') + '&url=' + encodeURIComponent(location.origin + location.pathname + '?p=' + encodeURIComponent(p.id)) + '" target="_blank" rel="noopener" title="Xでシェア">𝕏</a>' +
    '<button class="copy-link-btn" onclick="window.print()" title="印刷・PDF保存">🖨</button>' +
    (p.sourceUrl ? '<a class="x-share-btn" href="' + p.sourceUrl + '" target="_blank" rel="noopener" title="公式データソース">公式</a>' : '');
  if (isMultiOrg) {
    html += '<span class="transfer-badge">移籍歴あり</span>';
  } else {
    const org = ORGS[p.org] || {};
    html += '<span class="org-name">' + (org.name || "") + "</span>";
  }
  // キャリアマイルストーンバッジ
  {
    const milestones = [];
    if (allRecs.length >= 30) milestones.push({ label: '30期+', title: allRecs.length + '期出場', cls: 'ms-legend' });
    else if (allRecs.length >= 20) milestones.push({ label: '20期+', title: allRecs.length + '期出場', cls: 'ms-veteran' });
    else if (allRecs.length >= 10) milestones.push({ label: '10期+', title: allRecs.length + '期出場', cls: 'ms-regular' });
    const allPtsRecs2 = allRecs.filter(r => !r.ongoing && r.points != null);
    if (allPtsRecs2.length >= 5) {
      const posRate = allPtsRecs2.filter(r => r.points > 0).length / allPtsRecs2.length;
      if (posRate >= 0.75) milestones.push({ label: '安定', title: 'プラス率' + Math.round(posRate * 100) + '%', cls: 'ms-stable' });
    }
    milestones.forEach(m => {
      html += '<span class="career-milestone ' + m.cls + '" title="' + m.title + '">' + m.label + '</span>';
    });
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
  // 前後ナビゲーション
  {
    const list = filteredPlayers();
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0 && list.length > 1) {
      const prev = idx > 0 ? list[idx - 1] : null;
      const next = idx < list.length - 1 ? list[idx + 1] : null;
      html += '<div class="player-nav">';
      html += prev
        ? '<button class="player-nav-btn" data-nav-id="' + prev.id + '" title="前の選手: ' + prev.name + '">‹ ' + prev.name + '</button>'
        : '<span class="player-nav-btn disabled"></span>';
      const shareUrl = location.origin + location.pathname + '?p=' + encodeURIComponent(p.id);
      html += '<span class="player-nav-center"><span class="player-nav-pos">' + (idx + 1) + ' / ' + list.length + '</span><button class="player-share-btn" onclick="(async()=>{try{await navigator.clipboard.writeText(\'' + shareUrl.replace(/'/g, "\\'") + '\');this.textContent=\'✓\';setTimeout(()=>this.textContent=\'🔗\',1200);}catch(e){}})()" title="URLをコピー">🔗</button></span>';
      html += next
        ? '<button class="player-nav-btn" data-nav-id="' + next.id + '" title="次の選手: ' + next.name + '">' + next.name + ' ›</button>'
        : '<span class="player-nav-btn disabled"></span>';
      html += '</div>';
    }
  }

  html += renderProfile(p);

  if (isMultiOrg) {
    html += '<div class="summary">';
    html += stat(allRecs.length, "総出場期数");
    html += stat(totalPlayoffs, "決定戦進出");
    html += "</div>";
    // 団体別在籍タイムライン
    const allYears = allRecs.map(r => termToYear(r.orgId||p.org, r.term)).filter(y => y > 1000);
    const wYears = (p.wrecords||[]).map(r => wTermToYear(p.wleague||{}, r.term)).filter(y => y > 1000);
    const minYrG = Math.min(...allYears, ...wYears, 2100);
    const maxYrG = Math.max(...allYears, ...wYears, 1900);
    if (minYrG < maxYrG) {
      const gW = 560, gH = orgIds.length * 14 + 20, gPadL = 50, gPadR = 8, gPadT = 16;
      const gxFn = yr => gPadL + (yr - minYrG) / (maxYrG - minYrG) * (gW - gPadL - gPadR);
      const ORG_COLORS = { saikouisen: '#c0392b', renmei: '#2c5fa8', kyokai: '#3a8c4f', rmu: '#7d5ba6', mu: '#c77f1a' };
      let gSvg = '<svg viewBox="0 0 ' + gW + ' ' + gH + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:' + gH + 'px;margin:4px 0">';
      // 年軸
      for (let yr = Math.ceil(minYrG / 5) * 5; yr <= maxYrG; yr += 5) {
        const gx = gxFn(yr).toFixed(1);
        gSvg += '<line x1="' + gx + '" y1="' + (gPadT - 4) + '" x2="' + gx + '" y2="' + gH + '" stroke="#e2e5ea" stroke-width="0.5"/>';
        gSvg += '<text x="' + gx + '" y="' + (gPadT - 2) + '" text-anchor="middle" font-size="7" fill="#8a93a2">' + yr + '</text>';
      }
      orgIds.forEach((oid2, oi) => {
        const gy = gPadT + oi * 14 + 2;
        const org2 = ORGS[oid2] || {};
        const orgYears = allRecs.filter(r => (r.orgId||p.org) === oid2).map(r => termToYear(oid2, r.term)).filter(y => y > 1000);
        if (!orgYears.length) return;
        const oMin = Math.min(...orgYears), oMax = Math.max(...orgYears);
        const col = ORG_COLORS[oid2] || '#8a93a2';
        gSvg += '<rect x="' + gxFn(oMin).toFixed(1) + '" y="' + gy + '" width="' + Math.max(4, gxFn(oMax) - gxFn(oMin)).toFixed(1) + '" height="8" rx="2" fill="' + col + '" opacity="0.75"/>';
        gSvg += '<text x="' + Math.max(2, gxFn(oMin) - 2) + '" y="' + (gy + 7) + '" text-anchor="end" font-size="8" fill="' + col + '">' + (org2.shortName || oid2) + '</text>';
      });
      gSvg += '</svg>';
      html += gSvg;
    }
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
    const avgPtsPct = avgPtsPercentile(avgPts);
    const avgPtsStr = avgPts != null
      ? fmtPoints(avgPts) + "pt" + (avgPtsPct != null && recsWithPts.length >= 5 ? ' <span style="font-size:9px;color:var(--muted)">(上位' + (100 - avgPtsPct) + '%)</span>' : '')
      : null;
    const bestPts = recsWithPts.length
      ? recsWithPts.reduce((max, r) => r.points > max ? r.points : max, -Infinity)
      : null;
    const bestPtsStr = bestPts != null && bestPts > -Infinity ? fmtPoints(bestPts) + "pt" : null;
    const totalPts = recsWithPts.length >= 2 ? recsWithPts.reduce((s, r) => s + r.points, 0) : null;
    const totalPtsStr = totalPts != null ? fmtPoints(totalPts) + "pt" : null;
    const ptRankHere = totalPtsRank(p.id);
    const orgPtRankHere = orgPtsRank(p.id, oid);
    const orgName = (ORGS[oid] || {}).shortName || oid;
    const totalPtsTitle = totalPts != null
      ? [ptRankHere ? '全選手中通算pt ' + ptRankHere + '位（5期以上）' : null,
         orgPtRankHere ? orgName + '内通算pt ' + orgPtRankHere + '位（3期以上）' : null]
          .filter(Boolean).join(' / ') || null
      : null;
    const recsWithRank = groupRecs.filter(r => !r.ongoing && r.rank != null);
    const avgRank = recsWithRank.length >= 3
      ? (recsWithRank.reduce((s, r) => s + r.rank, 0) / recsWithRank.length)
      : null;
    const avgRankStr = avgRank != null ? avgRank.toFixed(1) + "位" : null;
    const bestPtsRec = recsWithPts.length ? recsWithPts.reduce((best, r) => r.points > best.points ? r : best) : null;
    const topTierName = (league.tiers || [])[0];
    const topFirstYear = topTierName
      ? groupRecs
          .filter(r => (r.tier === "後期" || r.tier === "前期" ? r.result : r.tier) === topTierName)
          .map(r => termToYear(r.orgId || oid, r.term))
          .filter(y => y > 1000)
          .reduce((min, y) => Math.min(min, y), Infinity)
      : Infinity;
    const topFirstYearStr = topFirstYear < Infinity ? topFirstYear + "年" : "-";

    // 昇級率
    const promotions = groupRecs.filter(r => r.category === "promotion").length;
    const completedRecs = groupRecs.filter(r => !r.ongoing && (r.category === "promotion" || r.category === "demotion" || r.category === "stay" || r.category === "playoff"));
    const promoRateStr = completedRecs.length >= 5
      ? Math.round(promotions / completedRecs.length * 100) + "%"
      : null;

    // 最長連続出場
    const sortedTerms = groupRecs.map(r => r.term).sort((a, b) => a - b);
    let maxStreak = 1, curStreak = 1;
    for (let i = 1; i < sortedTerms.length; i++) {
      if (sortedTerms[i] === sortedTerms[i - 1] + 1) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
      else curStreak = 1;
    }
    const streakStr = sortedTerms.length > 1 && maxStreak >= 3 ? maxStreak + "期" : null;

    // 最長連続昇級
    const catsSorted = groupRecs.slice().sort((a, b) => a.term - b.term).map(r => r.category).filter(c => c === "promotion" || c === "demotion" || c === "stay");
    let maxPromoStreak = 0, curPromoStreak = 0;
    catsSorted.forEach(c => {
      if (c === "promotion") { curPromoStreak++; maxPromoStreak = Math.max(maxPromoStreak, curPromoStreak); }
      else curPromoStreak = 0;
    });
    const promoStreakStr = maxPromoStreak >= 3 ? maxPromoStreak + "連続昇級" : null;

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
      if (promoStreakStr) html += stat(promoStreakStr, "連続記録");
      if (promoRateStr) html += stat(promoRateStr, "昇級率");
      if (totalPtsStr) html += stat(totalPtsStr, "通算pt", totalPtsTitle);
      if (bestPtsStr) html += stat(bestPtsStr, "最高pt");
      if (avgPtsStr) html += stat(avgPtsStr, "平均pt", avgPtsPct != null ? '全選手中上位' + (100 - avgPtsPct) + '%（5期以上出場選手中）' : null);
      if (avgRankStr) html += stat(avgRankStr, "平均順位");
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
      if (promoStreakStr) html += stat(promoStreakStr, "連続記録");
      if (promoRateStr) html += stat(promoRateStr, "昇級率");
      if (totalPtsStr) html += stat(totalPtsStr, "通算pt", totalPtsTitle);
      if (bestPtsStr) html += stat(bestPtsStr, "最高pt");
      if (avgPtsStr) html += stat(avgPtsStr, "平均pt", avgPtsPct != null ? '全選手中上位' + (100 - avgPtsPct) + '%（5期以上出場選手中）' : null);
      if (avgRankStr) html += stat(avgRankStr, "平均順位");
      if (latestPtsStr) html += stat(latestPtsStr, "直近pt");
      html += stat(yearRange, "活動期間");
      html += "</div>";
    }

    html += chartSvg(groupRecs, oid);

    // 累積ポイントスパークライン（5期以上ある場合）
    const cumulativeData = groupRecs.slice()
      .filter(r => !r.ongoing && r.points != null)
      .sort((a, b) => termToYear(oid, a.term) - termToYear(oid, b.term));
    if (cumulativeData.length >= 5) {
      let cumSum = 0;
      const cumPts = cumulativeData.map(r => { cumSum += r.points; return { yr: termToYear(oid, r.term), v: cumSum }; });
      const minV = Math.min(0, ...cumPts.map(d => d.v));
      const maxV = Math.max(0, ...cumPts.map(d => d.v));
      const vRange = maxV - minV || 1;
      const minYr = cumPts[0].yr, maxYr = cumPts[cumPts.length - 1].yr;
      const yrRange = maxYr - minYr || 1;
      const cW = 600, cH = 50, cPadL = 40, cPadR = 8, cPadT = 8, cPadB = 12;
      const cxFn = yr => cPadL + (yr - minYr) / yrRange * (cW - cPadL - cPadR);
      const cyFn = v => cPadT + (1 - (v - minV) / vRange) * (cH - cPadT - cPadB);
      const zero = cyFn(0).toFixed(1);
      let cSvg = '<svg viewBox="0 0 ' + cW + ' ' + cH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:50px">';
      cSvg += '<line x1="' + cPadL + '" y1="' + zero + '" x2="' + (cW - cPadR) + '" y2="' + zero + '" stroke="#e2e5ea" stroke-dasharray="3 2"/>';
      const path = cumPts.map((d, i) => (i === 0 ? 'M' : 'L') + cxFn(d.yr).toFixed(1) + ' ' + cyFn(d.v).toFixed(1)).join(' ');
      const lastV = cumPts[cumPts.length - 1].v;
      const lineColor = lastV >= 0 ? '#2a7a3a' : '#c0392b';
      cSvg += '<path d="' + path + '" fill="none" stroke="' + lineColor + '" stroke-width="1.5"/>';
      const lastX = cxFn(cumPts[cumPts.length - 1].yr).toFixed(1);
      const lastY = cyFn(lastV).toFixed(1);
      cSvg += '<circle cx="' + lastX + '" cy="' + lastY + '" r="3" fill="' + lineColor + '"/>';
      const label = (lastV >= 0 ? '+' : '') + lastV.toFixed(1);
      cSvg += '<text x="4" y="' + (parseFloat(lastY) + 4) + '" font-size="9" fill="' + lineColor + '">' + label + '</text>';
      // 年ラベル（開始・終了）
      const firstX = cxFn(minYr).toFixed(1);
      cSvg += '<text x="' + firstX + '" y="' + (cH - 2) + '" text-anchor="middle" font-size="8" fill="#8a93a2">' + minYr + '</text>';
      cSvg += '<text x="' + lastX + '" y="' + (cH - 2) + '" text-anchor="middle" font-size="8" fill="#8a93a2">' + maxYr + '</text>';
      cSvg += '<text x="4" y="10" font-size="8" fill="#8a93a2">通算pt推移</text>';
      cSvg += '</svg>';
      // 累積チャートに最高・最低ポイント期のマーカー追加
      const peakCum = cumPts.reduce((m, d) => d.v > m.v ? d : m, cumPts[0]);
      const troughCum = cumPts.reduce((m, d) => d.v < m.v ? d : m, cumPts[0]);
      if (peakCum.v > 0) {
        const px = cxFn(peakCum.yr).toFixed(1), py = cyFn(peakCum.v).toFixed(1);
        cSvg = cSvg.replace('</svg>', '<circle cx="' + px + '" cy="' + py + '" r="2.5" fill="#2a7a3a" opacity="0.6"/>' +
          '<text x="' + px + '" y="' + (parseFloat(py) - 3) + '" text-anchor="middle" font-size="7" fill="#2a7a3a">' + peakCum.yr + '</text></svg>');
      }
      if (troughCum.v < 0) {
        const tx = cxFn(troughCum.yr).toFixed(1), ty = cyFn(troughCum.v).toFixed(1);
        cSvg = cSvg.replace('</svg>', '<circle cx="' + tx + '" cy="' + ty + '" r="2.5" fill="#c0392b" opacity="0.6"/>' +
          '<text x="' + tx + '" y="' + (parseFloat(ty) + 9) + '" text-anchor="middle" font-size="7" fill="#c0392b">' + troughCum.yr + '</text></svg>');
      }
      // per-season棒グラフ（バー形式で各期ptを正負表示）
      const bW = 600, bH = 36, bPadL = 40, bPadR = 8, bPadT = 4, bPadB = 4;
      const bPts = cumulativeData.map(r => r.points);
      const bMax = Math.max(...bPts.map(Math.abs), 1);
      const bestPtIdx = bPts.indexOf(Math.max(...bPts));
      const worstPtIdx = bPts.indexOf(Math.min(...bPts));
      const zeroY = (bH / 2).toFixed(1);
      const barW = Math.max(1, (bW - bPadL - bPadR) / cumulativeData.length - 1);
      let bSvg = '<svg viewBox="0 0 ' + bW + ' ' + bH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:' + bH + 'px">';
      bSvg += '<line x1="' + bPadL + '" y1="' + zeroY + '" x2="' + (bW - bPadR) + '" y2="' + zeroY + '" stroke="#e2e5ea"/>';
      cumulativeData.forEach((r, i) => {
        const bx = (bPadL + i * (barW + 1)).toFixed(1);
        const pct = r.points / bMax;
        const barH2 = Math.abs(pct) * (bH / 2 - bPadT);
        const by = r.points >= 0 ? (bH / 2 - barH2).toFixed(1) : zeroY;
        const isBest = i === bestPtIdx && r.points > 0;
        const isWorst = i === worstPtIdx && r.points < 0;
        const col = r.points >= 0 ? '#2a7a3a' : '#c0392b';
        const yr = termToYear(oid, r.term);
        bSvg += '<rect x="' + bx + '" y="' + by + '" width="' + barW.toFixed(1) + '" height="' + barH2.toFixed(1) + '" fill="' + col + '" opacity="' + (isBest || isWorst ? '1' : '0.7') + '" stroke="' + (isBest || isWorst ? '#fff' : 'none') + '" stroke-width="' + (isBest || isWorst ? '0.5' : '0') + '"><title>' + yr + '年: ' + (r.points >= 0 ? '+' : '') + r.points.toFixed(1) + 'pt</title></rect>';
        if (isBest || isWorst) {
          bSvg += '<text x="' + (parseFloat(bx) + barW / 2) + '" y="' + (isBest ? parseFloat(by) - 1 : parseFloat(by) + parseFloat(barH2.toFixed(1)) + 7) + '" text-anchor="middle" font-size="6" fill="' + col + '">' + yr + '</text>';
        }
      });
      bSvg += '<text x="4" y="' + (bH / 2 + 4) + '" font-size="8" fill="#8a93a2">期別pt</text>';
      bSvg += '</svg>';
      // ティア推移ライン（リーグ内ランク）
      const tierList = (league.tiers || []);
      if (tierList.length >= 2) {
        const tierData = groupRecs.slice().sort((a, b) => termToYear(oid, a.term) - termToYear(oid, b.term))
          .map(r => {
            const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
            const idx = tierList.indexOf(t);
            return idx >= 0 ? { yr: termToYear(oid, r.term), idx, t, ongoing: r.ongoing } : null;
          }).filter(Boolean);
        if (tierData.length >= 3) {
          const tW = 600, tH = 28, tPadL = 40, tPadR = 8, tPadT = 4, tPadB = 4;
          const minYr2 = tierData[0].yr, maxYr2 = tierData[tierData.length - 1].yr;
          const yrRange2 = maxYr2 - minYr2 || 1;
          const txFn = yr => tPadL + (yr - minYr2) / yrRange2 * (tW - tPadL - tPadR);
          const tyFn = idx => tPadT + idx / (tierList.length - 1) * (tH - tPadT - tPadB);
          const TC2t = { A: '#c0392b', B: '#2c5fa8', C: '#3a8c4f', D: '#7d5ba6', E: '#c77f1a' };
          let tSvg = '<svg viewBox="0 0 ' + tW + ' ' + tH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:' + tH + 'px">';
          const path2 = tierData.filter(d => !d.ongoing).map((d, i) => (i === 0 ? 'M' : 'L') + txFn(d.yr).toFixed(1) + ' ' + tyFn(d.idx).toFixed(1)).join(' ');
          tSvg += '<path d="' + path2 + '" fill="none" stroke="#8a93a2" stroke-width="1" stroke-dasharray="2 1" opacity="0.5"/>';
          tierData.filter(d => !d.ongoing).forEach(d => {
            const col = TC2t[d.t[0]] || '#8a93a2';
            tSvg += '<circle cx="' + txFn(d.yr).toFixed(1) + '" cy="' + tyFn(d.idx).toFixed(1) + '" r="3" fill="' + col + '" opacity="0.85"><title>' + d.yr + '年: ' + d.t + '</title></circle>';
          });
          tSvg += '<text x="4" y="' + (tH / 2 + 3) + '" font-size="8" fill="#8a93a2">ティア</text>';
          // Y軸ラベル（最高と最低）
          tSvg += '<text x="' + tPadL + '" y="' + (tPadT + 7) + '" font-size="7" fill="' + (TC2t[tierList[0][0]] || '#8a93a2') + '">' + tierList[0] + '</text>';
          tSvg += '<text x="' + tPadL + '" y="' + (tH - 1) + '" font-size="7" fill="' + (TC2t[tierList[tierList.length-1][0]] || '#8a93a2') + '">' + tierList[tierList.length-1] + '</text>';
          tSvg += '</svg>';
          cSvg = cSvg + tSvg; // 累積チャートの後に追加
        }
      }
      html += '<div class="cum-chart">' + cSvg + bSvg + '</div>';
    }

    // ティア別集計（スタックドバー）
    const tierCounts = {};
    groupRecs.forEach(r => {
      const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    });
    const tierOrder = (league.tiers || []).concat(
      Object.keys(tierCounts).filter(t => !(league.tiers || []).includes(t))
    );
    const tierItems = tierOrder.filter(t => tierCounts[t]);
    const totalRecs = groupRecs.length;
    if (tierItems.length) {
      const TC2 = { A: '#c0392b', B: '#2c5fa8', C: '#3a8c4f', D: '#7d5ba6', E: '#c77f1a' };
      // スタックドバー
      let stackHtml = '<div class="tier-stack" title="ティア別出場割合">';
      tierItems.forEach(t => {
        const pct = (tierCounts[t] / totalRecs * 100).toFixed(1);
        const col = TC2[tierKey(t)] || '#8a93a2';
        stackHtml += '<div class="tier-stack-seg" style="width:' + pct + '%;background:' + col + '" title="' + t + ': ' + tierCounts[t] + '期 (' + pct + '%)"></div>';
      });
      stackHtml += '</div>';
      // テキストバッジ
      const tierBreakdown = tierItems.map(t =>
        '<span class="tb-item"><span class="tier-badge ' + tierClass(t) + ' tb-tier">' + t + '</span><span class="tb-cnt">' + tierCounts[t] + '</span></span>'
      ).join("");
      html += '<div class="tier-breakdown">' + stackHtml + tierBreakdown + '</div>';
    }

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

    const FOLD_THRESHOLD = 15, FOLD_SHOW = 10;
    const needsFold = displayItems.length > FOLD_THRESHOLD && !state.year;
    const hasYearMatchInOld = state.year && displayItems.slice(FOLD_SHOW).some(item => !item.gap && termToYear(item.rec.orgId || oid, item.rec.term) === parseInt(state.year, 10));
    const doFold = needsFold && !hasYearMatchInOld;
    const tableId = "tbl-" + oid + "-" + idx;

    html += '<table class="timeline" id="' + tableId + '"><thead><tr><th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th></tr></thead><tbody>';
    displayItems.forEach((item, itemIdx) => {
      if (doFold && itemIdx === FOLD_SHOW) {
        const hiddenCount = displayItems.length - FOLD_SHOW;
        html += '<tr class="fold-toggle-row"><td colspan="4"><button class="fold-btn" data-table="' + tableId + '" data-hidden="' + hiddenCount + '">▼ 過去' + hiddenCount + '期を表示</button></td></tr>';
        html += '</tbody><tbody class="fold-body" id="' + tableId + '-old" style="display:none">';
      }
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
        const ptsCls = (r.points !== null && r.points < 0) ? "pts-neg" : "pts-pos";
        const rankHtml = (r.rank !== undefined && r.rank !== null) ? ' <span class="rank">' + r.rank + "位</span>" : "";
        const halfHtml = (r.half && r.half !== "annual") ? ' <span class="half">' + r.half + "</span>" : "";
        const resultText = (r.result || "") + rankHtml + halfHtml || "—";
        const yr = termToYear(r.orgId || oid, r.term);
        const yrHtml = yr > 1000 ? '<span class="rec-year yr-link" data-yr="' + yr + '" title="' + yr + '年で絞り込む">' + yr + '</span>' : '';
        const isYearMatch = state.year && yr === parseInt(state.year, 10);
        const isBestPts = bestPtsRec && !r.ongoing && r.points != null && r.term === bestPtsRec.term && r.points === bestPtsRec.points;
        let rowCls = r.ongoing ? ' class="ongoing"' : (isBestPts ? ' class="best-rec"' : "");
        if (isYearMatch) rowCls = ' class="year-match"';
        const catIcon = r.category === "promotion" ? '<span class="cat-icon cat-up">↑</span>'
                      : r.category === "demotion"  ? '<span class="cat-icon cat-dn">↓</span>'
                      : r.category === "playoff"   ? '<span class="cat-icon cat-po">★</span>'
                      : "";
        // 後期/前期ティアは result をティア名として表示
        const isHalfSeason = r.tier === "後期" || r.tier === "前期";
        const displayTier = isHalfSeason && r.result ? r.result : r.tier;
        const halfLabel = isHalfSeason ? '<span class="half">' + r.tier + '</span>' : "";
        const displayResult = isHalfSeason ? "" : resultText;
        // 前期比delta
        let deltaHtml = "";
        if (!r.ongoing && r.points != null) {
          const prevTermRec = termsSorted.find(x => x.term === r.term - 1 && !x.ongoing && x.points != null);
          if (prevTermRec) {
            const delta = r.points - prevTermRec.points;
            const dSign = delta >= 0 ? "+" : "";
            const dCls = delta >= 0 ? "color:#2a7a3a" : "color:#c0392b";
            deltaHtml = ' <span style="font-size:9px;' + dCls + '" title="前期比">' + dSign + delta.toFixed(1) + '</span>';
          }
        }
        html += "<tr" + rowCls + ">" +
          '<td class="term">第' + r.term + "期" + yrHtml + "</td>" +
          '<td><span class="tier-badge ' + tierClass(displayTier) + '">' + displayTier + "</span>" + halfLabel + "</td>" +
          '<td class="result-' + r.category + '">' + catIcon + displayResult + "</td>" +
          '<td class="points ' + ptsCls + '">' + (r.points != null ? fmtPoints(r.points) : "—") + deltaHtml + "</td></tr>";
      }
    });
    html += "</tbody></table>";
    if (doFold) {
      html += '<div style="font-size:10px;color:var(--muted);margin-top:-4px">最近' + FOLD_SHOW + '期のみ表示</div>';
    }

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

  // キャリアインサイト（自動生成テキスト）
  const insightRecs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
  if (insightRecs.length >= 3) {
    const insightParts = [];
    const recYear = r => r.orgId || (p.records||[]).includes(r)
      ? termToYear(r.orgId || p.org, r.term)
      : wTermToYear(p.wleague || {}, r.term);
    const recentRecs = insightRecs.slice().sort((a, b) => recYear(b) - recYear(a)).slice(0, 3);
    const recentAvg = recentRecs.reduce((s, r) => s + r.points, 0) / recentRecs.length;
    const allAvg = insightRecs.reduce((s, r) => s + r.points, 0) / insightRecs.length;
    const bestRec = insightRecs.reduce((best, r) => r.points > best.points ? r : best);
    const worstRec = insightRecs.reduce((worst, r) => r.points < worst.points ? r : worst);
    const bestYear = recYear(bestRec);
    if (bestYear > 1000) insightParts.push("キャリアハイは" + bestYear + "年の" + fmtPoints(bestRec.points) + "pt");
    const worstYear = recYear(worstRec);
    if (worstRec.points < -100 && worstYear > 1000) insightParts.push("最大マイナスは" + worstYear + "年の" + fmtPoints(worstRec.points) + "pt");
    if (insightRecs.length >= 5) {
      const recent5 = insightRecs.slice().sort((a, b) => recYear(b) - recYear(a)).slice(0, 5);
      const recent5total = recent5.reduce((s, r) => s + r.points, 0);
      if (Math.abs(recent5total) > 50) insightParts.push("直近5期合計" + (recent5total >= 0 ? "+" : "") + fmtPoints(recent5total) + "pt");
      const trend = recentAvg - allAvg;
      if (trend > 20) insightParts.push("直近3期は平均比+" + Math.round(trend) + "ptと好調");
      else if (trend < -20) insightParts.push("直近3期は平均比" + Math.round(trend) + "ptと苦戦");
      // 連続プラス期最長
      const ptsTimeline = insightRecs.slice().sort((a, b) => recYear(a) - recYear(b)).map(r => r.points);
      let maxPos = 0, curPos = 0;
      ptsTimeline.forEach(v => { if (v > 0) { curPos++; maxPos = Math.max(maxPos, curPos); } else curPos = 0; });
      if (maxPos >= 4) insightParts.push("最長" + maxPos + "期連続プラス");
      // ポジティブ率
      const posCount = ptsTimeline.filter(v => v > 0).length;
      const posRate = Math.round(posCount / ptsTimeline.length * 100);
      if (insightRecs.length >= 8 && (posRate >= 70 || posRate <= 30)) {
        insightParts.push("プラス期" + posRate + "%（" + posCount + "/" + ptsTimeline.length + "期）");
      }
    }
    if (insightParts.length) {
      html += '<div class="career-insight">' + insightParts.join('。') + '。</div>';
    }
  }

  // 類似成績選手（同org・通算ptが近い選手）
  {
    const myTotalRecs = (p.records || []).concat(p.wrecords || []).filter(r => !r.ongoing && r.points != null);
    const myTotal = myTotalRecs.length >= 3 ? myTotalRecs.reduce((s, r) => s + r.points, 0) : null;
    const myAvg = myTotalRecs.length >= 3 ? myTotal / myTotalRecs.length : null;
    const myPlayoffs = (p.records||[]).concat(p.wrecords||[]).filter(r=>r.category==="playoff").length;
    if (myTotal !== null && myAvg !== null) {
      const similar = DATA.players
        .filter(x => x.id !== p.id)
        .map(x => {
          const xRecs = (x.records || []).concat(x.wrecords || []).filter(r => !r.ongoing && r.points != null);
          if (xRecs.length < 3) return null;
          const xTotal = xRecs.reduce((s, r) => s + r.points, 0);
          const xAvg = xTotal / xRecs.length;
          const xPlayoffs = (x.records||[]).concat(x.wrecords||[]).filter(r=>r.category==="playoff").length;
          const diff = Math.abs(xTotal - myTotal) / (Math.abs(myTotal) || 100)
            + Math.abs(xAvg - myAvg) / (Math.abs(myAvg) || 10)
            + Math.abs(xRecs.length - myTotalRecs.length) / (myTotalRecs.length || 5) * 0.3
            + Math.abs(xPlayoffs - myPlayoffs) * 0.1;
          return { x, diff };
        })
        .filter(Boolean)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5)
        .map(d => d.x);
      if (similar.length >= 3) {
        html += '<div class="recent-section"><div class="recent-head">📊 類似成績の選手</div><div class="recent-list">';
        similar.forEach(q => {
          const qLat = (q.records || []).filter(r => !r.ongoing).sort((a, b) => termToYear(b.orgId||q.org,b.term)-termToYear(a.orgId||q.org,a.term))[0];
          const qT = qLat ? ((qLat.tier==="後期"||qLat.tier==="前期")?(qLat.result||qLat.tier):qLat.tier) : null;
          const qBadge = qT ? '<span class="tier-badge '+tierClass(qT)+'" style="font-size:9px;padding:1px 3px;margin-left:2px">'+qT+'</span>' : '';
          html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + qBadge + '</button>';
        });
        html += '</div></div>';
      }
    }
  }

  // 同期デビュー選手セクション
  // 決定戦進出年ハイライト（3回以上）
  if (totalPlayoffs >= 3) {
    const playoffRecs = allRecs.filter(r => r.category === "playoff").sort((a, b) => {
      const ya = termToYear(a.orgId||p.org, a.term); const yb = termToYear(b.orgId||p.org, b.term);
      return ya - yb;
    });
    html += '<div class="recent-section"><div class="recent-head">★ 決定戦進出年</div><div class="recent-list">';
    playoffRecs.forEach(r => {
      const yr = termToYear(r.orgId||p.org, r.term);
      const oid2 = r.orgId || p.org;
      const orgShort = (ORGS[oid2] || {}).shortName || oid2;
      const ptsStr = r.points != null ? (r.points >= 0 ? '+' : '') + r.points.toFixed(1) + 'pt' : '';
      const ptsCls = r.points != null ? (r.points >= 0 ? 'color:#2a7a3a' : 'color:#c0392b') : '';
      html += '<span class="recent-btn" style="cursor:default">' +
        (yr > 1000 ? yr + '年' : '') +
        '<span style="font-size:9px;color:var(--muted);margin-left:2px">' + orgShort + '</span>' +
        (ptsStr ? '<span style="font-size:9px;' + ptsCls + ';margin-left:3px">' + ptsStr + '</span>' : '') +
        '</span>';
    });
    html += '</div></div>';
  }

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
      peers.forEach(q => {
        const qLat = (q.records || []).filter(r => !r.ongoing).sort((a,b) => termToYear(b.orgId||q.org,b.term)-termToYear(a.orgId||q.org,a.term))[0];
        const qT = qLat ? ((qLat.tier==="後期"||qLat.tier==="前期")?(qLat.result||qLat.tier):qLat.tier) : null;
        const qBadge = qT ? '<span class="tier-badge '+tierClass(qT)+'" style="font-size:9px;padding:1px 3px;margin-left:2px">'+qT+'</span>' : '';
        html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + qBadge + '</button>';
      });
      html += '</div></div>';
    }
  }

  // 最高ティア経験仲間（同団体・同最高ティアの選手）
  if (p.org && p.records && p.records.length) {
    const myOrg = ORGS[p.org];
    const myTiers = (myOrg && (myOrg.league || {}).tiers) || [];
    if (myTiers.length) {
      const myBestTierIdx = (() => {
        let best = 9999;
        (p.records || []).forEach(r => {
          const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
          const i = myTiers.indexOf(t);
          if (i >= 0 && i < best) best = i;
        });
        return best;
      })();
      if (myBestTierIdx < 9999 && myBestTierIdx <= 1) {
        const myBestTier = myTiers[myBestTierIdx];
        const sameToppers = DATA.players.filter(x => x.id !== p.id && (x.org === p.org || (x.records||[]).some(r => (r.orgId||x.org) === p.org)) && (x.records||[]).some(r => {
          const t = (r.tier === "後期" || r.tier === "前期") ? (r.result || r.tier) : r.tier;
          return t === myBestTier;
        })).slice(0, 8);
        if (sameToppers.length >= 2) {
          html += '<div class="recent-section"><div class="recent-head">' + (myOrg.shortName || "") + ' ' + myBestTier + ' 経験者</div><div class="recent-list">';
          sameToppers.forEach(q => {
            const qLat = (q.records||[]).filter(r=>!r.ongoing).sort((a,b)=>termToYear(b.orgId||q.org,b.term)-termToYear(a.orgId||q.org,a.term))[0];
            const qT = qLat ? ((qLat.tier==="後期"||qLat.tier==="前期")?(qLat.result||qLat.tier):qLat.tier) : null;
            const qBadge = qT ? '<span class="tier-badge '+tierClass(qT)+'" style="font-size:9px;padding:1px 3px;margin-left:2px">'+qT+'</span>' : '';
            html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + qBadge + '</button>';
          });
          html += '</div></div>';
        }
      }
    }
  }

  html += renderRecentHistory();
  addToHistory(p);

  el.detail.innerHTML = html;
  el.detail.querySelectorAll(".fold-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tbl = document.getElementById(btn.dataset.table + "-old");
      if (!tbl) return;
      const shown = tbl.style.display !== "none";
      tbl.style.display = shown ? "none" : "";
      btn.textContent = shown ? "▼ 過去" + btn.dataset.hidden + "期を表示" : "▲ 折りたたむ";
      const hint = btn.closest("table").nextElementSibling;
      if (hint && hint.tagName !== "TABLE") hint.style.display = shown ? "" : "none";
    });
  });
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
  el.detail.querySelectorAll("[data-nav-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const np = DATA.players.find(x => x.id === btn.dataset.navId);
      if (np) { state.selectedId = np.id; renderList(); scrollToSelected(); renderDetail(np); el.detail.scrollTop = 0; }
    });
  });
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
        tip.innerHTML = parts.map((s, i) => i === 0 ? '<strong>' + s + '</strong>' : s).join(' ') +
          '<span style="display:block;font-size:10px;opacity:0.7;margin-top:2px">クリックで同年絞り込み</span>';
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
      c.addEventListener("click", () => {
        const m = (c.dataset.tip || "").match(/^(\d{4})年/);
        if (m) {
          const yr = m[1];
          state.year = yr === state.year ? "" : yr;
          document.getElementById("yearFilter").value = state.year;
          renderList();
        }
      });
      c.addEventListener("touchstart", e => { e.preventDefault(); showTip(); }, { passive: false });
      c.addEventListener("touchend", () => { setTimeout(() => { tip.style.display = "none"; }, 1500); });
    });
  });
  el.detail.querySelectorAll(".yr-link[data-yr]").forEach(span => {
    span.addEventListener("click", e => {
      e.stopPropagation();
      const yr = span.dataset.yr;
      state.year = yr === state.year ? "" : yr;
      document.getElementById("yearFilter").value = state.year;
      renderList();
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
  // タッチスワイプで前後ナビゲーション（モバイル）
  let _swipeStartX = null;
  el.detail.ontouchstart = e => { _swipeStartX = e.touches[0].clientX; };
  el.detail.ontouchend = e => {
    if (_swipeStartX === null) return;
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    _swipeStartX = null;
    if (Math.abs(dx) < 60) return;
    const items = filteredPlayers();
    const curIdx = items.findIndex(x => x.id === state.selectedId);
    const nextIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
    if (nextIdx >= 0 && nextIdx < items.length) {
      const np = items[nextIdx];
      state.selectedId = np.id;
      renderList();
      scrollToSelected();
      renderDetail(np);
    }
  };
}

function stat(num, lbl, title) {
  const numStr = String(num);
  const cls = numStr.length > 6 ? " sm" : "";
  const tt = title ? ' title="' + title.replace(/"/g, '&quot;') + '"' : '';
  return '<div class="stat"' + tt + '><div class="num' + cls + '">' + numStr +
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
    let birthStr = pf.birth;
    let ageStr = "";
    if (bd.length === 3) {
      birthStr = bd[0] + "年" + parseInt(bd[1]) + "月" + parseInt(bd[2]) + "日";
      const now = new Date();
      const bDate = new Date(parseInt(bd[0]), parseInt(bd[1]) - 1, parseInt(bd[2]));
      let age = now.getFullYear() - bDate.getFullYear();
      if (now < new Date(now.getFullYear(), bDate.getMonth(), bDate.getDate())) age--;
      if (age > 0 && age < 100) ageStr = ' <span style="color:var(--muted);font-size:12px">（' + age + '歳）</span>';
    }
    html += profileRow("生年月日", birthStr + ageStr);
  }
  if (pf.hometown) html += profileRow("出身", pf.hometown);
  if (pf.education) html += profileRow("学歴", pf.education);
  if (pf.proYear) {
    const debutYsAll = (p.records || []).map(r => termToYear(r.orgId || p.org, r.term)).concat((p.wrecords || []).map(r => wTermToYear(p.wleague || {}, r.term))).filter(y => y > 1000);
    const debutYr = debutYsAll.length ? Math.min(...debutYsAll) : null;
    let proYearStr = pf.proYear + "年";
    if (pf.birth && pf.birth.split("-").length === 3) {
      const birthYr = parseInt(pf.birth.split("-")[0]);
      const ageAtDebut = (debutYr || pf.proYear) - birthYr;
      if (ageAtDebut > 10 && ageAtDebut < 70) proYearStr += ' <span style="color:var(--muted);font-size:12px">（' + ageAtDebut + '歳でデビュー）</span>';
    }
    html += profileRow("プロ入会", proYearStr);
  }
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

  // 統合・分離リーグの表示用マッピング（A⇔A1/A2 等）
  // 同格tierは同じ表示位置にまとめ、Y軸ラベルは期に応じて切替
  const TIER_EQUIV = { "A": "A1" };  // AはA1と同じ高さに表示
  const displayTier = t => TIER_EQUIV[t] || t;

  // 表示用tier一覧（統合後の重複を除去）
  const displayTiers = [];
  const seen = new Set();
  tiers.forEach(t => { const d = displayTier(t); if (!seen.has(d)) { seen.add(d); displayTiers.push(d); } });

  // 表示tier範囲（実績±1）
  const usedIdx = pts.map(d => displayTiers.indexOf(displayTier(d.tier)));
  const showMin = Math.max(0, Math.min(...usedIdx) - 1);
  const showMax = Math.min(displayTiers.length - 1, Math.max(...usedIdx) + 1);
  const numBands = showMax - showMin + 1;

  const W = 600, H = 200;
  const padL = 48, padR = 16, padT = 12, padB = 34;
  const chartH = H - padT - padB;

  const MAX_RANK = 16;
  function toV(tier, rank) {
    const i = displayTiers.indexOf(displayTier(tier)) - showMin;
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

  // TIER_EQUIV で統合された元tier一覧（ラベル表示用）
  const equivSources = {};
  Object.keys(TIER_EQUIV).forEach(k => {
    const d = TIER_EQUIV[k];
    if (!equivSources[d]) equivSources[d] = [];
    equivSources[d].push(k);
  });

  displayTiers.slice(showMin, showMax + 1).forEach((tier, i) => {
    const top = yFn(numBands - i).toFixed(1);
    const bot = yFn(numBands - i - 1).toFixed(1);
    const c = TC[tierKey(tier)] || '#8a93a2';
    svg += '<rect x="' + padL + '" y="' + top + '" width="' + (W - padL - padR) +
           '" height="' + (parseFloat(bot) - parseFloat(top)).toFixed(1) +
           '" fill="' + c + '" fill-opacity="0.05"/>';
    svg += '<line x1="' + padL + '" y1="' + top + '" x2="' + (W - padR) + '" y2="' + top + '" stroke="#e2e5ea"/>';
    const midY = ((parseFloat(top) + parseFloat(bot)) / 2 + 4).toFixed(1);
    // 統合tierはラベルに元の名前も併記（例: A1 に A が統合 → "A1/A"）
    var label = tier;
    if (equivSources[tier]) label = tier + '/' + equivSources[tier].join('/');
    svg += '<text x="' + (padL - 5) + '" y="' + midY +
           '" text-anchor="end" font-size="11" fill="' + c + '" font-weight="700">' + label + '</text>';
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
    if (pts.length <= 10 && d.points != null) {
      const lbl = fmtPoints(d.points);
      const lblY = (parseFloat(cy) - 9).toFixed(1);
      const lblColor = d.points >= 0 ? '#2a7a3a' : '#c0392b';
      svg += '<text x="' + cx + '" y="' + lblY + '" text-anchor="middle" font-size="9" fill="' + lblColor + '" pointer-events="none">' + lbl + '</text>';
    }
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
    if (pts.length <= 10 && d.points != null) {
      const lbl = fmtPoints(d.points);
      const lblY = (parseFloat(cy) - 9).toFixed(1);
      const lblColor = d.points >= 0 ? '#2a7a3a' : '#c0392b';
      svg += '<text x="' + cx + '" y="' + lblY + '" text-anchor="middle" font-size="9" fill="' + lblColor + '" pointer-events="none">' + lbl + '</text>';
    }
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
  const wRecsWithRank = wrecords.filter(r => !r.ongoing && r.rank != null);
  const wAvgRank = wRecsWithRank.length >= 3 ? (wRecsWithRank.reduce((s, r) => s + r.rank, 0) / wRecsWithRank.length) : null;
  const wAvgRankStr = wAvgRank != null ? wAvgRank.toFixed(1) + "位" : null;
  const wBestPtsRec = wRecsWithPts.length ? wRecsWithPts.reduce((best, r) => r.points > best.points ? r : best) : null;
  const wPromos = wrecords.filter(r => r.category === "promotion").length;
  const wCompleted = wrecords.filter(r => !r.ongoing && (r.category === "promotion" || r.category === "demotion" || r.category === "stay" || r.category === "playoff"));
  const wPromoRateStr = wCompleted.length >= 5 ? Math.round(wPromos / wCompleted.length * 100) + "%" : null;
  html += stat(wrecords.length, "出場期数");
  html += stat(topTier, "最高到達");
  html += stat(wPlayoffs, "決定戦進出");
  if (wStreakStr) html += stat(wStreakStr, "最長連続");
  if (wPromoRateStr) html += stat(wPromoRateStr, "昇級率");
  if (wTotalPtsStr) html += stat(wTotalPtsStr, "通算pt");
  if (wBestPtsStr) html += stat(wBestPtsStr, "最高pt");
  if (wAvgPtsStr) html += stat(wAvgPtsStr, "平均pt");
  if (wAvgRankStr) html += stat(wAvgRankStr, "平均順位");
  if (wLatestPtsStr) html += stat(wLatestPtsStr, "直近pt");
  html += stat(wYearRange, "活動期間");
  html += '</div>';

  html += wchartSvg(wrecords, wl);

  // 女流累積ptスパークライン
  const wCumData = wrecords.slice().filter(r => !r.ongoing && r.points != null)
    .sort((a, b) => wTermToYear(wl, a.term) - wTermToYear(wl, b.term));
  if (wCumData.length >= 5) {
    let wCumSum = 0;
    const wCumPts = wCumData.map(r => { wCumSum += r.points; return { yr: wTermToYear(wl, r.term), v: wCumSum }; });
    const wMinV = Math.min(0, ...wCumPts.map(d => d.v));
    const wMaxV = Math.max(0, ...wCumPts.map(d => d.v));
    const wVRange = wMaxV - wMinV || 1;
    const wMinYr = wCumPts[0].yr, wMaxYr = wCumPts[wCumPts.length - 1].yr;
    const wYrRange = wMaxYr - wMinYr || 1;
    const cW = 600, cH = 50, cPadL = 40, cPadR = 8, cPadT = 8, cPadB = 12;
    const wcxFn = yr => cPadL + (yr - wMinYr) / wYrRange * (cW - cPadL - cPadR);
    const wcyFn = v => cPadT + (1 - (v - wMinV) / wVRange) * (cH - cPadT - cPadB);
    const wZero = wcyFn(0).toFixed(1);
    let wcSvg = '<svg viewBox="0 0 ' + cW + ' ' + cH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:50px">';
    wcSvg += '<line x1="' + cPadL + '" y1="' + wZero + '" x2="' + (cW - cPadR) + '" y2="' + wZero + '" stroke="#e2e5ea" stroke-dasharray="3 2"/>';
    const wPath = wCumPts.map((d, i) => (i === 0 ? 'M' : 'L') + wcxFn(d.yr).toFixed(1) + ' ' + wcyFn(d.v).toFixed(1)).join(' ');
    const wLastV = wCumPts[wCumPts.length - 1].v;
    const wLineColor = wLastV >= 0 ? '#2a7a3a' : '#c0392b';
    wcSvg += '<path d="' + wPath + '" fill="none" stroke="' + wLineColor + '" stroke-width="1.5"/>';
    const wLastX = wcxFn(wCumPts[wCumPts.length - 1].yr).toFixed(1);
    const wLastY = wcyFn(wLastV).toFixed(1);
    wcSvg += '<circle cx="' + wLastX + '" cy="' + wLastY + '" r="3" fill="' + wLineColor + '"/>';
    wcSvg += '<text x="4" y="' + (parseFloat(wLastY) + 4) + '" font-size="9" fill="' + wLineColor + '">' + (wLastV >= 0 ? '+' : '') + wLastV.toFixed(1) + '</text>';
    wcSvg += '<text x="' + wcxFn(wMinYr).toFixed(1) + '" y="' + (cH - 2) + '" text-anchor="middle" font-size="8" fill="#8a93a2">' + wMinYr + '</text>';
    wcSvg += '<text x="' + wLastX + '" y="' + (cH - 2) + '" text-anchor="middle" font-size="8" fill="#8a93a2">' + wMaxYr + '</text>';
    wcSvg += '<text x="4" y="10" font-size="8" fill="#8a93a2">通算pt推移</text>';
    wcSvg += '</svg>';
    // 期別ptバー
    const bW = 600, bH = 36, bPadL = 40, bPadR = 8;
    const wBPts = wCumData.map(r => r.points);
    const wBMax = Math.max(...wBPts.map(Math.abs), 1);
    const barW = Math.max(1, (bW - bPadL - bPadR) / wCumData.length - 1);
    let wbSvg = '<svg viewBox="0 0 ' + bW + ' ' + bH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:' + bH + 'px">';
    wbSvg += '<line x1="' + bPadL + '" y1="' + (bH / 2) + '" x2="' + (bW - bPadR) + '" y2="' + (bH / 2) + '" stroke="#e2e5ea"/>';
    wCumData.forEach((r, i) => {
      const bx = (bPadL + i * (barW + 1)).toFixed(1);
      const bh2 = Math.abs(r.points / wBMax) * (bH / 2 - 4);
      const by = r.points >= 0 ? (bH / 2 - bh2).toFixed(1) : (bH / 2).toFixed(1);
      const col = r.points >= 0 ? '#2a7a3a' : '#c0392b';
      wbSvg += '<rect x="' + bx + '" y="' + by + '" width="' + barW.toFixed(1) + '" height="' + bh2.toFixed(1) + '" fill="' + col + '" opacity="0.7"/>';
    });
    wbSvg += '<text x="4" y="' + (bH / 2 + 4) + '" font-size="8" fill="#8a93a2">期別pt</text>';
    wbSvg += '</svg>';
    html += '<div class="cum-chart">' + wcSvg + wbSvg + '</div>';
  }

  // 女流ティア別集計（スタックドバー）
  const wTierCounts = {};
  wrecords.forEach(r => { wTierCounts[r.tier] = (wTierCounts[r.tier] || 0) + 1; });
  const wTierOrder = tiers.concat(Object.keys(wTierCounts).filter(t => !tiers.includes(t)));
  const wTierItems = wTierOrder.filter(t => wTierCounts[t]);
  if (wTierItems.length) {
    const wTotal = wrecords.length;
    const WTC = { A: '#c0392b', B: '#2c5fa8', C: '#3a8c4f', D: '#7d5ba6', E: '#c77f1a' };
    let wStack = '<div class="tier-stack">';
    wTierItems.forEach(t => {
      const pct = (wTierCounts[t] / wTotal * 100).toFixed(1);
      const col = WTC[tierKey(t)] || '#8a93a2';
      wStack += '<div class="tier-stack-seg" style="width:' + pct + '%;background:' + col + '" title="' + t + ': ' + wTierCounts[t] + '期"></div>';
    });
    wStack += '</div>';
    const wTierBreakdown = wTierItems.map(t =>
      '<span class="tb-item"><span class="tier-badge ' + tierClass(t) + ' tb-tier">' + t + '</span><span class="tb-cnt">' + wTierCounts[t] + '</span></span>'
    ).join("");
    html += '<div class="tier-breakdown">' + wStack + wTierBreakdown + '</div>';
  }

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

  const wNeedsFold = displayItems.length > 15 && !state.year;
  const wTableId = "wtbl-" + (p.id || "w");
  html += '<table class="timeline" id="' + wTableId + '"><thead><tr>' +
          '<th>期</th><th>リーグ</th><th>結果</th><th>ポイント</th>' +
          '</tr></thead><tbody>';
  displayItems.forEach((item, wItemIdx) => {
    if (wNeedsFold && wItemIdx === 10) {
      const wHiddenCount = displayItems.length - 10;
      html += '<tr class="fold-toggle-row"><td colspan="4"><button class="fold-btn" data-table="' + wTableId + '" data-hidden="' + wHiddenCount + '">▼ 過去' + wHiddenCount + '期を表示</button></td></tr>';
      html += '</tbody><tbody class="fold-body" id="' + wTableId + '-old" style="display:none">';
    }
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
      const wyrHtml = wyr > 1000 ? '<span class="rec-year yr-link" data-yr="' + wyr + '" title="' + wyr + '年で絞り込む">' + wyr + '</span>' : '';
      const wCatIcon = r.category === "promotion" ? '<span class="cat-icon cat-up">↑</span>'
                     : r.category === "demotion"  ? '<span class="cat-icon cat-dn">↓</span>'
                     : r.category === "playoff"   ? '<span class="cat-icon cat-po">★</span>'
                     : "";
      const wIsBest = wBestPtsRec && !r.ongoing && r.points != null && r.term === wBestPtsRec.term && r.points === wBestPtsRec.points;
      const wRowCls = wIsBest ? ' class="best-rec"' : '';
      html += '<tr' + wRowCls + '>' +
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

function showPlaceholder() {
  // org絞り込み中のトップ選手（通算pt順）
  let orgTopSection = "";
  if (state.org !== "all") {
    const org = ORGS[state.org];
    const orgPlayers = DATA.players.filter(p => playerOrgIds(p).includes(state.org));
    const ranked = orgPlayers.map(p => {
      const recs = (p.records || []).filter(r => (r.orgId || p.org) === state.org && !r.ongoing && r.points != null);
      return recs.length >= 3 ? { p, total: recs.reduce((s, r) => s + r.points, 0), n: recs.length } : null;
    }).filter(Boolean).sort((a, b) => b.total - a.total).slice(0, 8);
    if (ranked.length >= 3) {
      orgTopSection = '<div class="recent-section"><div class="recent-head">' + (org ? org.shortName : state.org) + ' 通算pt上位</div><div class="recent-list">';
      ranked.forEach(({ p, total }, ri) => {
        const sign = total >= 0 ? "+" : "";
        const col = total >= 0 ? "color:#2a7a3a" : "color:#c0392b";
        orgTopSection += '<button class="recent-btn" data-id="' + p.id + '">' +
          '<span style="font-size:9px;color:var(--muted);margin-right:2px">' + (ri + 1) + '.</span>' +
          p.name +
          '<span style="font-size:10px;' + col + ';margin-left:4px">' + sign + total.toFixed(0) + 'pt</span>' +
          '</button>';
      });
      orgTopSection += '</div></div>';
    }
  }
  const recent = renderRecentHistory();
  const favs = getFavs();
  let favSection = "";
  if (favs.size > 0) {
    const favPlayers = [...favs].map(id => DATA.players.find(x => x.id === id)).filter(Boolean).slice(0, 8);
    if (favPlayers.length) {
      favSection = '<div class="recent-section"><div class="recent-head">★ お気に入り</div><div class="recent-list">' +
        favPlayers.map(q => '<button class="recent-btn" data-id="' + q.id + '">' + q.name + '</button>').join('') +
        '</div></div>';
    }
  }
  // 履歴もお気に入りもない場合は注目選手を表示
  let pickupSection = "";
  const hist = (() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch(e) { return []; } })();
  if (!hist.length && !favs.size) {
    // 決定戦回数上位8名をピックアップ
    const top = DATA.players
      .map(x => ({ p: x, n: (x.records||[]).filter(r=>r.category==="playoff").length + (x.wrecords||[]).filter(r=>r.category==="playoff").length }))
      .filter(x => x.n >= 3)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
    if (top.length) {
      pickupSection = '<div class="recent-section"><div class="recent-head">★ 決定戦常連選手</div><div class="recent-list">' +
        top.map(({ p, n }) => '<button class="recent-btn" data-id="' + p.id + '" title="決定戦' + n + '回">' + p.name + '</button>').join('') +
        '</div></div>';
    }
  }
  // 今日が誕生日の選手
  let birthdaySection = "";
  {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayMMDD = mm + "-" + dd;
    const bdPlayers = DATA.players.filter(p => p.profile && p.profile.birth && p.profile.birth.endsWith(todayMMDD));
    if (bdPlayers.length) {
      birthdaySection = '<div class="recent-section"><div class="recent-head">🎂 本日お誕生日</div><div class="recent-list">';
      bdPlayers.forEach(bp => {
        const yr = parseInt(bp.profile.birth.split("-")[0]);
        const age = now.getFullYear() - yr;
        birthdaySection += '<button class="recent-btn" data-id="' + bp.id + '" title="' + age + '歳">' + bp.name + '<span style="font-size:10px;color:var(--muted);margin-left:4px">' + age + '歳</span></button>';
      });
      birthdaySection += '</div></div>';
    } else {
      // 直近7日以内に誕生日の選手（今日は除く）
      const upcomingBd = DATA.players.filter(p => {
        if (!p.profile || !p.profile.birth) return false;
        const parts = p.profile.birth.split("-");
        if (parts.length < 3) return false;
        const thisYear = now.getFullYear();
        let bdDate = new Date(thisYear, parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (bdDate <= now) bdDate = new Date(thisYear + 1, parseInt(parts[1]) - 1, parseInt(parts[2]));
        const diffDays = Math.ceil((bdDate - now) / 86400000);
        return diffDays > 0 && diffDays <= 7;
      }).slice(0, 6);
      if (upcomingBd.length) {
        birthdaySection = '<div class="recent-section"><div class="recent-head">🎂 近日誕生日（7日以内）</div><div class="recent-list">';
        upcomingBd.forEach(bp => {
          const parts = bp.profile.birth.split("-");
          const thisYear = now.getFullYear();
          let bdDate = new Date(thisYear, parseInt(parts[1]) - 1, parseInt(parts[2]));
          if (bdDate <= now) bdDate = new Date(thisYear + 1, parseInt(parts[1]) - 1, parseInt(parts[2]));
          const diffDays = Math.ceil((bdDate - now) / 86400000);
          birthdaySection += '<button class="recent-btn" data-id="' + bp.id + '" title="あと' + diffDays + '日">' + bp.name + '<span style="font-size:10px;color:var(--muted);margin-left:4px">あと' + diffDays + '日</span></button>';
        });
        birthdaySection += '</div></div>';
      }
    }
  }
  // 今日のピックアップ（日付ベースのシード選択）
  let dailySection = "";
  const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seed = parseInt(todayKey, 10) % DATA.players.length;
  const dailyPlayer = DATA.players[seed];
  if (dailyPlayer) {
    const dpAllRecs = (dailyPlayer.records || []).concat(dailyPlayer.wrecords || []).filter(r => !r.ongoing);
    const dpPts = dpAllRecs.filter(r => r.points != null);
    const dpTotal = dpPts.length ? dpPts.reduce((s, r) => s + r.points, 0) : null;
    const dpPlayoffs = dpAllRecs.filter(r => r.category === "playoff").length;
    const dpNick = dailyPlayer.profile && dailyPlayer.profile.nickname ? '"' + dailyPlayer.profile.nickname + '"' : null;
    const dpDescParts = [dpAllRecs.length + "期出場"];
    if (dpTotal != null) dpDescParts.push("通算" + (dpTotal >= 0 ? "+" : "") + dpTotal.toFixed(1) + "pt");
    if (dpPlayoffs) dpDescParts.push("決定戦" + dpPlayoffs + "回");
    if (dpNick) dpDescParts.push(dpNick);
    const dpDesc = dpDescParts.join(" / ");
    dailySection = '<div class="recent-section"><div class="recent-head">📅 今日のピックアップ</div><div class="recent-list">' +
      '<button class="recent-btn" data-id="' + dailyPlayer.id + '" title="' + dpDesc + '">' + dailyPlayer.name + '</button>' +
      '</div><div style="font-size:10px;color:var(--muted);margin-top:2px">' + dpDesc + '</div></div>';
  }
  // 今期出場中の選手（ongoingあり）をポイント順でorg別に表示
  let ongoingSection = "";
  {
    const ongoingByOrg = {};
    DATA.players.forEach(p => {
      const ongs = (p.records || []).filter(r => r.ongoing).map(r => ({ r, oid: r.orgId || p.org }));
      const wongs = (p.wrecords || []).filter(r => r.ongoing).map(r => ({ r, oid: (p.wleague || {}).id || "wleague" }));
      [...ongs, ...wongs].forEach(({ r, oid }) => {
        if (!ongoingByOrg[oid]) ongoingByOrg[oid] = [];
        ongoingByOrg[oid].push({ p, points: r.points, tier: r.tier });
      });
    });
    const orgOrder = Object.keys(ongoingByOrg);
    if (orgOrder.length) {
      ongoingSection = '<div class="recent-section"><div class="recent-head">🏆 今期出場中</div>';
      orgOrder.forEach(oid => {
        const org = ORGS[oid] || {};
        const sorted = ongoingByOrg[oid].slice().sort((a, b) => (b.points ?? -Infinity) - (a.points ?? -Infinity)).slice(0, 8);
        ongoingSection += '<div style="font-size:10px;color:var(--muted);margin:4px 0 2px">' + (org.shortName || oid) + '</div>';
        ongoingSection += '<div class="recent-list">';
        sorted.forEach(({ p, points, tier }, ri) => {
          const ptsStr = points != null ? (points >= 0 ? '+' : '') + points.toFixed(1) + 'pt' : '';
          const ptsCls = points != null ? (points >= 0 ? 'style="color:#2a7a3a"' : 'style="color:#c0392b"') : '';
          const tierBadge = tier ? '<span class="tier-badge ' + tierClass(tier) + '" style="font-size:9px;padding:1px 3px;margin-left:2px">' + tier + '</span>' : '';
          const ptsSpan = ptsStr ? ' <span ' + ptsCls + ' style="font-size:10px">' + ptsStr + '</span>' : '';
          const rankNum = points != null ? '<span style="font-size:9px;color:var(--muted);margin-right:2px">' + (ri + 1) + '.</span>' : '';
          ongoingSection += '<button class="recent-btn" data-id="' + p.id + '">' + rankNum + p.name + tierBadge + ptsSpan + '</button>';
        });
        ongoingSection += '</div>';
      });
      ongoingSection += '</div>';
    }
  }
  // 全体統計ミニサマリー
  const totalCount = DATA.players.length;
  const ongoingCount = DATA.players.filter(p => (p.records||[]).some(r=>r.ongoing)||(p.wrecords||[]).some(r=>r.ongoing)).length;
  const titleCount = DATA.players.filter(p => p.profile && p.profile.titles && p.profile.titles.length).length;
  const posCount2 = DATA.players.filter(p => {
    const recs = (p.records||[]).concat(p.wrecords||[]).filter(r=>!r.ongoing&&r.points!=null);
    return recs.length >= 2 && recs.reduce((s,r)=>s+r.points,0) > 0;
  }).length;
  const statBar = '<div class="db-stats">' +
    '<span title="データベース内選手総数">選手数: <strong>' + totalCount + '</strong></span>' +
    '<span title="今シーズン出場中">今期出場: <strong>' + ongoingCount + '</strong></span>' +
    '<span title="タイトルホルダー">称号保有: <strong>' + titleCount + '</strong></span>' +
    '<span title="2期以上出場・通算ポイントがプラスの選手">通算プラス: <strong>' + posCount2 + '</strong></span>' +
    '</div>';
  // クイック検索タグ（タイトル・フィルター）
  const quickTags = [
    { label: "雀王", type: "q" }, { label: "最高位", type: "q" }, { label: "鳳凰位", type: "q" }, { label: "十段位", type: "q" },
    { label: "今期出場中", type: "ongoing" }, { label: "通算プラス", type: "pos" }, { label: "タイトル保有", type: "titled" },
  ];
  const quickSection = '<div class="recent-section"><div class="recent-head">🔍 クイック検索</div><div class="recent-list">' +
    quickTags.map(t => '<button class="recent-btn quick-tag" data-qt="' + t.type + '" data-ql="' + t.label + '">' + t.label + '</button>').join('') +
    '</div></div>';

  el.detail.innerHTML = '<div class="placeholder">← 選手を選択してください</div>' + statBar + recent + favSection + orgTopSection + birthdaySection + dailySection + pickupSection + ongoingSection + quickSection;
  el.detail.querySelectorAll(".recent-btn[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = DATA.players.find(x => x.id === btn.dataset.id);
      if (p) { state.selectedId = p.id; renderList(); scrollToSelected(); renderDetail(p); }
    });
  });
  el.detail.querySelectorAll(".quick-tag[data-qt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const qt = btn.dataset.qt, ql = btn.dataset.ql;
      if (qt === "q") { state.query = ql; el.search.value = ql; }
      else if (qt === "ongoing") { state.ongoingOnly = true; renderOrgFilter(); }
      else if (qt === "pos") { state.positivePts = true; renderOrgFilter(); }
      else if (qt === "titled") { state.hasTitle = true; renderOrgFilter(); }
      resetAndRenderList();
    });
  });
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
      const qLatest = (q.records || []).filter(r => !r.ongoing)
        .sort((a, b) => termToYear(b.orgId || q.org, b.term) - termToYear(a.orgId || q.org, a.term))[0];
      const qTier = qLatest ? ((qLatest.tier === "後期" || qLatest.tier === "前期") ? (qLatest.result || qLatest.tier) : qLatest.tier) : null;
      const badge = qTier ? ' <span class="tier-badge ' + tierClass(qTier) + '" style="font-size:9px;padding:1px 3px">' + qTier + '</span>' : '';
      html += '<button class="recent-btn" data-id="' + q.id + '">' + q.name + badge + '</button>';
    });
    html += '</div></div>';
    return html;
  } catch (e) { return ""; }
}

// --- 起動 -------------------------------------------------------------
let _searchTimer = null;
// 検索履歴
const SEARCH_HIST_KEY = "mj_search_hist";
function getSearchHist() { try { return JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || "[]"); } catch(e) { return []; } }
function addSearchHist(q) {
  if (!q || q.length < 2) return;
  try {
    let hist = getSearchHist().filter(x => x !== q);
    hist.unshift(q);
    localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(hist.slice(0, 8)));
  } catch(e) {}
}
let _searchHistDiv = null;
function showSearchHist() {
  const hist = getSearchHist();
  if (!hist.length) return;
  if (!_searchHistDiv) {
    _searchHistDiv = document.createElement("div");
    _searchHistDiv.className = "search-hist";
    el.search.parentNode.insertBefore(_searchHistDiv, el.search.nextSibling);
  }
  _searchHistDiv.innerHTML = hist.map(q => '<button class="search-hist-btn" data-q="' + q.replace(/"/g, '&quot;') + '">' + q + '</button>').join('');
  _searchHistDiv.style.display = "flex";
  _searchHistDiv.querySelectorAll(".search-hist-btn").forEach(btn => {
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      el.search.value = btn.dataset.q;
      state.query = btn.dataset.q;
      hideSearchHist();
      renderList();
    });
  });
}
function hideSearchHist() { if (_searchHistDiv) _searchHistDiv.style.display = "none"; }
el.search.addEventListener("focus", () => { if (!el.search.value) showSearchHist(); });
el.search.addEventListener("blur", () => setTimeout(hideSearchHist, 200));
el.search.addEventListener("input", e => {
  state.query = e.target.value;
  state.showAll = false;
  if (e.target.value) hideSearchHist(); else showSearchHist();
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    renderList();
    // 絞り込み結果が1人だけなら自動で詳細を開く
    const items = filteredPlayers();
    if (items.length === 1 && state.query.trim().length >= 2) {
      const p = items[0];
      state.selectedId = p.id;
      renderList();
      renderDetail(p);
    }
  }, 80);
});
document.getElementById("yearFilter").addEventListener("input", e => { state.year = e.target.value; renderList(); });
el.search.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const items = filteredPlayers();
    if (!items.length) return;
    addSearchHist(state.query.trim());
    const p = items[0];
    state.selectedId = p.id;
    renderList();
    scrollToSelected();
    renderDetail(p);
    el.search.blur();
  }
  if (e.key === "Escape") {
    if (el.search.value) {
      el.search.value = "";
      state.query = "";
      hideSearchHist();
      renderList();
      e.stopPropagation();
    } else {
      el.search.blur();
    }
  }
});
// ソート設定をlocalStorageに保存・復元
(function() {
  try {
    const saved = localStorage.getItem("mj_sort");
    if (saved && el.sortSelect.querySelector('option[value="' + saved + '"]')) {
      state.sort = saved;
      el.sortSelect.value = saved;
    }
  } catch(e) {}
})();
el.sortSelect.addEventListener("change", e => {
  state.sort = e.target.value;
  try { localStorage.setItem("mj_sort", state.sort); } catch(e) {}
  renderList();
});
// タッチスワイプで前後の選手に移動（モバイル向け）
{
  let _touchStartX = 0, _touchStartY = 0;
  el.detail.addEventListener("touchstart", e => {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });
  el.detail.addEventListener("touchend", e => {
    if (!state.selectedId) return;
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    const list = filteredPlayers();
    const idx = list.findIndex(x => x.id === state.selectedId);
    if (idx < 0) return;
    const target = dx < 0 ? list[idx + 1] : list[idx - 1];
    if (target) { state.selectedId = target.id; renderList(); scrollToSelected(); renderDetail(target); }
  }, { passive: true });
}
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
  if (e.key === "r" && document.activeElement !== el.search) {
    if (typeof openRandomPlayer === "function") openRandomPlayer();
    return;
  }
  if (e.key === "s" && document.activeElement !== el.search && state.selectedId) {
    if (typeof copyPlayerLink === "function") copyPlayerLink();
    return;
  }
  if ((e.key === "n" || e.key === "p") && document.activeElement !== el.search && state.selectedId) {
    const items = filteredPlayers();
    const curIdx = items.findIndex(x => x.id === state.selectedId);
    const nextIdx = e.key === "n" ? curIdx + 1 : curIdx - 1;
    if (nextIdx >= 0 && nextIdx < items.length) {
      const np = items[nextIdx];
      state.selectedId = np.id;
      renderList();
      scrollToSelected();
      renderDetail(np);
      el.detail.scrollTop = 0;
    }
    return;
  }
  if ((e.key === "Escape" || (e.key === "Backspace" && !e.shiftKey && !e.ctrlKey && !e.metaKey)) && state.selectedId && document.activeElement !== el.search) {
    state.selectedId = null;
    history.replaceState(null, "", location.pathname + (location.search.replace(/[?&]p=[^&]*/g, '').replace(/^&/, '?') || ''));
    document.title = "麻雀プロ検索";
    renderList();
    showPlaceholder();
    e.preventDefault();
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
  // dキーでダークモード切替
  if (document.activeElement !== el.search && e.key === "d" && !e.ctrlKey && !e.metaKey) {
    const btn = document.getElementById("darkToggle");
    if (btn) btn.click();
    return;
  }
  // hキーでホーム（フィルター全解除）
  if (document.activeElement !== el.search && e.key === "h" && !e.ctrlKey && !e.metaKey) {
    if (state.query || state.org !== "all" || state.mleagueC || state.mleagueF || state.mtourn || state.topLeague || state.wleague || state.playoff || state.ongoingOnly || state.favOnly || state.year || state.debutDecade || state.positivePts || state.recentActive || state.hasTitle || state.ageMin != null || state.minRec != null) {
      state.query = ""; el.search.value = "";
      Object.assign(state, {org:"all",mleagueC:false,mleagueF:false,mtourn:false,topLeague:false,wleague:false,playoff:false,ongoingOnly:false,favOnly:false,year:"",debutDecade:null,positivePts:false,recentActive:false,hasTitle:false,mteam:null,mRelated:false,ageMin:null,ageMax:null,minRec:null});
      const yf = document.getElementById("yearFilter"); if (yf) yf.value = "";
      renderOrgFilter(); resetAndRenderList();
    }
    return;
  }
  // 数字キーで団体フィルター切替（1=最高位戦、2=連盟、3=協会、4=RMU、5=μ、0=全て）
  if (document.activeElement !== el.search && /^[0-5]$/.test(e.key)) {
    const orgMap = { "0": "all", "1": "saikouisen", "2": "renmei", "3": "kyokai", "4": "rmu", "5": "mu" };
    const newOrg = orgMap[e.key];
    if (newOrg && DATA.organizations.find(o => o.id === newOrg) || newOrg === "all") {
      state.org = newOrg;
      renderOrgFilter();
      resetAndRenderList();
    }
  }
});
renderOrgFilter();
renderList();

// 初期プレースホルダー（閲覧履歴・お気に入りがあれば表示）
showPlaceholder();

// URLパラメータで初期状態を設定（シェアリンク対応）
(function() {
  const params = new URLSearchParams(location.search);
  // ?q=検索クエリ で検索を初期化
  const q = params.get("q");
  if (q) {
    state.query = q;
    el.search.value = q;
    renderList();
  }
  // ?org=団体ID で団体フィルターを初期化
  const org = params.get("org");
  if (org && (org === "all" || DATA.organizations.find(o => o.id === org))) {
    state.org = org;
    renderOrgFilter();
    renderList();
  }
  // ?sort=ソートキー でソートを初期化
  const sort = params.get("sort");
  const validSorts = ["name","recent","debut","records","tier","playoff","pts","avgpts","avgrank","totalpts","career","titles"];
  if (sort && validSorts.includes(sort)) {
    state.sort = sort;
    document.getElementById("sortSelect").value = sort;
    renderList();
  }
  // 追加フィルターの復元
  if (params.get("mteam")) { const t = MLEAGUE_TEAMS.find(x => x.id === params.get("mteam")); if (t) { state.mteam = t.id; renderOrgFilter(); renderList(); } }
  if (params.get("mlc") === "1") { state.mleagueC = true; renderOrgFilter(); renderList(); }
  if (params.get("mlf") === "1") { state.mleagueF = true; renderOrgFilter(); renderList(); }
  if (params.get("ongoing") === "1") { state.ongoingOnly = true; renderOrgFilter(); renderList(); }
  if (params.get("fav") === "1") { state.favOnly = true; renderOrgFilter(); renderList(); }
  if (params.get("yr")) { const yr = params.get("yr"); state.year = yr; document.getElementById("yearFilter").value = yr; renderList(); }
  if (params.get("titled") === "1") { state.hasTitle = true; renderOrgFilter(); renderList(); }
  if (params.get("pos") === "1") { state.positivePts = true; renderOrgFilter(); renderList(); }
  // ?p=選手ID で選手を直接選択
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
  showPlaceholder();
});

// デスクトップでは検索欄に初期フォーカス
if (window.innerWidth > 760 && !location.search) {
  el.search.focus();
}

// 検索プレースホルダーを循環表示（AND検索の使い方をヒント）
(function() {
  const hints = ["名前・タイトル・団体で検索…", "例: 瀬戸熊", "例: 連盟 A1", "例: 最高位 決定戦", "例: 田中", "例: 雀王", "例: 協会 B1", "例: RMU", "例: 協会 A2（ティア名で検索可）"];
  let hi = 0;
  setInterval(function() {
    if (document.activeElement === el.search || el.search.value) return;
    hi = (hi + 1) % hints.length;
    el.search.placeholder = hints[hi];
  }, 3000);
})();
