/** Legendary Striker - game logic. Handlers are (uid, body) => JSON, independent of Express. */
import * as D from './database.js';
const { q1, qa, run, tx, isFree } = D;

export class Err extends Error { constructor(m, status = 400) { super(m); this.status = status; } }
const rnd = n => Math.floor(Math.random() * n);
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const pick = a => a[rnd(a.length)];

const active = new Map();   // uid -> live match state (in memory)
const lastSim = new Map();  // uid -> last simulated league results
export const dropActive = uid => active.delete(uid);
setInterval(() => { for (const [u, m] of active) if (Date.now() - m.touched > 36e5) active.delete(u); }, 6e5).unref();

const FIT = { id: 99, club: 'لاعب حر', name: 'الكابتن حسام (مدرب اللياقة)', archetype: 'developer', archetype_label: 'مدرب اللياقة', stamina_demand: 75, trust_penalty_failed_clutch: -3, formation: '4-2-3-1', quote: 'اللياقة أساس كل شيء.' };
const coachFor = p => (p.coach_id && q1('SELECT * FROM coaches WHERE id=?', p.coach_id)) || (isFree(p.club) ? FIT : q1('SELECT * FROM coaches WHERE club=?', p.club)) || FIT;
const ballon = (g, a, avg) => g * 4 + a * 2 + Math.round((avg || 0) * 10);
const fxRow = (f, m) => ({ id: f.id, home: f.home_name, away: f.away_name, home_score: m ? m.hs : f.home_score ?? 0, away_score: m ? m.as : f.away_score ?? 0, minute: m ? m.minute : 0, competition: f.competition, stage: f.stage, importance: f.importance, day: f.day_number, slot_time: f.slot_time });

// ---------------- match setup ----------------
function side(rows, pre) {
  const st = rows.filter(r => r.is_starter && !r.is_user), by = pos => st.filter(r => r.pos === pos);
  const act = {}, rowsById = {};
  const put = (id, r) => { if (r) act[id] = r; };
  put(pre + 'gk', by('GK')[0]);
  ['def', 'mid', 'fwd'].forEach(k => by(k.toUpperCase()).slice(0, 2).forEach((r, i) => put(pre + k + (i + 1), r)));
  const bench = rows.filter(r => !r.is_starter).map((r, i) => { rowsById['b' + r.id] = r; return { id: 'b' + r.id, name: r.name, number: r.number, pos: r.pos, pos_name: r.pos_name, ovr: r.ovr, status: i % 3 === 0 ? 'warming_up' : 'bench' }; });
  return { act, bench, rowsById, subs: 0 };
}
const lineupOf = (m, s, p) => ({ club: s === 'home' ? m.fx.home_name : m.fx.away_name, players: [...Object.entries(m[s].act).map(([id, r]) => ({ id, name: r.name, number: r.number })), ...(s === 'home' ? [{ id: 'me', name: p.name, number: 10 }] : [])] });
function coachView(m, s) {
  const c = s === 'home' ? m.coach : m.aCoach, d = (m.hs - m.as) * (s === 'home' ? 1 : -1);
  return { name: c.name, subs_used: m[s].subs, reaction: d > 0 ? 'happy' : d < 0 ? 'angry' : 'calm', reaction_label: d > 0 ? '🟢 راضٍ عن الأداء' : d < 0 ? '🔴 غاضب ويطالب برد فعل' : '⚪ يراقب بتركيز', quote: d > 0 ? c.quote : d < 0 ? 'ارفعوا الإيقاع، لا وقت للتراخي!' : 'ركّزوا واحتفظوا بالشكل.' };
}
const extras = m => ({ home_bench: m.home.bench, away_bench: m.away.bench, home_coach: coachView(m, 'home'), away_coach: coachView(m, 'away') });
const startPayload = (m, p) => ({ ok: true, fixture: fxRow(m.fx, m), lineups: { home: lineupOf(m, 'home', p), away: lineupOf(m, 'away', p) }, role: m.role, sub_minute: m.subMin, ...extras(m) });

