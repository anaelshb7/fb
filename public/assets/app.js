'use strict';
/* المهاجم الأسطوري — واجهة العميل (Vanilla JS, ES6+) */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const money = n => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = {
  comp: { league: 'الدوري', champions_league: 'دوري أبطال القارة', national_cup: 'كأس مصر', international: 'مباراة دولية' },
  stage: { league: '', group: 'دور المجموعات', qf: 'ربع النهائي', sf: 'نصف النهائي', final: 'النهائي', intl: 'تصفيات' },
  pos: { GK: 'حارس مرمى', DEF: 'مدافع', MID: 'وسط', FWD: 'مهاجم' },
  stat: { pace: 'السرعة', shooting: 'التسديد', passing: 'التمرير', dribbling: 'المراوغة', defending: 'الدفاع', physical: 'القوة البدنية' },
};

const hue = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const crest = name => `<div class="crest" style="--h:${hue(name)}"><span>${esc([...String(name).replace('منتخب ', '').replace(/^ال/, '').trim()].slice(0, 2).join(''))}</span></div>`;
/** صورة لاعب كرتونية / سيبرانية احترافية مطابقة تماماً لبطاقة CAM في الصورة المرفقة */
const avatarSvg = (name, club, isHero = false) => {
  const isMe = isHero || name.includes('فارس') || name.includes('العمري') || name.includes('striker');
  if (isMe) {
    // الأفاتار السيبراني الأسطوري لصانع الألعاب CAM: شعر مسرّح مرفوع، لحية خفيفة مهذبة، أعين حادة، تيشيرت نيون رقم 10 وصواعق كهربائية
    return `<svg viewBox="0 0 140 160" class="hero-cyber-avatar-svg" aria-hidden="true">
      <defs>
        <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <linearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80"/>
          <stop offset="100%" stop-color="#16a34a"/>
        </linearGradient>
        <radialGradient id="cyberAura" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="rgba(56,189,248,0.45)"/>
          <stop offset="70%" stop-color="rgba(34,197,94,0.15)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <!-- هالة الطاقة والصواعق الخلفية -->
      <circle cx="70" cy="70" r="65" fill="url(#cyberAura)"/>
      <path d="M22 68 L36 50 L30 46 L46 28 M118 72 L104 54 L110 50 L96 32" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.85"/>
      <path d="M28 88 L38 80 L34 76 L48 64 M112 92 L102 82 L106 78 L94 66" stroke="#4ade80" stroke-width="1.8" fill="none" opacity="0.8"/>
      
      <!-- تيشيرت النادي السيبراني #10 أزرق داكن مع خطوط نيون خضراء -->
      <path d="M12 160 C16 114 42 102 58 100 h24 c16 2 42 14 46 60 z" fill="#0b1728" stroke="#1e293b" stroke-width="2"/>
      <path d="M42 104 L70 128 L98 104" fill="none" stroke="url(#neonGreen)" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M48 100 L70 120 L92 100" fill="none" stroke="url(#neonCyan)" stroke-width="2.5"/>
      <!-- خطوط الطاقة والأكتاف -->
      <path d="M24 160 c4-26 12-42 24-48 M116 160 c-4-26-12-42-24-48" stroke="url(#neonGreen)" stroke-width="3" fill="none"/>
      <path d="M34 160 c3-18 8-28 16-32 M106 160 c-3-18-8-28-16-32" stroke="url(#neonCyan)" stroke-width="2" fill="none" opacity="0.75"/>
      
      <!-- رقم 10 البارز على التيشيرت -->
      <text x="60" y="146" text-anchor="middle" font-family="'Cairo', sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="-1">10</text>
      <!-- شعار النادي على الصدر -->
      <polygon points="88,132 94,136 94,144 88,148 82,144 82,136" fill="#0369a1" stroke="#4ade80" stroke-width="1.5"/>

      <!-- الرقبة والوجه الرياضي المنحوت -->
      <path d="M57 82 h26 v22 c0 4-4 8-13 8 s-13-4-13-8 z" fill="#cf9b74" stroke="#1e293b" stroke-width="2"/>
      <!-- الأذنان -->
      <circle cx="39" cy="68" r="6" fill="#cf9b74"/>
      <circle cx="101" cy="68" r="6" fill="#cf9b74"/>

      <!-- منحنى الرأس والفك القوي الرياضي -->
      <path d="M42 58 C42 40 54 30 70 30 s28 10 28 28 c0 20-10 36-28 36 S42 78 42 58 z" fill="#dfa882" stroke="#1e293b" stroke-width="2"/>

      <!-- اللحية المهذبة الخفيفة المحددة بدقة (Stubble / Trimmed Beard) -->
      <path d="M44 64 C45 84 56 94 70 94 s25-10 26-30 c-4 12-14 18-26 18 S48 76 44 64 z" fill="#1f1610" opacity="0.88"/>
      <!-- شوارب أنيقة مهذبة -->
      <path d="M58 77 Q70 74 82 77 Q70 79 58 77 Z" fill="#1f1610" opacity="0.85"/>

      <!-- العينان الثاقبتان والحواجب المحددة -->
      <path d="M50 56 q8-5 15-1 M75 55 q8-4 15 1" stroke="#1f1610" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="58" cy="63" rx="4.5" ry="3" fill="#ffffff"/>
      <ellipse cx="82" cy="63" rx="4.5" ry="3" fill="#ffffff"/>
      <circle cx="58.5" cy="63" r="2.2" fill="#0d9488"/>
      <circle cx="82.5" cy="63" r="2.2" fill="#0d9488"/>
      <circle cx="59.2" cy="62.2" r="0.8" fill="#ffffff"/>
      <circle cx="83.2" cy="62.2" r="0.8" fill="#ffffff"/>

      <!-- الأنف والفم الجاد الواثق -->
      <path d="M70 63 v10 q-3 2-5 0" stroke="#b47854" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M62 82 q8 2 16 0" stroke="#8b4a2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>

      <!-- الشعر العصري المرفوع مع التدريج الجانبي (Fade & Textured Pompadour/Quiff) -->
      <path d="M40 54 C38 24 58 12 73 14 c14 2 27 10 27 34 c-4-14-12-22-29-22 c-14 0-27 8-31 28 z" fill="#1f1610" stroke="#0f0c08" stroke-width="2" stroke-linejoin="round"/>
      <path d="M48 26 C56 16 74 16 84 22 C78 20 64 20 54 28 z" fill="#3b271d"/>
    </svg>`;
  }

  const h = hue(name), skin = ['#e0b48c', '#c68e63', '#f0c9a2', '#8d5a3b'][h % 4], hair = ['#2b1d12', '#0f0f10', '#5a3b22', '#8a6a3b'][(h >> 2) % 4];
  const beard = h % 3 === 0, style = h % 3, sh = hue(club), shirt = `hsl(${sh} 70% 38%)`, shirt2 = `hsl(${sh} 85% 62%)`, ln = '#0a1424';
  const hairPath = [
    'M32 52C30 26 50 16 62 16s32 10 28 36c-4-12-12-18-28-18s-26 6-30 18z',
    'M31 54C26 22 52 8 66 14s26 14 23 40c-3-14-10-24-27-24-14 0-27 8-31 24z',
    'M32 50C34 28 48 20 62 20s28 8 28 30c-6-8-14-14-28-14s-24 6-30 14z'
  ][style];
  return `<svg viewBox="0 0 120 140" aria-hidden="true">
    <path d="M6 140C8 106 34 98 48 96h24c14 2 40 10 42 44z" fill="${shirt}" stroke="${ln}" stroke-width="2.5"/>
    <path d="M40 98l20 20 20-20" fill="none" stroke="${shirt2}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M22 140c2-18 6-30 14-36M98 140c-2-18-6-30-14-36" stroke="${shirt2}" stroke-width="3" opacity=".7" fill="none"/>
    <rect x="49" y="78" width="22" height="24" rx="8" fill="${skin}" stroke="${ln}" stroke-width="2.5"/>
    <ellipse cx="33" cy="62" rx="5" ry="8" fill="${skin}" stroke="${ln}" stroke-width="2"/><ellipse cx="87" cy="62" rx="5" ry="8" fill="${skin}" stroke="${ln}" stroke-width="2"/>
    <ellipse cx="60" cy="58" rx="27" ry="31" fill="${skin}" stroke="${ln}" stroke-width="2.5"/>
    <path d="${hairPath}" fill="${hair}" stroke="${ln}" stroke-width="2.5" stroke-linejoin="round"/>
    ${beard ? `<path d="M34 64c2 22 14 30 26 30s24-8 26-30c-4 10-12 14-26 14S38 74 34 64z" fill="${hair}" opacity=".92"/>` : ''}
    <path d="M44 55q6-4 12-1M64 54q6-3 12 1" stroke="${ln}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="61" r="3.2" fill="#fff"/><circle cx="70" cy="61" r="3.2" fill="#fff"/><circle cx="50.6" cy="61.4" r="1.8" fill="#16324f"/><circle cx="70.6" cy="61.4" r="1.8" fill="#16324f"/>
    <path d="M60 62v9q-3 2-5 0" stroke="${ln}" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M52 78q8 5 16 0" stroke="${ln}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`;
};
const POS_CODE = { GK: 'GK', DEF: 'CB', MID: 'CAM', FWD: 'ST' };
const SPARKS = `<svg class="fc-spark" viewBox="0 0 300 380" aria-hidden="true" preserveAspectRatio="none">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 250l22-20-14-14 26-26-12-10 24-24" stroke="#38bdf8" stroke-width="2.4"/><path d="M282 210l-26-18 14-14-28-22 14-8-22-26" stroke="#38bdf8" stroke-width="2.4"/>
    <path d="M18 250l22-20-14-14 26-26-12-10 24-24M282 210l-26-18 14-14-28-22 14-8-22-26" stroke="#e0f2fe" stroke-width="1" opacity=".9"/></g>
  <g fill="#2dff8f"><circle cx="40" cy="170" r="2.2"/><circle cx="262" cy="150" r="2.6"/><circle cx="54" cy="120" r="1.8"/><circle cx="248" cy="110" r="2"/><circle cx="30" cy="205" r="1.6"/><circle cx="272" cy="190" r="1.8"/></g></svg>`;
const rarity = ovr => ovr >= 85 ? 'gold' : ovr >= 75 ? 'blue' : 'green';
const cardHtml = p => `
  <div class="fcard r-${rarity(p.ovr)}" data-tilt>
    <i class="fc-c tl"></i><i class="fc-c tr"></i>
    <div class="hero-lightning-aura" aria-hidden="true"></div>
    ${p.ovr >= 80 ? SPARKS : ''}
    <div class="fc-top">
      <div class="fc-ovr">${p.ovr}<small>التقييم</small></div>
      <div class="fc-pos cyber-pos"><span>${POS_CODE[p.position]}</span><b>${L.pos[p.position]}</b></div>
    </div>
    <div class="fc-avatar hero-avatar">
      <div class="hero-img-box">
        <img src="assets/img/card-cam.webp" alt="${esc(p.name)}" class="hero-avatar-art" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
        <div class="hero-svg-fallback" style="display:none;">${avatarSvg(p.name, p.club, true)}</div>
        <div class="hero-bonus-chip">+5% ✨</div>
      </div>
    </div>
    <div class="fc-name">${esc(p.name)}</div>
    <div class="fc-club">${esc(p.club)} · ${p.age} سنة</div>
    <div class="fc-stats">${Object.entries(p.stats).map(([k, v]) => `<div class="${v >= 85 ? 'hi' : ''}"><span>${L.stat[k]}</span><i style="--w:${v}%"></i><b>${v}</b></div>`).join('')}</div>
    <div class="fc-foot"><span class="ribbon">${esc(p.tier_label)} ✦</span><span>${esc(p.trust_label)}</span></div>
  </div>`;

/** إمالة ثلاثية الأبعاد للبطاقة عند المرور عليها (تفاعل المستخدم فقط) */
document.addEventListener('pointermove', e => {
  const c = e.target.closest && e.target.closest('[data-tilt]'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  c.style.setProperty('--ry', (x * 10).toFixed(1) + 'deg'); c.style.setProperty('--rx', (-y * 8).toFixed(1) + 'deg');
  c.style.setProperty('--gx', (x + 0.5) * 100 + '%'); c.style.setProperty('--gy', (y + 0.5) * 100 + '%');
});
document.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('[data-tilt]'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });

