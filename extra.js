/* ════════════════════════════════════════════════════════════════
   ARENA EXTRAS — charge après app.js
   Achievements · 1RM · Body Weight · Goals · Protéines · RPE · Coach IA
   ════════════════════════════════════════════════════════════════ */

/* ── ÉTAT ── */
let achievements    = store.get('achievements',    {});
let bodyLog         = store.get('bodyLog',         []); // [{date,kg,waist,chest}]
let goals           = store.get('goals',           []); // [{id,type,name,current,target,unit,targetDate,history}]
let proteinState    = store.get('proteinState',    {date:'', blocks:[false,false,false,false]});
let rpeData         = store.get('rpeData',         {}); // {YYYY-MM-DD:{energy,sleep,soreness}}
let coachHistory    = store.get('coachHistory',    []);
let coachApiKey     = store.get('coachApiKey',     '');
let nightOwlChecked = store.get('nightOwlChecked', '');

/* ── RESET protein si nouveau jour ── */
if(proteinState.date !== todayStr()){
  proteinState = {date:todayStr(), blocks:[false,false,false,false]};
  store.set('proteinState', proteinState);
}

/* ══════════════════════════════════════════════════════════════
   1. ACHIEVEMENTS
   ══════════════════════════════════════════════════════════════ */
const ACH_DEF = [
  {id:'first_blood',    icon:'🩸', name:'First Blood',       desc:'Première charge loggée'},
  {id:'week_warrior',   icon:'⚔️', name:'Week Warrior',      desc:'7 jours de streak consécutifs'},
  {id:'beast_mode',     icon:'🦁', name:'Beast Mode',        desc:'30 jours de streak'},
  {id:'monster_rank',   icon:'🧬', name:'Monster',           desc:'60 jours de streak — rang max'},
  {id:'perfect_week',   icon:'💎', name:'Perfect Week',      desc:'7 jours consécutifs séance + daily complet'},
  {id:'century_bench',  icon:'💯', name:'Century Club',      desc:'100kg au développé couché'},
  {id:'pr_machine',     icon:'🏆', name:'PR Machine',        desc:'10 PRs différents enregistrés'},
  {id:'volume_king',    icon:'👑', name:'Volume King',       desc:'Total de 50,000kg de volume cumulé'},
  {id:'iron_discipline',icon:'🔩', name:'Iron Discipline',   desc:'Score discipline ≥ 80% sur 30 jours'},
  {id:'runner_5',       icon:'👟', name:'Runner',            desc:'5 runs loggés'},
  {id:'runner_25',      icon:'🏅', name:'Runner Pro',        desc:'25 runs loggés'},
  {id:'club_100k',      icon:'🌍', name:'100K Club',         desc:'100km de running cumulés'},
  {id:'speed_demon',    icon:'⚡', name:'Speed Demon',       desc:'Pace ≤ 5\'00\"/km'},
  {id:'night_owl',      icon:'🦉', name:'Night Owl',         desc:'Séance après 22h00'},
  {id:'daily_30',       icon:'🔥', name:'Grinder',           desc:'30 jours de défi daily complétés'},
  {id:'comeback',       icon:'🔄', name:'Comeback Kid',      desc:'Reprendre après 7+ jours d\'absence'},
  {id:'protein_week',   icon:'🥩', name:'Protein King',      desc:'7 jours consécutifs de protéines complètes'},
];

function checkAchievements(){
  const newly = [];
  const push = id => { if(!achievements[id]) newly.push(id); };

  // first_blood
  if(Object.keys(prChargesData).length > 0) push('first_blood');

  // streaks
  if(streakData.count >= 7)  push('week_warrior');
  if(streakData.count >= 30) push('beast_mode');
  if(streakData.count >= 60) push('monster_rank');

  // bench 100kg
  const benchPr = prChargesData['Développé couché barre'];
  if(benchPr && benchPr.kg >= 100) push('century_bench');

  // 10 PRs
  if(Object.keys(prChargesData).length >= 10) push('pr_machine');

  // volume cumulé (somme de tous les logs de charges)
  let totalVol = 0;
  Object.values(chargesData).forEach(entries => entries.forEach(e => totalVol += e.kg * e.reps * 3));
  Object.values(prChargesData).forEach(pr => totalVol += pr.kg * pr.reps * 3);
  if(totalVol >= 50000) push('volume_king');

  // iron discipline (30 derniers jours)
  if(historyData.length >= 30){
    const disc = Math.round(historyData.slice(0,30).filter(d=>d.done).length / 30 * 100);
    if(disc >= 80) push('iron_discipline');
  }

  // runs
  if(runHistory.length >= 5)  push('runner_5');
  if(runHistory.length >= 25) push('runner_25');
  const totalKm = runHistory.reduce((a,r)=>a+r.dist,0);
  if(totalKm >= 100) push('club_100k');
  if(runHistory.some(r=>r.paceSeconds && r.paceSeconds <= 300)) push('speed_demon');

  // daily 30
  if(historyData.filter(d=>d.done).length >= 30) push('daily_30');

  // night owl
  const h = new Date().getHours();
  if(h >= 22 && nightOwlChecked !== todayStr() && Object.keys(progState).length > 0){
    push('night_owl');
    nightOwlChecked = todayStr();
    store.set('nightOwlChecked', nightOwlChecked);
  }

  // comeback (7+ jours sans séance puis reprise)
  if(historyData.length >= 2){
    const d1 = new Date(historyData[0].date);
    const d2 = new Date(historyData[1].date);
    const gap = (d1 - d2) / 86400000;
    if(gap >= 7) push('comeback');
  }

  // protein week: 7 jours consécutifs avec 4 blocs
  // stocké séparément via protein streak
  const protStreak = store.get('proteinStreak', {count:0, lastDate:''});
  if(protStreak.count >= 7) push('protein_week');

  newly.forEach(id=>{
    achievements[id] = {date: todayStr()};
    store.set('achievements', achievements);
    showAchievementToast(id);
  });
}