// ---------------- clutch ----------------
const SET = {
  attack: ['هجمة خطيرة! الكرة وصلتك داخل الثلث الأخير', 'الثلث الهجومي', [['quick_shot', 'تسديدة سريعة', 'shooting', 0.5, 'shoot'], ['wall_pass', 'تمريرة حائط', 'passing', 0.72, 'pass'], ['cut_inside', 'اختراق للداخل', 'dribbling', 0.58, 'dribble']]],
  midfield: ['الكرة في وسط الملعب والمساحات مفتوحة', 'وسط الملعب', [['mid_through', 'تمريرة بينية', 'passing', 0.55, 'pass'], ['mid_switch', 'تحويل اللعب', 'passing', 0.72, 'pass'], ['mid_pivot', 'كسر الخطوط بالمراوغة', 'dribbling', 0.6, 'dribble']]],
  defense: ['ضغط من الخصم أمام منطقتك!', 'الثلث الدفاعي', [['def_clear', 'تشتيت الكرة', 'defending', 0.8, 'clear'], ['def_press', 'ضغط على حامل الكرة', 'defending', 0.55, 'dribble'], ['pass_out', 'بناء اللعب من الخلف', 'passing', 0.65, 'pass']]],
};
function mkClutch(m, p) {
  const z = pick(['attack', 'attack', 'attack', 'midfield', 'midfield', 'defense']), [desc, title, opts] = SET[z];
  m.cid = (m.cid || 0) + 1;
  const full = opts.map(([key, label, stat, base, kind], i) => {
    const pct = clamp(Math.round((base + (p.stats[stat] - 60) / 200 + (p.energy - 50) / 500 + (p.morale - 70) / 700) * 100), 15, 95);
    const en = kind === 'shoot' ? -6 : kind === 'clear' ? -2 : -3, tr = kind === 'shoot' ? 5 : kind === 'pass' ? 2 : 3;
    return { key, label, index: i + 1, hint: `${pct}% نسبة النجاح`, pct, kind, en, tr, pills: [{ type: 'chance', icon: '🎯', label: `${pct}% نجاح` }, { type: 'energy', icon: '⚡', label: `${en}% طاقة`, delta: en }, { type: 'trust', icon: '👔', label: `${tr > 0 ? '+' : ''}${tr}% ثقة`, delta: tr }] };
  });
  m.pending = { id: m.cid, zone: z, options: full, at: Date.now() };
  return { id: m.cid, minute: m.minute, description: desc, zone: z, zone_title: title, options: full.map(({ pct, kind, en, tr, ...o }) => o) };
}

