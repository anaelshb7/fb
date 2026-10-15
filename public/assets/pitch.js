'use strict';
/* المهاجم الأسطوري — محرك الملعب 2.5D التفاعلي الحي
 * حركة كروية مستمرة 60fps بدون توقف
 * وجوه واقعية للاعبين (بشرة، شعر، حواجب، عيون، شوارب/لحية، ملامح تعبيرية)
 * ظهور الاسم عند التمرير (Hover) أو التثبيت والتركيز التام عند الضغط على اللاعب (Click to toggle Focus)
 * نصف الملعب التكيفي:
 *   - عند هجمتنا: نكون في نصف ملعب الخصم مع ظهور مهاجمينا ووسطنا والمدافعين وحارس الخصم
 *   - عند هجمة الخصم: نتحول لنصف ملعبنا مع ظهور مهاجمي الخصم ومدافعينا وحارس مرمانا الشناوي!
 */

class Pitch {
  static VW = 800;
  static VH = 392;
  static Y0 = 58;
  static Y1 = 384;

  /** إسقاط إحداثيات الملعب (u: عرض 0..1، v: عمق 0=خط المرمى البعيد .. 1=الأقرب) إلى الشاشة */
  static proj(u, v) {
    const s = 0.52 + 0.58 * v;
    return {
      x: Pitch.VW / 2 + (u - 0.5) * 780 * s,
      y: Pitch.Y0 + (Pitch.Y1 - Pitch.Y0) * v,
      s
    };
  }