function showAchievementToast(id){
  const def = ACH_DEF.find(a=>a.id===id);
  if(!def) return;
  const t = document.createElement('div');
  t.className = 'ach-toast';
  t.innerHTML = `<div class="ach-toast-icon">${def.icon}</div><div class="ach-toast-body"><div class="ach-toast-label">Achievement débloqué</div><div class="ach-toast-name">${def.name}</div><div class="ach-toast-desc">${def.desc}</div></div>`;
  document.body.appendChild(t);
  requestAnimationFrame(()=>{
    t.classList.add('show');
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 500); }, 4000);
  });
  if(navigator.vibrate) navigator.vibrate([80, 60, 120]);
}

function renderAchievements(){
  const el = document.getElementById('achievementsGrid');
  if(!el) return;
  el.innerHTML = '';
  ACH_DEF.forEach(def=>{
    const unlocked = !!achievements[def.id];
    const card = document.createElement('div');
    card.className = 'ach-card' + (unlocked ? ' unlocked' : ' locked');
    card.innerHTML = `
      <div class="ach-card-icon">${def.icon}</div>
      <div class="ach-card-name">${def.name}</div>
      <div class="ach-card-desc">${unlocked ? `<span style="color:var(--accent);font-size:9px">${achievements[def.id].date}</span>` : def.desc}</div>`;
    el.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   2. 1RM + SUGGESTIONS DE PROGRESSION
   ══════════════════════════════════════════════════════════════ */
function calc1RM(kg, reps){
  if(reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30));
}

function getProgressionSuggestion(exName, exSets){
  const entries = chargesData[exName] || [];
  const pr = prChargesData[exName] || null;
  if(!entries.length) return null;

  const last = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const oneRM = calc1RM(last.kg, last.reps);

  // Parser la fourchette de reps depuis exSets (ex: "4 × 6–8" → min:6, max:8)
  const rangeMatch = exSets.match(/(\d+)[\-–](\d+)/);
  const singleMatch = exSets.match(/×\s*(\d+)/);
  let repMin = 6, repMax = 12;
  if(rangeMatch){ repMin = parseInt(rangeMatch[1]); repMax = parseInt(rangeMatch[2]); }
  else if(singleMatch){ repMin = repMax = parseInt(singleMatch[1]); }

  let suggestion = null;
  if(last.reps >= repMax){
    // Haut de la fourchette → augmenter la charge
    suggestion = { type:'up', nextKg: last.kg + 2.5, reason:`${last.reps} reps = haut de la fourchette. +2.5kg` };
  } else if(last.reps < repMin){
    suggestion = { type:'down', nextKg: Math.max(last.kg - 2.5, 0), reason:`${last.reps} reps = sous la fourchette. -2.5kg` };
  } else {
    suggestion = { type:'hold', nextKg: last.kg, reason:`Continue à ${last.kg}kg — dans la fourchette` };
  }

  const isPr = pr && last.kg >= pr.kg;
  return { ...suggestion, oneRM, isPr, last, prev };
}

/* Patch openWeightModal pour injecter les suggestions */
const _origOpenWeightModal = typeof openWeightModal === 'function' ? openWeightModal : null;
if(_origOpenWeightModal){
  // On remplace par une version enrichie
  window.openWeightModal = function(exName, exSets, key){
    _origOpenWeightModal(exName, exSets, key);
    // Injecter suggestion sous le modal
    setTimeout(()=>{
      const suggEl = document.getElementById('weightSuggestion');
      if(!suggEl) return;
      const s = getProgressionSuggestion(exName, exSets);
      if(!s){ suggEl.innerHTML = ''; return; }
      const icons = {up:'↑', down:'↓', hold:'→'};
      const colors = {up:'var(--green)', down:'var(--orange)', hold:'var(--muted)'};
      suggEl.innerHTML = `
        <div class="weight-suggestion" style="border-color:${colors[s.type]}">
          <div class="ws-left">
            <div class="ws-suggest" style="color:${colors[s.type]}">${icons[s.type]} ${s.nextKg}kg</div>
            <div class="ws-reason">${s.reason}</div>
          </div>
          <div class="ws-right">
            <div class="ws-orm">${s.oneRM}kg</div>
            <div class="ws-orm-label">1RM est.</div>
            ${s.isPr ? '<div class="ws-pr">🏆 PR</div>' : ''}
          </div>
        </div>`;
    }, 100);
  };
}

/* ══════════════════════════════════════════════════════════════
   3. RPE — Rating of Perceived Exertion
   ══════════════════════════════════════════════════════════════ */
let rpeModalCallback = null;

function openRpeModal(dayTitle, onSave){
  rpeModalCallback = onSave;
  setTxt('rpeModalTitle', 'Post-séance — ' + dayTitle);
  const existing = rpeData[todayStr()];
  // Reset sliders
  ['rpeEnergy','rpeSleep','rpeSoreness'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = existing ? existing[id.replace('rpe','').toLowerCase()] || 3 : 3;
  });
  updateRpeDisplay();
  document.getElementById('rpeOverlay').classList.add('show');
}

function updateRpeDisplay(){
  const energy   = parseInt(document.getElementById('rpeEnergy')?.value   || 3);
  const sleep    = parseInt(document.getElementById('rpeSleep')?.value    || 3);
  const soreness = parseInt(document.getElementById('rpeSoreness')?.value || 3);
  const labels   = ['','😴','😫','😐','💪','🔥'];
  setTxt('rpeEnergyVal',   labels[energy]   + ' ' + energy + '/5');
  setTxt('rpeSleepVal',    labels[sleep]    + ' ' + sleep  + '/5');
  setTxt('rpeSorenessVal', ['','✅','😐','😬','😣','🚨'][soreness] + ' ' + soreness + '/5');
}

function saveRpe(){
  const energy   = parseInt(document.getElementById('rpeEnergy').value);
  const sleep    = parseInt(document.getElementById('rpeSleep').value);
  const soreness = parseInt(document.getElementById('rpeSoreness').value);
  rpeData[todayStr()] = {energy, sleep, soreness};
  store.set('rpeData', rpeData);
  document.getElementById('rpeOverlay').classList.remove('show');
  if(rpeModalCallback) rpeModalCallback();
  rpeModalCallback = null;
  checkAchievements();
}

document.getElementById('rpeSaveBtn')?.addEventListener('click', saveRpe);
document.getElementById('rpeSkipBtn')?.addEventListener('click', ()=>{
  document.getElementById('rpeOverlay').classList.remove('show');
  if(rpeModalCallback) rpeModalCallback();
  rpeModalCallback = null;
});
['rpeEnergy','rpeSleep','rpeSoreness'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input', updateRpeDisplay);
});