// ---------------- helpers ----------------
function aiSub(m, s, minute) {
  const S = m[s]; if (S.subs >= 3) return null;
  const ids = Object.keys(S.act).filter(i => !i.endsWith('gk')), id = pick(ids), out = S.act[id];
  const free = S.bench.filter(b => b.status !== 'subbed_in' && b.status !== 'subbed_out');
  const inn = free.find(b => S.rowsById[b.id].pos === out.pos) || free[0]; if (!inn) return null;
  inn.status = 'subbed_in'; inn.sub_minute = minute;
  S.bench.push({ id: 'o' + out.id, name: out.name, number: out.number, pos: out.pos, pos_name: out.pos_name, ovr: out.ovr, status: 'subbed_out', sub_minute: minute });
  S.act[id] = S.rowsById[inn.id]; S.subs++;
  return { minute, type: 'sub', team: s, text: `تبديل: يخرج ${out.name} ويدخل ${inn.name}`, sub_board: { team: s, out: { id, name: out.name, number: out.number }, in: { id: inn.id, name: inn.name, number: inn.number, pos: inn.pos } } };
}
const scorerOf = (m, s) => { const a = Object.entries(m[s].act).filter(([id]) => /fwd|mid/.test(id)).map(([, r]) => r.name); return a.length ? pick(a) : 'لاعب'; };
function applyResult(uid, h, a, hs, as) {
  const up = (n, gf, ga) => run('UPDATE standings SET pl=pl+1,gf=gf+?,ga=ga+?,pts=pts+? WHERE user_id=? AND name=?', gf, ga, gf > ga ? 3 : gf === ga ? 1 : 0, uid, n);
  up(h, hs, as); up(a, as, hs);
}
function simOthers(uid, skip) {
  const cl = qa('SELECT name,strength FROM clubs').filter(c => !skip.includes(c.name)).sort(() => Math.random() - 0.5), out = [];
  const goals = (s, o) => { let k = 0; for (let j = 0; j < 5; j++) if (chance(0.28 * (s / o) ** 2)) k++; return k; };
  for (let i = 0; i + 1 < cl.length; i += 2) {
    const x = cl[i], y = cl[i + 1], hs = goals(x.strength, y.strength), as = goals(y.strength, x.strength);
    applyResult(uid, x.name, y.name, hs, as);
    out.push({ home: x.name, away: y.name, score: `${hs}-${as}`, top_scorer: hs ? q1("SELECT name FROM squad_members WHERE club=? AND user_id=0 AND pos='FWD' AND is_starter=1 ORDER BY RANDOM() LIMIT 1", x.name)?.name || '—' : '—' });
  }
  lastSim.set(uid, out);
}
function endSeason(uid) {
  const s = q1('SELECT * FROM seasons WHERE user_id=?', uid), p = D.getPlayer(uid), st = D.standings(uid);
  const rank = st.findIndex(x => x.name === p.club) + 1, avg = s.matches ? r1(s.rating_sum / s.matches) : 0, trophies = rank === 1 && !isFree(p.club) ? 1 : 0;
  run('INSERT INTO career_seasons(user_id,season_number,matches,goals,assists,trophies,avg_rating) VALUES(?,?,?,?,?,?,?)', uid, s.season_number, s.matches, s.goals, s.assists, trophies, avg);
  if (s.goals >= 12) run('INSERT INTO awards(user_id,award,award_name,season_number) VALUES(?,?,?,?)', uid, 'golden_boot', 'الحذاء الذهبي', s.season_number);
  const rival = q1('SELECT * FROM rivals WHERE is_primary_rival=1');
  if (avg >= 7.5 && ballon(s.goals, s.assists, avg) > rival.ballon_dor_pts) run('INSERT INTO awards(user_id,award,award_name,season_number) VALUES(?,?,?,?)', uid, 'ballon_dor', 'الكرة الذهبية', s.season_number);
  const bd = q1('SELECT * FROM board_objectives WHERE user_id=?', uid);
  if (bd && rank && rank <= bd.target_league_rank && s.goals >= bd.target_player_goals) { D.setPlayer(uid, { balance: p.balance + bd.bonus_payout }); D.addTx(uid, 'wage', bd.bonus_payout, 'مكافأة مجلس الإدارة'); }
  D.setPlayer(uid, { age: p.age + 1, ovr: clamp(p.ovr + (avg >= 7 ? 1 : 0), 40, 99) });
  run("UPDATE seasons SET season_number=season_number+1,day=1,status='active',matches=0,goals=0,assists=0,trophies=0,rating_sum=0 WHERE user_id=?", uid);
  D.makeStandings(uid); D.makeFixtures(uid, p.club);
}
function nextDay(uid, day) {
  const p = D.getPlayer(uid), inj = Math.max(0, p.injury_days - 1);
  D.setPlayer(uid, { energy: clamp(p.energy + 18, 0, 100), injury_days: inj, is_injured: inj > 0 });
  run('UPDATE seasons SET day=? WHERE user_id=?', day + 1, uid);
  if (day + 1 >= 15) endSeason(uid);
}
const nextFixture = uid => q1("SELECT * FROM fixtures WHERE user_id=? AND status='scheduled' ORDER BY day_number LIMIT 1", uid);

