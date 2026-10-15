/** Legendary Striker - SQLite layer (node:sqlite). Per-user data, transactional seeds. */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(dir, { recursive: true });
export const DATA_DIR = dir;
export const db = new DatabaseSync(path.join(dir, 'legendary_striker.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');

export const q1 = (sql, ...a) => db.prepare(sql).get(...a);
export const qa = (sql, ...a) => db.prepare(sql).all(...a);
export const run = (sql, ...a) => db.prepare(sql).run(...a);
export const tx = fn => { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, name TEXT NOT NULL, position TEXT NOT NULL DEFAULT 'MID', age INTEGER NOT NULL DEFAULT 18, ovr INTEGER NOT NULL DEFAULT 67, club TEXT NOT NULL, tier TEXT NOT NULL, tier_label TEXT NOT NULL, trust REAL NOT NULL DEFAULT 80, trust_label TEXT NOT NULL, energy REAL NOT NULL DEFAULT 100, morale REAL NOT NULL DEFAULT 90, balance REAL NOT NULL DEFAULT 25000, match_wage REAL NOT NULL DEFAULT 0, is_injured INTEGER NOT NULL DEFAULT 0, injury_days INTEGER NOT NULL DEFAULT 0, transfer_listed INTEGER NOT NULL DEFAULT 1, coach_id INTEGER, pace INTEGER NOT NULL DEFAULT 68, shooting INTEGER NOT NULL DEFAULT 64, passing INTEGER NOT NULL DEFAULT 66, dribbling INTEGER NOT NULL DEFAULT 67, defending INTEGER NOT NULL DEFAULT 45, physical INTEGER NOT NULL DEFAULT 60, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS clubs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, stadium TEXT NOT NULL, tier TEXT NOT NULL, strength INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS coaches (id INTEGER PRIMARY KEY AUTOINCREMENT, club TEXT NOT NULL, name TEXT NOT NULL, archetype TEXT NOT NULL, archetype_label TEXT NOT NULL, stamina_demand INTEGER NOT NULL, trust_penalty_failed_clutch REAL NOT NULL, formation TEXT NOT NULL DEFAULT '4-2-3-1', quote TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tactics (id INTEGER PRIMARY KEY AUTOINCREMENT, club TEXT UNIQUE NOT NULL, formation TEXT NOT NULL, style_label TEXT NOT NULL, user_tactical_role TEXT NOT NULL, instructions_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS squad_members (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL DEFAULT 0, club TEXT NOT NULL, name TEXT NOT NULL, number INTEGER NOT NULL, pos TEXT NOT NULL, pos_name TEXT NOT NULL, age INTEGER NOT NULL, ovr INTEGER NOT NULL, nat TEXT NOT NULL DEFAULT 'مصر', value REAL NOT NULL, wage REAL NOT NULL, form TEXT NOT NULL DEFAULT 'جيد', is_starter INTEGER NOT NULL DEFAULT 0, is_user INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS fixtures (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, day_number INTEGER NOT NULL, competition TEXT NOT NULL DEFAULT 'league', stage TEXT NOT NULL DEFAULT 'league', home_name TEXT NOT NULL, away_name TEXT NOT NULL, home_score INTEGER, away_score INTEGER, slot_time TEXT NOT NULL DEFAULT '20:30', importance TEXT, status TEXT NOT NULL DEFAULT 'scheduled');
CREATE TABLE IF NOT EXISTS standings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, pl INTEGER NOT NULL DEFAULT 0, gf INTEGER NOT NULL DEFAULT 0, ga INTEGER NOT NULL DEFAULT 0, pts INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id, name));
CREATE TABLE IF NOT EXISTS recovery_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cost_usd REAL NOT NULL, energy_restore_pct REAL NOT NULL, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market_offers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, club TEXT NOT NULL, club_tier TEXT NOT NULL, new_tier_label TEXT NOT NULL, role TEXT NOT NULL, match_wage REAL NOT NULL, signing_bonus REAL NOT NULL, release_clause REAL NOT NULL, expires_at TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS rivals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, club TEXT NOT NULL, archetype TEXT NOT NULL, ovr INTEGER NOT NULL, goals INTEGER NOT NULL, assists INTEGER NOT NULL, avg_rating REAL NOT NULL, ballon_dor_pts REAL NOT NULL, is_primary_rival INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS agents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, name TEXT NOT NULL, wage_cut_pct REAL NOT NULL DEFAULT 15, penalty_clause_cost REAL NOT NULL DEFAULT 25000, min_ovr_threshold INTEGER NOT NULL DEFAULT 82, last_warning TEXT NOT NULL, bio TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS board_objectives (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, chairman_name TEXT NOT NULL, target_league_rank INTEGER NOT NULL, target_player_goals INTEGER NOT NULL, bonus_payout REAL NOT NULL, eval_message TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS match_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, home_name TEXT NOT NULL, away_name TEXT NOT NULL, home_score INTEGER NOT NULL, away_score INTEGER NOT NULL, goals INTEGER NOT NULL DEFAULT 0, assists INTEGER NOT NULL DEFAULT 0, rating REAL NOT NULL DEFAULT 6, log_status TEXT NOT NULL DEFAULT 'finished', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, balance_after REAL NOT NULL, note TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS seasons (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, season_number INTEGER NOT NULL DEFAULT 1, day INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', matches INTEGER NOT NULL DEFAULT 0, goals INTEGER NOT NULL DEFAULT 0, assists INTEGER NOT NULL DEFAULT 0, trophies INTEGER NOT NULL DEFAULT 0, rating_sum REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS career_seasons (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, season_number INTEGER NOT NULL, matches INTEGER NOT NULL, goals INTEGER NOT NULL, assists INTEGER NOT NULL, trophies INTEGER NOT NULL, avg_rating REAL NOT NULL);
CREATE TABLE IF NOT EXISTS awards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, award TEXT NOT NULL, award_name TEXT NOT NULL, season_number INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS i_sq ON squad_members(club, user_id);
CREATE INDEX IF NOT EXISTS i_fx ON fixtures(user_id, status, day_number);
CREATE INDEX IF NOT EXISTS i_ml ON match_logs(user_id);
CREATE INDEX IF NOT EXISTS i_tx ON transactions(user_id);
`);

// ---------------- static seed ----------------
export const FREE = 'لاعب حر (سوق الانتقالات)';
export const isFree = c => !c || c.includes('لاعب حر');
export const TIER_LABEL = { local: 'الدوري المحلي', mid: 'دوري متوسط', continental: 'مستوى قاري', elite: 'نخبة' };
const CLUBS = [
  ['الأهلي', 'ستاد القاهرة الدولي', 'elite', 82], ['بيراميدز', 'ستاد 30 يونيو', 'continental', 80], ['الزمالك', 'ستاد القاهرة الدولي', 'continental', 79],
  ['سيراميكا كليوباترا', 'ستاد السلام', 'mid', 74], ['المصري', 'ستاد بورسعيد', 'mid', 72], ['الإسماعيلي', 'ستاد الإسماعيلية', 'mid', 70],
  ['سموحة', 'ستاد الإسكندرية', 'local', 69], ['الاتحاد السكندري', 'ستاد الإسكندرية', 'local', 68], ['إنبي', 'ستاد بتروسبورت', 'local', 67], ['المقاولون العرب', 'ستاد عثمان أحمد عثمان', 'local', 66],
];
const A = { disciplinarian: 'المدرب الصارم', developer: 'المدرب المطوِّر', tactician: 'المدرب التكتيكي' };
const COACHES = [
  ['الأهلي', 'مارسيل كولر', 'disciplinarian', 85, -6, 'الانضباط أولاً، ومن لا يركض لا يلعب.'],
  ['الزمالك', 'جوزيه جوميز', 'developer', 70, -3, 'أثق في الشباب، والخطأ جزء من التعلّم.'],
  ['بيراميدز', 'كرونسلاف', 'tactician', 78, -4, 'كل تمريرة لها مكان، والتمركز يصنع الفارق.'],
  ['المقاولون العرب', 'معتمد جمال', 'developer', 72, -3, 'نلعب بقلب واحد ونقاتل حتى النهاية.'],
];
const FN = ['أحمد', 'محمد', 'محمود', 'مصطفى', 'عمر', 'يوسف', 'كريم', 'هشام', 'طارق', 'ياسر', 'إسلام', 'وليد', 'حسام', 'رامي', 'شادي', 'أيمن', 'سيف', 'زياد', 'بلال', 'نادر'];
const LN = ['السيد', 'حسن', 'فتحي', 'منصور', 'الشناوي', 'إبراهيم', 'زكريا', 'رضوان', 'عثمان', 'حمدي', 'النجار', 'سعد', 'فوزي', 'البنا', 'شريف', 'الدسوقي', 'مرسي', 'عامر', 'سالم', 'جابر'];
export const POS_NAME = { GK: 'حارس مرمى', DEF: 'مدافع', MID: 'لاعب وسط', FWD: 'مهاجم' };
const STARTERS = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const BENCH = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];
const NUMS = [1, 2, 3, 4, 5, 8, 6, 9, 11, 7, 12, 13, 14, 15, 16, 17, 18];

function seedStatic() {
  if (q1('SELECT COUNT(*) c FROM clubs').c) return;
  tx(() => {
    CLUBS.forEach(c => run('INSERT INTO clubs(name,stadium,tier,strength) VALUES(?,?,?,?)', ...c));
    COACHES.forEach(c => run('INSERT INTO coaches(club,name,archetype,archetype_label,stamina_demand,trust_penalty_failed_clutch,quote) VALUES(?,?,?,?,?,?,?)', c[0], c[1], c[2], A[c[2]], c[3], c[4], c[5]));
    const kinds = ['disciplinarian', 'developer', 'tactician'];
    CLUBS.forEach(([name], ci) => {
      if (COACHES.some(c => c[0] === name)) return;
      const k = kinds[ci % 3];
      run('INSERT INTO coaches(club,name,archetype,archetype_label,stamina_demand,trust_penalty_failed_clutch,quote) VALUES(?,?,?,?,?,?,?)', name, `مدرب ${name}`, k, A[k], 74, -4, 'ركّزوا في التفاصيل الصغيرة.');
    });
    CLUBS.forEach(([name, , , strength], ci) => {
      const coach = q1('SELECT * FROM coaches WHERE club=?', name);
      run('INSERT INTO tactics(club,formation,style_label,user_tactical_role,instructions_json) VALUES(?,?,?,?,?)', name, '4-2-3-1',
        coach.archetype === 'disciplinarian' ? 'ضغط عالٍ وانضباط' : coach.archetype === 'developer' ? 'استحواذ وتطوير' : 'تحولات سريعة', 'صانع ألعاب حر',
        JSON.stringify(['ضغط عالٍ عند فقدان الكرة', 'تحولات سريعة نحو الأطراف', 'الحفاظ على الشكل الدفاعي 4-2-3-1', 'التسديد من خارج المنطقة مسموح']));
      let seed = (ci + 1) * 9973;
      const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) % n; };
      [...STARTERS.map(p => [p, 1]), ...BENCH.map(p => [p, 0])].forEach(([pos, st], i) => {
        const ovr = Math.max(55, Math.min(90, strength + rnd(9) - 4 - (st ? 0 : 5)));
        run('INSERT INTO squad_members(club,name,number,pos,pos_name,age,ovr,value,wage,is_starter) VALUES(?,?,?,?,?,?,?,?,?,?)',
          name, `${FN[(i * 7 + ci * 3) % 20]} ${LN[(i * 11 + ci * 5) % 20]}`, NUMS[i], pos, POS_NAME[pos], 19 + rnd(14), ovr, ovr * ovr * 900, ovr * 700, st);
      });
    });
    [['جلسة استشفاء سريع', 3000, 20, 'تدليك وتمدد خفيف'], ['حمام ثلج واستشفاء', 8000, 40, 'يخفض الإجهاد العضلي'], ['حصة مع مدرب اللياقة', 15000, 60, 'برنامج لياقة فردي'], ['معسكر استشفاء كامل', 30000, 100, 'راحة تامة واستشفاء شامل']]
      .forEach(r => run('INSERT INTO recovery_items(name,cost_usd,energy_restore_pct,description) VALUES(?,?,?,?)', ...r));
    [['كريم الغندور', 'الأهلي', 'هداف صريح', 84, 11, 5, 7.8, 118, 1], ['لوكاس ميندي', 'بيراميدز', 'جناح مراوغ', 81, 9, 8, 7.6, 104, 0], ['سيف رمضان', 'الزمالك', 'صانع ألعاب', 80, 6, 12, 7.5, 99, 0]]
      .forEach(r => run('INSERT INTO rivals(name,club,archetype,ovr,goals,assists,avg_rating,ballon_dor_pts,is_primary_rival) VALUES(?,?,?,?,?,?,?,?,?)', ...r));
  });
}
seedStatic();

// ---------------- players ----------------
const PCOLS = ['name', 'position', 'age', 'ovr', 'club', 'tier', 'tier_label', 'trust', 'trust_label', 'energy', 'morale', 'balance', 'match_wage', 'is_injured', 'injury_days', 'transfer_listed', 'coach_id', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
export const trustLabel = t => t >= 85 ? 'أساسي غير قابل للمساس' : t >= 70 ? 'ركيزة أساسية' : t >= 50 ? 'لاعب تدوير' : 'على الهامش';
export function getPlayer(uid) {
  const p = q1('SELECT * FROM players WHERE user_id=?', uid);
  if (!p) return null;
  const { pace, shooting, passing, dribbling, defending, physical } = p;
  return { ...p, trust: +p.trust, energy: +p.energy, morale: Math.round(p.morale), is_injured: !!p.is_injured, transfer_listed: !!p.transfer_listed, stats: { pace, shooting, passing, dribbling, defending, physical } };
}
export function setPlayer(uid, f) {
  const ks = Object.keys(f).filter(k => PCOLS.includes(k));
  if (ks.length) run(`UPDATE players SET ${ks.map(k => k + '=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE user_id=?`, ...ks.map(k => typeof f[k] === 'boolean' ? +f[k] : f[k]), uid);
  return getPlayer(uid);
}
export function addTx(uid, type, amount, note) {
  run('INSERT INTO transactions(user_id,type,amount,balance_after,note) VALUES(?,?,?,?,?)', uid, type, amount, getPlayer(uid).balance, note);
}
export const season = uid => { const s = q1('SELECT * FROM seasons WHERE user_id=?', uid); if (s) { s.number = s.season_number; s.avg_rating = s.matches ? +(s.rating_sum / s.matches).toFixed(1) : null; } return s; };
export const standings = uid => qa('SELECT * FROM standings WHERE user_id=? ORDER BY pts DESC,(gf-ga) DESC,gf DESC', uid);

// ---------------- per-user career data ----------------
export function makeFixtures(uid, club, from = 1) {
  run('DELETE FROM fixtures WHERE user_id=?', uid);
  if (isFree(club)) return;
  const opp = CLUBS.map(c => c[0]).filter(n => n !== club);
  for (let d = from; d <= 14; d++) {
    const o = opp[(d - 1) % opp.length];
    const derby = (club === 'الأهلي' && o === 'الزمالك') || (club === 'الزمالك' && o === 'الأهلي') ? 'derby' : null;
    run('INSERT INTO fixtures(user_id,day_number,home_name,away_name,slot_time,importance) VALUES(?,?,?,?,?,?)', uid, d, club, o, d % 2 ? '20:30' : '18:00', derby);
  }
}
export function makeStandings(uid) {
  run('DELETE FROM standings WHERE user_id=?', uid);
  CLUBS.forEach(c => run('INSERT INTO standings(user_id,name) VALUES(?,?)', uid, c[0]));
}
export function makeOffers(uid) {
  const p = getPlayer(uid);
  run('UPDATE market_offers SET is_active=0 WHERE user_id=?', uid);
  const cl = qa('SELECT * FROM clubs WHERE name<>? ORDER BY strength', p.club).filter((_, i) => i % 2 === 0 || p.ovr > 72).slice(0, 5);
  const mul = { local: 0.8, mid: 1, continental: 1.3, elite: 1.6 };
  cl.forEach((c, i) => {
    const wage = Math.round(p.ovr * p.ovr * 4.3 * mul[c.tier] / 100) * 100;
    const role = p.ovr >= c.strength - 3 ? 'starter' : p.ovr >= c.strength - 8 ? 'rotation' : 'bench';
    const exp = new Date(Date.now() + (24 + i * 12) * 36e5).toISOString().slice(0, 19).replace('T', ' ');
    run('INSERT INTO market_offers(user_id,club,club_tier,new_tier_label,role,match_wage,signing_bonus,release_clause,expires_at) VALUES(?,?,?,?,?,?,?,?,?)', uid, c.name, c.tier, TIER_LABEL[c.tier], role, wage, wage * 4, wage * 60, exp);
  });
}
export function initCareer(uid) {
  run('INSERT OR REPLACE INTO seasons(user_id) VALUES(?)', uid);
  run('INSERT OR REPLACE INTO agents(user_id,name,last_warning,bio) VALUES(?,?,?,?)', uid, 'الوكيل سمير الجشع', 'أي عرض أقل من قيمتك سأرفضه بنفسي!', 'وكيل لاعبين متمرّس يقتطع نسبته من كل مباراة.');
  run('INSERT OR REPLACE INTO board_objectives(user_id,chairman_name,target_league_rank,target_player_goals,bonus_payout,eval_message) VALUES(?,?,?,?,?,?)', uid, 'رئيس النادي', 3, 10, 60000, 'المجلس ينتظر منك موسماً مميزاً.');
  makeStandings(uid);
  makeOffers(uid);
}
export function resetCareer(uid, name, position) {
  tx(() => {
    for (const t of ['fixtures', 'standings', 'market_offers', 'agents', 'board_objectives', 'seasons', 'career_seasons', 'awards', 'match_logs', 'transactions', 'squad_members'])
      run(`DELETE FROM ${t} WHERE user_id=?`, uid);
    if (!q1('SELECT 1 x FROM players WHERE user_id=?', uid)) run('INSERT INTO players(user_id,name,club,tier,tier_label,trust_label) VALUES(?,?,?,?,?,?)', uid, name, FREE, 'free_agent', 'x', 'x');
    setPlayer(uid, { name, position, age: 18, ovr: 67, club: FREE, tier: 'free_agent', tier_label: 'سوق الانتقالات (لاعب حر)', trust: 80, trust_label: 'موهبة صاعدة حرة تبحث عن عقد', energy: 100, morale: 90, balance: 25000, match_wage: 0, is_injured: 0, injury_days: 0, transfer_listed: 1, coach_id: null });
    initCareer(uid);
    addTx(uid, 'wage', 25000, 'منحة تدشين المسيرة');
  });
}
