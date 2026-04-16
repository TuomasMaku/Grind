/* ════════════════════════════════════════════════════════════════
   ARENA EXTRAS — charge APRÈS app.js, aucun patch de fonctions
   Achievements · 1RM · Body Weight · Goals · Protéines · RPE · Coach IA
   ════════════════════════════════════════════════════════════════ */

/* ── COMPAT: variables absentes si app.js v1 ── */
if (typeof prChargesData === 'undefined') window.prChargesData = {};
if (typeof runHistory    === 'undefined') window.runHistory    = [];
if (typeof chargesData   === 'undefined') window.chargesData   = {};
if (typeof historyData   === 'undefined') window.historyData   = [];
if (typeof streakData    === 'undefined') window.streakData    = {count:0, best:0};
if (typeof progState     === 'undefined') window.progState     = {};
if (typeof cycleStart    === 'undefined') window.cycleStart    = null;
if (typeof days          === 'undefined') window.days          = [];
if (typeof getRank       === 'undefined') window.getRank       = (s) => ({name:'Rookie', color:'#c9ff00'});
if (typeof getCurDayIdx  === 'undefined') window.getCurDayIdx  = () => -1;
if (typeof isCurrentWorkoutDone === 'undefined') window.isCurrentWorkoutDone = () => false;

let achievements    = store.get('achievements',    {});
let bodyLog         = store.get('bodyLog',         []);
let goals           = store.get('goals',           []);
let proteinState    = store.get('proteinState',    {date:'', blocks:[false,false,false,false]});
let rpeData         = store.get('rpeData',         {});
let coachHistory    = store.get('coachHistory',    []);
let coachApiKey     = store.get('coachApiKey',     '');

/* Reset protein si nouveau jour */
if (proteinState.date !== todayStr()) {
  proteinState = { date: todayStr(), blocks: [false, false, false, false] };
  store.set('proteinState', proteinState);
}

/* ══════════════════════════════════════════════════════════════
   1. ACHIEVEMENTS
   ══════════════════════════════════════════════════════════════ */
const ACH_DEF = [
  { id: 'first_blood',     icon: '🩸', name: 'First Blood',       desc: 'Première charge loggée' },
  { id: 'week_warrior',    icon: '⚔️',  name: 'Week Warrior',      desc: '7 jours de streak' },
  { id: 'beast_mode',      icon: '🦁', name: 'Beast Mode',         desc: '30 jours de streak' },
  { id: 'monster_rank',    icon: '🧬', name: 'Monster',            desc: '60 jours de streak' },
  { id: 'perfect_week',    icon: '💎', name: 'Perfect Week',       desc: '7 daily complets consécutifs' },
  { id: 'century_bench',   icon: '💯', name: 'Century Club',       desc: '100kg au développé couché' },
  { id: 'pr_machine',      icon: '🏆', name: 'PR Machine',         desc: '10 PRs différents' },
  { id: 'iron_discipline', icon: '🔩', name: 'Iron Discipline',    desc: 'Score discipline ≥ 80%' },
  { id: 'runner_5',        icon: '👟', name: 'Runner',             desc: '5 runs loggés' },
  { id: 'runner_25',       icon: '🏅', name: 'Runner Pro',         desc: '25 runs loggés' },
  { id: 'club_100k',       icon: '🌍', name: '100K Club',          desc: '100km cumulés en running' },
  { id: 'speed_demon',     icon: '⚡', name: 'Speed Demon',        desc: 'Pace ≤ 5\'00"/km' },
  { id: 'night_owl',       icon: '🦉', name: 'Night Owl',          desc: 'Séance après 22h00' },
  { id: 'daily_30',        icon: '🔥', name: 'Grinder',            desc: '30 daily complétés' },
  { id: 'comeback',        icon: '🔄', name: 'Comeback Kid',       desc: 'Reprise après 7j d\'absence' },
  { id: 'protein_week',    icon: '🥩', name: 'Protein King',       desc: '7 jours de protéines complètes' },
  { id: 'volume_king',     icon: '👑', name: 'Volume King',        desc: '50 000kg de volume cumulé' },
];

