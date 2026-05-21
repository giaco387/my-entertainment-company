// 成就定义
// check() 返回 true 时触发解锁，由 checkAchievements() 调用
const ACHIEVEMENTS = [

  // ── 里程碑 ──────────────────────────────────────────────
  { id:'first_debut',    name:'初露锋芒', icon:'🌟', cat:'里程碑', desc:'第一位练习生成功出道',
    check() { return G.artists.some(a => a.status === '已出道' || a.status === '工作中'); } },
  { id:'fame_800',       name:'新兴势力', icon:'📈', cat:'里程碑', desc:'公司声望达到800',
    check() { return G.fame >= 800; } },
  { id:'fame_2500',      name:'业界翘楚', icon:'🏅', cat:'里程碑', desc:'公司声望达到2500',
    check() { return G.fame >= 2500; } },
  { id:'fame_8000',      name:'娱乐帝国', icon:'👑', cat:'里程碑', desc:'声望达到8000，成为顶级娱乐帝国',
    check() { return G.fame >= 8000; } },
  { id:'money_3000',     name:'财富自由', icon:'💰', cat:'里程碑', desc:'资金突破3000万',
    check() { return G.money >= 3000; } },
  { id:'month_24',       name:'两年老板', icon:'📅', cat:'里程碑', desc:'经营公司满24个月',
    check() { return G.month > 24; } },

  // ── 艺人 ────────────────────────────────────────────────
  { id:'sign_first',     name:'伯乐',     icon:'🤝', cat:'艺人', desc:'签约第一位练习生',
    check() { return G.artists.length >= 1; } },
  { id:'fans_100',       name:'百万宠儿', icon:'💫', cat:'艺人', desc:'任意艺人粉丝突破100万',
    check() { return G.artists.some(a => (a.fans || 0) >= 100); } },
  { id:'fans_500',       name:'顶流诞生', icon:'🚀', cat:'艺人', desc:'任意艺人粉丝突破500万',
    check() { return G.artists.some(a => (a.fans || 0) >= 500); } },
  { id:'all_debut',      name:'全员出道', icon:'🎤', cat:'艺人', desc:'旗下至少3名艺人全部出道',
    check() { return G.artists.length >= 3 && G.artists.every(a => a.status === '已出道' || a.status === '工作中'); } },
  { id:'pr_recovery',    name:'浴火重生', icon:'🔥', cat:'艺人', desc:'艺人从舆论危机恢复至口碑爆棚',
    check() { return G.artists.some(a => a._hadCrisis && (a.pr || 60) >= 80); } },
  { id:'all_directions', name:'全能经纪人',icon:'🎭', cat:'艺人', desc:'旗下同时拥有歌手、演员、主持人、全能四种方向',
    check() {
      const dirs = new Set(G.artists.filter(a => a.direction).map(a => a.direction));
      return ['歌手', '演员', '主持人', '全能'].every(d => dirs.has(d));
    } },

  // ── 建设 ────────────────────────────────────────────────
  { id:'all_built',      name:'基础完备', icon:'🏗️', cat:'建设', desc:'所有设施完成建造',
    check() { return Object.values(G.buildings).every(b => b.lv > 0); } },
  { id:'max_building',   name:'精益求精', icon:'⬆️', cat:'建设', desc:'任意设施升至最高等级',
    check() { return Object.values(G.buildings).some(b => b.lv >= b.maxLv); } },
  { id:'streaming_signed',name:'流媒体时代',icon:'📱',cat:'建设', desc:'签约流媒体平台合约',
    check() { return G.streamingDeal === true; } },

  // ── 内容 ────────────────────────────────────────────────
  { id:'album_released', name:'唱片公司', icon:'💿', cat:'内容', desc:'发行第一张实体专辑',
    check() { return (G.releases || []).some(r => r.type === 'album'); } },
  { id:'releases_10',    name:'内容工厂', icon:'🎬', cat:'内容', desc:'累计发行10部内容',
    check() { return (G.releases || []).length >= 10; } },

  // ── 活动 ────────────────────────────────────────────────
  { id:'concert_done',   name:'演唱会初体验',icon:'🎪',cat:'活动', desc:'首次成功举办演唱会巡演',
    check() { return (G.completedEventNames || []).includes('演唱会巡演'); } },
  { id:'award_done',     name:'站上颁奖台', icon:'🏆',cat:'活动', desc:'首次受邀参加颁奖典礼',
    check() { return (G.lastAwardMonth || 0) > 0; } },
];