function finishMatch(uid, m) {
  const p = D.getPlayer(uid), fx = m.fx, played = m.role === 'starter' ? 90 : Math.max(0, 90 - m.subMin);
  const rating = r1(clamp(m.rating + (m.hs > m.as ? 0.4 : m.hs < m.as ? -0.3 : 0), 3, 10));
  const ag = q1('SELECT * FROM agents WHERE user_id=?', uid), gross = Math.round(p.match_wage * played / 90), cut = Math.round(gross * (ag?.wage_cut_pct ?? 15) / 100), fixed = 400, net = gross - cut - fixed;
  tx(() => {
    run("UPDATE fixtures SET home_score=?,away_score=?,status='finished' WHERE id=?", m.hs, m.as, fx.id);
    run('INSERT INTO match_logs(user_id,home_name,away_name,home_score,away_score,goals,assists,rating) VALUES(?,?,?,?,?,?,?,?)', uid, fx.home_name, fx.away_name, m.hs, m.as, m.mg, m.ma, rating);
    let b = p.balance;
    [['wage', gross, `أجر مباراة ${fx.away_name}`], ['agent_fee', -cut, 'عمولة الوكيل'], ['overhead', -fixed, 'مصاريف المعيشة']].forEach(([t, a, n]) => { b += a; D.setPlayer(uid, { balance: b }); if (a) D.addTx(uid, t, a, n); });
    applyResult(uid, fx.home_name, fx.away_name, m.hs, m.as);
    simOthers(uid, [fx.home_name, fx.away_name]);
    run('UPDATE seasons SET matches=matches+1,goals=goals+?,assists=assists+?,rating_sum=rating_sum+? WHERE user_id=?', m.mg, m.ma, rating, uid);
    const hurt = D.getPlayer(uid).energy <= 35 && chance(0.3), d = 2 + rnd(3);
    if (hurt) D.setPlayer(uid, { is_injured: true, injury_days: d });
    nextDay(uid, fx.day_number);
  });
  active.delete(uid);
  return { home: fx.home_name, away: fx.away_name, score: `${m.hs} - ${m.as}`, goals: m.mg, assists: m.ma, rating, minutes: played, net_wage: net, goals_breakdown: m.goals };
}

// ---------------- handlers ----------------
export const H = {};

H.state = (uid, b, { username, csrf }) => {
  const p = D.getPlayer(uid); if (!p) throw new Err('بيانات اللاعب غير موجودة', 404);
  const free = isFree(p.club), m = active.get(uid), nf = free ? null : nextFixture(uid);
  return {
    ok: true, csrf, username, dev_mode: false, needs_career: false, season: D.season(uid), player: p, is_free_agent: free,
    active_match: m ? { ...startPayload(m, p).fixture, ...startPayload(m, p), id: m.fx.id } : null,
    next_fixture: m || !nf ? null : fxRow(nf),
    upcoming: free ? [] : qa("SELECT * FROM fixtures WHERE user_id=? AND status='scheduled' ORDER BY day_number LIMIT 5", uid),
    recent: qa('SELECT * FROM match_logs WHERE user_id=? ORDER BY id DESC LIMIT 5', uid),
    items: qa('SELECT * FROM recovery_items ORDER BY cost_usd'), daily_fixed_cost: free ? 100 : 400, standings: D.standings(uid),
  };
};

const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 24);
H.new_career = (uid, b) => {
  active.delete(uid);
  D.resetCareer(uid, cleanName(b.name) || 'لاعب جديد', ['GK', 'DEF', 'MID', 'FWD'].includes(b.position) ? b.position : 'MID');
  return { ok: true, created: true, redirect_tab: 'market', is_free_agent: true };
};