function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = ''), 3200);
}

/** طبقة الاتصال: JSON + رمز CSRF في الجسم والترويسة */
class Api {
  static _csrf = null;
  static get csrf() {
    return this._csrf || $('meta[name="csrf"]')?.content || 'token_ls_striker_2026';
  }
  static set csrf(val) {
    if (val) {
      this._csrf = val;
      const meta = $('meta[name="csrf"]');
      if (meta) meta.content = val;
    }
  }
  static async call(path, payload = null) {
    const csrfToken = Api.csrf;
    const opt = payload === null
      ? { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } }
      : {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ ...payload, csrf: csrfToken }),
        };
    let res, data;
    // Determine path whether accessed from root / or /public/
    const isPublicSubdir = window.location.pathname.startsWith('/public');
    const apiBase = isPublicSubdir ? '/public/api/' : '/api/';
    const cleanPath = path.replace(/^(\/)?(public\/)?(api\/)?/, '');
    const url = apiBase + cleanPath;

    try {
      res = await fetch(url, opt);
    } catch {
      // Fallback try relative 'api/' if absolute failed
      try { res = await fetch('api/' + cleanPath, opt); }
      catch { throw Object.assign(new Error('تعذر الاتصال بالخادم'), { status: 0 }); }
    }

    // إذا أعاد السيرفر 405 (Method Not Allowed)، نجرب الطريقة البديلة تلقائياً (GET <-> POST)
    if (res && res.status === 405) {
      try {
        const altOpt = opt.method === 'GET'
          ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ csrf: csrfToken }) }
          : { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } };
        const retryRes = await fetch(url, altOpt);
        if (retryRes.ok) {
          res = retryRes;
        }
      } catch { /* متابعة المعالجة العادية */ }
    }

    try {
      data = await res.json();
    } catch {
      // If server returned non-JSON, retry relative endpoint before throwing
      try {
        const altUrl = url.startsWith('/public') ? '/api/' + cleanPath : '/public/api/' + cleanPath;
        const altRes = await fetch(altUrl, opt);
        data = await altRes.json();
        res = altRes;
      } catch {
        data = { ok: false, error: 'استجابة غير صالحة من الخادم' };
      }
    }
    if (!res.ok || data.ok === false) throw Object.assign(new Error(data.error || 'خطأ غير معروف'), { status: res.status, data });
    return data;
  }
}

