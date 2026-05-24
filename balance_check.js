const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function loadData() {
  const ctx = {};
  const code = ['artists.js', 'content.js']
    .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8'))
    .join('\n') + '\nglobalThis.__DATA__ = { POOL, CONTENT_TYPES };';
  vm.runInNewContext(code, ctx);
  return ctx.__DATA__;
}

const { POOL, CONTENT_TYPES } = loadData();
const LIVE_INCOME_PER_LEVEL = 15;

const BUILDINGS = {
  live: { name: '直播间', lv: 0, maxLv: 8, cost: 80 },
  practice: { name: '训练室', lv: 1, maxLv: 8, cost: 60 },
  studio: { name: '录音室', lv: 1, maxLv: 8, cost: 100 },
  office: { name: '经纪办公室', lv: 1, maxLv: 6, cost: 50 },
};

function routeLevel(state, id) {
  const routes = {
    cash: ['live', 'merch', 'office'],
    talent: ['practice', 'lounge', 'health', 'rehearsal'],
    content: ['studio', 'mv', 'wardrobe', 'makeup', 'media'],
  };
  const keys = routes[id] || [];
  const count = keys.filter(k => state.buildings[k] && state.buildings[k].lv > 0).length;
  return count >= keys.length ? 2 : count >= 3 ? 1 : 0;
}
function cashRouteIncomeMult(state) { return 1 + routeLevel(state, 'cash') * 0.05; }
function talentRouteTrainMult(state) { return 1 + routeLevel(state, 'talent') * 0.05; }
function talentRouteRestBonus(state) {
  const lv = routeLevel(state, 'talent');
  return lv * 3 + (lv >= 2 ? 2 : 0);
}
function contentRouteIncomeMult(state) { return 1 + routeLevel(state, 'content') * 0.05; }