H.match_start = (uid, b) => {
  const p = D.getPlayer(uid);
  if (isFree(p.club)) throw new Err('وقّع مع نادٍ أولاً لخوض المباريات');
  const cur = active.get(uid); if (cur) { cur.touched = Date.now(); return startPayload(cur, p); }
  const fx = nextFixture(uid); if (!fx) throw new Err('لا توجد مباريات قادمة في هذا الموسم');
  if (p.is_injured || b.decision === 'rest') {
    tx(() => { run("UPDATE fixtures SET status='skipped' WHERE id=?", fx.id); run("INSERT INTO match_logs(user_id,home_name,away_name,home_score,away_score,log_status) VALUES(?,?,?,0,0,'rested')", uid, fx.home_name, fx.away_name); D.setPlayer(uid, { energy: clamp(p.energy + 25, 0, 100) }); nextDay(uid, fx.day_number); });
    return { ok: true, skipped: true, message: p.is_injured ? 'أنت مصاب — تم تخطي المباراة للتعافي.' : 'قرار حكيم! ارتحت وتعافت طاقتك (+25%).' };
  }
  if (p.energy <= 35 && !b.decision) return { ok: true, needs_decision: true, dilemma: { message: `طاقتك ${Math.round(p.energy)}% فقط — خطر الإصابة كبير. هل ترتاح أم تلعب؟` } };
  const home = qa('SELECT * FROM squad_members WHERE club=? AND user_id IN (0,?) ORDER BY is_starter DESC,ovr DESC', fx.home_name, uid);
  const away = qa('SELECT * FROM squad_members WHERE club=? AND user_id=0 ORDER BY is_starter DESC,ovr DESC', fx.away_name);
  const st = c => q1('SELECT strength FROM clubs WHERE name=?', c).strength;
  const role = p.trust >= 60 ? 'starter' : 'sub', coach = coachFor(p);
  const m = { uid, fx, minute: 0, hs: 0, as: 0, goals: [], mg: 0, ma: 0, rating: 6, role, subMin: role === 'sub' ? 55 + rnd(15) : 0, coach, aCoach: q1('SELECT * FROM coaches WHERE club=?', fx.away_name) || FIT, home: side(home, 'h_'), away: side(away, 'a_'), sH: st(fx.home_name) + (p.ovr - 67) * 0.1, sA: st(fx.away_name), plan: [10, 24, 38, 55, 70].map(x => x + rnd(7)), subPlan: { away: 58 + rnd(8), home: 66 + rnd(8) }, touched: Date.now(), pending: null };
  active.set(uid, m);
  return startPayload(m, p);
};

H.match_tick = (uid, b) => {
  const m = active.get(uid); if (!m || m.fx.id !== Number(b.fixture_id)) throw new Err('المباراة غير نشطة');
  m.touched = Date.now(); m.pending = null; m.minute++;
  const mn = m.minute, ev = [], p0 = D.getPlayer(uid);
  if (m.role === 'sub' && mn === m.subMin) ev.push({ minute: mn, type: 'info', text: 'المدرب يُشركك بديلاً الآن — اللعب بين قدميك!' });
  const goal = s => { const sc = scorerOf(m, s); s === 'home' ? m.hs++ : m.as++; m.goals.push({ team: s, scorer: sc, assist: null, minute: mn }); ev.push({ minute: mn, type: s === 'home' ? 'goal' : 'opp_goal', text: `⚽ هدف لـ ${s === 'home' ? m.fx.home_name : m.fx.away_name}! سجله ${sc}`, scorer: sc }); };
  if (chance(0.011 * (m.sH / m.sA) ** 2.5)) goal('home');
  if (chance(0.011 * (m.sA / m.sH) ** 2.5)) goal('away');
  if (chance(0.03)) ev.push({ minute: mn, type: 'save', text: `تصدٍّ رائع من حارس ${chance(0.5) ? m.fx.home_name : m.fx.away_name}!` });
  else if (chance(0.1)) ev.push({ minute: mn, type: 'chatter', text: pick(['ضغط متبادل في وسط الملعب', 'الجماهير تشجع بحماس', 'كرة ثابتة بعيدة عن المرمى', 'المدرب يوجّه لاعبيه من الخط']) });
  for (const s of ['home', 'away']) if (mn === m.subPlan[s]) { const e = aiSub(m, s, mn); if (e) ev.push(e); }
  const played = m.role === 'starter' || mn >= m.subMin;
  if (played) D.setPlayer(uid, { energy: clamp(p0.energy - 0.2 * (m.coach.stamina_demand / 75), 0, 100) });
  const clutch = played && m.plan.includes(mn) ? mkClutch(m, D.getPlayer(uid)) : null;
  const p = D.getPlayer(uid), fin = mn >= 90, out = { ok: true, events: ev, fixture: fxRow(m.fx, m), hud: p, finished: fin, ...extras(m) };
  if (clutch) out.clutch = clutch;
  if (fin) { out.summary = finishMatch(uid, m); out.hud = D.getPlayer(uid); }
  return out;
};