function checkAchievements() {
  const newly = [];
  const push = id => { if (!achievements[id]) newly.push(id); };

  if (Object.keys(prChargesData).length > 0) push('first_blood');
  if (streakData.count >= 7)  push('week_warrior');
  if (streakData.count >= 30) push('beast_mode');
  if (streakData.count >= 60) push('monster_rank');

  const benchPr = prChargesData['Développé couché barre'];
  if (benchPr && benchPr.kg >= 100) push('century_bench');
  if (Object.keys(prChargesData).length >= 10) push('pr_machine');

  if (historyData.length >= 30) {
    const disc = Math.round(historyData.slice(0,30).filter(d => d.done).length / 30 * 100);
    if (disc >= 80) push('iron_discipline');
  }

  if (runHistory.length >= 5)  push('runner_5');
  if (runHistory.length >= 25) push('runner_25');
  const totalKm = runHistory.reduce((a, r) => a + r.dist, 0);
  if (totalKm >= 100) push('club_100k');
  if (runHistory.some(r => r.paceSeconds && r.paceSeconds <= 300)) push('speed_demon');

  if (historyData.filter(d => d.done).length >= 30) push('daily_30');

  if (new Date().getHours() >= 22 && Object.keys(progState).length > 0) push('night_owl');

  if (historyData.length >= 2) {
    const gap = (new Date(historyData[0].date) - new Date(historyData[1].date)) / 86400000;
    if (gap >= 7) push('comeback');
  }

  const ps = store.get('proteinStreak', { count: 0 });
  if (ps.count >= 7) push('protein_week');

  newly.forEach(id => {
    achievements[id] = { date: todayStr() };
    store.set('achievements', achievements);
    showAchievementToast(id);
  });

  const countEl = document.getElementById('achCount');
  if (countEl) countEl.textContent = Object.keys(achievements).length;
  const totalEl = document.getElementById('achTotal');
  if (totalEl) totalEl.textContent = ACH_DEF.length;
}

function showAchievementToast(id) {
  const def = ACH_DEF.find(a => a.id === id);
  if (!def) return;
  const t = document.createElement('div');
  t.className = 'ach-toast';
  t.innerHTML = `<div class="ach-toast-icon">${def.icon}</div><div class="ach-toast-body"><div class="ach-toast-label">Achievement débloqué</div><div class="ach-toast-name">${def.name}</div><div class="ach-toast-desc">${def.desc}</div></div>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 4000);
  });
  if (navigator.vibrate) navigator.vibrate([80, 60, 120]);
}

function renderAchievements() {
  const el = document.getElementById('achievementsGrid');
  if (!el) return;
  checkAchievements();
  el.innerHTML = ACH_DEF.map(def => {
    const unlocked = !!achievements[def.id];
    return `<div class="ach-card ${unlocked ? 'unlocked' : 'locked'}">
      <div class="ach-card-icon">${def.icon}</div>
      <div class="ach-card-name">${def.name}</div>
      <div class="ach-card-desc">${unlocked ? `<span style="color:var(--accent);font-size:9px">${achievements[def.id].date}</span>` : def.desc}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   2. 1RM + SUGGESTIONS
   ══════════════════════════════════════════════════════════════ */
function calc1RM(kg, reps) {
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30));
}

function showWeightSuggestion(exName, exSets) {
  const el = document.getElementById('weightSuggestion');
  if (!el) return;
  const entries = chargesData[exName] || [];
  const pr = prChargesData[exName] || null;
  if (!entries.length) { el.innerHTML = ''; return; }

  const last = entries[entries.length - 1];
  const oneRM = calc1RM(last.kg, last.reps);
  const rangeMatch = exSets.match(/(\d+)[\-–](\d+)/);
  const singleMatch = exSets.match(/×\s*(\d+)/);
  let repMin = 6, repMax = 12;
  if (rangeMatch) { repMin = parseInt(rangeMatch[1]); repMax = parseInt(rangeMatch[2]); }
  else if (singleMatch) { repMin = repMax = parseInt(singleMatch[1]); }

  let type, nextKg, reason;
  if (last.reps >= repMax) {
    type = 'up'; nextKg = last.kg + 2.5; reason = `${last.reps} reps = haut fourchette → augmente`;
  } else if (last.reps < repMin) {
    type = 'down'; nextKg = Math.max(last.kg - 2.5, 0); reason = `${last.reps} reps = sous fourchette → réduis`;
  } else {
    type = 'hold'; nextKg = last.kg; reason = `Dans la fourchette — maintiens ${last.kg}kg`;
  }

  const colors = { up: 'var(--green)', down: 'var(--orange)', hold: 'var(--muted)' };
  const icons  = { up: '↑', down: '↓', hold: '→' };
  const isPr   = pr && last.kg >= pr.kg;

  el.innerHTML = `<div class="weight-suggestion" style="border-color:${colors[type]}">
    <div class="ws-left">
      <div class="ws-suggest" style="color:${colors[type]}">${icons[type]} ${nextKg}kg</div>
      <div class="ws-reason">${reason}</div>
    </div>
    <div class="ws-right">
      <div class="ws-orm">${oneRM}kg</div>
      <div class="ws-orm-label">1RM est.</div>
      ${isPr ? '<div class="ws-pr">🏆 PR</div>' : ''}
    </div>
  </div>`;
}