/** مؤثرات صوتية عبر WebAudio (بدون ملفات خارجية) */
class Sound {
  static ctx = null;
  static ensure() {
    if (!Sound.ctx) { try { Sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (Sound.ctx.state === 'suspended') Sound.ctx.resume();
    return Sound.ctx;
  }
  static tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slideTo = null) {
    const c = Sound.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  static heartbeat() { Sound.tone(70, 0.14, 'sine', 0.35); Sound.tone(60, 0.16, 'sine', 0.3, 0.17); }
  static whistle() { Sound.tone(2600, 0.55, 'square', 0.09); Sound.tone(2300, 0.45, 'square', 0.07, 0.15); }
  static subWhistle() { Sound.tone(2800, 0.15, 'square', 0.12); Sound.tone(3200, 0.25, 'square', 0.14, 0.17); }
  static good() { Sound.tone(660, 0.12, 'triangle', 0.18); Sound.tone(990, 0.22, 'triangle', 0.18, 0.12); }
  static bad() { Sound.tone(220, 0.35, 'sawtooth', 0.12, 0, 110); }
}

/** تحديث لوحة الحالة (HUD) بسلاسة دون إعادة تحميل */
class Hud {
  static update(p) {
    $('#hud-name').textContent = p.name; $('#hud-club').textContent = p.club + ' · ' + L.pos[p.position];
    const hudAv = $('#hud-av');
    if (hudAv) {
      hudAv.innerHTML = `<img src="assets/img/card-cam.webp" alt="Avatar" class="hud-av-img" onerror="this.parentElement.textContent='⚽';">`;
    }
    $('#hud-balance').textContent = money(p.balance);
    $('#hud-balance').style.color = p.balance < 0 ? 'var(--red)' : 'var(--gold)';
    $('#hud-trust-v').textContent = p.trust.toFixed(0) + '%';
    $('#hud-trust-l').textContent = '· ' + p.trust_label;
    $('#hud-energy-v').textContent = p.energy.toFixed(0) + '%';
    $('#hud-morale-v').textContent = p.morale + '%';
    $('#mh-trust').textContent = p.trust.toFixed(0) + '%'; $('#mh-energy').textContent = p.energy.toFixed(0) + '%';
    $('#mh-trust-bar').style.width = p.trust + '%'; $('#mh-energy-bar').style.width = p.energy + '%';
    $('#bar-trust').style.width = p.trust + '%';
    $('#bar-energy').style.width = p.energy + '%';
    $('#bar-morale').style.width = p.morale + '%';

    // وميض الشاشة باللون الأحمر عند انخفاض الطاقة لمستوى يهدد بحدوث إصابة (35% أو أقل)
    const isDanger = Number(p.energy) <= 35;
    const vig = $('#danger-vignette');
    const barEnergy = $('#bar-energy');
    const mhBarEnergy = $('#mh-energy-bar');
    if (barEnergy) barEnergy.classList.toggle('danger', isDanger);
    if (mhBarEnergy) mhBarEnergy.classList.toggle('danger', isDanger);

    if (vig) {
      if (isDanger) {
        if (vig.classList.contains('hidden')) {
          vig.classList.remove('hidden');
          vig.classList.add('active');
          Sound.heartbeat();
          toast('⚠️ تحذير طبي عاجل: طاقة اللاعب منخفضة جداً! خطر وشيك لحدوث إصابة عضلية.', true);
        }
      } else {
        vig.classList.add('hidden');
        vig.classList.remove('active');
      }
    }

    Hud.player = p;
  }
}

/** شاشة اللحظة الحاسمة: عدّاد دائري SVG بـ requestAnimationFrame، نبض قلب، وإرسال فوري مع تجميد الواجهة */
class ClutchOverlayController {
  static C = 2 * Math.PI * 52;
  constructor(pitch) {
    this.pitch = pitch;
    this.root = $('#clutch'); this.arc = $('#ring-arc'); this.txt = $('#ring-text'); this.ring = $('.ring', this.root);
    this.opts = $('#clutch-options'); this.res = $('#clutch-result');
    this.arc.style.strokeDasharray = ClutchOverlayController.C;
    this._key = e => { const b = $$('.opt', this.opts)[Number(e.key) - 1]; if (b && !this.locked) b.click(); };
  }

  run(c) {
    return new Promise(resolve => {
      this.c = c; this.locked = false; this.raf = 0; this.lastBeat = 0; this.resolve = resolve;
      $('#clutch-min').textContent = `الدقيقة ${c.minute}'`;
      $('#clutch-title').textContent = '⚡ قرار اللحظة: ' + c.description;
      this.res.className = 'result hidden'; this.ring.classList.remove('danger');
      this.opts.innerHTML = '';
      c.options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt'; b.dataset.key = o.key;

        let pillsHtml = '';
        if (o.pills && Array.isArray(o.pills) && o.pills.length) {
          pillsHtml = o.pills.map(p => {
            const pClass = p.type === 'chance'
              ? 'chance-pill'
              : (p.type === 'energy'
                  ? `energy-pill ${p.delta >= 0 ? 'pos' : 'neg'}`
                  : (p.type === 'trust'
                      ? `trust-pill ${p.delta >= 0 ? 'pos' : 'neg'}`
                      : `morale-pill ${p.delta >= 0 ? 'pos' : 'neg'}`));
            return `
              <div class="metric-pill ${pClass}">
                <span class="m-ico">${p.icon}</span>
                <span class="m-val">${esc(p.label)}</span>
              </div>
            `;
          }).join('');
        } else {
          // بديل احتياطي متوافق
          const chanceStr = o.chance_text || (o.key?.includes('shot') ? '75% فرصة هدف بنسبه' : (o.key === 'pass_back' ? '95% نسبة الحفاظ على الكرة' : '50% فرصة هدف بنسبه'));
          const energyStr = o.energy_text || (o.key === 'pass_back' ? '+5% طاقة' : '-15% طاقة');
          const trustStr = o.trust_text || (o.key === 'pass_back' ? '-10% ثقة المدرب' : '+5% ثقة المدرب');
          pillsHtml = `
            ${o.key !== 'pass_back' ? `<div class="metric-pill chance-pill"><span class="m-ico">🎯</span><span class="m-val">${esc(chanceStr)}</span></div>` : ''}
            <div class="metric-pill energy-pill ${energyStr.includes('+') ? 'pos' : 'neg'}"><span class="m-ico">⚡</span><span class="m-val">${esc(energyStr)}</span></div>
            <div class="metric-pill trust-pill ${trustStr.includes('+') ? 'pos' : 'neg'}"><span class="m-ico">👔</span><span class="m-val">${esc(trustStr)}</span></div>
          `;
        }

        b.innerHTML = `
          <div class="opt-head">
            <span class="n">${o.index}</span>
            <b class="opt-label">${esc(o.label)}</b>
          </div>
          <div class="opt-metrics">
            ${pillsHtml}
          </div>
        `;
        ['mouseenter', 'focus'].forEach(ev => b.addEventListener(ev, () => this.pitch.focus(o.key)));
        ['mouseleave', 'blur'].forEach(ev => b.addEventListener(ev, () => this.pitch.focus(null)));
        b.addEventListener('click', () => this.submit(o.key, b), { once: true });
        this.opts.appendChild(b);
      });
      window.scrollTo({ top: 0 });
      const matchTab = $('#tab-match');
      if (matchTab) matchTab.scrollTop = 0;
      this.root.classList.remove('urgent');
      this.root.classList.remove('hidden');
      document.addEventListener('keydown', this._key);
      Sound.ensure();
      // مهلة اتخاذ القرار 20 ثانية كاملة كما هو مطلوب
      this.limit = 20000;
      this.endAt = performance.now() + 20000;
      this.txt.textContent = '20.0';
      this.arc.style.strokeDashoffset = '0';
      const tick = now => {
        if (this.locked) return;
        const left = this.endAt - now;
        if (left <= 0) { this.arc.style.strokeDashoffset = ClutchOverlayController.C; this.txt.textContent = '0.0'; return this.timeout(); }
        this.arc.style.strokeDashoffset = String(ClutchOverlayController.C * (1 - left / this.limit));
        this.txt.textContent = (left / 1000).toFixed(1);
        if (left < 5000) {
          this.ring.classList.add('danger'); this.root.classList.add('urgent');
          if (now - this.lastBeat > 600) { this.lastBeat = now; Sound.heartbeat(); }
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  freeze() { this.locked = true; cancelAnimationFrame(this.raf); $$('.opt', this.opts).forEach(b => (b.disabled = true)); }

  async submit(choice, btn) {
    if (this.locked) return;
    this.freeze(); btn?.classList.add('picked');
    const clientTs = performance.timeOrigin + performance.now();   // للتدقيق فقط، الحكم للخادم
    await this.send(choice, clientTs);
  }

  async timeout() {
    if (this.locked) return;
    this.freeze(); Sound.whistle();
    this.show('⏱ انتهت مهلة الـ 20 ثانية!', false);
    await this.send('__timeout__', performance.timeOrigin + performance.now());
  }

  show(text, ok) { this.res.textContent = text; this.res.className = 'result ' + (ok ? 'ok' : 'bad'); }

  async send(choice, ts) {
    let out;
    try {
      out = await Api.call('match_action.php', { clutch_id: this.c.id, choice, client_ts: ts });
      this.pitch.resolve(choice, out.success, out.goal);
      this.show(out.text, out.success);
      out.success ? Sound.good() : (out.timed_out ? null : Sound.bad());
      await sleep(1700);
    } catch (e) {
      out = { error: e.message }; toast(e.message, true); await sleep(600);
    }
    document.removeEventListener('keydown', this._key);
    this.root.classList.add('hidden');
    this.resolve(out);
  }
}

/** إدارة المباراة: ممتدة لـ 15 دقيقة فعلية (حلقة tick → أحداث → فرص حاسمة متكررة → tick) */
class MatchController {
  constructor(app) {
    this.app = app;
    this.pitch = new Pitch($('#pitch'));
    this.overlay = new ClutchOverlayController(this.pitch);
    this.running = false;
    this.speed = 1;
    this.paused = false;
    this.elapsedSec = 0;
    this.timerInterval = null;

    this.currentFixtureId = null;
    this.currentMinute = 0;
    this.homeBench = [];
    this.awayBench = [];
    this.homeCoach = null;
    this.awayCoach = null;
    this.lineups = null;
    this.selectedSubOut = null;
    this.selectedSubIn = null;
    this.subBoardTimer = null;

    this.bindControls();
    this.initDugoutEvents();
    // عرض البدلاء فوراً على دكة البدلاء لكلا الفريقين حتى تظهر المقاعد ممتلئة باللاعبين دائماً
    this.updateBenchesAndCoaches();
  }

  bindControls() {
    const bindBtn = (id, spd) => {
      const b = $('#' + id);
      if (b) {
        b.addEventListener('click', () => {
          this.speed = spd;
          $$('.speed-btn').forEach(btn => btn.classList.remove('active'));
          b.classList.add('active');
          toast(`⚡ تم ضبط سرعة المباراة على ${spd}x`);
        });
      }
    };
    bindBtn('spd-1x', 1);
    bindBtn('spd-2x', 2);
    bindBtn('spd-5x', 5);
    bindBtn('spd-10x', 10);

    const pauseBtn = $('#btn-pause-match');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.textContent = this.paused ? '▶ استئناف' : '⏸ إيقاف';
        pauseBtn.classList.toggle('active', this.paused);
        toast(this.paused ? '⏸ تم إيقاف المباراة مؤقتاً' : '▶ تم استئناف اللقاء');
      });
    }

    // زر ملء الشاشة لمباراة غامرة بكامل الشاشة مع اختصار F
    const fsBtn = $('#btn-fullscreen-match');
    if (fsBtn) {
      const toggleFs = async () => {
        const target = $('#tab-match');
        const isCurrentlyFs = !!(document.fullscreenElement || document.webkitFullscreenElement || target.classList.contains('is-fullscreen'));
        if (!isCurrentlyFs) {
          try {
            if (target.requestFullscreen) await target.requestFullscreen();
            else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
            else target.classList.add('is-fullscreen');
            toast('⛶ تم تفعيل وضع ملء الشاشة — الفرص والقرارات الحاسمة ستظهر هنا في المقدمة!');
          } catch {
            target.classList.add('is-fullscreen');
            toast('⛶ تم تفعيل العرض المكبر للمباراة');
          }
        } else {
          try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
              if (document.exitFullscreen) await document.exitFullscreen();
              else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
            }
          } catch {}
          target.classList.remove('is-fullscreen');
          toast('🗗 تم إنهاء وضع ملء الشاشة');
        }
      };

      fsBtn.addEventListener('click', toggleFs);

      document.addEventListener('keydown', e => {
        if ((e.key === 'f' || e.key === 'F') && !$('#tab-match').classList.contains('hidden')) {
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            toggleFs();
          }
        }
      });

      const onFsChange = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || $('#tab-match')?.classList.contains('is-fullscreen'));
        fsBtn.innerHTML = isFs ? '🗗 خروج من ملء الشاشة' : '⛶ وضع ملء الشاشة';
        fsBtn.classList.toggle('active', isFs);
        const matchTab = $('#tab-match');
        if (matchTab) matchTab.classList.toggle('is-fullscreen', isFs);
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
    }
  }

  async start(decision = '') {
    const r = await Api.call('match_start.php', { decision });
    if (r.needs_decision) {
      const d = await this.app.askDilemma(r.dilemma.message);
      return this.start(d);
    }
    if (r.skipped) { toast(r.message); return this.app.refresh(); }
    this.currentFixtureId = r.fixture.id;
    if (r.lineups) this.pitch.setLineups(r.lineups);
    this.updateBenchesAndCoaches(r);
    this.begin(r.fixture);
    if (r.role === 'sub') this.feed(0, 'sub', `المدرب يبقيك على الدكة حتى الدقيقة ${r.sub_minute}`);
    return this.loop(r.fixture.id);
  }

  resume(f) {
    if (f.lineups) this.pitch.setLineups(f.lineups);
    this.updateBenchesAndCoaches(f);
    this.begin(f);
    return this.loop(f.id);
  }

  begin(f) {
    this.currentFixtureId = f.id;
    this.currentFixture = f;
    this.currentMinute = f.minute || 0;
    this.homeTeamName = f.home;
    this.awayTeamName = f.away;
    this.app.tab('match');
    $('#feed').innerHTML = '';
    const importanceTag = f.importance === 'derby' ? 'ديربي قوي ومرتقب!' : f.stage === 'final' ? 'المباراة النهائية الكبرى 🏆!' : 'مباراة قوية وحاسمة!';
    $('#ticker-text').textContent = `استعداد لانطلاق المباراة بين ${f.home} و ${f.away}… ${importanceTag}`;
    this.setScore(f);
    $('#match-actions').innerHTML = '<span class="muted">المباراة جارية — ركّز في التمركز والفرص الحاسمة…</span>';

    // تحديث أسماء الدكة
    const hTeamBadge = $('#home-team-name-badge');
    if (hTeamBadge) hTeamBadge.textContent = `دكة ${f.home}`;
    const hBenchTitle = $('#home-bench-title');
    if (hBenchTitle) hBenchTitle.textContent = `🪑 بدلاء ${f.home}`;

    const aTeamBadge = $('#away-team-name-badge');
    if (aTeamBadge) aTeamBadge.textContent = `دكة ${f.away}`;
    const aBenchTitle = $('#away-bench-title');
    if (aBenchTitle) aBenchTitle.textContent = `🪑 بدلاء ${f.away}`;
    
    // تأكيد ملء البدلاء على الدكة فوراً حتى تظهر للمستخدم
    this.updateBenchesAndCoaches(f);

    // ضبط العداد الزمني الفعلي لـ 15 دقيقة (900 ثانية) متزامن مع دقيقة المباراة الحالية
    this.elapsedSec = Math.min(900, Math.round(((f.minute || 0) / 90) * 900));
    this.paused = false;
    clearInterval(this.timerInterval);
    const elTimer = $('#match-elapsed');
    const updateTimerDisplay = () => {
      const mm = String(Math.floor(this.elapsedSec / 60)).padStart(2, '0');
      const ss = String(Math.floor(this.elapsedSec % 60)).padStart(2, '0');
      if (elTimer) elTimer.textContent = `${mm}:${ss}`;
    };
    updateTimerDisplay();
    
    this.timerInterval = setInterval(() => {
      if (!this.running || this.paused || !this.overlay.root.classList.contains('hidden')) return;
      this.elapsedSec = Math.min(900, this.elapsedSec + 1 * this.speed);
      updateTimerDisplay();
    }, 1000);
  }

  setScore(f) {
    this.currentMinute = f.minute || 0;
    this.homeTeamName = f.home;
    this.awayTeamName = f.away;
    $('#sb-home').textContent = f.home; $('#sb-away').textContent = f.away;
    $('#sb-score').textContent = `${f.home_score} - ${f.away_score}`; $('#sb-minute').textContent = f.minute + "'";
    $('#sb-meta').textContent = `${L.comp[f.competition] || ''} ${L.stage[f.stage] ? '· ' + L.stage[f.stage] : ''}`;
    $('#mh-venue').textContent = '🏟 ستاد ' + f.home;
    $('#sb-prog').style.width = Math.min(100, f.minute / 90 * 100) + '%';
    
    // مزامنة توقيت الـ 15 دقيقة (كل دقيقة كروية = 10 ثوانٍ حقيقية)
    if (this.running) {
      const targetSec = Math.min(900, Math.round(((f.minute || 0) / 90) * 900));
      if (Math.abs(this.elapsedSec - targetSec) > 4) {
        this.elapsedSec = targetSec;
        const elTimer = $('#match-elapsed');
        if (elTimer) {
          const mm = String(Math.floor(this.elapsedSec / 60)).padStart(2, '0');
          const ss = String(Math.floor(this.elapsedSec % 60)).padStart(2, '0');
          elTimer.textContent = `${mm}:${ss}`;
        }
      }
    }

    if (!this.overlay.root.classList.contains('hidden')) return;   // لا نحرّك اللاعبين أثناء اللحظة الحاسمة
    this.pitch.setMinute(f.minute);
  }

  feed(min, type, text) {
    const box = $('#feed'), d = document.createElement('div');
    d.className = type; d.innerHTML = `<span class="t">${min}'</span>${esc(text)}`;
    $('#ticker-text').textContent = text;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }

  async playEvents(events) {
    for (const e of events) {
      while (this.paused && this.running) await sleep(200);
      this.feed(e.minute, e.type, e.text);
      if (e.type === 'goal') {
        this.pitch.goal('home', e.scorer || '');
        Sound.good();
      } else if (e.type === 'opp_goal') {
        this.pitch.goal('away', e.scorer || '');
        Sound.bad();
      } else if (e.type === 'save') {
        Sound.good();
      } else if (e.type === 'sub' || e.sub_board) {
        Sound.subWhistle();
        if (e.sub_board) {
          this.showElectronicSubBoard(e.sub_board, e.minute);
          this.pitch.substitutePlayer(e.team || 'away', e.sub_board.out?.id, e.sub_board.in);
        }
      }
      $('#sb-minute').textContent = e.minute + "'";
      const pace = (e.type === 'chatter' ? 260 : 500) / this.speed;
      await sleep(pace);
    }
  }

  async loop(id) {
    this.currentFixtureId = id;
    this.running = true;
    while (this.running) {
      while (this.paused && this.running) await sleep(200);
      let r;
      try { r = await Api.call('match_tick.php', { fixture_id: id }); }
      catch (e) { toast(e.message, true); break; }
      
      await this.playEvents(r.events);
      this.setScore(r.fixture);
      Hud.update(r.hud);
      this.updateBenchesAndCoaches(r);

      if (r.finished) {
        clearInterval(this.timerInterval);
        await this.finish(r);
        break;
      }

      if (r.clutch) {
        // انيميشن تفاعلي: الكرة تُمرر للمستخدم أولاً بحسب منطقة الفرصة
        await this.pitch.deliverBallToUser(r.clutch);
        this.pitch.showClutch(r.clutch.options);
        const res = await this.overlay.run(r.clutch);
        if (res && !res.error) {
          const evType = res.goal ? 'goal' : (res.success ? 'info' : 'bad');
          this.feed(res.fixture.minute, evType, res.text);
          this.setScore(res.fixture);
          Hud.update(res.hud);
          if (res.home_coach || res.home_bench) {
            this.updateBenchesAndCoaches(res);
          }
          if (res.goal) {
            this.pitch.goal('home', res.scorer || 'أنت');
            Sound.good();
          }
          if (res.trust_delta) toast(`ثقة المدرب ${res.trust_delta > 0 ? '+' : ''}${res.trust_delta}%`, res.trust_delta < 0);
        }
      }
      
      // انتظار إيقاع الدقيقة لمحاكاة الـ 15 دقيقة بالكامل (10 ثوانٍ لكل دقيقة كروية عند 1x: 90 دقيقة * 10 ث = 900 ثانية = 15 دقيقة كاملة)
      const tickWait = Math.max(300, Math.round(9800 / this.speed));
      const startWait = performance.now();
      while ((performance.now() - startWait < tickWait) && this.running) {
        while (this.paused && this.running) await sleep(200);
        await sleep(250);
      }
    }
    clearInterval(this.timerInterval);
    this.running = false;
  }

  getDefaultBench(club, side) {
    const isMokawloon = (club || '').includes('المقاولون');
    const isHilal = (club || '').includes('الهلال');
    const isAhly = (club || '').includes('الأهلي');
    
    if (isMokawloon || (side === 'home' && !isAhly)) {
      return [
        { id: 'sub_h_arabi', name: 'أحمد عربي', number: 16, pos: 'GK', pos_name: 'حارس مرمى', ovr: 69, status: 'bench' },
        { id: 'sub_h_farouqa', name: 'فاروقا نور الدين', number: 5, pos: 'CB', pos_name: 'قلب دفاع صلب', ovr: 74, status: 'warming_up' },
        { id: 'sub_h_wael', name: 'لؤي وائل', number: 6, pos: 'CB', pos_name: 'قلب دفاع', ovr: 71, status: 'bench' },
        { id: 'sub_h_abed', name: 'أمير عابد', number: 2, pos: 'RB', pos_name: 'ظهير أيمن', ovr: 72, status: 'bench' },
        { id: 'sub_h_gebna', name: 'عبد الرحمن جبنة', number: 17, pos: 'CAM', pos_name: 'صانع ألعاب', ovr: 74, status: 'warming_up' },
        { id: 'sub_h_niass', name: 'أمادو نياص', number: 19, pos: 'RW', pos_name: 'جناح سريع', ovr: 73, status: 'warming_up' },
        { id: 'sub_h_nyari', name: 'مامادو نياريه', number: 18, pos: 'ST', pos_name: 'مهاجم بديل', ovr: 70, status: 'bench' },
        { id: 'sub_h_hassan', name: 'الحبيب حسن', number: 24, pos: 'DEF', pos_name: 'مدافع واعد', ovr: 68, status: 'bench' }
      ];
    }
    
    if (isHilal || side === 'away') {
      return [
        { id: 'sub_a_owais', name: 'محمد العويس', number: 21, pos: 'GK', pos_name: 'حارس دولي', ovr: 77, status: 'bench' },
        { id: 'sub_a_bulaihi', name: 'علي البليهي', number: 5, pos: 'CB', pos_name: 'قلب دفاع حماسي', ovr: 79, status: 'bench' },
        { id: 'sub_a_cancelo', name: 'جواو كانسيلو', number: 20, pos: 'RB', pos_name: 'ظهير مهاري', ovr: 86, status: 'warming_up' },
        { id: 'sub_a_nasser', name: 'ناصر الدوسري', number: 16, pos: 'CM', pos_name: 'وسط محوري', ovr: 76, status: 'warming_up' },
        { id: 'sub_a_kanno', name: 'محمد كنو', number: 28, pos: 'CDM', pos_name: 'ارتكاز بدني', ovr: 77, status: 'bench' },
        { id: 'sub_a_malcom', name: 'مالكوم', number: 77, pos: 'RW', pos_name: 'جناح برازيلي خطير', ovr: 83, status: 'warming_up' },
        { id: 'sub_a_leonardo', name: 'ماركوس ليوناردو', number: 11, pos: 'ST', pos_name: 'مهاجم شاب', ovr: 80, status: 'bench' },
        { id: 'sub_a_hamdan', name: 'عبد الله الحمدان', number: 14, pos: 'ST', pos_name: 'مهاجم بديل', ovr: 75, status: 'bench' }
      ];
    }

    return [
      { id: 'sub_1', name: 'حارس بديل', number: 16, pos: 'GK', ovr: 74, status: 'bench' },
      { id: 'sub_2', name: 'مدافع بديل', number: 5, pos: 'CB', ovr: 75, status: 'warming_up' },
      { id: 'sub_3', name: 'وسط بديل', number: 8, pos: 'CM', ovr: 76, status: 'bench' },
      { id: 'sub_4', name: 'مهاجم بديل', number: 19, pos: 'ST', ovr: 77, status: 'warming_up' }
    ];
  }

  initDugoutEvents() {
    const btnCoachConsult = $('#btn-coach-consult');
    if (btnCoachConsult) btnCoachConsult.addEventListener('click', () => this.openCoachConsult());

    const btnCloseCoach = $('#btn-close-coach-dialog');
    if (btnCloseCoach) btnCloseCoach.addEventListener('click', () => this.closeCoachConsult());

    const btnAckCoach = $('#btn-coach-ack');
    if (btnAckCoach) btnAckCoach.addEventListener('click', () => this.ackCoachConsult());
  }

  updateBenchesAndCoaches(data) {
    if (!data) return;
    if (data.home_bench) this.homeBench = data.home_bench;
    if (data.away_bench) this.awayBench = data.away_bench;
    if (data.home_coach) this.homeCoach = data.home_coach;
    if (data.away_coach) this.awayCoach = data.away_coach;
    if (data.lineups) {
      this.lineups = data.lineups;
      this.pitch.setLineups(data.lineups);
    }

    const hTeam = this.homeTeamName || (this.lineups?.home?.club) || 'المقاولون العرب';
    const aTeam = this.awayTeamName || (this.lineups?.away?.club) || 'الهلال السعودي';

    if (!this.homeBench || !this.homeBench.length) {
      this.homeBench = this.getDefaultBench(hTeam, 'home');
    }
    if (!this.awayBench || !this.awayBench.length) {
      this.awayBench = this.getDefaultBench(aTeam, 'away');
    }

    // 1. تحديث شارات التبديل المتبقية للمدرب
    const hUsed = this.homeCoach ? this.homeCoach.subs_used : 0;
    const aUsed = this.awayCoach ? this.awayCoach.subs_used : 0;
    const hBadge = $('#home-subs-badge');
    if (hBadge) hBadge.textContent = `${5 - hUsed}/5 🔄`;
    const aBadge = $('#away-subs-badge');
    if (aBadge) aBadge.textContent = `${5 - aUsed}/5 🔄`;

    // 2. تحديث مدرب الفريق (الذكاء الاصطناعي)
    if (this.homeCoach) {
      const hFig = $('#home-coach-figure');
      if (hFig) hFig.dataset.reaction = this.homeCoach.reaction || 'calm';
      const hName = $('#home-coach-name');
      if (hName) hName.textContent = this.homeCoach.name || 'المدير الفني';
      const hState = $('#home-coach-state');
      if (hState) hState.textContent = this.homeCoach.reaction_label || '🟢 توجيهات تكتيكية';
      const hQuote = $('#home-coach-quote');
      if (hQuote) hQuote.textContent = `"${this.homeCoach.quote}"`;

      const hTeamBadge = $('#home-team-name-badge');
      if (hTeamBadge) hTeamBadge.textContent = `دكة ${hTeam}`;
      const hBenchTitle = $('#home-bench-title');
      if (hBenchTitle) hBenchTitle.textContent = `🪑 بدلاء ${hTeam}`;
    }

    // 3. تحديث مدرب المنافس (الذكاء الاصطناعي)
    if (this.awayCoach) {
      const aFig = $('#away-coach-figure');
      if (aFig) aFig.dataset.reaction = this.awayCoach.reaction || 'calm';
      const aName = $('#away-coach-name');
      if (aName) aName.textContent = this.awayCoach.name || 'مدرب الخصم';
      const aState = $('#away-coach-state');
      if (aState) aState.textContent = this.awayCoach.reaction_label || '⚪ توجيهات فنية ومراقبة';
      const aQuote = $('#away-coach-quote');
      if (aQuote) aQuote.textContent = `"${this.awayCoach.quote}"`;

      const aTeamBadge = $('#away-team-name-badge');
      if (aTeamBadge) aTeamBadge.textContent = `دكة ${aTeam}`;
      const aBenchTitle = $('#away-bench-title');
      if (aBenchTitle) aBenchTitle.textContent = `🪑 بدلاء ${aTeam}`;
    }

    // 4. توليد بطاقات دكة بدلاء الفريق الأول (المقاولون العرب)
    const coachShortName = this.homeCoach?.name?.split(' ')[0] || 'المدرب';
    const isMokawloon = hTeam.includes('المقاولون');
    const hNumBg = isMokawloon ? '#facc15' : '#ef4444';
    const hNumColor = isMokawloon ? '#000000' : '#ffffff';

    const hList = $('#home-bench-players');
    if (hList && this.homeBench && this.homeBench.length) {
      hList.innerHTML = this.homeBench.map(p => {
        let tagHtml = '<span class="bp-tag">🪑 جالس على الدكة</span>';
        if (p.status === 'warming_up') tagHtml = '<span class="bp-tag warm">🏃 يُجري الإحماء (أمر المدرب)</span>';
        else if (p.status === 'subbed_in') tagHtml = `<span class="bp-tag in">🟢 أشركه ${coachShortName} ${p.sub_minute ? `(د ${p.sub_minute}')` : ''}</span>`;
        else if (p.status === 'subbed_out') tagHtml = `<span class="bp-tag">🔴 استبدله المدرب ${p.sub_minute ? `(د ${p.sub_minute}')` : ''}</span>`;

        return `
          <div class="bench-pcard ${p.status === 'subbed_in' ? 'subbed-in' : ''} ${p.status === 'subbed_out' ? 'subbed-out' : ''}">
            <div class="bp-main">
              <span class="bp-num" style="background:${hNumBg};color:${hNumColor};font-weight:900;">${p.number}</span>
              <div class="bp-info">
                <span class="bp-name">${esc(p.name)}</span>
                <span class="bp-meta">${p.pos} · OVR ${p.ovr || 75}</span>
              </div>
            </div>
            <div class="bp-status">
              ${tagHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    // 5. توليد بطاقات دكة بدلاء الخصم (الهلال السعودي)
    const aCoachShortName = this.awayCoach?.name?.split(' ')[0] || 'المدرب';
    const isHilal = aTeam.includes('الهلال');
    const aNumBg = isHilal ? '#1d4ed8' : 'rgba(255,255,255,0.12)';
    const aNumColor = isHilal ? '#ffffff' : '#f8fafc';

    const aList = $('#away-bench-players');
    if (aList && this.awayBench && this.awayBench.length) {
      aList.innerHTML = this.awayBench.map(p => {
        let tagHtml = '<span class="bp-tag">🪑 جالس على الدكة</span>';
        if (p.status === 'warming_up') tagHtml = '<span class="bp-tag warm">🏃 يُجري الإحماء</span>';
        else if (p.status === 'subbed_in') tagHtml = `<span class="bp-tag in">🟢 شارك بديلاً ${p.sub_minute ? `(د ${p.sub_minute}')` : ''}</span>`;
        else if (p.status === 'subbed_out') tagHtml = `<span class="bp-tag">🔴 استبدله ${aCoachShortName} ${p.sub_minute ? `(د ${p.sub_minute}')` : ''}</span>`;

        return `
          <div class="bench-pcard ${p.status === 'subbed_in' ? 'subbed-in' : ''} ${p.status === 'subbed_out' ? 'subbed-out' : ''}">
            <div class="bp-main">
              <span class="bp-num" style="background:${aNumBg};color:${aNumColor};font-weight:900;">${p.number}</span>
              <div class="bp-info">
                <span class="bp-name">${esc(p.name)}</span>
                <span class="bp-meta">${p.pos} · OVR ${p.ovr || 78}</span>
              </div>
            </div>
            <div class="bp-status">${tagHtml}</div>
          </div>
        `;
      }).join('');
    }
  }

  showElectronicSubBoard(subBoard, min) {
    if (!subBoard || !subBoard.out || !subBoard.in) return;
    const banner = $('#sub-board-banner');
    if (!banner) return;

    const minEl = $('#sub-board-min');
    if (minEl) minEl.textContent = (min || this.currentMinute || 60) + "'";

    const teamEl = $('#sub-board-team');
    if (teamEl) {
      const hCoachName = this.homeCoach?.name || 'المدرب';
      const hTeamName = this.homeTeamName || $('#hud-club')?.textContent?.split('·')[0]?.trim() || 'النادي';
      const aCoachName = this.awayCoach?.name || 'المدرب';
      teamEl.textContent = subBoard.team === 'home' ? `🔴 ${hTeamName} (${hCoachName})` : `⚪ المنافس (${aCoachName})`;
    }

    const outLed = $('#sub-led-out');
    if (outLed) outLed.textContent = subBoard.out.number;
    const outName = $('#sub-name-out');
    if (outName) outName.textContent = subBoard.out.name;

    const inLed = $('#sub-led-in');
    if (inLed) inLed.textContent = subBoard.in.number;
    const inName = $('#sub-name-in');
    if (inName) inName.textContent = subBoard.in.name;

    banner.classList.remove('hidden');
    clearTimeout(this.subBoardTimer);
    this.subBoardTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 4500);
  }

  async openCoachConsult() {
    try {
      const res = await Api.call('coach_chat.php', { fixture_id: this.currentFixtureId });
      const c = res.coach;
      $('#cd-coach-name').textContent = c.name;
      $('#cd-coach-role').textContent = `${c.role} · الدقيقة ${c.minute}'`;
      $('#cd-coach-speech').textContent = c.advice;

      const statsEl = $('#cd-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div><span>النتيجة الحالية:</span><b>${c.score}</b></div>
          <div><span>طاقتك البدنية:</span><b>${c.user_energy ? c.user_energy.toFixed(0) : 80}%</b></div>
          <div><span>ثقة المدرب:</span><b>${c.user_trust ? c.user_trust.toFixed(0) : 85}%</b></div>
        `;
      }
      $('#coach-consult-modal').classList.remove('hidden');
    } catch (e) {
      toast(e.message || 'تعذر التواصل مع المدرب', true);
    }
  }

  closeCoachConsult() {
    $('#coach-consult-modal').classList.add('hidden');
  }

  ackCoachConsult() {
    this.closeCoachConsult();
    toast('⭐ استوعبت تعليمات المدرب بحرفية! (+1% ثقة المدرب)');
  }

  async finish(r) {
    const elTimer = $('#match-elapsed');
    if (elTimer) elTimer.textContent = '15:00';
    this.elapsedSec = 900;

    const s = r.summary;
    const goalsList = (s.goals_breakdown && s.goals_breakdown.length)
      ? `<div class="summary-goals-box" style="margin:12px 0; padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
          <b style="display:block; margin-bottom:6px; color:var(--gold); font-size:0.9rem;">⚽ هدافو اللقاء (تنوع الأهداف):</b>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:0.85rem;">
            ${s.goals_breakdown.map(g => `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>${g.team === 'home' ? `🔴 ${esc(s.home)}` : `⚪ ${esc(s.away)}`}: <b>${esc(g.scorer)}</b> ${g.assist ? `<small class="muted">(صناعة: ${esc(g.assist)})</small>` : ''}</span>
                <b class="${g.team === 'home' ? 'ok' : 'bad'}">${g.minute}'</b>
              </div>
            `).join('')}
          </div>
        </div>`
      : '';

    $('#summary-body').innerHTML = `
      <p class="center" style="font-size:1.4rem; margin-bottom:4px;"><b>${esc(s.home)} ${esc(s.score)} ${esc(s.away)}</b></p>
      ${goalsList}
      <div class="stats">
        <div><span>أهدافك</span><b>${s.goals}</b></div>
        <div><span>صناعتك للأهداف</span><b>${s.assists}</b></div>
        <div><span>تقييمك الفني</span><b>⭐ ${Number(s.rating).toFixed(1)}</b></div>
        <div><span>دقائق اللعب</span><b>${s.minutes}'</b></div>
        <div><span>صافي الأجر</span><b>${money(s.net_wage)}</b></div>
      </div>`;
    $('#summary').classList.remove('hidden');
    await new Promise(res => $('#sm-close').addEventListener('click', res, { once: true }));
    $('#summary').classList.add('hidden');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } catch {}
    }
    $('#tab-match')?.classList.remove('is-fullscreen');
    this.app.tab('home');
    await this.app.refresh();
  }
}

class App {
  constructor() {
    this.match = new MatchController(this);
    this.bindAuth();
    this.bindNav();
    $('#btn-logout').addEventListener('click', async () => {
      try { const r = await Api.call('auth.php', { action: 'logout' }); Api.csrf = r.csrf; } catch { /* تجاهل */ }
      this.view('auth');
    });
    $('#db-table-select')?.addEventListener('change', () => this.loadDatabaseExplorer());
    $('#btn-refresh-db')?.addEventListener('click', () => this.loadDatabaseExplorer());
    this.refresh();
  }

  bindNav() {
    // 1. أزرار القائمة الرئيسية والمنسدلة
    $$('#nav .nav-btn, #nav .sub-tab-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const tab = b.dataset.tab;
        if (tab) this.tab(tab);
        $$('.nav-item.has-dropdown').forEach(item => item.classList.remove('open'));
      });
    });

    // 2. تفعيل القائمة المنسدلة باللمس/النقر
    $$('.nav-item.has-dropdown .nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const parent = btn.closest('.nav-item');
        if (parent) {
          const isOpen = parent.classList.contains('open');
          $$('.nav-item.has-dropdown').forEach(item => item.classList.remove('open'));
          if (!isOpen) parent.classList.add('open');
        }
      });
    });

    // 3. إغلاق القوائم عند النقر بالخارج
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#nav')) {
        $$('.nav-item.has-dropdown').forEach(item => item.classList.remove('open'));
      }
    });
  }

  tab(name) {
    $$('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-' + name));
    
    // تحديث تمييز الأزرار النشطة في الشريط العلوي والمنسدل
    $$('.sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.nav-btn').forEach(b => {
      const parent = b.closest('.nav-item');
      const hasSub = parent && parent.querySelector(`.sub-tab-btn[data-tab="${name}"]`);
      const isDirect = b.dataset.tab === name;
      b.classList.toggle('active', isDirect || !!hasSub);
    });

    document.body.classList.toggle('in-match', name === 'match');
    window.scrollTo({ top: 0 });
    if (name === 'tactics') this.loadTactics();
    if (name === 'squad') this.loadSquad();
    if (name === 'career') this.loadCareer();
    if (name === 'market') this.loadMarket();
    if (name === 'npc') this.loadNpcSubsystems();
    if (name === 'database') this.loadDatabaseExplorer();
  }

  /** مستعرض قاعدة البيانات الحية واستعراض جداول SQL الحقيقية */
  async loadDatabaseExplorer() {
    try {
      const select = $('#db-table-select');
      const curTable = select?.value || 'players';
      const data = await Api.call('database_explorer.php', { table: curTable });
      
      // 1. Grid of tables
      const grid = $('#db-tables-grid');
      if (grid && data.summary) {
        grid.innerHTML = Object.entries(data.summary).map(([tbl, cnt]) => `
          <div class="db-tbl-card ${tbl === curTable ? 'active' : ''}" data-table="${tbl}" style="background: ${tbl === curTable ? 'rgba(34,197,94,0.18)' : 'rgba(30,41,59,0.7)'}; border: 1px solid ${tbl === curTable ? '#22c55e' : 'rgba(255,255,255,0.1)'}; padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <b style="font-size: 0.85rem; color: ${tbl === curTable ? '#4ade80' : '#e2e8f0'};">${tbl}</b>
              <span class="badge" style="background: #0f172a; color: #38bdf8; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">${cnt} صف</span>
            </div>
          </div>
        `).join('');

        $$('.db-tbl-card').forEach(card => {
          card.onclick = () => {
            if (select) {
              select.value = card.dataset.table;
              this.loadDatabaseExplorer();
            }
          };
        });
      }

      // 2. Rows count label
      const countLabel = $('#db-rows-count');
      if (countLabel) countLabel.textContent = `معروض ${data.rows?.length || 0} من أصل ${data.summary?.[curTable] || 0} سجل في جدول [${curTable}]`;

      // 3. Table Headers & Body
      const thead = $('#db-table-head');
      const tbody = $('#db-table-body');
      if (thead && tbody) {
        if (!data.rows || data.rows.length === 0) {
          thead.innerHTML = '<tr><th style="padding: 10px;">الحالة</th></tr>';
          tbody.innerHTML = '<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">لا توجد سجلات بعد في هذا الجدول</td></tr>';
          return;
        }

        const cols = Object.keys(data.rows[0]);
        thead.innerHTML = `<tr>${cols.map(c => `<th style="padding: 8px 12px; border: 1px solid rgba(255,255,255,0.1); color: #93c5fd; white-space: nowrap;">${esc(c)}</th>`).join('')}</tr>`;

        tbody.innerHTML = data.rows.map((row, idx) => `
          <tr style="background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; border-bottom: 1px solid rgba(255,255,255,0.05);">
            ${cols.map(c => {
              const val = row[c];
              let displayVal = val;
              if (typeof val === 'object' && val !== null) displayVal = JSON.stringify(val);
              return `<td style="padding: 8px 12px; border: 1px solid rgba(255,255,255,0.05); white-space: nowrap; max-width: 260px; overflow: hidden; text-overflow: ellipsis;">${esc(displayVal ?? 'NULL')}</td>`;
            }).join('')}
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading database explorer:', err);
    }
  }

  /** صفحة 1: التشكيلة والتكتيكات المعتمدة للمدرب ودكة البدلاء */
  async loadTactics() {
    try {
      const data = await Api.call('squad.php');
      const { squad, tactics, coach, player, club, is_free_agent } = data;
      const currentClub = club || (player && player.club) || $('#hud-club')?.textContent?.split('·')[0]?.trim() || 'النادي';

      if (is_free_agent || !tactics) {
        $('#tactics-meta').textContent = `الحالة: لاعب حر في سوق الانتقالات | لا تكتيكات نادٍ حالياً`;
        $('#tactics-style-badge').textContent = `🌟 لياقة فردية`;
        $('#tactics-formation-badge').textContent = '4-2-3-1';
        $('#t-coach-name').textContent = coach ? coach.name : 'الكابتن حسام (مدرب اللياقة الفردية)';
        $('#t-coach-archetype').textContent = coach ? coach.archetype_label : 'تدريب فردي';
        $('#t-directives').innerHTML = `
          <div class="t-dir-item">
            <span class="icon">🌟</span>
            <span>أنت لاعب حر في سوق الانتقالات! وقّع مع أحد الأندية لتكليفك بتعليمات تكتيكية وتشكيلة معتمدة.</span>
          </div>
        `;
        $('#t-user-instruction').innerHTML = `
          <b>توجيه الوكيل والمدرب:</b>
          <span>انتقل لتبويب سوق الانتقالات لاختيار أحد عروض الأندية وتوقيع عقدك الاحترافي الأول. <a href="javascript:void(0)" onclick="app.tab('market')" style="color:#facc15;font-weight:bold;text-decoration:underline;">سوق الانتقالات ➔</a></span>
        `;
        if ($('#t-bench-list')) $('#t-bench-list').innerHTML = `
          <div class="empty"><div>📝</div><b>لا توجد دكة بدلاء</b><p class="muted small">ستظهر دكة بدلاء فريقك بعد توقيع العقد في سوق الانتقالات.</p></div>
        `;
        return;
      }

      $('#tactics-meta').textContent = `الخطة: ${tactics.formation} | المدرب: ${coach.name} | النادي: ${currentClub}`;
      $('#tactics-style-badge').textContent = `🔥 ${tactics.style_label}`;
      $('#tactics-formation-badge').textContent = tactics.formation;

      $('#t-coach-name').textContent = coach.name;
      $('#t-coach-archetype').textContent = coach.archetype_label;

      // تعليمات المدرب
      $('#t-directives').innerHTML = (tactics.instructions || []).map((ins, idx) => `
        <div class="t-dir-item">
          <span class="icon">${['🎯', '⚡', '📐', '🛡️'][idx % 4]}</span>
          <span>${esc(ins)}</span>
        </div>
      `).join('');

      const partnerPlayer = (squad || []).find(p => p.pos === 'FWD' && !p.is_user)?.name || 'المهاجم';
      $('#t-user-instruction').innerHTML = `
        <b>دورك التكتيكي المكلف به من المدرب (${esc(coach.name)}):</b>
        <span>${esc(tactics.user_tactical_role)} — تحرك بحرية في الثلث الأخير، واربط بين خط الوسط والمهاجم ${esc(partnerPlayer)} مع مباغتة الحارس بالتسديد بعيد المدى.</span>
      `;

      // دكة البدلاء (Substitutes)
      const benchPlayers = squad.filter(p => !p.is_starter);
      $('#bench-count').textContent = `${benchPlayers.length} لاعبين متاحين للتبديل`;
      $('#bench-list').innerHTML = benchPlayers.map(p => `
        <div class="bench-item">
          <div class="b-left">
            <span class="bench-num">#${p.number}</span>
            <div>
              <b>${esc(p.name)}</b>
              <small class="muted" style="display:block;">${esc(p.pos_name || p.pos)}</small>
            </div>
          </div>
          <span class="bench-ovr">${p.ovr} OVR</span>
        </div>
      `).join('');

      // لوحة الملعب التكتيكي والـ 11 لاعباً الأساسيين (Starting XI)
      const starters = squad.filter(p => p.is_starter);
      const formationCoords = {
        'GK': [{ x: 50, y: 88, pos_label: 'GK' }],
        'DEF': [
          { x: 15, y: 72, pos_label: 'LB' },
          { x: 38, y: 74, pos_label: 'LCB' },
          { x: 62, y: 74, pos_label: 'RCB' },
          { x: 85, y: 72, pos_label: 'RB' }
        ],
        'MID': [
          { x: 50, y: 56, pos_label: 'CDM' },
          { x: 28, y: 44, pos_label: 'CM' },
          { x: 72, y: 44, pos_label: 'CAM' }
        ],
        'FWD': [
          { x: 20, y: 22, pos_label: 'LW' },
          { x: 50, y: 16, pos_label: 'ST' },
          { x: 80, y: 22, pos_label: 'RW' }
        ]
      };

      let defIdx = 0, midIdx = 0, fwdIdx = 0;
      const boardHtml = starters.map(p => {
        let coord = { x: 50, y: 50, pos_label: p.pos };
        if (p.pos === 'GK') {
          coord = formationCoords['GK'][0];
        } else if (p.pos === 'DEF') {
          coord = formationCoords['DEF'][defIdx++ % 4];
        } else if (p.pos === 'MID') {
          if (p.is_user) {
            coord = { x: 50, y: 38, pos_label: 'CAM (أنت)' };
          } else {
            coord = formationCoords['MID'][midIdx++ % 3];
          }
        } else if (p.pos === 'FWD') {
          coord = formationCoords['FWD'][fwdIdx++ % 3];
        }

        const isUser = !!p.is_user;
        const isGk = (p.pos === 'GK');

        return `
          <div class="tactics-pin ${isUser ? 'is-user' : ''}" style="left:${coord.x}%; top:${coord.y}%;" title="${esc(p.name)} (${p.ovr} OVR)">
            <div class="pin-badge ${isUser ? 'is-user' : (isGk ? 'is-gk' : '')}">
              ${p.number}
              <span class="pin-ovr">${p.ovr}</span>
            </div>
            <span class="pin-label">${isUser ? `★ ${p.name} (أنت)` : esc(p.name)}</span>
          </div>
        `;
      }).join('');

      $('#tactics-pitch-board').innerHTML = boardHtml;
    } catch (e) {
      toast(e.message, true);
    }
  }

  /** صفحة 2: قائمة لاعبي النادي مرتبين حسب المراكز (حراس، دفاع، وسط، هجوم) */
  async loadSquad() {
    try {
      const data = await Api.call('squad.php');
      const { squad, player, club, is_free_agent } = data;

      if (is_free_agent || !squad || squad.length === 0) {
        const sqClubTitle = $('#sq-club-title');
        if (sqClubTitle) sqClubTitle.textContent = 'سوق الانتقالات — لاعب حر';
        $('#sq-total-players').textContent = '0 لاعبين';
        $('#sq-avg-ovr').textContent = '—';
        $('#sq-total-val').textContent = '$0M';
        $('#squad-sections-container').innerHTML = `
          <div class="empty" style="padding:40px 20px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌟</div>
            <h3 style="color:#facc15;font-size:18px;margin-bottom:8px;">أنت لاعب حر في سوق الانتقالات حالياً</h3>
            <p class="muted" style="max-width:500px;margin:0 auto 16px;">لم تنضم بعد لأي نادٍ لعرض تشكيلة الفريق. استعرض عروض التعاقد الفورية في نافذة سوق الانتقالات ووقّع عقدك الأول!</p>
            <button class="btn primary" onclick="app.tab('market')">الانتقال إلى سوق الانتقالات ➔</button>
          </div>
        `;
        return;
      }

      this.fullSquadList = squad;
      const currentClub = club || (player && player.club) || $('#hud-club')?.textContent?.split('·')[0]?.trim() || 'النادي';

      const sqClubTitle = $('#sq-club-title');
      if (sqClubTitle) sqClubTitle.textContent = `قائمة لاعبي ${currentClub} (Club Squad)`;

      $('#sq-total-players').textContent = `${squad.length} لاعباً`;
      const avgOvr = (squad.reduce((a, b) => a + Number(b.ovr), 0) / squad.length).toFixed(1);
      $('#sq-avg-ovr').textContent = `${avgOvr} OVR`;
      const totalVal = (squad.reduce((a, b) => a + Number(b.value || 0), 0) / 1e6).toFixed(1);
      $('#sq-total-val').textContent = `$${totalVal}M`;

      const renderFiltered = () => {
        const activePos = $('#sq-pos-filters .sq-tab-btn.active')?.dataset.pos || 'ALL';
        const searchVal = ($('#sq-search-input')?.value || '').trim().toLowerCase();

        let filtered = this.fullSquadList;
        if (activePos !== 'ALL') {
          filtered = filtered.filter(p => p.pos === activePos);
        }
        if (searchVal) {
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchVal) ||
            String(p.number).includes(searchVal) ||
            (p.pos_name && p.pos_name.toLowerCase().includes(searchVal))
          );
        }

        const groups = [
          { key: 'GK', label: '🧤 حراس المرمى', badge: 'حراس مرمى' },
          { key: 'DEF', label: '🛡️ خط الدفاع', badge: 'مدافعين' },
          { key: 'MID', label: '⚙️ خط الوسط', badge: 'لاعبي وسط' },
          { key: 'FWD', label: '⚡ خط الهجوم', badge: 'مهاجمين' }
        ];

        const html = groups.map(g => {
          const list = filtered.filter(p => p.pos === g.key);
          if (!list.length) return '';

          return `
            <div class="squad-pos-section">
              <div class="squad-pos-title">
                <span>${g.label}</span>
                <span class="badge">${list.length} لاعبين</span>
              </div>
              <div class="squad-grid">
                ${list.map(p => {
                  const isUser = !!p.is_user;
                  return `
                    <div class="squad-card ${isUser ? 'is-user' : ''}">
                      <div class="squad-card-head">
                        <div class="sq-avatar ${isUser ? 'is-me' : ''}">
                          ${isUser ? `<img src="assets/img/card-cam.webp" alt="${esc(p.name)}" class="sq-av-img">` : avatarSvg(p.name, currentClub)}
                        </div>
                        <div class="sq-card-info">
                          <div class="sq-name">${isUser ? `★ ${p.name} (أنت)` : esc(p.name)}</div>
                          <div class="sq-meta">
                            <span>#${p.number}</span>
                            <span>•</span>
                            <span class="pill ${isUser ? 'ok' : ''}" style="font-size:0.68rem; padding:1px 6px;">${esc(p.pos_name || p.pos)}</span>
                          </div>
                        </div>
                        <div class="sq-ovr-box">
                          <b>${p.ovr}</b>
                          <small>OVR</small>
                        </div>
                      </div>

                      <div class="sq-card-details">
                        <div class="sq-detail-row"><span>العمر:</span><b>${p.age} سنة</b></div>
                        <div class="sq-detail-row"><span>الجنسية:</span><b>${esc(p.nat || 'مصر')}</b></div>
                        <div class="sq-detail-row"><span>القيمة:</span><b>${money(p.value)}</b></div>
                        <div class="sq-detail-row"><span>الحالة:</span><b class="ok">${esc(p.form)}</b></div>
                      </div>

                      <div class="sq-card-footer">
                        <span>اللياقة: <b class="ok">${p.stamina}%</b></span>
                        <span class="pill ${p.is_starter ? 'ok' : ''}">${p.is_starter ? '✔ أساسي' : '🪑 بديل'}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');

        $('#squad-sections-container').innerHTML = html || '<div class="empty"><b>لا توجد نتائج مطابقة للبحث</b></div>';
      };

      $$('#sq-pos-filters .sq-tab-btn').forEach(b => {
        b.onclick = () => {
          $$('#sq-pos-filters .sq-tab-btn').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          renderFiltered();
        };
      });

      $('#sq-search-input').oninput = () => renderFiltered();
      renderFiltered();
    } catch (e) {
      toast(e.message, true);
    }
  }

  /** سوق الانتقالات: عروض الأندية + زملاء في السوق + نصيحة الوكيل */
  async loadMarket() {
    try {
      const m = await Api.call('market.php');
      const CT = { local: 'محلي', mid: 'متوسط', continental: 'قاري', elite: 'نخبة' };
      const R = { starter: ['لاعب أساسي', 'ok'], rotation: ['تدوير', 'mid'], bench: ['بديل', 'bad'] };
      const left = iso => {                                     // الوقت المتبقي للعرض
        const ms = new Date(String(iso).replace(' ', 'T')) - Date.now();
        if (!isFinite(ms)) return '';
        if (ms <= 0) return 'انتهى';
        const h = Math.floor(ms / 36e5); return h >= 24 ? `${Math.floor(h / 24)} يوم` : `${h} ساعة`;
      };
      const cur = Number(m.current?.wage) || 0;
      const isFree = m.is_free_agent || (m.current && String(m.current.club||'').includes('لاعب حر'));
      const freeHero = isFree ? `
        <div class="alert gold" style="display:flex;align-items:center;gap:14px;margin-bottom:18px;background:linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.1));border:1px solid #eab308;padding:14px;border-radius:12px;">
          <span style="font-size:32px;">🌟</span>
          <div>
            <b style="color:#facc15;display:block;font-size:16px;margin-bottom:4px;">أنت لاعب حر في سوق الانتقالات الاحترافي!</b>
            <span style="color:#f8fafc;font-size:13px;line-height:1.5;">تهانينا على تدشين مسيرتك! أنت غير مرتبط بأي نادٍ حالياً. استعرض عروض التعاقد الفورية من أندية الدوري أدناه، واضغط <b>"قبول العرض والتوقيع"</b> لتنضم لفريقك وتستلم مكافأة التوقيع فوراً وتبدأ خوض مباريات الدوري!</span>
          </div>
        </div>
      ` : '';

      $('#market-offers').innerHTML = freeHero + (m.offers.map(o => {
        const up = Math.round((o.match_wage / cur - 1) * 100), r = R[o.role] || ['', ''];
        return `<div class="offer tier-${esc(o.club_tier)}">
          <div class="offer-head">${crest(o.club)}<div class="grow"><b>${esc(o.club)}</b><small class="muted">${[CT[o.club_tier], o.new_tier_label].filter((v, i, a) => v && a.indexOf(v) === i).map(esc).join(' · ')}</small></div>
            <span class="pill ${r[1]}">${r[0]}</span></div>
          <div class="offer-grid">
            <div><span>أجر المباراة</span><b class="ok">${money(o.match_wage)} ${up > 0 && cur > 1 ? `<em class="up">▲${up}%</em>` : ''}</b></div>
            <div><span>مكافأة التوقيع</span><b style="color:#22c55e;">${money(o.signing_bonus)}</b></div>
            <div><span>الشرط الجزائي</span><b>${money(o.release_clause)}</b></div>
            <div><span>ينتهي العرض بعد</span><b>⏳ ${left(o.expires_at)}</b></div></div>
          <div class="offer-actions"><button class="btn primary" data-accept="${o.id}">📝 قبول العرض والتوقيع</button><button class="btn reject" data-reject="${o.id}">رفض</button></div></div>`;
      }).join('') || `<div class="empty"><div>📭</div><b>لا توجد عروض حالياً</b><p class="muted small">اطلب وضعك في قائمة الانتقالات ليلتفت إليك الوكلاء.</p></div>`);

      const peers = m.peers || [];
      const chips = [['', 'الكل'], ['FWD', 'مهاجم'], ['MID', 'وسط'], ['DEF', 'مدافع'], ['GK', 'حارس']];
      $('#market-peers').innerHTML = peers.length ? `<div class="chips">${chips.map(([k, t], i) => `<button class="chip${i ? '' : ' on'}" data-pos="${k}">${t}</button>`).join('')}</div>
        <div class="peer-list">${peers.map(p => `<div class="peer" data-pos="${p.position}">
          <div class="peer-av">${esc([...p.name.trim()][0] || '⚽')}<i>${p.ovr}</i></div>
          <div class="grow"><b>${esc(p.name)}</b><small class="muted">${L.pos[p.position]} · ${p.age} سنة · ${esc(p.club)}</small></div>
          ${p.npc ? '<span class="pill">NPC</span>' : '<span class="pill ok">لاعب</span>'}</div>`).join('')}</div>`
        : '<div class="empty"><div>🧑‍🤝‍🧑</div><b>السوق هادئ</b><p class="muted small">ستظهر هنا المواهب القريبة من مستواك.</p></div>';
      $$('.chip', $('#market-peers')).forEach(c => c.addEventListener('click', () => {
        $$('.chip', $('#market-peers')).forEach(x => x.classList.toggle('on', x === c));
        $$('.peer', $('#market-peers')).forEach(p => p.classList.toggle('hidden', !!c.dataset.pos && p.dataset.pos !== c.dataset.pos));
      }));

      const best = m.offers.slice().sort((a, b) => b.match_wage - a.match_wage)[0];
      const tip = isFree ? 'بصفتك لاعباً حراً، يمكنك التوقيع مع أي نادٍ يقدم لك عقداً للانضمام فوراً لكتيبته وقائمة مبارياته!'
        : !m.window_open ? 'النافذة مغلقة الآن — ستفتح يوم الحفل (اليوم 15) لمدة 24 ساعة. جهّز أرقامك قبلها.'
        : best ? `أعلى أجر معروض: ${esc(best.club)} بـ ${money(best.match_wage)} للمباراة. تذكّر أن دورك المتوقع يحدد ثقة المدرب الابتدائية.`
        : m.listed ? 'أنت في القائمة فعلاً — انتظر العروض وحافظ على تقييمك مرتفعاً.' : 'لا عروض حتى الآن. ضع نفسك في قائمة الانتقالات لتلفت أنظار الأندية.';
      $('#market-info').innerHTML = `<div class="mk-status"><b>${esc(m.current.club)}</b><small class="muted">${esc(m.current.tier_label)} · أجر المباراة ${money(m.current.wage)}</small>
          <span class="pill ${m.window_open ? 'ok' : 'bad'}">${m.window_open ? '● النافذة مفتوحة' : '● النافذة مغلقة'}</span></div>
        <div class="mk-tip"><span>💡</span><div><b>نصيحة الوكيل</b><p>${tip}</p></div></div>
        <button id="btn-list" class="btn ${m.listed ? '' : 'primary'}" ${m.listed ? 'disabled' : ''}>${m.listed ? '✔ في قائمة الانتقالات' : '📤 طلب وضع في قائمة الانتقالات'}</button>`;

      const act = async (body, msg) => {
        try { const r = await Api.call('market_action.php', body); if (r.hud) Hud.update(r.hud); toast(msg(r)); await this.refresh(); await this.loadMarket(); }
        catch (e) { toast(e.message, true); }
      };
      $('#btn-list').addEventListener('click', e => { e.target.disabled = true; act({ action: 'list' }, r => r.message); });
      $$('[data-accept]').forEach(b => b.addEventListener('click', () => {
        if (confirm('تأكيد قبول العرض والانتقال للنادي وتوقيع العقد؟')) {
          act({ action: 'accept', offer_id: Number(b.dataset.accept) }, r => {
            setTimeout(() => this.tab('home'), 1200);
            return r.message || `🎉 مبارك! تم توقيع العقد الرسمي مع ${r.club} — مكافأة التوقيع ${money(r.bonus)}`;
          });
        }
      }));
      $$('[data-reject]').forEach(b => b.addEventListener('click', () => act({ action: 'reject', offer_id: Number(b.dataset.reject) }, () => 'تم رفض العرض')));
    } catch (e) { toast(e.message, true); }
  }

  /** بيئة الشخصيات الافتراضية والروبوتات: المدرب والمنافسون والوكيل وسوق الآلي */
  async loadNpcSubsystems() {
    try {
      const [coachRes, rivalRes, agentRes, marketBotRes] = await Promise.all([
        Api.call('coach_decision.php', { importance: 'derby' }),
        Api.call('rival_race.php'),
        Api.call('agent_board.php'),
        Api.call('market_bots.php')
      ]);

      // 1. لوحة المدرب الذكي
      const c = coachRes.coach;
      const ev = coachRes.evaluation;
      $('#coach-status-box').innerHTML = `
        <div class="coach-status-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>${esc(c.name)}</b>
            <span class="pill ${c.archetype === 'disciplinarian' ? 'bad' : (c.archetype === 'developer' ? 'ok' : 'mid')}">${esc(c.archetype_label)}</span>
          </div>
          <div class="coach-metrics">
            <div><span>مطلب اللياقة</span><b>>${c.stamina_demand ?? '—'}%</b></div>
            <div><span>عقوبة الفرصة الحاسمة</span><b class="bad">${c.trust_penalty_failed_clutch ?? 0}%</b></div>
            <div><span>قرار مباراة القمة</span><b class="ok">${esc(ev.role)}</b></div>
          </div>
        </div>`;

      $('#coach-dialogue-box').innerHTML = `<b>حديث المدرب في غرفة الملابس:</b><p style="margin:4px 0 0;">${esc(ev.dialogue)}</p>`;

      // أزرار التبديل الفوري للمدرب
      $$('#coach-switch-btns button').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.coach) === c.id);
        b.onclick = async () => {
          try {
            await Api.call('coach_switch.php', { coach_id: b.dataset.coach });
            toast(`👔 تم تعيين المدرب: ${b.textContent}`);
            await this.loadNpcSubsystems();
          } catch (err) { toast(err.message, true); }
        };
      });

      // 2. لوحة المنافس المباشر وسباق الكرة الذهبية
      const cmp = rivalRes.comparison;
      $('#rival-comparison-box').innerHTML = `
        <div class="rival-h2h-card">
          <div class="rival-side">
            <b>${esc(cmp.user.name)}</b>
            <small>${esc(cmp.user.club)}</small>
            <div><span class="ovr-badge">${cmp.user.ovr} OVR</span></div>
          </div>
          <div class="rival-vs">VS</div>
          <div class="rival-side">
            <b>${esc(cmp.rival.name)}</b>
            <small>${esc(cmp.rival.club)} · ${esc(cmp.rival.archetype)}</small>
            <div><span class="ovr-badge" style="background:#ef4444; color:#fff;">${cmp.rival.ovr} OVR</span></div>
          </div>
        </div>
        <div class="rival-stats-bars">
          <div class="r-stat-row"><span>الأهداف المسجلة</span><b>${cmp.user.goals}</b> vs <b>${cmp.rival.goals}</b></div>
          <div class="r-stat-row"><span>التمريرات الحاسمة</span><b>${cmp.user.assists}</b> vs <b>${cmp.rival.assists}</b></div>
          <div class="r-stat-row"><span>متوسط التقييم</span><b>⭐ ${cmp.user.avg_rating}</b> vs <b>⭐ ${cmp.rival.avg_rating}</b></div>
          <div class="r-stat-row"><span>نقاط الكرة الذهبية</span><b class="lead">🏆 ${cmp.user.ballon_dor_pts}</b> vs <b>🏆 ${cmp.rival.ballon_dor_pts}</b></div>
        </div>
        <div class="result ok" style="margin-top:10px;">${esc(cmp.headline_verdict)}</div>`;

      const matches = rivalRes.simulated_matches || [];
      $('#simulated-league-box').innerHTML = `
        <h4 style="margin:12px 0 6px; font-size:0.9rem; color:var(--muted);">نتائج محاكاة باقي مباريات الدوري (Poisson Simulation):</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${matches.map(m => `
            <div style="display:flex; justify-content:space-between; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:8px; font-size:0.82rem;">
              <span>${esc(m.home)} <b>${esc(m.score)}</b> ${esc(m.away)}</span>
              <small class="muted">هداف اللقاء: ${esc(m.top_scorer)}</small>
            </div>`).join('')}
        </div>`;

      // 3. لوحة الوكيل الجشع وتطلعات الإدارة
      const ag = agentRes.agent;
      const bd = agentRes.board;
      $('#agent-board-box').innerHTML = `
        <div class="agent-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>${esc(ag.name)}</b>
            <span class="pill bad">اقتطاع ${ag.wage_cut_pct}%</span>
          </div>
          <p class="muted small" style="margin:2px 0;">${esc(ag.bio)}</p>
          <div class="harass-alert">
            <span>⚠️</span>
            <div><b>إنذار الوكيل المستمر:</b> <span>${esc(ag.last_warning)}</span></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-top:4px;">
            <span>الشرط الجزائي للفسخ: <b>${money(ag.penalty_clause_cost)}</b></span>
            <span>عتبة OVR للوكالات الكبرى: <b>${ag.min_ovr_threshold} OVR</b></span>
          </div>
        </div>

        <div class="board-card" style="margin-top:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>تطلعات مجلس الإدارة (${esc(bd.chairman_name)})</b>
            <span class="pill ok">مكافأة ${money(bd.bonus_payout)}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.82rem; margin-top:4px;">
            <div>المركز المطلوب: <b>المركز ${bd.target_league_rank}</b></div>
            <div>الأهداف المطلوبة: <b>${bd.target_player_goals} هدفاً</b> (أحرزت ${bd.current_player_goals})</div>
          </div>
          <p class="muted small" style="margin:4px 0 0;">${esc(bd.eval_message)}</p>
        </div>`;

      // 4. لوحة روبوتات السوق الآلية
      const mb = marketBotRes;
      $('#market-bots-box').innerHTML = `
        <div style="font-size:0.84rem; color:var(--muted); margin-bottom:8px;">
          خوارزمية السيولة الآلية: <code>${esc(mb.config.formula)}</code>
        </div>
        <h4 style="margin:0 0 6px; font-size:0.85rem; color:#38bdf8;">آخر عمليات الشراء الآلي للروبوتات (Buyer Bots بعد 12 ساعة):</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(mb.recent_bot_purchases || []).map(b => `
            <div class="market-bot-item">
              <div><b>${esc(b.item)}</b><small class="muted" style="display:block;">${esc(b.time)} · ${esc(b.buyer)}</small></div>
              <b class="ok">${money(b.price)}</b>
            </div>`).join('')}
        </div>
        <h4 style="margin:12px 0 6px; font-size:0.85rem; color:#fbbf24;">عروض البائعين الآلية اليومية (Seller Bots Stock):</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(mb.seller_bot_daily_stock || []).map(s => `
            <div class="market-bot-item">
              <div><b>${esc(s.name)}</b><small class="muted" style="display:block;">${esc(s.seller)}</small></div>
              <b class="gold">${money(s.price)}</b>
            </div>`).join('')}
        </div>`;
    } catch (e) {
      toast(e.message, true);
    }
  }

  /** تفاصيل المسيرة: إجماليات، رف الجوائز، رسم المواسم، والسجل المالي */
  async loadCareer() {
    const box = $('#career-extra');
    try {
      const c = await Api.call('career.php');
      const T = { wage: ['💵', 'أجر المباراة'], agent_fee: ['🤝', 'عمولة الوكيل'], overhead: ['🏠', 'مصاريف المعيشة'], interest: ['📉', 'فوائد الدين'], garnish: ['⚖️', 'حجز على الدخل'], recovery: ['💆', 'استشفاء'], daily_expense: ['🧾', 'مصاريف يومية'], award: ['🏅', 'جائزة'] };
      const A = { ballon_dor: ['🏆', 'الكرة الذهبية'], golden_boot: ['👟', 'الحذاء الذهبي (الهداف)'] };
      const t = Object.fromEntries(Object.entries(c.totals || {}).map(([k, v]) => [k, v === null ? null : Number(v)]));
      const per = t.matches ? ((t.goals + t.assists) / t.matches).toFixed(2) : '—';
      const tiles = [['⚽', t.goals, 'الأهداف'], ['🎯', t.assists, 'التمريرات الحاسمة'], ['🏟', t.matches, 'المباريات'], ['🏆', t.trophies, 'البطولات'], ['⭐', t.avg_rating ?? '—', 'متوسط التقييم'], ['🔥', per, 'مساهمة / مباراة']];

      const seasons = (c.seasons || []).slice().reverse().slice(-8);
      const max = Math.max(1, ...seasons.map(s => Math.max(Number(s.goals), Number(s.assists))));
      const chart = seasons.length ? `<div class="sc-chart">${seasons.map(s => `
          <div class="sc-col" title="موسم ${s.season_number}: ${s.goals} هدف · ${s.assists} صناعة · ${s.matches} مباراة">
            <div class="sc-bars"><i class="g" style="--h:${Number(s.goals) / max * 100}%"><b>${s.goals}</b></i><i class="a" style="--h:${Number(s.assists) / max * 100}%"><b>${s.assists}</b></i></div>
            <span>م${s.season_number}</span><small>${s.avg_rating ? '⭐' + s.avg_rating : '—'}</small>
          </div>`).join('')}</div>
        <div class="sc-legend"><span><i class="g"></i>أهداف</span><span><i class="a"></i>تمريرات حاسمة</span></div>`
        : '<div class="empty"><div>📈</div><b>لا بيانات بعد</b><p class="muted small">العب أول مباراة ليبدأ رسم مسيرتك.</p></div>';

      const tx = c.transactions || [];
      const inc = tx.filter(x => x.amount > 0).reduce((a, x) => a + Number(x.amount), 0), out = tx.filter(x => x.amount < 0).reduce((a, x) => a + Number(x.amount), 0);
      const txRow = x => { const [ic, lb] = T[x.type] || ['💱', x.type]; const neg = x.amount < 0;
        return `<div class="tx"><span class="tx-i">${ic}</span><div class="grow"><b>${esc(lb)}</b><small class="muted">${esc(String(x.created_at).slice(5, 16))}</small></div>
          <div class="tx-a"><b class="${neg ? 'neg' : 'pos'}">${neg ? '' : '+'}${money(x.amount)}</b><small class="muted">الرصيد ${money(x.balance_after)}</small></div></div>`; };

      box.innerHTML = `
        <div class="panel"><h3>إجمالي المسيرة</h3><div class="ctiles">${tiles.map(([i, v, l]) => `<div><span class="ci">${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div></div>
        <div class="panel"><h3>رف الجوائز</h3>
          ${c.awards.length ? `<div class="shelf">${c.awards.map(a => { const [i, n] = A[a.award] || ['🎖', a.award]; return `<div class="medal"><span>${i}</span><b>${esc(n)}</b><small>الموسم ${a.season_number}</small></div>`; }).join('')}</div>`
            : '<div class="empty slim"><div>🏆</div><b>الرف فارغ</b><p class="muted small">الكرة الذهبية والهداف تُمنح في حفل اليوم 15 من كل موسم.</p></div>'}</div>
        <div class="panel"><h3>الموسم بموسم</h3>${chart}
          ${seasons.length ? `<details class="more"><summary>عرض الجدول</summary><table><tr><th>الموسم</th><th>لعب</th><th>أهداف</th><th>صناعة</th><th>بطولات</th><th>تقييم</th></tr>${(c.seasons || []).map(s => `<tr><td>${s.season_number}</td><td>${s.matches}</td><td>${s.goals}</td><td>${s.assists}</td><td>${s.trophies}</td><td>${s.avg_rating ?? '—'}</td></tr>`).join('')}</table></details>` : ''}</div>
        <div class="panel"><h3>السجل المالي</h3>
          <div class="fin-sum"><div><small>دخل (آخر ${tx.length} معاملة)</small><b class="pos">+${money(inc)}</b></div><div><small>مصروفات</small><b class="neg">${money(out)}</b></div><div><small>الرصيد الحالي</small><b>${money(Hud.player ? Hud.player.balance : 0)}</b></div></div>
          ${tx.length ? `<div class="tx-list">${tx.slice(0, 6).map(txRow).join('')}</div>${tx.length > 6 ? `<details class="more"><summary>عرض الباقي (${tx.length - 6})</summary><div class="tx-list">${tx.slice(6).map(txRow).join('')}</div></details>` : ''}`
            : '<div class="empty slim"><div>🧾</div><b>لا معاملات بعد</b></div>'}</div>`;
    } catch (e) { toast(e.message, true); }
  }

  view(name) {
    ['auth', 'career', 'game'].forEach(v => $('#view-' + v).classList.toggle('hidden', v !== name));
  }

  bindAuth() {
    $$('.tabs button').forEach(b => b.addEventListener('click', () => {
      $$('.tabs button').forEach(x => x.classList.toggle('active', x === b));
      $('#form-login').classList.toggle('hidden', b.dataset.tab !== 'login');
      $('#form-register').classList.toggle('hidden', b.dataset.tab !== 'register');
    }));
    const submit = (sel, path, extra, after) => $(sel).addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target); btn.disabled = true;
      try {
        await Api.call(path, { ...extra, ...Object.fromEntries(new FormData(e.target)) });
        await (after ? after() : this.refresh());
      }
      catch (err) { toast(err.message, true); } finally { btn.disabled = false; }
    });
    submit('#form-login', 'auth.php', { action: 'login' });
    submit('#form-register', 'auth.php', { action: 'register' }, async () => {
      await this.refresh();
      this.tab('market');
      toast('مرحباً بك كلاعب حر في سوق الانتقالات! استعرض عروض الأندية ووقّع أول عقد احترافي 🌟');
    });
    submit('#form-career', 'new_career.php', {}, async () => {
      await this.refresh();
      this.tab('market');
      toast('بدأت مسيرتك كلاعب حر في سوق الانتقالات! وقّع مع ناديك المفضل لبدء الدوري 🌟');
    });
  }

  askDilemma(msg) {
    return new Promise(res => {
      $('#dilemma-text').textContent = msg; $('#dilemma').classList.remove('hidden');
      const done = v => { $('#dilemma').classList.add('hidden'); res(v); };
      $('#dl-rest').onclick = () => done('rest'); $('#dl-start').onclick = () => done('start');
    });
  }

  async refresh() {
    let s;
    try { s = await Api.call('state.php'); }
    catch (e) { if (e.status === 401) return this.view('auth'); toast(e.message, true); return; }
    Api.csrf = s.csrf;
    if (s.needs_career) {
      const sel = $('#seed-select'); sel.length = 1;
      (s.seeds || []).forEach(x => { const snap = JSON.parse(x.snapshot_json || '{}'); sel.add(new Option(`إرث ${snap.name || ''} (${x.legacy_points} نقطة)`, x.id)); });
      return this.view('career');
    }
    this.view('game'); this.render(s);
    if (!this.tabInit) {
      this.tabInit = true;
      if (s.is_free_agent || (s.player && s.player.club && s.player.club.includes('لاعب حر'))) {
        this.tab('market');
      } else {
        this.tab('home');
      }
    }
    if (s.active_match && !this.match.running) this.match.resume(s.active_match);
  }

  render(s) {
    const p = s.player; Hud.update(p);
    const isFree = s.is_free_agent || (p.club && p.club.includes('لاعب حر'));

    $('#hud-season').textContent = s.season ? `${s.season.number ?? s.season.season_number} · اليوم ${s.season.day}/15` + (s.season.status === 'gala_day' ? ' 🏆' : '') : '—';
    $('#player-card').innerHTML = cardHtml(p) +
      (p.is_injured ? `<div class="alert">🩹 مصاب — ${p.injury_days} يوم متبقٍ</div>` : '') +
      (Number(p.energy) <= 35 ? `<div class="alert danger-blink">⚠️ إنذار طبي: طاقة اللاعب (${Number(p.energy).toFixed(0)}%) منخفضة جداً — خطر تعرّض لإصابة عضلية! استرجع طاقتك من تبويب النادي</div>` : '') +
      (isFree
        ? '<div class="alert gold">🌟 أنت لاعب حر في سوق الانتقالات! توجّه إلى <a href="javascript:void(0)" onclick="app.tab(\'market\')" style="color:#facc15;font-weight:bold;text-decoration:underline;">سوق الانتقالات</a> لتوقيع أول عقد احترافي.</div>'
        : (p.transfer_listed ? '<div class="alert">أنت في قائمة الانتقالات (ثقة المدرب منخفضة)</div>' : '')) +
      `<p class="muted small center">أجر المباراة ${money(p.match_wage)}${s.daily_fixed_cost ? ` · مصاريف يومية ثابتة ${money(s.daily_fixed_cost)}` : ''}</p>`;

    const nf = s.next_fixture;
    const tag = f => `${L.comp[f.competition] || ''}${L.stage[f.stage] ? ' · ' + L.stage[f.stage] : ''}`;
    $('#next-card').innerHTML = '<h3>مباراتك القادمة</h3>' + (!isFree && nf
      ? `<div class="tags"><span class="tag gold">${tag(nf)}</span><span class="tag">اليوم ${nf.day} · ${esc(nf.slot_time)}</span>${nf.importance === 'derby' ? '<span class="tag hot">ديربي 🔥</span>' : ''}${nf.importance === 'final' ? '<span class="tag hot">نهائي 🏆</span>' : ''}</div>
         <div class="vs"><div class="team">${crest(nf.home)}${esc(nf.home)}</div><div class="vsmark">VS</div><div class="team">${crest(nf.away)}${esc(nf.away)}</div></div>
         <div class="actions"><button id="btn-play" class="btn primary big">▶ ادخل المباراة</button></div>${s.dev_mode ? '<p class="muted small">وضع التطوير مفعّل</p>' : ''}`
      : `<div class="empty" style="padding:20px 10px;text-align:center;">
           <div style="font-size:36px;margin-bottom:8px;">🌟</div>
           <b style="color:#facc15;font-size:16px;">أنت لاعب حر في سوق الانتقالات</b>
           <p class="muted small" style="margin:6px auto 14px;max-width:320px;">لم توقّع عقداً مع نادٍ بعد. خوض المباريات الرسمية يتطلب الانضمام لأحد أندية الدوري.</p>
           <button class="btn primary" onclick="app.tab('market')">الانتقال لسوق الانتقالات لتوقيع أول عقد ➔</button>
         </div>`);
    $('#btn-play')?.addEventListener('click', e => { e.target.disabled = true; this.match.start().catch(err => { toast(err.message, true); this.refresh(); }); });
    $('#home-player').innerHTML = cardHtml(p) +
      (p.is_injured ? `<div class="alert">🩹 مصاب — ${p.injury_days} يوم</div>` : '') +
      (Number(p.energy) <= 35 ? `<div class="alert danger-blink">⚠️ إنذار: طاقة اللاعب ${Number(p.energy).toFixed(0)}% — خطر إصابة وشيك!</div>` : '');
    const day = s.season ? s.season.day : 0;
    $('#season-box').innerHTML = s.season
      ? `<div>الموسم ${s.season.number ?? s.season.season_number} · اليوم <b>${day}</b> من 15</div><div class="bar"><i style="width:${(day / 15 * 100).toFixed(0)}%"></i></div>
         <div class="muted small">${s.season.status === 'gala_day' ? '🏆 يوم الحفل: لا مباريات — جوائز وتجديد العقود' : 'الموسم الواحد = سنة كروية في مسيرتك'}</div>` : '—';
    const slot = f => `اليوم ${f.day_number} · ${String(f.slot_time).slice(0, 5)}`;
    $('#upcoming').innerHTML = s.upcoming.map(f =>
      `<div class="fx"><b>${esc(f.home_name)} × ${esc(f.away_name)}</b><br><small>${L.comp[f.competition]} ${L.stage[f.stage] ? '· ' + L.stage[f.stage] : ''} · ${slot(f)}${f.importance === 'derby' ? ' · ديربي 🔥' : ''}</small></div>`).join('') || '<span class="muted">لا مباريات قادمة</span>';
    $('#fixtures-full').innerHTML = $('#upcoming').innerHTML;
    $('#recent').innerHTML = s.recent.map(f =>
      `<div class="fx">${esc(f.home_name)} <b>${f.home_score}-${f.away_score}</b> ${esc(f.away_name)}<br><small>${f.log_status === 'finished' ? `⚽${f.goals} 🎯${f.assists} · تقييم ${Number(f.rating).toFixed(1)}` : f.log_status === 'rested' ? 'ارتحت' : 'لم تشارك'}</small></div>`).join('') || '<span class="muted">—</span>';
    const ico = n => n.includes('شاقة') ? '🔥' : n.includes('سريع') ? '⚡' : n.includes('مدرب') ? '🏋️' : '💆';
    $('#shop').innerHTML = s.items.map(i =>
      `<div class="shop-card"><div class="ico">${ico(i.name)}</div><b>${esc(i.name)}</b><small>${esc(i.description)}</small><button class="btn primary" data-item="${i.id}">${money(i.cost_usd)}</button></div>`).join('');
    $$('#shop button').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { const r = await Api.call('recover_stamina.php', { item_id: Number(b.dataset.item) }); Hud.update(r.hud); toast(`تم: ${r.item} — الطاقة ${r.energy.toFixed(0)}%`); Sound.good(); }
      catch (e) { toast(e.message, true); } finally { b.disabled = false; }
    }));
    $('#standings').innerHTML = '<tr><th>#</th><th>النادي</th><th>لعب</th><th>له/عليه</th><th>نقاط</th></tr>' +
      (s.standings || []).map((c, i) => `<tr class="${esc(c.name) === esc(p.club) ? 'me' : ''}"><td>${i + 1}</td><td>${esc(c.name)}</td><td>${c.pl}</td><td>${c.gf}/${c.ga}</td><td><b>${c.pts}</b></td></tr>`).join('');
  }
}

new App();