const COMPANY_SHARE_BY_RARITY = { '普通': 90, '良好': 85, '优秀': 80, '稀有': 75, '✨传奇': 70 };
function companyShare(a) { return COMPANY_SHARE_BY_RARITY[a.rarity] || 85; }
function companyIncome(gross, a) { return Math.round(gross * companyShare(a) / 100); }
function drain(a, training = false) {
  const base = { '✨传奇': 10, '稀有': 12, '优秀': 14, '良好': 15, '普通': 18 }[a.rarity] || 15;
  return training ? Math.max(5, base - 3) : base;
}
function recover(a, buildings) {
  const base = { '✨传奇': 38, '稀有': 33, '优秀': 30, '良好': 28, '普通': 22 }[a.rarity] || 28;
  return base + ((buildings.health && buildings.health.lv) || 0) * 3;
}
function cloneArtist(p) {
  return {
    ...p,
    status: '训练中',
    fans: 2,
    pr: 60,
    energy: 100,
    totalCost: p.cost,
  };
}
function buildDuration(targetLv) {
  if (targetLv <= 1) return 1;
  if (targetLv <= 3) return 2;
  if (targetLv <= 5) return 3;
  return 4;
}
function startBuild(state, key) {
  const b = state.buildings[key];
  if (!b || b.lv >= b.maxLv || state.pendingBuilds.some(p => p.key === key)) return false;
  if (state.money < b.cost) return false;
  const paid = b.cost;
  const targetLv = b.lv + 1;
  state.money -= paid;
  state.cost += paid;
  state.costBy.building += paid;
  b.cost = Math.round(b.cost * 1.5);
  state.pendingBuilds.push({ key, targetLv, completeAt: state.month + buildDuration(targetLv) });
  state.actions.push(`${b.name}->Lv.${targetLv} (${paid}万)`);
  return true;
}
function releaseSingle(state, a) {
  const t = CONTENT_TYPES.find(x => x.id === 'single');
  if (!t || state.money < t.cost || state.pendingReleases.length) return false;
  state.money -= t.cost;
  state.cost += t.cost;
  state.costBy.content += t.cost;
  state.pendingReleases.push({
    type: 'single',
    title: `${a.name} 首支单曲`,
    baseIncome: t.income(a),
    releasedAt: state.month + t.productionMonths,
    duration: t.duration,
  });
  state.actions.push(`制作数字单曲 (${t.cost}万)`);
  return true;
}
function processMonth(state) {
  state.month += 1;
  state.income = 0;
  state.cost = 0;
  state.incomeBy = { live: 0, work: 0, content: 0, starter: 0 };
  state.costBy = { training: 0, building: 0, content: 0, rest: 0 };
  state.actions = [];

  const doneBuilds = state.pendingBuilds.filter(p => p.completeAt <= state.month);
  state.pendingBuilds = state.pendingBuilds.filter(p => p.completeAt > state.month);
  doneBuilds.forEach(p => {
    state.buildings[p.key].lv = p.targetLv;
    state.actions.push(`${state.buildings[p.key].name}完工 Lv.${p.targetLv}`);
  });

  const doneReleases = state.pendingReleases.filter(r => r.releasedAt <= state.month);
  state.pendingReleases = state.pendingReleases.filter(r => r.releasedAt > state.month);
  doneReleases.forEach(r => {
    state.releases.push(r);
    state.actions.push(`${r.title}上线`);
  });

  if (state.buildings.live.lv > 0) {
    const g = Math.round(state.buildings.live.lv * LIVE_INCOME_PER_LEVEL * cashRouteIncomeMult(state));
    state.income += g;
    state.incomeBy.live += g;
  }

  state.releases.forEach(r => {
    const age = state.month - r.releasedAt;
    const mult = age === 0 ? 1.5 : age === 1 ? 1.0 : age === 2 ? 0.6 : 0.2;
    const g = Math.round(r.baseIncome * mult * contentRouteIncomeMult(state));
    state.income += g;
    state.incomeBy.content += g;
  });

  state.artists.forEach(a => {
    const energyMult = a.energy >= 80 ? 1.1 : a.energy <= 20 ? 0.6 : 1;
    if (a.status === '训练中') {
      const eff = (1 + state.buildings.practice.lv * 0.2) * energyMult * talentRouteTrainMult(state);
      a.singing = Math.min(99, a.singing + Math.round(1.5 * eff));
      a.dance = Math.min(99, a.dance + Math.round(1.5 * eff));
      a.acting = Math.min(99, a.acting + Math.round(1.0 * eff));
      state.cost += 5;
      state.costBy.training += 5;
      a.energy = Math.max(0, a.energy - drain(a, true));
      if (a.singing > 75 && a.dance > 65) {
        a.status = '已出道';
        state.actions.push(`${a.name}出道`);
      }
    } else if (a.status === '工作中' || a.status === '已出道') {
      const prMult = a.pr >= 80 ? 1.3 : a.pr >= 60 ? 1 : a.pr >= 40 ? 0.7 : 0.3;
      const gross = Math.round(((a.singing + a.dance) / 12 + 4) * prMult * energyMult);
      const g = companyIncome(gross, a);
      state.income += g;
      state.incomeBy.work += g;
      a.fans = Math.round((a.fans || 0) + gross / 8);
      a.energy = Math.max(0, a.energy - drain(a));
    } else if (a.status === '休息中') {
      state.cost += 2;
      state.costBy.rest += 2;
      a.energy = Math.min(100, a.energy + recover(a, state.buildings) + talentRouteRestBonus(state));
      if (a.energy >= 80 && a.singing > 75 && a.dance > 65) a.status = '工作中';
    }
    if (a.energy <= 0 && a.status !== '休息中') a.status = '休息中';
  });

  state.money += state.income - state.cost;
  state.fame += Math.floor(state.income / 25 + 1);
}