/* Patch: déclencher RPE quand toute la séance est cochée */
const _origIsCurrentWorkoutDone = typeof isCurrentWorkoutDone === 'function' ? isCurrentWorkoutDone : null;
let rpeTriggerFired = store.get('rpeTriggerFired', '');

function checkRpeTrigger(){
  if(rpeTriggerFired === todayStr()) return;
  if(!_origIsCurrentWorkoutDone || !_origIsCurrentWorkoutDone()) return;
  const cur = getCurDayIdx();
  if(cur < 0) return;
  const dayTitle = days[cur].title;
  rpeTriggerFired = todayStr();
  store.set('rpeTriggerFired', rpeTriggerFired);
  setTimeout(()=> openRpeModal(dayTitle, ()=>{}), 800);
}

/* ══════════════════════════════════════════════════════════════
   4. BODY WEIGHT TRACKING
   ══════════════════════════════════════════════════════════════ */
function saveBodyEntry(){
  const kg    = parseFloat(document.getElementById('bodyKgInput')?.value);
  const waist = parseFloat(document.getElementById('bodyWaistInput')?.value) || null;
  if(isNaN(kg) || kg <= 0){ document.getElementById('bodyKgInput')?.focus(); return; }

  const existing = bodyLog.findIndex(e=>e.date===todayStr());
  const entry = {date:todayStr(), kg, waist};
  if(existing >= 0) bodyLog[existing] = entry;
  else bodyLog.unshift(entry);
  if(bodyLog.length > 365) bodyLog = bodyLog.slice(0, 365);
  store.set('bodyLog', bodyLog);
  document.getElementById('bodyKgInput').value  = '';
  document.getElementById('bodyWaistInput').value = '';
  renderBodySection();
  updateBodyHomeCard();
}