/* Appel depuis le modal de poids — on surcharge le handler confirm */
const origWeightConfirm = document.getElementById('weightModalConfirm');
if (origWeightConfirm) {
  origWeightConfirm.addEventListener('click', () => {
    setTimeout(() => checkAchievements(), 200);
  });
}

/* ══════════════════════════════════════════════════════════════
   3. RPE POST-SÉANCE
   ══════════════════════════════════════════════════════════════ */
function openRpeModal(title) {
  const el = document.getElementById('rpeOverlay');
  if (!el) return;
  const titleEl = document.getElementById('rpeModalTitle');
  if (titleEl) titleEl.textContent = 'Post-séance — ' + title;
  const existing = rpeData[todayStr()];
  ['rpeEnergy', 'rpeSleep', 'rpeSoreness'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = existing ? (existing[id.replace('rpe','').toLowerCase()] || 3) : 3;
  });
  updateRpeDisplay();
  el.classList.add('show');
}

function updateRpeDisplay() {
  const energy   = parseInt(document.getElementById('rpeEnergy')?.value   || 3);
  const sleep    = parseInt(document.getElementById('rpeSleep')?.value    || 3);
  const soreness = parseInt(document.getElementById('rpeSoreness')?.value || 3);
  const eLbls = ['','😴','😫','😐','💪','🔥'];
  const sLbls = ['','✅','😐','😬','😣','🚨'];
  const ev = document.getElementById('rpeEnergyVal');
  const sv = document.getElementById('rpeSleepVal');
  const sv2 = document.getElementById('rpeSorenessVal');
  if (ev)  ev.textContent  = eLbls[energy]   + ' ' + energy   + '/5';
  if (sv)  sv.textContent  = eLbls[sleep]    + ' ' + sleep    + '/5';
  if (sv2) sv2.textContent = sLbls[soreness] + ' ' + soreness + '/5';
}

function saveRpe() {
  const energy   = parseInt(document.getElementById('rpeEnergy')?.value   || 3);
  const sleep    = parseInt(document.getElementById('rpeSleep')?.value    || 3);
  const soreness = parseInt(document.getElementById('rpeSoreness')?.value || 3);
  rpeData[todayStr()] = { energy, sleep, soreness };
  store.set('rpeData', rpeData);
  const el = document.getElementById('rpeOverlay');
  if (el) el.classList.remove('show');
  renderRpeHome();
}

function renderRpeHome() {
  const el = document.getElementById('homeRpeToday');
  if (!el) return;
  const r = rpeData[todayStr()];
  if (r) {
    el.textContent = `⚡ Énergie ${r.energy}/5  😴 Sommeil ${r.sleep}/5  💪 Courbatures ${r.soreness}/5`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* Détection auto séance terminée pour ouvrir RPE */
let rpeAutoFired = store.get('rpeAutoFired', '');
function checkAndFireRpe() {
  if (rpeAutoFired === todayStr()) return;
  if (typeof isCurrentWorkoutDone !== 'function') return;
  if (!isCurrentWorkoutDone()) return;
  if (rpeData[todayStr()]) return;
  const cur = typeof getCurDayIdx === 'function' ? getCurDayIdx() : -1;
  if (cur < 0) return;
  rpeAutoFired = todayStr();
  store.set('rpeAutoFired', rpeAutoFired);
  setTimeout(() => openRpeModal(days[cur].title), 1000);
}

document.getElementById('rpeSaveBtn')?.addEventListener('click', saveRpe);
document.getElementById('rpeSkipBtn')?.addEventListener('click', () => {
  const el = document.getElementById('rpeOverlay');
  if (el) el.classList.remove('show');
});
['rpeEnergy', 'rpeSleep', 'rpeSoreness'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateRpeDisplay);
});