function applyStarterRewards(state) {
  if (!state.goals.recruit && state.artists.length >= 1) {
    state.goals.recruit = true; state.money += 20; state.income += 20; state.incomeBy.starter += 20;
  }
  if (!state.goals.live && state.buildings.live.lv >= 1) {
    state.goals.live = true; state.money += 30; state.income += 30; state.incomeBy.starter += 30;
  }
  if (!state.goals.practice && state.buildings.practice.lv >= 2) {
    state.goals.practice = true; state.fame += 5;
  }
  if (!state.goals.debut && state.artists.some(a => a.status === '已出道' || a.status === '工作中')) {
    state.goals.debut = true; state.fame += 10; state.artists[0].fans += 5;
  }
  if (!state.goals.single && state.releases.some(r => r.type === 'single')) {
    state.goals.single = true; state.money += 30; state.income += 30; state.incomeBy.starter += 30; state.fame += 10;
  }
}

function totalFans(state) {
  return state.artists.reduce((s, a) => s + (a.fans || 0), 0);
}

function applyCompanyStageRewards(state) {
  if (!state.stages) state.stages = {};
  if (!state.stages.basement &&
    state.artists.length >= 1 &&
    state.buildings.live.lv >= 1 &&
    state.artists.some(a => a.status === '已出道' || a.status === '工作中')) {
    state.stages.basement = true;
    state.money += 25;
    state.income += 25;
    state.incomeBy.starter += 25;
    state.fame += 8;
    state.actions.push('阶段完成：地下练习室 (+25万)');
  }
  if (!state.stages.small_agency &&
    state.releases.some(r => r.type === 'single') &&
    totalFans(state) >= 30 &&
    state.income >= 80) {
    state.stages.small_agency = true;
    state.money += 50;
    state.income += 50;
    state.incomeBy.starter += 50;
    state.fame += 15;
    state.actions.push('阶段完成：小型经纪公司 (+50万)');
  }
}

function applyRouteGoalRewards(state) {
  if (!state.routeGoals) state.routeGoals = {};
  if (!state.routeGoals.cash &&
    ['live', 'merch', 'office'].every(k => state.buildings[k] && state.buildings[k].lv > 0)) {
    state.routeGoals.cash = true;
    state.money += 40;
    state.income += 40;
    state.incomeBy.starter += 40;
    state.fame += 5;
    state.actions.push('路线任务：现金流基础盘 (+40万)');
  }
  if (!state.routeGoals.talent &&
    ['practice', 'lounge', 'health'].every(k => state.buildings[k] && state.buildings[k].lv > 0)) {
    state.routeGoals.talent = true;
    state.artists.forEach(a => { a.energy = Math.min(100, (a.energy || 80) + 15); });
    state.fame += 8;
    state.actions.push('路线任务：核心艺人培养线');
  }
  if (!state.routeGoals.content &&
    ['studio', 'mv', 'media'].every(k => state.buildings[k] && state.buildings[k].lv > 0)) {
    state.routeGoals.content = true;
    state.money += 30;
    state.income += 30;
    state.incomeBy.starter += 30;
    state.fame += 10;
    state.actions.push('路线任务：作品制作链路 (+30万)');
  }
}

function publicArtistCount(state) {
  return state.artists.filter(a => a.status === '已出道' || a.status === '工作中').length;
}

function applyLongGoalRewards(state) {
  if (!state.longGoals) state.longGoals = {};
  if (!state.longGoals.twoPublic && publicArtistCount(state) >= 2) {
    state.longGoals.twoPublic = true;
    state.fame += 15;
    state.actions.push('长期目标：双艺人阵容');
  }
  if (!state.longGoals.fans100 && totalFans(state) >= 100) {
    state.longGoals.fans100 = true;
    state.money += 60;
    state.income += 60;
    state.incomeBy.starter += 60;
    state.fame += 20;
    state.actions.push('长期目标：粉丝100万 (+60万)');
  }
  if (!state.longGoals.threeReleases && state.releases.length >= 3) {
    state.longGoals.threeReleases = true;
    state.fame += 18;
    state.actions.push('长期目标：稳定内容供给');
  }
  if (!state.longGoals.income150 && state.income >= 150) {
    state.longGoals.income150 = true;
    state.money += 80;
    state.income += 80;
    state.incomeBy.starter += 80;
    state.actions.push('长期目标：单月收入突破 (+80万)');
  }
}

