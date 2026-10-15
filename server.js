/**
 * Legendary Striker - Express server (port 3005 by default).
 * Sessions in SQLite, bcrypt-only auth, CSRF on every write, same-origin only.
 */
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as D from './database.js';
import { H, Err, dropActive } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3005;
const HOST = process.env.HOST || '0.0.0.0';

// ---- session secret: env var, or generated once and kept in data/.session_secret
const secretFile = path.join(D.DATA_DIR, '.session_secret');
const SECRET = process.env.SESSION_SECRET || (fs.existsSync(secretFile) ? fs.readFileSync(secretFile, 'utf8') : (() => { const s = crypto.randomBytes(48).toString('hex'); fs.writeFileSync(secretFile, s, { mode: 0o600 }); return s; })());

class SqliteStore extends session.Store {
  get(sid, cb) { try { const r = D.q1('SELECT sess FROM sessions WHERE sid=? AND expires>?', sid, Date.now()); cb(null, r ? JSON.parse(r.sess) : null); } catch (e) { cb(e); } }
  set(sid, sess, cb) { try { const exp = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 864e5; D.run('INSERT OR REPLACE INTO sessions(sid,sess,expires) VALUES(?,?,?)', sid, JSON.stringify(sess), exp); cb?.(null); } catch (e) { cb?.(e); } }
  destroy(sid, cb) { try { D.run('DELETE FROM sessions WHERE sid=?', sid); cb?.(null); } catch (e) { cb?.(e); } }
  touch(sid, sess, cb) { this.set(sid, sess, cb); }
}
setInterval(() => { try { D.run('DELETE FROM sessions WHERE expires<?', Date.now()); } catch {} }, 36e5).unref();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], scriptSrcAttr: ["'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ['https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: null,
  } },
  hsts: false, crossOriginOpenerPolicy: false, originAgentCluster: false,
}));
app.use(express.json({ limit: '50kb' }));
app.use(session({
  name: 'ls.sid', secret: SECRET, store: new SqliteStore(), resave: false, saveUninitialized: false,
  cookie: { maxAge: 864e5, httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === '1' },
}));
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), { maxAge: '1h' }));
app.use('/public/assets', express.static(path.join(__dirname, 'public/assets'), { maxAge: '1h' }));

const csrf = req => (req.session.csrfToken ||= crypto.randomBytes(32).toString('hex'));
const safeEq = (a, b) => { a = Buffer.from(String(a || '')); b = Buffer.from(String(b || '')); return a.length === b.length && crypto.timingSafeEqual(a, b); };

// ---- index.html with the session's CSRF token injected into the meta tag
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const sendIndex = (req, res) => { res.set('Cache-Control', 'no-store').type('html').send(INDEX.replace('<meta name="csrf" content="">', `<meta name="csrf" content="${csrf(req)}">`)); };
app.get(['/', '/index.html', '/index.php', '/public', '/public/'], sendIndex);

// ---- auth (needs bcrypt, so it lives here)
const tries = new Map();
const limited = key => { const n = Date.now(), t = (tries.get(key) || []).filter(x => n - x < 9e5); tries.set(key, t); return t.length >= 10; };
const fail = key => tries.set(key, [...(tries.get(key) || []), Date.now()]);
const regen = req => new Promise((ok, no) => { const t = req.session.csrfToken; req.session.regenerate(e => { if (e) return no(e); req.session.csrfToken = t || crypto.randomBytes(32).toString('hex'); ok(); }); });
const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 24);

async function auth(req, res) {
  const b = req.body || {};
  if (b.action === 'logout') { const uid = req.session.userId; if (uid) dropActive(uid); return req.session.destroy(() => res.json({ ok: true, csrf: crypto.randomBytes(32).toString('hex') })); }
  const key = `${req.ip}|${String(b.login || b.username || '').toLowerCase()}`;
  if (limited(key)) throw new Err('محاولات كثيرة — حاول بعد 15 دقيقة', 429);
  if (b.action === 'login') {
    const u = D.q1('SELECT * FROM users WHERE username=? OR email=?', String(b.login || ''), String(b.login || '').toLowerCase());
    const ok = u && await bcrypt.compare(String(b.password || ''), u.password);
    if (!ok) { fail(key); throw new Err('بيانات الدخول غير صحيحة', 401); }
    await regen(req); req.session.userId = u.id;
    return res.json({ ok: true, logged_in: true, csrf: csrf(req) });
  }
  if (b.action === 'register') {
    const username = String(b.username || '').trim(), email = String(b.email || `${username}@game.local`).trim().toLowerCase(), pw = String(b.password || '');
    if (!/^[\p{L}\p{N}_]{3,20}$/u.test(username)) throw new Err('اسم المستخدم 3-20 حرفاً (حروف وأرقام وشرطة سفلية فقط)', 422);
    if (pw.length < 6 || pw.length > 72) throw new Err('كلمة المرور 6 أحرف على الأقل', 422);
    if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 80) throw new Err('بريد إلكتروني غير صالح', 422);
    if (D.q1('SELECT 1 x FROM users WHERE username=? OR email=?', username, email)) throw new Err('اسم المستخدم أو البريد مستخدم بالفعل', 409);
    const uid = Number(D.run('INSERT INTO users(username,email,password) VALUES(?,?,?)', username, email, await bcrypt.hash(pw, 10)).lastInsertRowid);
    D.resetCareer(uid, cleanName(b.player_name) || username, ['GK', 'DEF', 'MID', 'FWD'].includes(b.position) ? b.position : 'MID');
    await regen(req); req.session.userId = uid;
    return res.json({ ok: true, registered: true, redirect_tab: 'market', is_free_agent: true, csrf: csrf(req) });
  }
  throw new Err('إجراء غير معروف');
}

// ---- API router: /api/<name> and /api/<name>.php (also under /public)
app.all(/^\/(?:public\/)?api\/([a-z_]+)(?:\.php)?$/, async (req, res) => {
  const name = req.params[0];
  try {
    if (!['GET', 'POST', 'HEAD'].includes(req.method)) throw new Err('طريقة غير مدعومة', 405);
    if (req.method === 'POST' && !safeEq(req.get('x-csrf-token') || req.body?.csrf, req.session.csrfToken)) throw new Err('رمز الحماية غير صالح — أعد تحميل الصفحة', 403);
    if (name === 'auth') return await auth(req, res);
    const uid = req.session.userId;
    const user = uid && D.q1('SELECT username FROM users WHERE id=?', uid);
    if (!user) return res.status(401).json({ ok: false, error: 'الرجاء تسجيل الدخول أولاً', csrf: csrf(req) });
    if (!Object.hasOwn(H, name)) throw new Err('مسار غير موجود', 404);
    res.set('Cache-Control', 'no-store').json(H[name](uid, req.method === 'POST' ? req.body || {} : {}, { username: user.username, csrf: csrf(req) }));
  } catch (e) {
    if (!(e instanceof Err)) console.error(`[api/${name}]`, e);
    res.status(e.status || 500).json({ ok: false, error: e instanceof Err ? e.message : 'خطأ داخلي في الخادم' });
  }
});
app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'مسار غير موجود' }));
app.use((req, res) => (req.method === 'GET' ? sendIndex(req, res) : res.status(404).end()));

app.listen(PORT, HOST, () => console.log(`⚽ Legendary Striker running on http://${HOST}:${PORT}`));