H.match_action = (uid, b) => {
  const m = active.get(uid), pc = m?.pending;
  if (!pc || pc.id !== Number(b.clutch_id)) throw new Err('لا توجد لحظة حاسمة نشطة');
  const timeout = b.choice === '__timeout__' || Date.now() - pc.at > 23000, o = pc.options.find(x => x.key === b.choice);
  if (!timeout && !o) throw new Err('اختيار غير صالح');
  m.pending = null; m.touched = Date.now();
  const p = D.getPlayer(uid); let success = false, goal = false, assist = false, text;
  if (!timeout) {
    success = chance(o.pct / 100);
    if (success) { goal = o.kind === 'shoot' ? chance(0.7) : o.kind === 'pass' && pc.zone !== 'defense' ? chance(0.35) : o.kind === 'dribble' && pc.zone === 'attack' ? chance(0.4) : false; assist = goal && o.kind === 'pass'; }
  }
  let scorer = p.name;
  if (goal) { m.hs++; if (assist) { scorer = scorerOf(m, 'home'); m.ma++; } else m.mg++; m.goals.push({ team: 'home', scorer, assist: assist ? p.name : null, minute: m.minute }); }
  text = timeout ? '⏱ انتهى الوقت وضاعت الفرصة!' : goal ? (assist ? `🎯 تمريرة حاسمة رائعة! ${scorer} يسجل بعد تمريرتك` : '⚽ هدف رائع! سددتها في الشباك') : success ? '✔ قرار ذكي حافظ على الكرة' : '✖ فشلت المحاولة وضاعت الكرة';
  m.rating = clamp(m.rating + (goal ? 0.8 : success ? 0.35 : -0.35), 3, 10);
  const td = !success ? m.coach.trust_penalty_failed_clutch : Math.round(o.tr / (goal ? 1 : 2)), trust = clamp(p.trust + td, 0, 100);
  const hud = D.setPlayer(uid, { trust, trust_label: D.trustLabel(trust), energy: clamp(p.energy + (timeout ? 0 : o.en), 0, 100), morale: clamp(p.morale + (success ? 2 : -2), 0, 100) });
  return { ok: true, success, goal, text, timed_out: timeout, trust_delta: td, scorer, fixture: fxRow(m.fx, m), hud, ...extras(m) };
};

H.coach_chat = (uid, b) => {
  const m = active.get(uid); if (!m || m.fx.id !== Number(b.fixture_id)) throw new Err('المباراة غير نشطة');
  const p = D.getPlayer(uid), d = m.hs - m.as;
  const advice = p.energy < 40 ? 'طاقتك منخفضة، وفّر مجهودك ولا تغامر بالتسديد البعيد.' : d < 0 ? 'نحن متأخرون — ابحث عن المساحات وسدد عند أول فرصة.' : d > 0 ? 'حافظ على التقدم، مرّر بذكاء واضغط عند فقدان الكرة.' : 'المباراة مفتوحة، كن جاهزاً للحظة الحاسمة.';
  return { ok: true, coach: { name: m.coach.name, role: m.coach.archetype_label, minute: m.minute, advice, score: `${m.hs} - ${m.as}`, user_energy: p.energy, user_trust: p.trust } };
};

H.squad = uid => {
  const p = D.getPlayer(uid), coach = coachFor(p);
  if (isFree(p.club)) return { ok: true, squad: [], tactics: null, coach, player: p, club: p.club, is_free_agent: true };
  const squad = qa('SELECT * FROM squad_members WHERE club=? AND user_id IN (0,?) ORDER BY is_starter DESC,ovr DESC', p.club, uid).map(r => ({ ...r, is_user: !!r.is_user, is_starter: !!r.is_starter }));
  const t = q1('SELECT * FROM tactics WHERE club=?', p.club);
  return { ok: true, squad, tactics: t && { formation: t.formation, style_label: t.style_label, user_tactical_role: t.user_tactical_role, instructions: JSON.parse(t.instructions_json) }, coach, player: p, club: p.club, is_free_agent: false };
};

H.market = uid => {
  const p = D.getPlayer(uid), s = D.season(uid), free = isFree(p.club), now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const get = () => qa('SELECT * FROM market_offers WHERE user_id=? AND is_active=1 AND expires_at>? ORDER BY match_wage DESC', uid, now);
  let offers = get();
  if (!offers.length && (free || p.transfer_listed)) { D.makeOffers(uid); offers = get(); }
  const peers = qa('SELECT name,club,pos position,age,ovr FROM squad_members WHERE user_id=0 AND is_starter=1 AND ovr BETWEEN ? AND ? ORDER BY ovr DESC LIMIT 12', p.ovr - 6, p.ovr + 8).map(x => ({ ...x, npc: 1 }));
  return { ok: true, offers, peers, current: { club: p.club, tier_label: p.tier_label, wage: p.match_wage }, is_free_agent: free, window_open: free || s.day >= 13, listed: p.transfer_listed };
};