function chooseActions(state) {
  if (state.month === 1 && !state.artists.length) {
    const p = POOL.find(a => a.name === '韩依依') || POOL[0];
    const a = cloneArtist(p);
    state.money -= a.cost;
    state.cost += a.cost;
    state.artists.push(a);
    state.actions.push(`签约${a.name} (${a.cost}万)`);
  }
  if (state.buildings.live.lv === 0) startBuild(state, 'live');
  else if (state.buildings.practice.lv < 3) startBuild(state, 'practice');
  else if (state.buildings.office.lv < 2 && state.month >= 6) startBuild(state, 'office');

  state.artists.forEach(a => {
    if (a.status === '已出道') a.status = '工作中';
    if ((a.status === '工作中' || a.status === '已出道') && a.energy <= 35) a.status = '休息中';
  });

  const publicArtist = state.artists.find(a => a.status === '工作中' || a.status === '已出道');
  if (publicArtist && !state.releases.length && !state.pendingReleases.length) releaseSingle(state, publicArtist);
}

function simulate(months = 24) {
  const state = {
    month: 0,
    money: 800,
    fame: 12,
    artists: [],
    buildings: JSON.parse(JSON.stringify(BUILDINGS)),
    pendingBuilds: [],
    pendingReleases: [],
    releases: [],
    goals: {},
    stages: {},
    routeGoals: {},
    longGoals: {},
    history: [],
    income: 0,
    cost: 0,
    incomeBy: {},
    costBy: {},
    actions: [],
  };

  for (let i = 0; i < months; i++) {
    processMonth(state);
    chooseActions(state);
    applyStarterRewards(state);
    applyCompanyStageRewards(state);
    applyRouteGoalRewards(state);
    applyLongGoalRewards(state);
    state.history.push({
      month: state.month,
      money: state.money,
      fame: state.fame,
      income: state.income,
      cost: state.cost,
      net: state.income - state.cost,
      artists: state.artists.map(a => `${a.name}:${a.status}:唱${a.singing}/舞${a.dance}/精${a.energy}`),
      buildings: Object.values(state.buildings).map(b => `${b.name}Lv.${b.lv}`).join(' '),
      incomeBy: { ...state.incomeBy },
      costBy: { ...state.costBy },
      actions: [...state.actions],
    });
  }
  return state;
}

function printReport(state) {
  console.log('Balance simulation: conservative first-24-month route');
  console.log('Assumptions: sign one mid-tier trainee, build live room, upgrade practice room, release first single after debut.');
  console.log('');
  console.log('Month | Money | Income | Cost | Net | Fame | Actions');
  console.log('----- | ----- | ------ | ---- | --- | ---- | -------');
  state.history.forEach(h => {
    console.log(`${String(h.month).padStart(5)} | ${String(h.money).padStart(5)} | ${String(h.income).padStart(6)} | ${String(h.cost).padStart(4)} | ${String(h.net).padStart(3)} | ${String(h.fame).padStart(4)} | ${h.actions.join('; ')}`);
  });
  const final = state.history[state.history.length - 1];
  const totals = state.history.reduce((acc, h) => {
    Object.entries(h.incomeBy).forEach(([k, v]) => acc.income[k] = (acc.income[k] || 0) + v);
    Object.entries(h.costBy).forEach(([k, v]) => acc.cost[k] = (acc.cost[k] || 0) + v);
    return acc;
  }, { income: {}, cost: {} });
  console.log('');
  console.log('Final artists:', final.artists.join(' | '));
  console.log('Final buildings:', final.buildings);
  console.log('Income breakdown:', totals.income);
  console.log('Cost breakdown:', totals.cost);
  console.log('');
  if (final.money > 1200) console.log('Finding: funds are very comfortable; early game may lack pressure.');
  else if (final.money < 300) console.log('Finding: funds are tight; early game may punish experimentation.');
  else console.log('Finding: funds remain in a moderate range.');
}

printReport(simulate(Number(process.argv[2] || 24)));