document.getElementById('bodySaveBtn')?.addEventListener('click', saveBodyEntry);

function renderBodySection(){
  const el = document.getElementById('bodySpark');
  if(!el) return;
  const entries = bodyLog.slice(0, 30).reverse();
  if(entries.length < 2){ el.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#484848" font-size="12" font-family="Bebas Neue">Minimum 2 entrées</text>'; return; }

  const w = 500, h = 80, pad = 8;
  const kgs = entries.map(e=>e.kg);
  const minKg = Math.min(...kgs), maxKg = Math.max(...kgs);
  const range = maxKg - minKg || 1;
  const pts = entries.map((e,i)=>({
    x: pad + (i/(entries.length-1))*(w-pad*2),
    y: pad + ((e.kg-minKg)/range)*(h-pad*2)
  }));
  const ptsInv = pts.map(p=>({x:p.x, y:h-p.y}));
  const lineStr = ptsInv.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${ptsInv[0].x},${h} ${lineStr} ${ptsInv[ptsInv.length-1].x},${h}`;
  const last = entries[entries.length-1];
  const first = entries[0];
  const delta = last.kg - first.kg;
  const color = delta <= 0 ? 'var(--green)' : 'var(--orange)';

  el.innerHTML = `
    <polygon points="${area}" style="fill:rgba(201,255,0,0.06);stroke:none"/>
    <polyline points="${lineStr}" style="fill:none;stroke:${color};stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>
    <circle cx="${ptsInv[ptsInv.length-1].x}" cy="${ptsInv[ptsInv.length-1].y}" r="4" style="fill:${color}"/>
    <text x="${ptsInv[ptsInv.length-1].x}" y="${ptsInv[ptsInv.length-1].y-8}" text-anchor="middle" fill="${color}" font-size="11" font-family="Bebas Neue">${last.kg}kg</text>`;

  // Stats
  const bodyStats = document.getElementById('bodyStats');
  if(bodyStats){
    const deltaStr = (delta > 0 ? '+' : '') + delta.toFixed(1);
    const deltaColor = delta <= 0 ? 'var(--green)' : 'var(--orange)';
    bodyStats.innerHTML = `
      <div class="body-stat"><div class="body-stat-val">${last.kg}<span style="font-size:14px">kg</span></div><div class="body-stat-label">Actuel</div></div>
      <div class="body-stat"><div class="body-stat-val" style="color:${deltaColor}">${deltaStr}<span style="font-size:14px">kg</span></div><div class="body-stat-label">Évolution</div></div>
      <div class="body-stat"><div class="body-stat-val">${bodyLog.length}</div><div class="body-stat-label">Entrées</div></div>`;
  }

  // Historique récent
  const bodyHistEl = document.getElementById('bodyHistory');
  if(bodyHistEl){
    bodyHistEl.innerHTML = bodyLog.slice(0,10).map((e,i)=>{
      const prev = bodyLog[i+1];
      const d = prev ? e.kg - prev.kg : 0;
      const dStr = d !== 0 ? `<span style="color:${d<0?'var(--green)':'var(--orange)'}; font-size:10px">${d>0?'+':''}${d.toFixed(1)}kg</span>` : '';
      return `<div class="body-hist-row"><span class="body-hist-date">${e.date}</span><span class="body-hist-kg">${e.kg}kg ${dStr}</span>${e.waist?`<span class="body-hist-waist">${e.waist}cm</span>`:''}</div>`;
    }).join('');
  }
}

function updateBodyHomeCard(){
  const el = document.getElementById('homeBodyKg');
  if(!el) return;
  if(bodyLog.length === 0){ el.textContent = '—'; return; }
  el.textContent = bodyLog[0].kg + 'kg';
}

/* ══════════════════════════════════════════════════════════════
   5. GOALS SYSTEM
   ══════════════════════════════════════════════════════════════ */
const GOAL_TEMPLATES = [
  {type:'bench',  name:'Bench Press',     unit:'kg', icon:'🏋️', hint:'Ex: 100kg'},
  {type:'squat',  name:'Squat',           unit:'kg', icon:'🦵', hint:'Ex: 120kg'},
  {type:'run5k',  name:'5K en moins de', unit:'min', icon:'🏃', hint:'Ex: 22'},
  {type:'weight', name:'Poids de forme',  unit:'kg', icon:'⚖️', hint:'Ex: 80kg'},
  {type:'streak', name:'Streak objectif', unit:'j',  icon:'🔥', hint:'Ex: 60'},
  {type:'custom', name:'Objectif custom', unit:'',   icon:'🎯', hint:'Valeur cible'},
];

function openGoalModal(){
  document.getElementById('goalOverlay').classList.add('show');
  renderGoalTemplates();
}
function closeGoalModal(){ document.getElementById('goalOverlay').classList.remove('show'); }

document.getElementById('goalModalClose')?.addEventListener('click', closeGoalModal);

function renderGoalTemplates(){
  const el = document.getElementById('goalTemplates');
  if(!el) return;
  el.innerHTML = GOAL_TEMPLATES.map(t=>`
    <div class="goal-tpl" onclick="selectGoalTemplate('${t.type}')">
      <span class="goal-tpl-icon">${t.icon}</span>
      <span class="goal-tpl-name">${t.name}</span>
    </div>`).join('');
}

let selectedGoalType = null;
function selectGoalTemplate(type){
  selectedGoalType = type;
  const tpl = GOAL_TEMPLATES.find(t=>t.type===type);
  document.getElementById('goalTemplates').style.display = 'none';
  const form = document.getElementById('goalForm');
  form.style.display = 'block';
  setTxt('goalFormTitle', tpl.icon + ' ' + tpl.name);
  document.getElementById('goalTargetInput').placeholder = tpl.hint;
  document.getElementById('goalUnitLabel').textContent = tpl.unit;
  // Pre-fill current value
  let currentVal = '';
  if(type === 'bench' && prChargesData['Développé couché barre']) currentVal = prChargesData['Développé couché barre'].kg;
  if(type === 'weight' && bodyLog.length) currentVal = bodyLog[0].kg;
  if(type === 'streak') currentVal = streakData.count;
  document.getElementById('goalCurrentInput').value = currentVal;
}

document.getElementById('goalSaveBtn')?.addEventListener('click', ()=>{
  const tpl = GOAL_TEMPLATES.find(t=>t.type===selectedGoalType);
  if(!tpl) return;
  const target  = parseFloat(document.getElementById('goalTargetInput').value);
  const current = parseFloat(document.getElementById('goalCurrentInput').value) || 0;
  const date    = document.getElementById('goalDateInput').value;
  const name    = document.getElementById('goalNameInput').value || tpl.name;
  if(isNaN(target)){ document.getElementById('goalTargetInput').focus(); return; }
  const goal = {
    id: Date.now().toString(),
    type: selectedGoalType,
    icon: tpl.icon,
    name,
    unit: tpl.unit,
    current,
    target,
    startDate: todayStr(),
    targetDate: date || '',
    history:[{date:todayStr(), val:current}]
  };
  goals.push(goal);
  store.set('goals', goals);
  closeGoalModal();
  document.getElementById('goalForm').style.display = 'none';
  document.getElementById('goalTemplates').style.display = 'grid';
  selectedGoalType = null;
  renderGoals();
});

function deleteGoal(id){
  goals = goals.filter(g=>g.id!==id);
  store.set('goals', goals);
  renderGoals();
}

function updateGoalProgress(){
  // Mise à jour automatique des goals selon les données
  goals.forEach(g=>{
    let newVal = null;
    if(g.type==='bench' && prChargesData['Développé couché barre']) newVal = prChargesData['Développé couché barre'].kg;
    if(g.type==='squat' && prChargesData['Squat barre']) newVal = prChargesData['Squat barre'].kg;
    if(g.type==='weight' && bodyLog.length) newVal = bodyLog[0].kg;
    if(g.type==='streak') newVal = streakData.count;
    if(newVal !== null && newVal !== g.current){
      g.current = newVal;
      if(!g.history.find(h=>h.date===todayStr())) g.history.push({date:todayStr(), val:newVal});
    }
  });
  store.set('goals', goals);
}

function renderGoals(){
  updateGoalProgress();
  const el = document.getElementById('goalsContainer');
  if(!el) return;
  if(goals.length === 0){
    el.innerHTML = '<div class="goals-empty">Aucun objectif défini.<br><button class="goal-add-btn" onclick="openGoalModal()">+ Ajouter un objectif</button></div>';
    return;
  }
  el.innerHTML = goals.map(g=>{
    const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
    const done = g.current >= g.target;
    const remaining = g.target - g.current;
    const daysLeft = g.targetDate ? Math.ceil((new Date(g.targetDate) - new Date()) / 86400000) : null;
    return `
      <div class="goal-card ${done?'goal-done':''}">
        <div class="goal-header">
          <span class="goal-icon">${g.icon}</span>
          <div class="goal-title-wrap">
            <div class="goal-name">${g.name}</div>
            ${daysLeft !== null ? `<div class="goal-deadline ${daysLeft < 14 ? 'urgent' : ''}">${daysLeft > 0 ? daysLeft + ' jours' : 'Dépassé'}</div>` : ''}
          </div>
          <div class="goal-nums">
            <div class="goal-current">${g.current}<span class="goal-unit">${g.unit}</span></div>
            <div class="goal-sep">/</div>
            <div class="goal-target">${g.target}<span class="goal-unit">${g.unit}</span></div>
          </div>
          <button class="goal-delete" onclick="deleteGoal('${g.id}')">✕</button>
        </div>
        <div class="goal-bar-wrap">
          <div class="goal-bar" style="width:${pct}%;background:${done?'var(--accent)':'var(--run)'}"></div>
        </div>
        <div class="goal-footer">
          <span class="goal-pct">${pct}%</span>
          ${done ? '<span class="goal-done-label">✓ Objectif atteint 🎉</span>' : `<span class="goal-remaining">${Math.abs(remaining).toFixed(1)}${g.unit} restant${g.unit==='kg'?'s':''}</span>`}
        </div>
      </div>`;
  }).join('') + '<button class="goal-add-btn" style="margin-top:8px" onclick="openGoalModal()">+ Ajouter un objectif</button>';
}

/* ══════════════════════════════════════════════════════════════
   6. PROTEIN TRACKER
   ══════════════════════════════════════════════════════════════ */
const PROTEIN_BLOCKS = [
  {label:'Matin',        icon:'☀️', g:35},
  {label:'Midi',         icon:'🕛', g:40},
  {label:'Post-séance',  icon:'💪', g:45},
  {label:'Soir',         icon:'🌙', g:30},
];
const PROTEIN_TOTAL = PROTEIN_BLOCKS.reduce((a,b)=>a+b.g, 0);

function renderProteinTracker(){
  const el = document.getElementById('proteinTracker');
  if(!el) return;
  const done = proteinState.blocks.filter(Boolean).length;
  const gDone = PROTEIN_BLOCKS.slice(0,4).reduce((a,b,i)=>a+(proteinState.blocks[i]?b.g:0),0);

  el.innerHTML = `
    <div class="prot-header">
      <div class="prot-title">Protéines du jour</div>
      <div class="prot-total">${gDone}<span style="font-size:14px;color:var(--muted)">/${PROTEIN_TOTAL}g</span></div>
    </div>
    <div class="prot-bar-wrap"><div class="prot-bar" style="width:${Math.round(gDone/PROTEIN_TOTAL*100)}%"></div></div>
    <div class="prot-blocks">${PROTEIN_BLOCKS.map((b,i)=>`
      <div class="prot-block ${proteinState.blocks[i]?'done':''}" onclick="toggleProteinBlock(${i})">
        <div class="prot-block-icon">${b.icon}</div>
        <div class="prot-block-label">${b.label}</div>
        <div class="prot-block-g">+${b.g}g</div>
        <div class="prot-block-check">✓</div>
      </div>`).join('')}
    </div>`;
}

function toggleProteinBlock(i){
  proteinState.blocks[i] = !proteinState.blocks[i];
  store.set('proteinState', proteinState);
  // Streak protéines
  const allDone = proteinState.blocks.every(Boolean);
  if(allDone){
    const ps = store.get('proteinStreak', {count:0, lastDate:''});
    const yd = yesterdayStr();
    if(ps.lastDate !== todayStr()){
      ps.count = ps.lastDate === yd ? ps.count + 1 : 1;
      ps.lastDate = todayStr();
      store.set('proteinStreak', ps);
    }
  }
  renderProteinTracker();
  checkAchievements();
}

/* ══════════════════════════════════════════════════════════════
   7. BODY TAB — render complet
   ══════════════════════════════════════════════════════════════ */
function renderBodyTab(){
  renderBodySection();
  renderGoals();
  renderAchievements();
  updateBodyHomeCard();
}

/* ══════════════════════════════════════════════════════════════
   8. COACH IA
   ══════════════════════════════════════════════════════════════ */
let coachThinking = false;

function buildCoachContext(){
  const cur     = getCurDayIdx();
  const curDay  = cur >= 0 ? days[cur] : null;
  const rank    = typeof getRank === 'function' ? getRank(streakData.count) : {name:'?'};
  const totalKm = runHistory.reduce((a,r)=>a+r.dist,0);
  const monthStr = todayStr().slice(0,7);
  const monthKm = runHistory.filter(r=>r.date.startsWith(monthStr)).reduce((a,r)=>a+r.dist,0);
  const perfectDays = historyData.filter(d=>d.done).length;
  const discScore = historyData.length > 0 ? Math.round(perfectDays/historyData.length*100) : 0;

  const prs = Object.entries(prChargesData)
    .slice(0,8)
    .map(([k,v])=>`  - ${k}: ${v.kg}kg × ${v.reps} reps (1RM est. ${calc1RM(v.kg,v.reps)}kg)`)
    .join('\n');

  const recentRuns = runHistory.slice(0,5)
    .map(r=>`  - ${r.date}: ${r.dist}km en ${Math.floor(r.timeSeconds/60)}min (${r.pace}/km, zone ${r.zone})`)
    .join('\n');

  const recentSessions = historyData.slice(0,7)
    .map(d=>`  - ${d.date}: daily ${d.pct}% ${d.done?'✓':''}`)
    .join('\n');

  const rpeRecent = Object.entries(rpeData).slice(0,5)
    .map(([date,r])=>`  - ${date}: énergie ${r.energy}/5, sommeil ${r.sleep}/5, douleurs ${r.soreness}/5`)
    .join('\n');

  const protStreak = store.get('proteinStreak', {count:0});
  const goalsSummary = goals.map(g=>`  - ${g.name}: ${g.current}/${g.target}${g.unit} (${Math.round(g.current/g.target*100)}%)`).join('\n');

  return `Tu es le coach personnel de Thomas, 27 ans, basé à Chambéry, France. Il est civil servant reconverti en frontalier Suisse. Son objectif: indépendance financière + physique. Philosophie: Discipline > motivation.

ÉTAT ACTUEL (${todayStr()}):
- Streak: ${streakData.count} jours (record: ${streakData.best})
- Rang: ${rank.name}
- Cycle: ${cycleStart ? 'J'+(cur+1)+'/8 — '+(curDay?curDay.title:'?') : 'Non démarré'}
- Score discipline: ${discScore}% (${perfectDays} jours parfaits)

PRs PRINCIPAUX:
${prs || '  Aucun PR enregistré'}

BODY:
- Poids actuel: ${bodyLog.length ? bodyLog[0].kg+'kg' : 'Non suivi'}
- Évolution 30j: ${bodyLog.length >= 2 ? (bodyLog[0].kg - bodyLog[Math.min(29,bodyLog.length-1)].kg).toFixed(1)+'kg' : 'Données insuffisantes'}

RUNNING:
- Total cumulé: ${totalKm.toFixed(1)}km
- Ce mois: ${monthKm.toFixed(1)}km
- 5 derniers runs:
${recentRuns || '  Aucun run'}

NUTRITION:
- Streak protéines: ${protStreak.count} jours consécutifs
- Objectif: 130-140g/jour (blocs: 35+40+45+30g)

FATIGUE (RPE récent):
${rpeRecent || '  Aucune donnée RPE'}

OBJECTIFS:
${goalsSummary || '  Aucun objectif défini'}

HISTORIQUE RÉCENT:
${recentSessions}

ACHIEVEMENTS: ${Object.keys(achievements).length}/${ACH_DEF.length} débloqués

Réponds en français. Sois direct, concis et actionnable. Tu connais les données ci-dessus et tu les utilises. Pas de généralités, du spécifique basé sur les chiffres réels de Thomas.`;
}

async function sendCoachMessage(){
  const input = document.getElementById('coachInput');
  const msg = input?.value?.trim();
  if(!msg || coachThinking) return;

  const key = document.getElementById('coachApiKey')?.value?.trim() || coachApiKey;
  if(!key){ showCoachError('Entre ta clé API Anthropic dans les paramètres.'); return; }
  if(key !== coachApiKey){ coachApiKey = key; store.set('coachApiKey', key); }

  input.value = '';
  coachHistory.push({role:'user', content:msg});
  renderCoachMessages();
  coachThinking = true;
  updateCoachUI();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system: buildCoachContext(),
        messages: coachHistory.slice(-10).map(m=>({role:m.role, content:m.content}))
      })
    });
    const data = await res.json();
    if(data.error){ showCoachError(data.error.message); coachThinking=false; updateCoachUI(); return; }
    const reply = data.content?.[0]?.text || '';
    coachHistory.push({role:'assistant', content:reply});
    if(coachHistory.length > 40) coachHistory = coachHistory.slice(-40);
    store.set('coachHistory', coachHistory);
  } catch(e){
    showCoachError('Erreur réseau: ' + e.message);
  }
  coachThinking = false;
  updateCoachUI();
  renderCoachMessages();
}

function showCoachError(msg){
  coachHistory.push({role:'system-error', content:msg});
  renderCoachMessages();
}

function clearCoachHistory(){
  coachHistory = [];
  store.set('coachHistory', coachHistory);
  renderCoachMessages();
}

function renderCoachMessages(){
  const el = document.getElementById('coachMessages');
  if(!el) return;
  if(coachHistory.length === 0){
    el.innerHTML = `<div class="coach-empty">
      <div class="coach-empty-icon">🤖</div>
      <div class="coach-empty-title">Coach ARENA</div>
      <div class="coach-empty-sub">Je connais tes données. Pose-moi n'importe quelle question sur ton entraînement, ta progression ou ta récupération.</div>
      <div class="coach-suggestions">
        <div class="coach-suggest" onclick="askCoach('Analyse ma progression et dis-moi ce qui bloque')">Analyse ma progression</div>
        <div class="coach-suggest" onclick="askCoach('Programme-moi 4 semaines pour passer 100kg au bench')">Plan 100kg bench</div>
        <div class="coach-suggest" onclick="askCoach('Comment améliorer mon pace sur 5km ?')">Améliorer mon 5K</div>
        <div class="coach-suggest" onclick="askCoach('Est-ce que je suis en surmenage en ce moment ?')">Suis-je en surmenage ?</div>
      </div>
    </div>`;
    return;
  }
  el.innerHTML = coachHistory.map(m=>{
    if(m.role==='system-error') return `<div class="coach-msg error"><span>⚠️ ${m.content}</span></div>`;
    const cls = m.role==='user' ? 'coach-msg user' : 'coach-msg assistant';
    const text = m.content.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    return `<div class="${cls}"><div class="coach-msg-bubble">${text}</div></div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function askCoach(msg){
  const input = document.getElementById('coachInput');
  if(input){ input.value = msg; sendCoachMessage(); }
}

function updateCoachUI(){
  const btn = document.getElementById('coachSendBtn');
  const thinking = document.getElementById('coachThinking');
  if(btn) btn.disabled = coachThinking;
  if(thinking) thinking.style.display = coachThinking ? 'flex' : 'none';
}

document.getElementById('coachSendBtn')?.addEventListener('click', sendCoachMessage);
document.getElementById('coachInput')?.addEventListener('keydown', e=>{
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendCoachMessage(); }
});
document.getElementById('coachClearBtn')?.addEventListener('click', clearCoachHistory);
document.getElementById('coachApiKeyBtn')?.addEventListener('click', ()=>{
  const panel = document.getElementById('coachApiPanel');
  if(panel) panel.style.display = panel.style.display==='none' ? 'block' : 'none';
});
document.getElementById('coachApiSaveBtn')?.addEventListener('click', ()=>{
  const key = document.getElementById('coachApiKeyInput')?.value?.trim();
  if(key){ coachApiKey=key; store.set('coachApiKey',key); document.getElementById('coachApiPanel').style.display='none'; }
});

/* Pré-remplir la clé si déjà sauvegardée */
if(coachApiKey && document.getElementById('coachApiKeyInput')){
  document.getElementById('coachApiKeyInput').value = coachApiKey;
  document.getElementById('coachApiKey').value = coachApiKey;
}

/* ══════════════════════════════════════════════════════════════
   9. PATCH switchTab pour les nouveaux onglets
   ══════════════════════════════════════════════════════════════ */
const _origSwitchTab = window.switchTab;
window.switchTab = function(name){
  _origSwitchTab(name);
  if(name === 'body')  renderBodyTab();
  if(name === 'coach'){ renderCoachMessages(); updateCoachUI(); }
  if(name === 'home')  renderProteinTracker();
};

/* ══════════════════════════════════════════════════════════════
   10. PATCH updateHome pour les nouvelles cartes
   ══════════════════════════════════════════════════════════════ */
const _origUpdateHome = window.updateHome;
window.updateHome = function(){
  _origUpdateHome();
  renderProteinTracker();
  updateBodyHomeCard();
  updateGoalProgress();
  checkRpeTrigger();
  checkAchievements();
  // Afficher le RPE du jour sur la home
  const rpeEl = document.getElementById('homeRpeToday');
  if(rpeEl){
    const r = rpeData[todayStr()];
    if(r){ rpeEl.textContent = `⚡ ${r.energy}/5  😴 ${r.sleep}/5  💪 ${r.soreness}/5`; rpeEl.style.display='block'; }
    else { rpeEl.style.display='none'; }
  }
};

/* ══════════════════════════════════════════════════════════════
   11. INIT
   ══════════════════════════════════════════════════════════════ */
renderProteinTracker();
updateBodyHomeCard();
renderCoachMessages();
checkAchievements();
updateGoalProgress();
if(bodyLog.length > 0) renderBodySection();