  static pts(list) {
    return list.map(([u, v]) => {
      const p = Pitch.proj(u, v);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
  }

  static arc(cu, cv, ru, rv, a0, a1, n = 24) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      out.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]);
    }
    return out;
  }

  static ACTION = {
    lob: 'shoot', long_shot: 'shoot', quick_shot: 'shoot',
    ground_pass: 'pass', wall_pass: 'pass', wide_pass: 'pass', pass_out: 'pass',
    dribble_keeper: 'dribble', cut_inside: 'dribble', run_ball: 'dribble', dribble_out: 'dribble',
    mid_through: 'pass', mid_switch: 'pass', mid_pivot: 'dribble',
    def_clear: 'clear', def_press: 'dribble', def_intercept: 'clear',
    clear_ball: 'clear',
  };
  static COLORS = { shoot: '#2dff8f', pass: '#38bdf8', dribble: '#fbbf24', clear: '#c084fc' };

  constructor(host) {
    this.host = host;
    this.rafId = null;
    this.lastTime = performance.now();
    this.inClutch = false;
    this.deliveringToUser = false;
    this.userResolver = null;
    this.passTimer = 0;
    this.minute = 1;

    // الطور التكتيكي: 'attack' (هجمتنا في نصف ملعبهم) أو 'defense' (هجمتهم في نصف ملعبنا)
    this.phase = 'attack';
    this.phaseTimer = 0;

    // اللاعب المركز عليه حالياً (Click to focus / toggle name)
    this.focusedPlayerId = null;

    // أطقم الفريقين الافتراضية (المقاولون العرب: أصفر وأسود | الهلال السعودي: أزرق ملكي وأبيض)
    this.homeKit = { primary: '#facc15', secondary: '#000000', shorts: '#0f172a', number: '#000000' };
    this.awayKit = { primary: '#1d4ed8', secondary: '#ffffff', shorts: '#1d4ed8', number: '#ffffff' };
    this.homeGkKit = { primary: '#10b981', secondary: '#047857', shorts: '#047857', number: '#ffffff' };
    this.awayGkKit = { primary: '#7c3aed', secondary: '#4c1d95', shorts: '#111827', number: '#ffffff' };

    this.initEntities();
    this.build();
    this.bindEvents();
    this.startLoop();
  }

  /** تهيئة قائمة اللاعبين مع ملامح الوجه التفصيلية والتمركزات في نصفي الملعب */
  initEntities() {
    this.players = [
      // 1. المستخدم (أنت) - المقاولون العرب #10
      {
        id: 'me', name: 'فارس العمري', number: 10, role: 'me', team: 'home', kit: this.homeKit,
        face: { skin: '#e0b48c', hairColor: '#1e1b18', hairStyle: 'fade', eyes: '#1e1b18', facialHair: 'beard_trim', brow: 'sharp' },
        attackPos: { u: 0.50, v: 0.62 }, defensePos: { u: 0.50, v: 0.88 },
        u: 0.50, v: 0.62, targetU: 0.50, targetV: 0.62, baseU: 0.50, baseV: 0.62,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 0, facing: 1, kickAnim: 0
      },

      // حارس المقاولون العرب (محمود أبو السعود)
      {
        id: 'h_gk', name: 'محمود أبو السعود', number: 1, role: 'gk', team: 'home', kit: this.homeGkKit,
        face: { skin: '#c68e63', hairColor: '#0f172a', hairStyle: 'short', eyes: '#0f172a', facialHair: 'beard_full', brow: 'heavy' },
        attackPos: { u: 0.50, v: 0.98 }, defensePos: { u: 0.50, v: 0.08 },
        u: 0.50, v: 0.98, targetU: 0.50, targetV: 0.98, baseU: 0.50, baseV: 0.98,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 0.5, facing: 1, kickAnim: 0
      },

      // مدافع المقاولون 1 (أحمد علاء)
      {
        id: 'h_def1', name: 'أحمد علاء', number: 4, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#8d5a3b', hairColor: '#111827', hairStyle: 'crew', eyes: '#111827', facialHair: 'goatee', brow: 'thick' },
        attackPos: { u: 0.34, v: 0.85 }, defensePos: { u: 0.40, v: 0.28 },
        u: 0.34, v: 0.85, targetU: 0.34, targetV: 0.85, baseU: 0.34, baseV: 0.85,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 1.2, facing: 1, kickAnim: 0
      },

      // مدافع المقاولون 2 (جوزيف أوشايا)
      {
        id: 'h_def2', name: 'جوزيف أوشايا', number: 13, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#4a2c11', hairColor: '#0f172a', hairStyle: 'fade', eyes: '#0f172a', facialHair: 'stubble', brow: 'calm' },
        attackPos: { u: 0.72, v: 0.82 }, defensePos: { u: 0.62, v: 0.28 },
        u: 0.72, v: 0.82, targetU: 0.72, targetV: 0.82, baseU: 0.72, baseV: 0.82,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 2.1, facing: 1, kickAnim: 0
      },

      // خط وسط المقاولون الدفاعي (أحمد الشيمي)
      {
        id: 'h_mid1', name: 'أحمد الشيمي', number: 8, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#c68e63', hairColor: '#18181b', hairStyle: 'short', eyes: '#18181b', facialHair: 'clean', brow: 'focused' },
        attackPos: { u: 0.36, v: 0.70 }, defensePos: { u: 0.50, v: 0.46 },
        u: 0.36, v: 0.70, targetU: 0.36, targetV: 0.70, baseU: 0.36, baseV: 0.70,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 3.4, facing: 1, kickAnim: 0
      },

      // وسط المقاولون المحوري (محمد مجلي)
      {
        id: 'h_mid2', name: 'محمد مجلي', number: 14, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#e0b48c', hairColor: '#27272a', hairStyle: 'messy', eyes: '#27272a', facialHair: 'beard_trim', brow: 'sharp' },
        attackPos: { u: 0.65, v: 0.60 }, defensePos: { u: 0.35, v: 0.65 },
        u: 0.65, v: 0.60, targetU: 0.65, targetV: 0.60, baseU: 0.65, baseV: 0.60,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 4.2, facing: 1, kickAnim: 0
      },

      // جناح المقاولون (محمود الشبراوي)
      {
        id: 'h_fwd1', name: 'الشبراوي', number: 11, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#8d5a3b', hairColor: '#09090b', hairStyle: 'curly', eyes: '#09090b', facialHair: 'goatee', brow: 'curved' },
        attackPos: { u: 0.22, v: 0.42 }, defensePos: { u: 0.25, v: 0.82 },
        u: 0.22, v: 0.42, targetU: 0.22, targetV: 0.42, baseU: 0.22, baseV: 0.42,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 5.1, facing: 1, kickAnim: 0
      },

      // رأس حربة المقاولون (محمد سالم)
      {
        id: 'h_fwd2', name: 'محمد سالم', number: 9, role: 'mate', team: 'home', kit: this.homeKit,
        face: { skin: '#f0c9a2', hairColor: '#1c1917', hairStyle: 'fade', eyes: '#1c1917', facialHair: 'beard_full', brow: 'bold' },
        attackPos: { u: 0.76, v: 0.38 }, defensePos: { u: 0.70, v: 0.85 },
        u: 0.76, v: 0.38, targetU: 0.76, targetV: 0.38, baseU: 0.76, baseV: 0.38,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 0.8, facing: 1, kickAnim: 0
      },

      // --- الخصم (الهلال السعودي) ---
      // حارس مرمى الهلال العالمي (ياسين بونو)
      {
        id: 'a_gk', name: 'ياسين بونو', number: 37, role: 'opp_gk', team: 'away', kit: this.awayGkKit,
        face: { skin: '#e0b48c', hairColor: '#18181b', hairStyle: 'fade', eyes: '#18181b', facialHair: 'beard_trim', brow: 'heavy' },
        attackPos: { u: 0.50, v: 0.08 }, defensePos: { u: 0.50, v: 0.98 },
        u: 0.50, v: 0.08, targetU: 0.50, targetV: 0.08, baseU: 0.50, baseV: 0.08,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 1.5, facing: -1, kickAnim: 0
      },

      // صخرة دفاع الهلال (كاليدو كوليبالي)
      {
        id: 'a_def1', name: 'كوليبالي', number: 3, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#3b220c', hairColor: '#09090b', hairStyle: 'crew', eyes: '#09090b', facialHair: 'beard_trim', brow: 'thick' },
        attackPos: { u: 0.42, v: 0.30 }, defensePos: { u: 0.38, v: 0.82 },
        u: 0.42, v: 0.30, targetU: 0.42, targetV: 0.30, baseU: 0.42, baseV: 0.30,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 2.7, facing: -1, kickAnim: 0
      },

      // ظهير أيسر الهلال (رينان لودي)
      {
        id: 'a_def2', name: 'رينان لودي', number: 6, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#f0c9a2', hairColor: '#1c1917', hairStyle: 'fade', eyes: '#1c1917', facialHair: 'beard_trim', brow: 'bold' },
        attackPos: { u: 0.62, v: 0.32 }, defensePos: { u: 0.65, v: 0.80 },
        u: 0.62, v: 0.32, targetU: 0.62, targetV: 0.32, baseU: 0.62, baseV: 0.32,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 3.1, facing: -1, kickAnim: 0
      },

      // ارتكاز الهلال (روبن نيفيز)
      {
        id: 'a_mid1', name: 'روبن نيفيز', number: 8, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#f4d0b0', hairColor: '#2e1c0c', hairStyle: 'short', eyes: '#2e1c0c', facialHair: 'beard_full', brow: 'focused' },
        attackPos: { u: 0.38, v: 0.50 }, defensePos: { u: 0.50, v: 0.45 },
        u: 0.38, v: 0.50, targetU: 0.38, targetV: 0.50, baseU: 0.38, baseV: 0.50,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 4.8, facing: -1, kickAnim: 0
      },

      // وسط الهلال المحوري (ميلينكوفيتش سافيتش)
      {
        id: 'a_mid2', name: 'سافيتش', number: 22, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#f8d7b8', hairColor: '#3b2510', hairStyle: 'fade', eyes: '#3b2510', facialHair: 'beard_trim', brow: 'calm' },
        attackPos: { u: 0.58, v: 0.52 }, defensePos: { u: 0.50, v: 0.35 },
        u: 0.58, v: 0.52, targetU: 0.58, targetV: 0.52, baseU: 0.58, baseV: 0.52,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 5.6, facing: -1, kickAnim: 0
      },

      // جناح الهلال (سالم الدوسري - التورنيدو)
      {
        id: 'a_fwd1', name: 'سالم الدوسري', number: 29, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#c68e63', hairColor: '#1e1b18', hairStyle: 'fade', eyes: '#1e1b18', facialHair: 'beard_trim', brow: 'sharp' },
        attackPos: { u: 0.28, v: 0.66 }, defensePos: { u: 0.30, v: 0.26 },
        u: 0.28, v: 0.66, targetU: 0.28, targetV: 0.66, baseU: 0.28, baseV: 0.66,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 1.9, facing: -1, kickAnim: 0
      },

      // رأس حربة الهلال (ألكسندر ميتروفيتش)
      {
        id: 'a_fwd2', name: 'ميتروفيتش', number: 9, role: 'opp', team: 'away', kit: this.awayKit,
        face: { skin: '#f4d0b0', hairColor: '#18181b', hairStyle: 'short', eyes: '#18181b', facialHair: 'beard_full', brow: 'bold' },
        attackPos: { u: 0.68, v: 0.68 }, defensePos: { u: 0.70, v: 0.24 },
        u: 0.68, v: 0.68, targetU: 0.68, targetV: 0.68, baseU: 0.68, baseV: 0.68,
        vx: 0, vy: 0, runPhase: 0, idlePhase: 3.8, facing: -1, kickAnim: 0
      }
    ];

    // الكرة الحية
    this.ball = {
      u: 0.65,
      v: 0.60,
      h: 0,
      targetU: 0.65,
      targetV: 0.60,
      speed: 0.55,
      carrierId: 'h_mid2',
      inAir: false,
      airApex: 0,
      spin: 0
    };
  }

  setLineups(lineups) {
    if (!lineups) return;
    const hClub = lineups.home?.club || '';
    const aClub = lineups.away?.club || '';

    // تحديث أطقم الفريقين بحسب الأندية المتنافسة
    if (hClub.includes('المقاولون')) {
      this.homeKit = { primary: '#facc15', secondary: '#000000', shorts: '#0f172a', number: '#000000' };
      this.homeGkKit = { primary: '#10b981', secondary: '#047857', shorts: '#047857', number: '#ffffff' };
    } else if (hClub.includes('الهلال')) {
      this.homeKit = { primary: '#1d4ed8', secondary: '#ffffff', shorts: '#1d4ed8', number: '#ffffff' };
      this.homeGkKit = { primary: '#7c3aed', secondary: '#4c1d95', shorts: '#111827', number: '#ffffff' };
    } else if (hClub.includes('الأهلي')) {
      this.homeKit = { primary: '#d62839', secondary: '#ffffff', shorts: '#ffffff', number: '#ffffff' };
      this.homeGkKit = { primary: '#10b981', secondary: '#047857', shorts: '#047857', number: '#ffffff' };
    }

    if (aClub.includes('الهلال')) {
      this.awayKit = { primary: '#1d4ed8', secondary: '#ffffff', shorts: '#1d4ed8', number: '#ffffff' };
      this.awayGkKit = { primary: '#7c3aed', secondary: '#4c1d95', shorts: '#111827', number: '#ffffff' };
    } else if (aClub.includes('الزمالك')) {
      this.awayKit = { primary: '#f8fafc', secondary: '#dc2626', shorts: '#f8fafc', number: '#dc2626' };
      this.awayGkKit = { primary: '#f59e0b', secondary: '#b45309', shorts: '#111827', number: '#ffffff' };
    } else if (aClub.includes('إنبي')) {
      this.awayKit = { primary: '#1e3a8a', secondary: '#f97316', shorts: '#1e3a8a', number: '#ffffff' };
      this.awayGkKit = { primary: '#059669', secondary: '#047857', shorts: '#111827', number: '#ffffff' };
    }

    if (lineups.home && lineups.home.players) {
      lineups.home.players.forEach(p => {
        const found = this.players.find(x => x.id === p.id);
        if (found) {
          found.name = p.name;
          found.number = p.number;
          found.kit = (found.role === 'gk') ? this.homeGkKit : this.homeKit;
        }
      });
    }
    if (lineups.away && lineups.away.players) {
      lineups.away.players.forEach(p => {
        const found = this.players.find(x => x.id === p.id);
        if (found) {
          found.name = p.name;
          found.number = p.number;
          found.kit = (found.role === 'opp_gk') ? this.awayGkKit : this.awayKit;
        }
      });
    }

    this.rebuildActors();
  }

  rebuildActors() {
    if (!this.actors) return;
    this.actors.innerHTML = this.players.map(p => this.playerSvg(p)).join('') + this.ballSvg();
    this.updatePlayerLabels();
    this.applyPhaseFormations(false);
  }

  build() {
    const { VW, VH } = Pitch;
    const bands = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = i / N, b = (i + 1) / N;
      bands.push(`<polygon points="${Pitch.pts([[0, a], [1, a], [1, b], [0, b]])}" fill="${i % 2 ? '#1b9a46' : '#168a3d'}"/>`);
    }
    const line = (list, extra = '') => `<polyline points="${Pitch.pts(list)}" fill="none" ${extra}/>`;
    const L = 'stroke="#eafff2" stroke-opacity=".75" stroke-width="2" stroke-linejoin="round"';
    const g1 = Pitch.proj(0.43, 0.02), g2 = Pitch.proj(0.57, 0.02), gh = 30 * g1.s;
    const crowd = Array.from({ length: 70 }, (_, i) => {
      const x = (i * 97) % VW, y = 22 + ((i * 53) % 34), c = ['#ef4444', '#f8fafc', '#38bdf8', '#fbbf24', '#2dff8f'][i % 5];
      return `<circle cx="${x}" cy="${y}" r="2.2" fill="${c}" opacity=".55"/>`;
    }).join('');

    this.host.innerHTML = `
      <svg class="pitch-svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="ملعب المباراة">
        <defs>
          <radialGradient id="pg-light" cx="50%" cy="0%" r="90%">
            <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="pg-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#021008" stop-opacity=".55"/>
            <stop offset=".35" stop-color="#021008" stop-opacity="0"/>
          </linearGradient>
          <filter id="pg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <marker id="pg-arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="context-stroke"/>
          </marker>
        </defs>
        <rect y="0" width="${VW}" height="${Pitch.Y0 + 6}" fill="#050d1a" opacity=".55"/>
        ${crowd}
        <rect x="0" y="${Pitch.Y0 - 14}" width="${VW}" height="9" fill="#0b3b66"/><rect x="0" y="${Pitch.Y0 - 14}" width="${VW}" height="2" fill="#38bdf8" opacity=".8"/>
        <g>${bands.join('')}</g>
        <polygon points="${Pitch.pts([[0, 0], [1, 0], [1, 1], [0, 1]])}" fill="url(#pg-fade)"/>
        <g ${L} class="field-lines">
          ${line([[0, 0.02], [1, 0.02]])}
          ${line([[0.2, 0.02], [0.2, 0.34], [0.8, 0.34], [0.8, 0.02]])}
          ${line([[0.37, 0.02], [0.37, 0.12], [0.63, 0.12], [0.63, 0.02]])}
          ${line(Pitch.arc(0.5, 0.34, 0.12, 0.07, 0, Math.PI))}
          ${line(Pitch.arc(0.5, 1.12, 0.2, 0.2, Math.PI, Math.PI * 2))}
        </g>
        <circle cx="${Pitch.proj(0.5, 0.23).x}" cy="${Pitch.proj(0.5, 0.23).y}" r="2.5" fill="#eafff2" opacity=".8"/>
        <g class="goal">
          <rect id="goal-frame" x="${g1.x}" y="${g1.y - gh}" width="${g2.x - g1.x}" height="${gh}" fill="rgba(255,255,255,.08)" stroke="#fff" stroke-width="2.5"/>
          <path d="M${g1.x} ${g1.y - gh * .5}H${g2.x}M${g1.x} ${g1.y - gh * .25}H${g2.x}" stroke="#fff" stroke-opacity=".35"/>
        </g>
        <rect width="${VW}" height="${VH}" fill="url(#pg-light)" pointer-events="none"/>
        <g id="pg-lines" pointer-events="none"></g>
        <g id="pg-actors"></g>
      </svg>
      <div id="phase-badge" class="pitch-mode-badge" aria-live="polite">
        <span class="dot"></span>
        <span id="phase-badge-txt">⚡ هجمة لنا (نصف ملعب الخصم)</span>
      </div>
      <div class="pitch-click-hint">👆 اضغط على أي لاعب لتثبيت اسمه والتركيز عليه</div>
      <div id="pass-banner" class="pitch-pass-banner" aria-live="polite">
        <span class="pulse-ball">⚽</span>
        <span id="pass-banner-txt">تمريرة بينية قادمة إليك...</span>
      </div>
      <div class="pitch-goal-flash hidden" aria-hidden="true"><span class="goal-text">جووول!</span></div>`;

    this.lines = this.host.querySelector('#pg-lines');
    this.actors = this.host.querySelector('#pg-actors');
    this.flash = this.host.querySelector('.pitch-goal-flash');
    this.passBanner = this.host.querySelector('#pass-banner');
    this.passBannerTxt = this.host.querySelector('#pass-banner-txt');
    this.phaseBadge = this.host.querySelector('#phase-badge');
    this.phaseBadgeTxt = this.host.querySelector('#phase-badge-txt');

    // توليد عناصر اللاعبين والكرة
    this.actors.innerHTML = this.players.map(p => this.playerSvg(p)).join('') + this.ballSvg();

    // تطبيق التشكيلة المبدئية لنصف الملعب
    this.applyPhaseFormations(false);
  }

  /**
   * رسم وجه اللاعب المفصل والواقعي بتقنية SVG:
   * ملامح بشرة وظلال، عيون وبؤبؤ، حواجب حادة، شعر مخصص بتصفيفات متنوعة، ولحية/شوارب/دوجلاس
   */
  faceSvg(face, isGk) {
    const { skin, hairColor, hairStyle, eyes, facialHair, brow } = face;

    // حواجب
    const browSvg = brow === 'heavy'
      ? `<path d="M-6 -68 Q-3 -70 0 -68 M6 -68 Q3 -70 0 -68" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round"/>`
      : brow === 'sharp'
        ? `<path d="M-7 -68.5 L-2 -69.5 M7 -68.5 L2 -69.5" fill="none" stroke="${hairColor}" stroke-width="1.5" stroke-linecap="round"/>`
        : `<path d="M-6 -68 Q-3 -69 -1 -68 M6 -68 Q3 -69 1 -68" fill="none" stroke="${hairColor}" stroke-width="1.3" stroke-linecap="round"/>`;

    // عيون وبؤبؤ وبريق
    const eyesSvg = `
      <circle cx="-3.5" cy="-65" r="1.5" fill="#ffffff"/>
      <circle cx="3.5" cy="-65" r="1.5" fill="#ffffff"/>
      <circle cx="-3.5" cy="-65" r="0.9" fill="${eyes}"/>
      <circle cx="3.5" cy="-65" r="0.9" fill="${eyes}"/>
      <circle cx="-3.8" cy="-65.3" r="0.35" fill="#ffffff"/>
      <circle cx="3.2" cy="-65.3" r="0.35" fill="#ffffff"/>
    `;

    // الأنف والفم
    const noseAndMouthSvg = `
      <path d="M0 -65 L0.5 -62.5 L-0.5 -62" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M-2.5 -59 Q0 -58 2.5 -59" fill="none" stroke="#991b1b" stroke-width="1.1" stroke-linecap="round"/>
    `;

    // شعر اللاعب حسب الستايل
    let hairSvg = '';
    if (hairStyle === 'fade') {
      hairSvg = `
        <path d="M-9.5 -65 a9.5 9.5 0 0 1 19 0 c-1 -5 -18 -5 -19 0 z" fill="${hairColor}"/>
        <path d="M-8 -68 Q0 -75 8 -68 Q0 -71 -8 -68" fill="${hairColor}"/>
      `;
    } else if (hairStyle === 'curly' || hairStyle === 'tall_curly') {
      hairSvg = `
        <path d="M-9.5 -64 a10.5 10.5 0 0 1 19 0 c-2 -7 -17 -7 -19 0 z" fill="${hairColor}"/>
        <circle cx="-6" cy="-72" r="3.2" fill="${hairColor}"/>
        <circle cx="0" cy="-73.5" r="3.5" fill="${hairColor}"/>
        <circle cx="6" cy="-72" r="3.2" fill="${hairColor}"/>
      `;
    } else if (hairStyle === 'side_part') {
      hairSvg = `
        <path d="M-9 -64 Q-6 -74 8 -68 Q4 -74 -9 -64 Z" fill="${hairColor}"/>
      `;
    } else { // short / crew
      hairSvg = `
        <path d="M-9.5 -65 a9.5 9.5 0 0 1 19 0 c-2 -5 -17 -5 -19 0 z" fill="${hairColor}"/>
      `;
    }

    // لحية وشوارب
    let beardSvg = '';
    if (facialHair === 'beard_full') {
      beardSvg = `
        <path d="M-7 -61 C-7 -54 7 -54 7 -61 C5 -56 -5 -56 -7 -61 Z" fill="${hairColor}" opacity=".9"/>
        <path d="M-3.5 -60.5 Q0 -60 3.5 -60.5" fill="none" stroke="${hairColor}" stroke-width="1.2" stroke-linecap="round"/>
      `;
    } else if (facialHair === 'beard_trim') {
      beardSvg = `
        <path d="M-6 -61 C-5 -55 5 -55 6 -61 C4 -57 -4 -57 -6 -61 Z" fill="${hairColor}" opacity=".75"/>
        <path d="M-2.5 -60.5 Q0 -60.2 2.5 -60.5" fill="none" stroke="${hairColor}" stroke-width="0.9" stroke-linecap="round"/>
      `;
    } else if (facialHair === 'goatee') {
      beardSvg = `
        <ellipse cx="0" cy="-57" rx="2.5" ry="2" fill="${hairColor}" opacity=".9"/>
        <path d="M-2.5 -60.5 Q0 -60 2.5 -60.5" fill="none" stroke="${hairColor}" stroke-width="1.1" stroke-linecap="round"/>
      `;
    } else if (facialHair === 'stubble') {
      beardSvg = `
        <path d="M-6 -61 C-5 -55 5 -55 6 -61 C4 -57 -4 -57 -6 -61 Z" fill="${hairColor}" opacity=".4"/>
      `;
    }

    return `
      <!-- رأس وظلال الوجه -->
      <g class="face-group">
        <circle cx="0" cy="-64" r="9.5" fill="${skin}"/>
        <!-- ظل الوجنتين -->
        <ellipse cx="-5" cy="-62" rx="2.2" ry="1.2" fill="rgba(0,0,0,0.06)"/>
        <ellipse cx="5" cy="-62" rx="2.2" ry="1.2" fill="rgba(0,0,0,0.06)"/>
        <!-- الأذنان -->
        <circle cx="-9.5" cy="-64" r="2.2" fill="${skin}"/>
        <circle cx="9.5" cy="-64" r="2.2" fill="${skin}"/>
        <!-- العينان والحواجب -->
        ${browSvg}
        ${eyesSvg}
        <!-- الأنف والفم -->
        ${noseAndMouthSvg}
        <!-- اللحية أو الشوارب -->
        ${beardSvg}
        <!-- الشعر -->
        ${hairSvg}
        <!-- شريط الرأس لحارس المرمى إن وجد -->
        ${isGk ? '<rect x="-10" y="-68" width="20" height="2.5" rx="1" fill="#0f172a"/>' : ''}
      </g>
    `;
  }

  playerSvg(p) {
    const isMe = p.role === 'me';
    const isGk = p.role === 'gk' || p.role === 'opp_gk';

    // شارة الاسم فوق رأس اللاعب مع رقم القميص
    // ملاحظة: تظهر عند الـ Focus أو الـ Hover بالـ CSS
    const namePill = isMe
      ? `<g class="name-badge is-me">
           <rect x="-46" y="-98" width="92" height="24" rx="12" fill="#04120a" stroke="#2dff8f" stroke-width="2" filter="url(#pg-glow)"/>
           <text x="0" y="-82" text-anchor="middle" font-size="12" font-weight="900" fill="#2dff8f" letter-spacing=".3">★ ${p.name} #${p.number}</text>
         </g>
         <ellipse class="me-ring" cx="0" cy="2" rx="30" ry="10" fill="none" stroke="#2dff8f" stroke-width="3" filter="url(#pg-glow)"/>
         <path class="me-beacon" d="M0 -106 L-5 -115 L5 -115 Z" fill="#2dff8f"/>`
      : p.team === 'home'
        ? `<g class="name-badge is-mate">
             <rect x="-42" y="-92" width="84" height="22" rx="11" fill="rgba(4,18,10,0.92)" stroke="#38bdf8" stroke-width="1.4"/>
             <text x="0" y="-77" text-anchor="middle" font-size="11.5" font-weight="800" fill="#e0f2fe">${p.name} #${p.number}</text>
           </g>`
        : `<g class="name-badge is-opp">
             <rect x="-42" y="-92" width="84" height="22" rx="11" fill="rgba(15,23,42,0.92)" stroke="#f43f5e" stroke-width="1.4"/>
             <text x="0" y="-77" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fecdd3">${p.name} #${p.number}</text>
           </g>`;

    // حلقة التركيز الذهبية الخاصة بالـ Click
    const focusSpot = `
      <g class="focus-indicator" style="display:none">
        <ellipse class="focus-spotlight" cx="0" cy="2" rx="34" ry="12" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="6 4"/>
        <path d="M0 -105 L-5 -114 L5 -114 Z" fill="#fbbf24"/>
      </g>
    `;

    return `
      <g class="actor ${p.role} ${p.team}" id="pa-${p.id}" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name} رقم ${p.number}">
        ${focusSpot}
        ${namePill}
        <!-- ظل اللاعب على العشب -->
        <ellipse cx="0" cy="2" rx="17" ry="5.5" fill="#000" opacity=".4"/>
        
        <!-- القدمان مع انيميشن حركة الجري والانسيابية -->
        <g class="legs">
          <g class="leg leg-l">
            <rect x="-8" y="-22" width="6" height="23" rx="3" fill="${p.kit.shorts}"/>
            <rect x="-8.5" y="-6" width="7" height="8" rx="2" fill="#0f172a"/>
          </g>
          <g class="leg leg-r">
            <rect x="2" y="-22" width="6" height="23" rx="3" fill="${p.kit.shorts}"/>
            <rect x="1.5" y="-6" width="7" height="8" rx="2" fill="#0f172a"/>
          </g>
        </g>
        
        <!-- التيشيرت مع الرقم البارز بوضوح على الصدر/الظهر -->
        <g class="body-torso">
          <rect x="-14" y="-54" width="28" height="34" rx="9" fill="${p.kit.primary}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
          <path d="M-8 -54 L0 -46 L8 -54" fill="none" stroke="${p.kit.secondary}" stroke-width="2.5" stroke-linecap="round"/>
          <text class="jersey-num" x="0" y="-28" text-anchor="middle" font-size="16" font-weight="900" fill="${p.kit.number}" letter-spacing="-.5">${p.number}</text>
        </g>

        <!-- الوجه الواقعي والملامح والشعر -->
        ${this.faceSvg(p.face, isGk)}
      </g>
    `;
  }

  ballSvg() {
    return `
      <g id="pa-ball" class="actor ball">
        <ellipse id="ball-shadow" cx="0" cy="2" rx="7.5" ry="3" fill="#000" opacity=".45"/>
        <g id="ball-sphere">
          <circle cx="0" cy="-7" r="7" fill="#ffffff" stroke="#111827" stroke-width="1.2"/>
          <path d="M0 -11 L3.5 -8.5 L2 -4.5 L-2 -4.5 L-3.5 -8.5 Z" fill="#111827"/>
          <path d="M3.5 -8.5 L6.5 -9 M2 -4.5 L4.5 -2.5 M-2 -4.5 L-4.5 -2.5 M-3.5 -8.5 L-6.5 -9" stroke="#111827" stroke-width="1" stroke-linecap="round"/>
        </g>
      </g>`;
  }

  bindEvents() {
    // الضغط على اللاعب لتثبيت الاسم والتركيز عليه أو إخفائه إذا ضغط عليه مرة أخرى
    this.actors.addEventListener('click', (e) => {
      const actorEl = e.target.closest('.actor');
      if (!actorEl || actorEl.id === 'pa-ball') return;
      const pid = actorEl.dataset.id;
      if (!pid) return;
      this.togglePlayerFocus(pid);
    });
  }

  /** الضغط لتثبيت الاسم والتركيز: ضغطة أولى تُثبت، ضغطة ثانية تُخفي */
  togglePlayerFocus(pid) {
    if (this.focusedPlayerId === pid) {
      // إزالة التركيز وإخفاء الاسم الثابت
      this.focusedPlayerId = null;
    } else {
      this.focusedPlayerId = pid;
    }
    this.syncFocusUi();
  }

  syncFocusUi() {
    this.players.forEach(p => {
      const el = this.actors.querySelector('#pa-' + p.id);
      if (!el) return;
      const isFocused = (this.focusedPlayerId === p.id);
      el.classList.toggle('focused', isFocused);

      const badge = el.querySelector('.name-badge');
      if (badge) {
        // المستخدم (me) يبقى اسمه بارزاً دائماً أو نثبته، وباقي اللاعبين يثبت اسمهم بالتركيز
        if (p.role === 'me') {
          badge.classList.add('badge-visible');
        } else {
          badge.classList.toggle('badge-visible', isFocused);
        }
      }

      const focusIndicator = el.querySelector('.focus-indicator');
      if (focusIndicator) {
        focusIndicator.style.display = isFocused ? 'block' : 'none';
      }
    });
  }

  updatePlayerLabels() {
    this.players.forEach(p => {
      const el = this.actors.querySelector('#pa-' + p.id);
      if (!el) return;
      const tName = el.querySelector('.name-badge text');
      if (tName) {
        tName.textContent = p.role === 'me' ? `★ ${p.name} #${p.number}` : `${p.name} #${p.number}`;
      }
      const tNum = el.querySelector('.jersey-num');
      if (tNum) tNum.textContent = p.number;
    });
  }

  /** إجراء تبديل للاعب على أرض الملعب مع تأثيرات بصرية وتحديث الاسم والرقم */
  substitutePlayer(team, playerOutId, newPlayerData) {
    if (!newPlayerData) return;
    let target = this.players.find(x => x.id === playerOutId || (x.team === team && x.number === newPlayerData.out_number));
    if (!target) {
      // محاولة مطابقة بالاسم
      target = this.players.find(x => x.team === team && (x.role === 'mate' || x.role === 'opp'));
    }
    if (!target) return;

    const el = this.actors.querySelector('#pa-' + target.id);
    if (el) {
      el.style.transition = 'opacity .4s ease, transform .4s ease';
      el.style.opacity = '0.2';
      el.style.transform += ' scale(0.7)';
      setTimeout(() => {
        target.name = newPlayerData.name;
        target.number = newPlayerData.number;
        if (target.id === 'me' || target.role === 'me') {
          target.role = 'mate';
          target.id = newPlayerData.id || 'sub_h_koka';
        }
        if (newPlayerData.face) {
          target.face = { ...target.face, ...newPlayerData.face };
        }
        const temp = document.createElement('div');
        temp.innerHTML = this.playerSvg(target);
        const freshEl = temp.firstElementChild;
        if (freshEl && el.parentNode) {
          el.parentNode.replaceChild(freshEl, el);
          freshEl.classList.add('subbed-in-beacon');
          setTimeout(() => freshEl.classList.remove('subbed-in-beacon'), 3000);
        }
        this.syncFocusUi();
      }, 400);
    }
  }

  /**
   * تبديل نصف الملعب التكيفي:
   *  - 'attack'  : الهجمة لنا (في نصف ملعب الخصم)، المرمى في الأعلى هو مرمى الخصم (عواد).
   *  - 'defense' : الهجمة للخصم (في نصف ملعبنا)، المرمى في الأعلى هو مرمانا (الشناوي).
   *  - 'midfield': صراع واستحواذ في دائرة المنتصف (Center Circle) وبناء اللعب.
   */
  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.applyPhaseFormations(true);

    if (this.phaseBadge && this.phaseBadgeTxt) {
      this.phaseBadge.classList.remove('is-defense', 'is-midfield');
      if (phase === 'attack') {
        this.phaseBadgeTxt.textContent = '⚡ هجمة لنا (نصف ملعب الخصم)';
      } else if (phase === 'defense') {
        this.phaseBadge.classList.add('is-defense');
        this.phaseBadgeTxt.textContent = '🛡️ هجمة للخصم (نصف ملعبنا - الدفاع والحارس)';
      } else {
        this.phaseBadge.classList.add('is-midfield');
        this.phaseBadgeTxt.textContent = '⚙️ صراع وسط الملعب (بناء اللعب والاستحواذ)';
      }
    }
  }

  applyPhaseFormations(animate = true) {
    const ph = this.phase;
    const isAtt = (ph === 'attack');
    const isMid = (ph === 'midfield');

    const midfieldPos = {
      me: { u: 0.50, v: 0.52 },
      h_gk: { u: 0.50, v: 0.98 },
      h_def1: { u: 0.38, v: 0.76 },
      h_def2: { u: 0.65, v: 0.74 },
      h_mid1: { u: 0.36, v: 0.60 },
      h_mid2: { u: 0.64, v: 0.48 },
      h_fwd1: { u: 0.24, v: 0.38 },
      h_fwd2: { u: 0.74, v: 0.36 },
      a_gk: { u: 0.50, v: 0.05 },
      a_def1: { u: 0.46, v: 0.32 },
      a_def2: { u: 0.62, v: 0.34 },
      a_mid1: { u: 0.42, v: 0.46 },
      a_mid2: { u: 0.58, v: 0.48 },
      a_fwd1: { u: 0.28, v: 0.60 },
      a_fwd2: { u: 0.70, v: 0.62 }
    };

    this.players.forEach(p => {
      const coords = isMid ? (midfieldPos[p.id] || p.attackPos) : (isAtt ? p.attackPos : p.defensePos);
      p.baseU = coords.u;
      p.baseV = coords.v;
      p.targetU = coords.u;
      p.targetV = coords.v;

      if (!animate) {
        p.u = coords.u;
        p.v = coords.v;
      }

      const el = this.actors.querySelector('#pa-' + p.id);
      if (!el) return;

      let visible = true;
      if (isMid) {
        if (p.id === 'h_gk' || p.id === 'a_gk') visible = false;
      } else if (isAtt) {
        if (p.id === 'h_gk') visible = false;
        else if (p.id === 'a_fwd1' || p.id === 'a_fwd2') visible = false;
      } else {
        if (p.id === 'a_gk') visible = false;
        else if (p.id === 'h_fwd2') visible = false;
      }

      el.classList.toggle('hidden-phase', !visible);
      el.classList.toggle('visible-phase', visible);
    });

    // تبديل ألوان شباك المرمى في الأعلى
    const goalFrame = this.host.querySelector('#goal-frame');
    if (goalFrame) {
      goalFrame.setAttribute('stroke', isAtt ? '#f8fafc' : (isMid ? '#38bdf8' : '#ef4444'));
    }
  }

  startLoop() {
    if (this.rafId) return;
    const tick = (now) => {
      const dt = Math.min(0.08, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.updateSimulation(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * محاكاة الحركة المستمرة 60fps بدون توقف:
   * حركة حية دائمة لكل اللاعبين (تأرجح، حركة بدون كرة، جري مستمر)،
   * تمريرات دورية حية بين الزملاء (أو بين لاعبي الخصم عند الدفاع)،
   * وتبديل نصف الملعب بسلاسة.
   */
  updateSimulation(dt) {
    // 1. التناوب الديناميكي على نصف الملعب كل 14-18 ثانية (أو حسب مجريات الدقيقة) ما لم تكن هناك لحظة حاسمة
    if (!this.inClutch && !this.deliveringToUser) {
      this.phaseTimer += dt;
      if (this.phaseTimer > 15) {
        this.phaseTimer = 0;
        this.setPhase(this.phase === 'attack' ? 'defense' : 'attack');
      }

      this.passTimer += dt;
      // كل 2.6 ثوانٍ، تُمرر الكرة بسلاسة بين اللاعبين
      if (this.passTimer > 2.6) {
        this.passTimer = 0;
        this.triggerRoutinePass();
      }
    }

    // 2. تحديث حركة اللاعبين المستمرة (حتى بدون كرة: تنفس، تأهب، حركة تكتيكية حية)
    this.players.forEach(p => {
      p.idlePhase = (p.idlePhase || 0) + dt * 2.2;

      // نبض الحركة التكتيكية الحية الدائمة (Micro-movement) حتى لا يقف أي لاعب ساكناً إطلاقاً
      const idleU = Math.sin(p.idlePhase + p.number) * 0.012;
      const idleV = Math.cos(p.idlePhase * 0.8 + p.number) * 0.008;

      const destU = p.targetU + idleU;
      const destV = p.targetV + idleV;

      const dx = destU - p.u;
      const dy = destV - p.v;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.002) {
        const isCarrier = (p.id === this.ball.carrierId);
        const spd = isCarrier ? 0.38 : (p.id === 'me' ? 0.32 : 0.25);
        const step = Math.min(dist, spd * dt);
        p.u += (dx / dist) * step;
        p.v += (dy / dist) * step;
        p.runPhase += dt * 14;
        p.facing = dx >= 0 ? 1 : -1;
      } else {
        // حركة أقدام خفيفة مستمرة تدل على التأهب والجاهزية
        p.runPhase += dt * 3.5;
      }

      // تراجع تأثير انيميشن الركل
      if (p.kickAnim > 0) {
        p.kickAnim -= dt * 4;
        if (p.kickAnim < 0) p.kickAnim = 0;
      }
    });

    // 3. تحديث مسار الكرة المستمر
    const ball = this.ball;
    const me = this.players.find(p => p.id === 'me');
    const bdx = ball.targetU - ball.u;
    const bdy = ball.targetV - ball.v;
    const bdist = Math.hypot(bdx, bdy);

    if (bdist > 0.008) {
      const bspd = ball.speed || 0.65;
      const bstep = Math.min(bdist, bspd * dt);
      ball.u += (bdx / bdist) * bstep;
      ball.v += (bdy / bdist) * bstep;
      ball.spin += dt * 28;

      // قوس الارتفاع الهوائي للكرة
      if (ball.inAir) {
        const prog = 1 - (bdist / (ball.totalDist || 0.1));
        ball.h = Math.sin(prog * Math.PI) * (ball.airApex || 0.14);
      } else {
        ball.h = 0;
      }

      // إذا كانت التمريرة الحاسمة متجهة للمستخدم واقتربت من قدمه (الاستلام الحاسم!)
      if (this.deliveringToUser && me) {
        const toMe = Math.hypot(me.u - ball.u, me.v - ball.v);
        if (toMe < 0.038) {
          this.deliveringToUser = false;
          ball.carrierId = 'me';
          ball.u = me.u + 0.02;
          ball.v = me.v + 0.01;
          ball.h = 0;
          ball.inAir = false;

          // إخفاء شريط التمريرة وتنبيه واجهة اللحظة الحاسمة فوراً!
          if (this.passBanner) this.passBanner.classList.remove('show');
          if (typeof this.userResolver === 'function') {
            const res = this.userResolver;
            this.userResolver = null;
            res();
          }
        }
      }
    } else {
      // الكرة عند اللاعب الحامل
      ball.h = 0;
      ball.inAir = false;
      if (ball.targetCarrier) {
        ball.carrierId = ball.targetCarrier;
        ball.targetCarrier = null;
      }
      if (ball.carrierId) {
        const carrier = this.players.find(p => p.id === ball.carrierId);
        if (carrier) {
          ball.u = carrier.u + 0.02 * carrier.facing;
          ball.v = carrier.v + 0.01;
        }
      }
    }
  }

  /** تمريرات كروية متبادلة مستمرة وواقعية حسب نصف الملعب النشط */
  triggerRoutinePass() {
    const isAtt = (this.phase === 'attack');
    const team = isAtt ? 'home' : 'away';

    // اللاعبون المتاحون للتمرير في نصف الملعب الحالي
    const activePlayers = this.players.filter(p => {
      if (p.team !== team) return false;
      if (isAtt && p.id === 'h_gk') return false;
      if (!isAtt && p.id === 'a_gk') return false;
      return true;
    });

    const carrier = this.players.find(p => p.id === this.ball.carrierId);
    if (!carrier || carrier.team !== team) {
      // إعطاء الكرة لأحد اللاعبين المؤهلين
      const next = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      if (next) this.passBallTo(next.id, 0.45);
      return;
    }

    const candidates = activePlayers.filter(m => m.id !== carrier.id);
    const receiver = candidates[Math.floor(Math.random() * candidates.length)];
    if (receiver) {
      carrier.kickAnim = 1;
      this.passBallTo(receiver.id, 0.52);
      this.driftFormation(receiver.u, receiver.v);
    }
  }

  driftFormation(targetU, targetV) {
    this.players.forEach(p => {
      if (p.id === 'h_gk' || p.id === 'a_gk') return;
      const jitterU = (Math.random() - 0.5) * 0.05;
      const jitterV = (Math.random() - 0.5) * 0.03;
      p.targetU = Math.max(0.12, Math.min(0.88, p.baseU + jitterU + (targetU - 0.5) * 0.12));
      p.targetV = Math.max(0.18, Math.min(0.92, p.baseV + jitterV + (targetV - 0.5) * 0.08));
    });
  }

  passBallTo(playerId, speed = 0.55, inAir = false) {
    const target = this.players.find(p => p.id === playerId);
    if (!target) return;
    this.ball.carrierId = null;
    this.ball.targetCarrier = playerId;
    this.ball.targetU = target.u + 0.015;
    this.ball.targetV = target.v + 0.01;
    this.ball.speed = speed;
    this.ball.inAir = inAir;
    this.ball.airApex = inAir ? 0.16 : 0;
    this.ball.totalDist = Math.hypot(this.ball.targetU - this.ball.u, this.ball.targetV - this.ball.v);
  }

  /**
   * تمريرة حاسمة موجهة للمستخدم:
   * تضمن التحول الفوري لنصف ملعب الخصم (attack)،
   * تمرير الكرة من الزميل بانسيابية تامة، وعند وصولها إلى قدم المستخدم تنطلق اللحظة الحاسمة!
   */
  deliverBallToUser(clutch) {
    return new Promise(resolve => {
      // ضبط طور الملعب بحسب منطقة الفرصة
      const zone = (clutch && clutch.zone) || 'attack';
      if (zone === 'defense') {
        this.setPhase('defense');
      } else if (zone === 'midfield') {
        this.setPhase('midfield');
      } else {
        this.setPhase('attack');
      }

      this.inClutch = true;
      this.deliveringToUser = true;
      this.userResolver = resolve;

      // تحديد الزميل الممرر
      const passerId = (clutch && clutch.passer && clutch.passer.id) || (zone === 'defense' ? 'h_def1' : (zone === 'midfield' ? 'h_mid1' : 'h_mid2'));
      let passer = this.players.find(p => p.id === passerId) || this.players.find(p => p.id === 'h_mid2');
      const me = this.players.find(p => p.id === 'me');

      // تمركز تكتيكي للموقف حسب المنطقة
      if (zone === 'defense') {
        me.targetU = 0.48;
        me.targetV = 0.42;
      } else if (zone === 'midfield') {
        me.targetU = 0.50;
        me.targetV = 0.52;
      } else {
        me.targetU = 0.50;
        me.targetV = 0.56;
      }

      if (passer && passer.id !== 'me') {
        passer.u = Math.min(0.72, me.targetU + 0.16);
        passer.v = me.targetV + 0.10;
        passer.targetU = passer.u;
        passer.targetV = passer.v;
        passer.kickAnim = 1;
        this.ball.u = passer.u;
        this.ball.v = passer.v;
      } else {
        passer = me;
      }

      // تموضع الخصوم بحسب الموقف
      const aGk = this.players.find(p => p.id === 'a_gk');
      if (aGk) { aGk.targetU = 0.50; aGk.targetV = (zone === 'defense' ? 0.98 : 0.08); }
      const aDef1 = this.players.find(p => p.id === 'a_def1');
      if (aDef1) { aDef1.targetU = 0.44; aDef1.targetV = (zone === 'defense' ? 0.75 : 0.38); }
      const aDef2 = this.players.find(p => p.id === 'a_def2');
      if (aDef2) { aDef2.targetU = 0.62; aDef2.targetV = (zone === 'defense' ? 0.72 : 0.42); }

      // عرض شريط الإشعار الحماسي للتمريرة مع عنوان المنطقة
      if (this.passBanner && this.passBannerTxt) {
        const zoneBadge = (clutch && clutch.zone_title) ? `[${clutch.zone_title}] ` : '';
        const msg = (clutch && clutch.pass_text)
          ? clutch.pass_text
          : `👟 تمريرة مفتاحية من [${passer.name} #${passer.number}] في طريقها إليك... استلم وقرر!`;
        this.passBannerTxt.textContent = `${zoneBadge}${msg}`;
        this.passBanner.classList.add('show');
      }

      // إطلاق الكرة في اتجاه المستخدم بانيميشن حقيقي
      this.ball.carrierId = null;
      this.ball.targetCarrier = 'me';
      this.ball.targetU = me.targetU;
      this.ball.targetV = me.targetV;
      this.ball.speed = 0.75;
      this.ball.inAir = false;
      this.ball.totalDist = Math.hypot(me.targetU - this.ball.u, me.targetV - this.ball.v);
    });
  }

  showClutch(options) {
    this.inClutch = true;
    const me = this.players.find(p => p.id === 'me');
    if (!me) return;

    this.ball.u = me.u + 0.02;
    this.ball.v = me.v + 0.01;
    this.ball.carrierId = 'me';

    const from = Pitch.proj(this.ball.u, this.ball.v);
    const mates = this.players.filter(p => p.team === 'home' && p.id !== 'me' && p.id !== 'h_gk');
    let mateIdx = 0;
    this.targets = {};

    this.lines.innerHTML = options.map((o) => {
      const act = Pitch.ACTION[o.key] || 'pass';
      const col = Pitch.COLORS[act];
      const pct = (/(\d+)\s*%/.exec(o.hint) || [])[1];
      let to;

      if (act === 'shoot') {
        to = Pitch.proj(0.50, 0.02); // مرمى الخصم
      } else if (act === 'pass') {
        const m = mates[mateIdx++ % mates.length];
        to = Pitch.proj(m.u, m.v);
      } else if (act === 'dribble') {
        to = Pitch.proj(0.48, 0.32); // اختراق للعمق
      } else {
        to = Pitch.proj(0.50, 0.42);
      }

      to = { x: to.x, y: to.y - (act === 'pass' ? 24 * to.s : 0) };
      this.targets[o.key] = { act, to, u: 0.5, v: 0.02 };

      const cx = (from.x + to.x) / 2;
      const cy = Math.min(from.y, to.y) - (act === 'pass' ? 32 : 14);
      const lx = cx, ly = cy + 6;

      return `
        <g class="opt-line" data-key="${o.key}" style="--c:${col}">
          <path d="M${from.x} ${from.y - 8} Q${cx} ${cy} ${to.x} ${to.y}"
                fill="none" stroke="${col}" stroke-width="3.5"
                ${act === 'pass' ? 'stroke-dasharray="9 7"' : ''}
                stroke-linecap="round" marker-end="url(#pg-arr)" filter="url(#pg-glow)"/>
          ${pct ? `
            <g transform="translate(${lx},${ly})">
              <rect x="-26" y="-13" width="52" height="24" rx="12" fill="#04120a" stroke="${col}" stroke-width="1.5"/>
              <text y="4" text-anchor="middle" font-size="14" font-weight="800" fill="${col}">${pct}%</text>
            </g>` : ''}
          <text x="${to.x}" y="${to.y - 12}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" opacity=".95">${o.index}</text>
        </g>
      `;
    }).join('');

    this.host.classList.add('clutch-on');
  }

  focus(key) {
    this.lines.querySelectorAll('.opt-line').forEach(g => {
      g.classList.toggle('dim', key && g.dataset.key !== key);
    });
  }

  resolve(key, success, goal = false) {
    const t = this.targets && this.targets[key];
    this.lines.querySelectorAll('.opt-line').forEach(g => {
      g.classList.toggle('chosen', g.dataset.key === key);
    });

    const me = this.players.find(p => p.id === 'me');
    if (me) me.kickAnim = 1;

    if (t) {
      this.ball.carrierId = null;
      if (t.act === 'shoot') {
        this.ball.targetU = success ? 0.49 : 0.41;
        this.ball.targetV = 0.02;
        this.ball.speed = 0.95;
        this.ball.inAir = true;
        this.ball.airApex = 0.15;
      } else if (t.act === 'pass') {
        const receiver = this.players.find(p => p.id === 'h_fwd2') || this.players.find(p => p.id === 'h_fwd1');
        if (receiver) {
          this.ball.targetU = receiver.u;
          this.ball.targetV = receiver.v;
          this.ball.targetCarrier = receiver.id;
        }
        this.ball.speed = 0.75;
      } else if (t.act === 'dribble') {
        if (me) {
          me.targetU = 0.48;
          me.targetV = 0.34;
        }
        this.ball.targetU = 0.48;
        this.ball.targetV = 0.35;
        this.ball.speed = 0.65;
      }

      if (goal) {
        setTimeout(() => this.goal(), 500);
      }
    }

    setTimeout(() => {
      this.lines.innerHTML = '';
      this.host.classList.remove('clutch-on');
      this.inClutch = false;
      this.deliveringToUser = false;
    }, 1600);
  }

  render() {
    // 1. رسم وتحديث تموضع كل لاعب وحركات أقدامه
    this.players.forEach(p => {
      const el = this.actors.querySelector('#pa-' + p.id);
      if (!el) return;
      const proj = Pitch.proj(p.u, p.v);
      const sc = proj.s * 0.95;
      el.style.transform = `translate(${proj.x.toFixed(1)}px,${proj.y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      el.dataset.v = p.v;

      const legL = el.querySelector('.leg-l');
      const legR = el.querySelector('.leg-r');
      if (legL && legR) {
        if (p.kickAnim > 0) {
          legR.style.transform = `rotate(-25deg) translateY(-4px)`;
          legL.style.transform = `rotate(10deg)`;
        } else if (p.runPhase > 0) {
          const swing = Math.sin(p.runPhase) * 14;
          legL.style.transform = `rotate(${swing.toFixed(1)}deg)`;
          legR.style.transform = `rotate(${-swing.toFixed(1)}deg)`;
        } else {
          legL.style.transform = 'none';
          legR.style.transform = 'none';
        }
      }
    });

    // 2. رسم وتحديث تموضع الكرة
    const ballEl = this.actors.querySelector('#pa-ball');
    if (ballEl) {
      const bProj = Pitch.proj(this.ball.u, this.ball.v);
      const bSc = bProj.s * 0.85;
      const hPx = this.ball.h * 140 * bProj.s;

      ballEl.style.transform = `translate(${bProj.x.toFixed(1)}px,${bProj.y.toFixed(1)}px) scale(${bSc.toFixed(3)})`;
      const sphere = ballEl.querySelector('#ball-sphere');
      if (sphere) {
        sphere.style.transform = `translateY(${-hPx.toFixed(1)}px) rotate(${this.ball.spin.toFixed(1)}rad)`;
      }
      const shadow = ballEl.querySelector('#ball-shadow');
      if (shadow) {
        const shadowScale = Math.max(0.4, 1 - this.ball.h * 1.5);
        shadow.style.transform = `scale(${shadowScale.toFixed(2)})`;
      }
    }

    // 3. ترتيب العمق بحسب الإحداثي الرأسي v (Z-Order Sorting)
    const children = [...this.actors.children].filter(n => n.id !== 'pa-ball');
    children.sort((a, b) => Number(a.dataset.v || 0) - Number(b.dataset.v || 0));
    children.forEach(n => this.actors.appendChild(n));
    if (ballEl) this.actors.appendChild(ballEl);
  }

  setMinute(min) {
    this.minute = min;
    // تناوب تكتيكي إضافي مع دقائق المباراة إن لم نكن في لحظة حاسمة
    if (!this.inClutch && !this.deliveringToUser) {
      // مثلاً كل 3-4 دقائق، تتغير الهجمة بين هجوم ودفاع
      const ph = (Math.floor(min / 4) % 2 === 0) ? 'attack' : 'defense';
      if (ph !== this.phase) this.setPhase(ph);
    }
  }

  goal(team = 'home', scorer = '') {
    const isAway = (team === 'away');
    const textEl = this.flash.querySelector('.goal-text');
    if (textEl) {
      if (scorer) {
        textEl.innerHTML = `⚽ جوووووول!<br><small style="font-size:1.15rem; color:${isAway ? '#f87171' : '#38bdf8'}; font-weight:800;">${scorer} ${isAway ? '(الزمالك)' : '(الأهلي)'}</small>`;
      } else {
        textEl.innerHTML = `⚽ جوووووووول!`;
      }
    }
    this.flash.classList.remove('hidden');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
    setTimeout(() => {
      this.flash.classList.add('hidden');
      this.flash.classList.remove('go');
    }, 2200);
  }
}