/* ══════════════════════════════════════════════════════════════
   4. BODY WEIGHT
   ══════════════════════════════════════════════════════════════ */
function saveBodyEntry() {
  const kg    = parseFloat(document.getElementById('bodyKgInput')?.value);
  const waist = parseFloat(document.getElementById('bodyWaistInput')?.value) || null;
  if (isNaN(kg) || kg <= 0) { document.getElementById('bodyKgInput')?.focus(); return; }

  const idx = bodyLog.findIndex(e => e.date === todayStr());
  const entry = { date: todayStr(), kg, waist };
  if (idx >= 0) bodyLog[idx] = entry; else bodyLog.unshift(entry);
  if (bodyLog.length > 365) bodyLog = bodyLog.slice(0, 365);
  store.set('bodyLog', bodyLog);

  const ki = document.getElementById('bodyKgInput');
  const wi = document.getElementById('bodyWaistInput');
  if (ki) ki.value = '';
  if (wi) wi.value = '';

  renderBodySection();
  updateBodyHomeCard();
  checkAchievements();
  if (navigator.vibrate) navigator.vibrate(60);
}

document.getElementById('bodySaveBtn')?.addEventListener('click', saveBodyEntry);

function renderBodySection() {
  updateBodyHomeCard();
  const el = document.getElementById('bodySpark');
  if (!el) return;
  const entries = bodyLog.slice(0, 30).reverse();
  if (entries.length < 2) {
    el.innerHTML = '<text x="250" y="45" text-anchor="middle" fill="#484848" font-size="12" font-family="Bebas Neue">Minimum 2 entrées pour voir le graphe</text>';
  } else {
    const w = 500, h = 80, pad = 8;
    const kgs = entries.map(e => e.kg);
    const minKg = Math.min(...kgs), maxKg = Math.max(...kgs);
    const range = maxKg - minKg || 1;
    const pts = entries.map((e, i) => ({
      x: pad + (i / (entries.length - 1)) * (w - pad * 2),
      y: h - pad - ((e.kg - minKg) / range) * (h - pad * 2)
    }));
    const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${pts[0].x},${h} ${line} ${pts[pts.length-1].x},${h}`;
    const last = entries[entries.length - 1];
    const delta = last.kg - entries[0].kg;
    const color = delta <= 0 ? 'var(--green)' : 'var(--orange)';
    el.innerHTML = `
      <polygon points="${area}" style="fill:rgba(201,255,0,0.05);stroke:none"/>
      <polyline points="${line}" style="fill:none;stroke:${color};stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>
      <circle cx="${pts[pts.length-1].x}" cy="${pts[pts.length-1].y}" r="4" style="fill:${color}"/>
      <text x="${pts[pts.length-1].x}" y="${pts[pts.length-1].y - 8}" text-anchor="middle" fill="${color}" font-size="11" font-family="Bebas Neue">${last.kg}kg</text>`;
  }

  const statsEl = document.getElementById('bodyStats');
  if (statsEl && bodyLog.length > 0) {
    const last = bodyLog[0];
    const first = bodyLog[Math.min(29, bodyLog.length - 1)];
    const delta = last.kg - first.kg;
    const dColor = delta <= 0 ? 'var(--green)' : 'var(--orange)';
    statsEl.innerHTML = `
      <div class="body-stat"><div class="body-stat-val">${last.kg}<span style="font-size:14px">kg</span></div><div class="body-stat-label">Actuel</div></div>
      <div class="body-stat"><div class="body-stat-val" style="color:${dColor}">${delta > 0 ? '+' : ''}${delta.toFixed(1)}<span style="font-size:14px">kg</span></div><div class="body-stat-label">Évolution</div></div>
      <div class="body-stat"><div class="body-stat-val">${bodyLog.length}</div><div class="body-stat-label">Entrées</div></div>`;
  }

  const histEl = document.getElementById('bodyHistory');
  if (histEl) {
    histEl.innerHTML = bodyLog.slice(0, 10).map((e, i) => {
      const prev = bodyLog[i + 1];
      const d = prev ? e.kg - prev.kg : 0;
      const dStr = d !== 0 ? `<span style="color:${d < 0 ? 'var(--green)' : 'var(--orange)'};font-size:10px">${d > 0 ? '+' : ''}${d.toFixed(1)}kg</span>` : '';
      return `<div class="body-hist-row"><span class="body-hist-date">${e.date}</span><span class="body-hist-kg">${e.kg}kg ${dStr}</span>${e.waist ? `<span class="body-hist-waist">${e.waist}cm</span>` : ''}</div>`;
    }).join('');
  }
}

function updateBodyHomeCard() {
  const el = document.getElementById('homeBodyKg');
  if (!el) return;
  el.textContent = bodyLog.length > 0 ? bodyLog[0].kg + 'kg' : '—';
}

/* ══════════════════════════════════════════════════════════════
   5. GOALS
   ══════════════════════════════════════════════════════════════ */
const GOAL_TEMPLATES = [
  { type: 'bench',  name: 'Bench Press',     unit: 'kg',  icon: '🏋️' },
  { type: 'squat',  name: 'Squat',           unit: 'kg',  icon: '🦵' },
  { type: 'run5k',  name: '5K en moins de',  unit: 'min', icon: '🏃' },
  { type: 'weight', name: 'Poids de forme',  unit: 'kg',  icon: '⚖️' },
  { type: 'streak', name: 'Streak objectif', unit: 'j',   icon: '🔥' },
  { type: 'custom', name: 'Custom',          unit: '',    icon: '🎯' },
];

let selectedGoalType = null;

function openGoalModal() {
  const el = document.getElementById('goalOverlay');
  if (!el) return;
  el.classList.add('show');
  renderGoalTemplates();
  const form = document.getElementById('goalForm');
  const tpls = document.getElementById('goalTemplates');
  if (form) form.style.display = 'none';
  if (tpls) tpls.style.display = 'grid';
}

function closeGoalModal() {
  const el = document.getElementById('goalOverlay');
  if (el) el.classList.remove('show');
  selectedGoalType = null;
}

function renderGoalTemplates() {
  const el = document.getElementById('goalTemplates');
  if (!el) return;
  el.innerHTML = GOAL_TEMPLATES.map(t => `
    <div class="goal-tpl" onclick="selectGoalTemplate('${t.type}')">
      <span class="goal-tpl-icon">${t.icon}</span>
      <span class="goal-tpl-name">${t.name}</span>
    </div>`).join('');
}

function selectGoalTemplate(type) {
  selectedGoalType = type;
  const tpl = GOAL_TEMPLATES.find(t => t.type === type);
  if (!tpl) return;
  const tpls = document.getElementById('goalTemplates');
  const form = document.getElementById('goalForm');
  if (tpls) tpls.style.display = 'none';
  if (form) form.style.display = 'block';
  const titleEl = document.getElementById('goalFormTitle');
  if (titleEl) titleEl.textContent = tpl.icon + ' ' + tpl.name;
  const unitEl = document.getElementById('goalUnitLabel');
  if (unitEl) unitEl.textContent = tpl.unit;
  const nameEl = document.getElementById('goalNameInput');
  if (nameEl) nameEl.value = tpl.name;
  const currentEl = document.getElementById('goalCurrentInput');
  if (currentEl) {
    let val = '';
    if (type === 'bench' && prChargesData['Développé couché barre']) val = prChargesData['Développé couché barre'].kg;
    if (type === 'squat' && prChargesData['Squat barre']) val = prChargesData['Squat barre'].kg;
    if (type === 'weight' && bodyLog.length) val = bodyLog[0].kg;
    if (type === 'streak') val = streakData.count;
    currentEl.value = val;
  }
}

document.getElementById('goalModalClose')?.addEventListener('click', closeGoalModal);
document.getElementById('goalSaveBtn')?.addEventListener('click', () => {
  const tpl = GOAL_TEMPLATES.find(t => t.type === selectedGoalType);
  if (!tpl) return;
  const target  = parseFloat(document.getElementById('goalTargetInput')?.value);
  const current = parseFloat(document.getElementById('goalCurrentInput')?.value) || 0;
  const date    = document.getElementById('goalDateInput')?.value || '';
  const name    = document.getElementById('goalNameInput')?.value || tpl.name;
  if (isNaN(target)) { document.getElementById('goalTargetInput')?.focus(); return; }

  goals.push({
    id: Date.now().toString(),
    type: selectedGoalType,
    icon: tpl.icon,
    name,
    unit: tpl.unit,
    current,
    target,
    startDate: todayStr(),
    targetDate: date,
  });
  store.set('goals', goals);
  closeGoalModal();
  renderGoals();
});

function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  store.set('goals', goals);
  renderGoals();
}

function updateGoalProgress() {
  goals.forEach(g => {
    let v = null;
    if (g.type === 'bench'  && prChargesData['Développé couché barre']) v = prChargesData['Développé couché barre'].kg;
    if (g.type === 'squat'  && prChargesData['Squat barre'])            v = prChargesData['Squat barre'].kg;
    if (g.type === 'weight' && bodyLog.length)                          v = bodyLog[0].kg;
    if (g.type === 'streak')                                            v = streakData.count;
    if (v !== null) g.current = v;
  });
  store.set('goals', goals);
}

function renderGoals() {
  updateGoalProgress();
  const el = document.getElementById('goalsContainer');
  if (!el) return;
  if (goals.length === 0) {
    el.innerHTML = '<div class="goals-empty">Aucun objectif.<br><button class="goal-add-btn" onclick="openGoalModal()">+ Ajouter un objectif</button></div>';
    return;
  }
  el.innerHTML = goals.map(g => {
    const pct  = Math.min(Math.round((g.current / g.target) * 100), 100);
    const done = g.current >= g.target;
    const rem  = (g.target - g.current).toFixed(1);
    const days = g.targetDate ? Math.ceil((new Date(g.targetDate) - new Date()) / 86400000) : null;
    return `<div class="goal-card ${done ? 'goal-done' : ''}">
      <div class="goal-header">
        <span class="goal-icon">${g.icon}</span>
        <div class="goal-title-wrap">
          <div class="goal-name">${g.name}</div>
          ${days !== null ? `<div class="goal-deadline ${days < 14 ? 'urgent' : ''}">${days > 0 ? days + ' jours' : 'Délai dépassé'}</div>` : ''}
        </div>
        <div class="goal-nums">
          <div class="goal-current">${g.current}<span class="goal-unit">${g.unit}</span></div>
          <div class="goal-sep">/</div>
          <div class="goal-target">${g.target}<span class="goal-unit">${g.unit}</span></div>
        </div>
        <button class="goal-delete" onclick="deleteGoal('${g.id}')">✕</button>
      </div>
      <div class="goal-bar-wrap"><div class="goal-bar" style="width:${pct}%;background:${done ? 'var(--accent)' : 'var(--run)'}"></div></div>
      <div class="goal-footer">
        <span class="goal-pct">${pct}%</span>
        ${done ? '<span class="goal-done-label">✓ Atteint 🎉</span>' : `<span class="goal-remaining">${rem}${g.unit} restant</span>`}
      </div>
    </div>`;
  }).join('') + '<button class="goal-add-btn" style="margin-top:8px" onclick="openGoalModal()">+ Ajouter un objectif</button>';
}

/* ══════════════════════════════════════════════════════════════
   6. PROTEIN TRACKER
   ══════════════════════════════════════════════════════════════ */
const PROT_BLOCKS = [
  { label: 'Matin',       icon: '☀️', g: 35 },
  { label: 'Midi',        icon: '🕛', g: 40 },
  { label: 'Post-séance', icon: '💪', g: 45 },
  { label: 'Soir',        icon: '🌙', g: 30 },
];
const PROT_TOTAL = PROT_BLOCKS.reduce((a, b) => a + b.g, 0);

function renderProteinTracker() {
  const el = document.getElementById('proteinTracker');
  if (!el) return;
  const gDone = PROT_BLOCKS.reduce((a, b, i) => a + (proteinState.blocks[i] ? b.g : 0), 0);
  const pct   = Math.round(gDone / PROT_TOTAL * 100);
  el.innerHTML = `
    <div class="prot-header">
      <div class="prot-title">Protéines du jour</div>
      <div class="prot-total">${gDone}<span style="font-size:14px;color:var(--muted)">/${PROT_TOTAL}g</span></div>
    </div>
    <div class="prot-bar-wrap"><div class="prot-bar" style="width:${pct}%"></div></div>
    <div class="prot-blocks">
      ${PROT_BLOCKS.map((b, i) => `
        <div class="prot-block ${proteinState.blocks[i] ? 'done' : ''}" onclick="toggleProteinBlock(${i})">
          <div class="prot-block-icon">${b.icon}</div>
          <div class="prot-block-label">${b.label}</div>
          <div class="prot-block-g">+${b.g}g</div>
          <div class="prot-block-check">✓</div>
        </div>`).join('')}
    </div>`;
}

function toggleProteinBlock(i) {
  proteinState.blocks[i] = !proteinState.blocks[i];
  store.set('proteinState', proteinState);
  // Streak protéines
  if (proteinState.blocks.every(Boolean)) {
    const ps = store.get('proteinStreak', { count: 0, lastDate: '' });
    if (ps.lastDate !== todayStr()) {
      ps.count = ps.lastDate === yesterdayStr() ? ps.count + 1 : 1;
      ps.lastDate = todayStr();
      store.set('proteinStreak', ps);
    }
  }
  renderProteinTracker();
  checkAchievements();
}

/* ══════════════════════════════════════════════════════════════
   7. COACH IA
   ══════════════════════════════════════════════════════════════ */
let coachThinking = false;

function buildCoachContext() {
  const cur    = typeof getCurDayIdx === 'function' ? getCurDayIdx() : -1;
  const curDay = cur >= 0 ? days[cur] : null;
  const rank   = typeof getRank === 'function' ? getRank(streakData.count) : { name: '?' };
  const totalKm = runHistory.reduce((a, r) => a + r.dist, 0);
  const monthStr = todayStr().slice(0, 7);
  const monthKm = runHistory.filter(r => r.date.startsWith(monthStr)).reduce((a, r) => a + r.dist, 0);
  const perf = historyData.length > 0 ? Math.round(historyData.filter(d => d.done).length / historyData.length * 100) : 0;

  const prs = Object.entries(prChargesData).slice(0, 8)
    .map(([k, v]) => `  - ${k}: ${v.kg}kg × ${v.reps} (1RM ~${calc1RM(v.kg, v.reps)}kg)`).join('\n');

  const recentRuns = runHistory.slice(0, 5)
    .map(r => `  - ${r.date}: ${r.dist}km ${r.pace}/km zone ${r.zone}`).join('\n');

  const rpeRecent = Object.entries(rpeData).slice(-5)
    .map(([d, r]) => `  - ${d}: énergie ${r.energy}/5, sommeil ${r.sleep}/5, courbatures ${r.soreness}/5`).join('\n');

  const goalsSummary = goals.map(g => `  - ${g.name}: ${g.current}/${g.target}${g.unit}`).join('\n');

  return `Tu es le coach personnel de Thomas, 27 ans, Chambéry. Civil servant → frontalier Suisse. Objectif: indépendance physique + financière. Philosophie: Discipline > motivation. Réponds en français, sois direct et actionnable, utilise les données réelles.

ÉTAT (${todayStr()}):
- Streak: ${streakData.count}j (record: ${streakData.best}j)
- Rang: ${rank.name}
- Cycle: ${cycleStart ? 'J' + (cur + 1) + '/8 — ' + (curDay ? curDay.title : '?') : 'Non démarré'}
- Score discipline: ${perf}%
- Poids: ${bodyLog.length ? bodyLog[0].kg + 'kg' : 'non suivi'}

PRs:
${prs || '  Aucun'}

Running: ${totalKm.toFixed(1)}km total, ${monthKm.toFixed(1)}km ce mois
${recentRuns || '  Aucun run récent'}

RPE récent:
${rpeRecent || '  Aucune donnée'}

Objectifs:
${goalsSummary || '  Aucun'}`;
}

async function sendCoachMessage() {
  const input = document.getElementById('coachInput');
  const msg = input?.value?.trim();
  if (!msg || coachThinking) return;

  const keyInput = document.getElementById('coachApiKeyInput');
  const key = keyInput?.value?.trim() || coachApiKey;
  if (!key) {
    coachHistory.push({ role: 'system-error', content: 'Entre ta clé API Anthropic (bouton 🔑 ci-dessus).' });
    renderCoachMessages();
    return;
  }
  if (key !== coachApiKey) { coachApiKey = key; store.set('coachApiKey', key); }

  input.value = '';
  coachHistory.push({ role: 'user', content: msg });
  coachThinking = true;
  renderCoachMessages();
  updateCoachUI();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: buildCoachContext(),
        messages: coachHistory
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.content?.[0]?.text || '(Pas de réponse)';
    coachHistory.push({ role: 'assistant', content: reply });
    if (coachHistory.length > 40) coachHistory = coachHistory.slice(-40);
    store.set('coachHistory', coachHistory);
  } catch (e) {
    coachHistory.push({ role: 'system-error', content: 'Erreur: ' + e.message });
  }

  coachThinking = false;
  renderCoachMessages();
  updateCoachUI();
}

function askCoach(msg) {
  const input = document.getElementById('coachInput');
  if (input) { input.value = msg; sendCoachMessage(); }
}

function clearCoachHistory() {
  coachHistory = [];
  store.set('coachHistory', coachHistory);
  renderCoachMessages();
}

function renderCoachMessages() {
  const el = document.getElementById('coachMessages');
  if (!el) return;

  if (coachHistory.filter(m => m.role !== 'system-error').length === 0) {
    el.innerHTML = `<div class="coach-empty">
      <div class="coach-empty-icon">🤖</div>
      <div class="coach-empty-title">Coach ARENA</div>
      <div class="coach-empty-sub">Je connais tes données réelles — PRs, runs, streak, poids, objectifs. Pose n'importe quelle question.</div>
      <div class="coach-suggestions">
        <div class="coach-suggest" onclick="askCoach('Analyse ma progression et dis-moi ce qui bloque')">Analyse ma progression</div>
        <div class="coach-suggest" onclick="askCoach('Fais-moi un plan 4 semaines pour passer 100kg au bench')">Plan 100kg bench</div>
        <div class="coach-suggest" onclick="askCoach('Comment améliorer mon pace sur 5km ?')">Améliorer mon 5K</div>
        <div class="coach-suggest" onclick="askCoach('Suis-je en surmenage en ce moment ?')">Suis-je en surmenage ?</div>
      </div>
    </div>`;
    return;
  }

  el.innerHTML = coachHistory.map(m => {
    if (m.role === 'system-error') return `<div class="coach-msg error"><div class="coach-msg-bubble">⚠️ ${m.content}</div></div>`;
    const cls  = m.role === 'user' ? 'user' : 'assistant';
    const text = m.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return `<div class="coach-msg ${cls}"><div class="coach-msg-bubble">${text}</div></div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function updateCoachUI() {
  const btn      = document.getElementById('coachSendBtn');
  const thinking = document.getElementById('coachThinking');
  if (btn)      btn.disabled = coachThinking;
  if (thinking) thinking.style.display = coachThinking ? 'flex' : 'none';
}

document.getElementById('coachSendBtn')?.addEventListener('click', sendCoachMessage);
document.getElementById('coachInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCoachMessage(); }
});
document.getElementById('coachClearBtn')?.addEventListener('click', clearCoachHistory);
document.getElementById('coachApiKeyBtn')?.addEventListener('click', () => {
  const panel = document.getElementById('coachApiPanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('coachApiSaveBtn')?.addEventListener('click', () => {
  const val = document.getElementById('coachApiKeyInput')?.value?.trim();
  if (val) {
    coachApiKey = val;
    store.set('coachApiKey', val);
    const p = document.getElementById('coachApiPanel');
    if (p) p.style.display = 'none';
    coachHistory.push({ role: 'system-error', content: '✅ Clé API sauvegardée.' });
    renderCoachMessages();
  }
});

/* Pré-remplir clé si existante */
if (coachApiKey) {
  const ki = document.getElementById('coachApiKeyInput');
  if (ki) ki.value = coachApiKey;
}

/* ══════════════════════════════════════════════════════════════
   8. BODY TAB — onBodyTab() appelé depuis HTML
   ══════════════════════════════════════════════════════════════ */
function onBodyTab() {
  renderBodySection();
  renderGoals();
  renderAchievements();
}

function onCoachTab() {
  renderCoachMessages();
  updateCoachUI();
}

/* ══════════════════════════════════════════════════════════════
   9. INIT — appels sûrs au chargement
   ══════════════════════════════════════════════════════════════ */
renderProteinTracker();
updateBodyHomeCard();
renderRpeHome();
checkAchievements();

/* Polling léger pour RPE auto (toutes les 30s, seulement si app est en foreground) */
setInterval(() => {
  checkAndFireRpe();
  renderRpeHome();
}, 30000);