H.market_action = (uid, b) => {
  const p = D.getPlayer(uid), id = Number(b.offer_id);
  if (active.has(uid)) throw new Err('لا يمكن التعاقد أثناء مباراة جارية');
  if (b.action === 'list') { D.setPlayer(uid, { transfer_listed: true }); if (!q1('SELECT 1 x FROM market_offers WHERE user_id=? AND is_active=1', uid)) D.makeOffers(uid); return { ok: true, message: 'تم إدراجك في قائمة الانتقالات — ستصلك عروض قريباً.' }; }
  const o = q1('SELECT * FROM market_offers WHERE id=? AND user_id=? AND is_active=1', id, uid); if (!o) throw new Err('العرض غير موجود أو انتهى', 404);
  if (b.action === 'reject') { run('UPDATE market_offers SET is_active=0 WHERE id=?', id); return { ok: true, message: 'تم رفض العرض' }; }
  if (b.action !== 'accept') throw new Err('إجراء غير معروف');
  const s = D.season(uid), trust = o.role === 'starter' ? 82 : o.role === 'rotation' ? 62 : 42;
  tx(() => {
    run('DELETE FROM squad_members WHERE user_id=?', uid);
    if (o.role !== 'bench') { const d = q1('SELECT id FROM squad_members WHERE club=? AND user_id=0 AND is_starter=1 AND pos=? ORDER BY ovr LIMIT 1', o.club, p.position); if (d) run('UPDATE squad_members SET is_starter=0 WHERE id=?', d.id); }
    run('INSERT INTO squad_members(user_id,club,name,number,pos,pos_name,age,ovr,value,wage,form,is_starter,is_user) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)', uid, o.club, p.name, 10, p.position, D.POS_NAME[p.position], p.age, p.ovr, p.ovr * p.ovr * 900, o.match_wage, 'متألق', o.role === 'bench' ? 0 : 1);
    D.setPlayer(uid, { club: o.club, tier: o.club_tier, tier_label: o.new_tier_label, match_wage: o.match_wage, balance: p.balance + o.signing_bonus, transfer_listed: false, trust, trust_label: D.trustLabel(trust), coach_id: null });
    D.addTx(uid, 'wage', o.signing_bonus, `مكافأة توقيع ${o.club}`);
    run('UPDATE market_offers SET is_active=0 WHERE user_id=?', uid);
    D.makeFixtures(uid, o.club, Math.min(s.day, 14));
    if (s.day <= 1) D.makeStandings(uid);
  });
  return { ok: true, club: o.club, bonus: o.signing_bonus, hud: D.getPlayer(uid), message: `🎉 مبارك! تم توقيع العقد الرسمي مع ${o.club} — مكافأة التوقيع ${Math.round(o.signing_bonus).toLocaleString('en')}$` };
};

H.recover_stamina = (uid, b) => {
  const p = D.getPlayer(uid), it = q1('SELECT * FROM recovery_items WHERE id=?', Number(b.item_id));
  if (!it) throw new Err('عنصر غير موجود', 404);
  if (active.has(uid)) throw new Err('لا يمكن الاستشفاء أثناء المباراة');
  if (p.balance < it.cost_usd) throw new Err('رصيدك لا يكفي');
  const energy = clamp(p.energy + it.energy_restore_pct, 0, 100);
  const hud = D.setPlayer(uid, { energy, balance: p.balance - it.cost_usd }); D.addTx(uid, 'recovery', -it.cost_usd, it.name);
  return { ok: true, hud, item: it.name, energy };
};

H.career = uid => {
  const t = q1("SELECT COALESCE(SUM(goals),0) goals,COALESCE(SUM(assists),0) assists,COUNT(*) matches,ROUND(AVG(rating),1) avg_rating FROM match_logs WHERE user_id=? AND log_status='finished'", uid);
  t.trophies = q1('SELECT COALESCE(SUM(trophies),0) c FROM career_seasons WHERE user_id=?', uid).c;
  return { ok: true, totals: t, seasons: qa('SELECT * FROM career_seasons WHERE user_id=? ORDER BY season_number', uid), awards: qa('SELECT * FROM awards WHERE user_id=?', uid), transactions: qa('SELECT * FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 20', uid) };
};

H.coach_decision = uid => {
  const p = D.getPlayer(uid), c = coachFor(p), ok = p.trust >= 60;
  return { ok: true, coach: c, evaluation: { role: ok ? 'أساسي' : 'بديل', dialogue: ok ? `${c.quote} أنت جزء أساسي من خطتي هذا الأسبوع.` : 'ثقتي بك تراجعت — أثبت نفسك في التدريبات وفي الفرص الحاسمة.' } };
};
H.coach_switch = (uid, b) => {
  const c = q1('SELECT id FROM coaches WHERE id=?', Number(b.coach_id)); if (!c) throw new Err('مدرب غير موجود', 404);
  D.setPlayer(uid, { coach_id: c.id }); return { ok: true };
};

H.rival_race = uid => {
  const p = D.getPlayer(uid), s = D.season(uid), r = q1('SELECT * FROM rivals WHERE is_primary_rival=1'), up = ballon(s.goals, s.assists, s.avg_rating);
  return { ok: true, comparison: { user: { name: p.name, club: p.club, ovr: p.ovr, goals: s.goals, assists: s.assists, avg_rating: s.avg_rating ?? '—', ballon_dor_pts: up }, rival: r, headline_verdict: up >= r.ballon_dor_pts ? `أنت تتقدم على ${r.name} في سباق الكرة الذهبية!` : `${r.name} يتقدم عليك بـ ${r.ballon_dor_pts - up} نقطة — حان وقت الرد.` }, simulated_matches: lastSim.get(uid) || [] };
};
H.agent_board = uid => {
  const bd = q1('SELECT * FROM board_objectives WHERE user_id=?', uid), p = D.getPlayer(uid), s = D.season(uid);
  return { ok: true, agent: q1('SELECT * FROM agents WHERE user_id=?', uid), board: { ...bd, current_player_goals: s.goals, current_league_rank: D.standings(uid).findIndex(x => x.name === p.club) + 1 } };
};
H.market_bots = () => {
  const it = qa('SELECT * FROM recovery_items');
  return { ok: true, config: { formula: 'السعر العادل = القيمة الأساسية × (1 ± تذبذب السوق)' }, recent_bot_purchases: it.map((x, i) => ({ id: x.id, item: x.name, price: x.cost_usd * 1.1, time: `منذ ${i + 2} ساعات`, buyer: `Bot-${100 + i}` })), seller_bot_daily_stock: it.map((x, i) => ({ id: x.id, name: x.name, price: Math.round(x.cost_usd * 0.95), seller: `Seller-${200 + i}` })) };
};

const EXPLORE = { players: 'user_id', clubs: null, coaches: null, squad_members: 'user_id', tactics: null, fixtures: 'user_id', standings: 'user_id', recovery_items: null, market_offers: 'user_id', rivals: null, transactions: 'user_id', match_logs: 'user_id' };
H.database_explorer = (uid, b) => {
  const t = Object.hasOwn(EXPLORE, b.table) ? b.table : 'players';
  const w = k => (!k ? ['', []] : t === 'squad_members' ? [' WHERE user_id IN (0,?)', [uid]] : [` WHERE ${k}=?`, [uid]]);
  const summary = {}; for (const [n, k] of Object.entries(EXPLORE)) { const [c, a] = w.call(null, k); summary[n] = q1(`SELECT COUNT(*) c FROM ${n}${n === 'squad_members' ? ' WHERE user_id IN (0,?)' : c}`, ...(n === 'squad_members' ? [uid] : a)).c; }
  const [c, a] = w(EXPLORE[t]);
  return { ok: true, summary, rows: qa(`SELECT * FROM ${t}${c} LIMIT 50`, ...a) };
};
