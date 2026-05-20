// 活动赛事（玩家主动参与，每月可选，需派艺人）
// compute(sel) 根据所选艺人动态计算奖励
// apply(sel, r) 执行效果并返回结果描述文字
const EVENTS = [
  {
    name:'校园歌唱比赛', icon:'🎵', bg:'#f0fdf4',
    desc:'参加全市高校联合歌唱比赛，派出的歌手越多阵容越强',
    cost:5, minArtists:1, statHint:'唱技',
    req:'需要歌唱≥60的出道艺人',
    check()    { return G.artists.some(a => a.singing >= 60 && (a.status === '已出道' || a.status === '工作中')); },
    artistCheck(a) { return (a.status === '已出道' || a.status === '工作中') && a.singing >= 60; },
    compute(sel) {
      const best  = sel.reduce((b, a) => a.singing > b.singing ? a : b);
      const multi = 1 + 0.25 * (sel.length - 1);
      return { fame: Math.round((20 + best.singing * 0.3) * multi), money: Math.round((10 + best.singing * 0.25) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) + r.fame * 0.4); a.pr = Math.min(100, (a.pr || 60) + 6); });
      const best = sel.reduce((b, a) => a.singing > b.singing ? a : b);
      return displayName(best) + (sel.length > 1 ? ' 等' + sel.length + '人' : '') + '凭借唱功斩获佳绩！';
    }
  },
  {
    name:'新人选秀综艺', icon:'📺', bg:'#eff6ff',
    desc:'参加热门选秀节目，多位艺人同台更能刷爆热度',
    cost:10, minArtists:1, statHint:'综合均值',
    req:'需要出道艺人 ≥1',
    check()    { return G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s, a) => s + (a.singing + a.dance + a.acting) / 3, 0) / sel.length;
      const multi = 1 + 0.3 * (sel.length - 1);
      return { fame: Math.round((25 + avg * 0.4) * multi), money: Math.round((20 + avg * 0.5) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) + r.fame * 0.6); a.pr = Math.min(100, (a.pr || 60) + 10); });
      return sel.map(displayName).join('、') + (sel.length > 1 ? ' 组团出击，' : ' ') + '综合表现亮眼，人气飙升！';
    }
  },
  {
    name:'品牌代言活动', icon:'💼', bg:'#fffbeb',
    desc:'接受品牌代言，派出艺人的粉丝总量决定代言费',
    cost:0, minArtists:1, statHint:'粉丝量',
    req:'需声望≥50 且出道艺人',
    check()    { return G.fame >= 50 && G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const totalFans = sel.reduce((s, a) => s + (a.fans || 0), 0);
      return { fame: Math.round(8 + totalFans * 0.08), money: Math.round(60 + totalFans * 1.2) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.pr = Math.min(100, (a.pr || 60) + 5); });
      return sel.map(displayName).join('、') + '成功代言，品牌曝光带来' + r.money + '万收益！';
    }
  },
  {
    name:'演唱会巡演', icon:'🎪', bg:'#fdf4ff',
    desc:'举办演唱会，多位艺人联合出演票房翻倍增长',
    cost:50, minArtists:2, statHint:'唱+舞均值',
    req:'需出道艺人≥2 且声望≥80',
    check()    { return G.artists.filter(a => a.status === '已出道' || a.status === '工作中').length >= 2 && G.fame >= 80; },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s, a) => s + (a.singing + a.dance) / 2, 0) / sel.length;
      const multi = 1 + 0.4 * (sel.length - 1);
      return { fame: Math.round((50 + avg * 0.6) * multi), money: Math.round((150 + avg * 2) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) + r.fame * 0.5); a.pr = Math.min(100, (a.pr || 60) + 12); });
      return sel.map(displayName).join('、') + ' 合力演出大获成功！';
    }
  },
  {
    name:'颁奖典礼', icon:'🏆', bg:'#fff7ed',
    desc:'参加年度颁奖典礼，以最强阵容角逐大奖',
    cost:20, minArtists:1, statHint:'综合实力',
    req:'需声望≥150 且出道艺人',
    check()    { return G.fame >= 150 && G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const best  = sel.reduce((b, a) => { const sa = (a.singing + a.dance + a.acting) / 3, sb = (b.singing + b.dance + b.acting) / 3; return sa > sb ? a : b; });
      const s     = (best.singing + best.dance + best.acting) / 3;
      const bonus = sel.length > 1 ? (sel.length - 1) * 15 : 0;
      return { fame: Math.round(120 + s * 0.8 + bonus), money: Math.round(60 + s * 0.5 + bonus * 0.5) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) + r.fame * 0.3); a.pr = Math.min(100, (a.pr || 60) + 15); });
      G.fame += 10;
      const best = sel.reduce((b, a) => { const sa = (a.singing + a.dance + a.acting) / 3, sb = (b.singing + b.dance + b.acting) / 3; return sa > sb ? a : b; });
      return displayName(best) + (sel.length > 1 ? ' 等' + sel.length + '人出席，' : '') + '荣获年度大奖，公司声誉显著提升！';
    }
  },
];

// 月度随机事件（被动触发，不需要玩家参与）
const MONTHLY_EVENTS = {
  industry: [
    { name:'年末颁奖季来临',     icon:'🏆', type:'good', desc:'全行业热度上升，声望与收益同步提升',
      effect() { G.fame += 15; G.money += 30; addLog('颁奖季热度奖励', 'plus', 30); } },
    { name:'流媒体平台提升版权分成', icon:'📱', type:'good', desc:'内容平台调整政策，本月多获一笔分成',
      effect() { const b = Math.max(20, G.artists.filter(a => a.status === '工作中' || a.status === '已出道').length * 15); G.money += b; addLog('平台分成额外奖励', 'plus', b); } },
    { name:'权威媒体正面报道',    icon:'📰', type:'good', desc:'行业形象提升，公司声望大幅增加',
      effect() { G.fame += 22; } },
    { name:'资本看好文娱赛道',    icon:'💼', type:'good', desc:'市场信心回升，临时获得合作投资',
      check() { return G.fame >= 30; },
      effect() { G.money += 100; addLog('行业投资红利', 'plus', 100); } },
    { name:'监管部门出台整改通知',icon:'📋', type:'bad',  desc:'合规整改产生额外支出',
      effect() { G.money = Math.max(0, G.money - 30); addLog('合规整改费用', 'minus', 30); } },
    { name:'广告市场整体下行',    icon:'📉', type:'bad',  desc:'演出报价普遍走低，收入受损',
      effect() { const p = Math.max(10, Math.round(G.monthlyIncome * 0.15)); G.money = Math.max(0, G.money - p); addLog('广告市场下行损失', 'minus', p); } },
    { name:'行业丑闻引发信任危机',icon:'😰', type:'bad',  desc:'整体舆论环境变差，声望受损',
      effect() { G.fame = Math.max(0, G.fame - 12); } },
  ],
  company: [
    { name:'知名制作人寻求合作', icon:'🎼', type:'good', desc:'训练中的艺人本月属性额外提升',
      check() { return G.artists.some(a => a.status === '训练中'); },
      effect() { G.artists.filter(a => a.status === '训练中').forEach(a => { a.singing = Math.min(99, a.singing + 5); a.dance = Math.min(99, a.dance + 5); }); } },
    { name:'商务合作签约',       icon:'🤝', type:'good', desc:'一笔商务合作带来额外收入',
      effect() { G.money += 50; addLog('商务合作收入', 'plus', 50); } },
    { name:'热门综艺节目邀约',   icon:'📺', type:'good', desc:'节目方支付合作费，声望同步提升',
      check() { return G.artists.length > 0; },
      effect() { G.money += 60; G.fame += 18; addLog('综艺合作费', 'plus', 60); } },
    { name:'设施设备故障',       icon:'🔧', type:'bad',  desc:'维修费用支出，影响正常运营',
      check() { return Object.values(G.buildings).some(b => b.lv > 0); },
      effect() {
        const built = Object.entries(G.buildings).filter(([, b]) => b.lv > 0);
        const [, b]  = built[Math.floor(Math.random() * built.length)];
        G.money = Math.max(0, G.money - 40); addLog(b.name + ' 维修费', 'minus', 40);
        return b.name + '出现故障，花费40万维修';
      }},
    { name:'竞争对手恶意施压',   icon:'😤', type:'bad',  desc:'舆论冲击导致部分粉丝流失',
      check() { return G.artists.some(a => (a.fans || 0) > 3); },
      effect() {
        const pool = G.artists.filter(a => (a.fans || 0) > 3);
        const a    = pool[Math.floor(Math.random() * pool.length)];
        const loss = Math.round((a.fans || 0) * 0.1);
        a.fans = Math.max(0, (a.fans || 0) - loss);
        return displayName(a) + '受到舆论冲击，流失' + loss + '万粉丝';
      }},
    { name:'财务审计发现漏洞',   icon:'🧾', type:'bad',  desc:'需补缴税款及滞纳金',
      effect() { const p = Math.max(15, Math.round(G.money * 0.03)); G.money = Math.max(0, G.money - p); addLog('税务补缴', 'minus', p); } },
  ],
  artist: [
    { name:'意外爆红',     icon:'🚀', type:'good', desc:'短视频爆款带动粉丝量暴增',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { a.fans = Math.round((a.fans || 0) * 1.6 + 15); G.fame += 8; a.pr = Math.min(100, (a.pr || 60) + 20); } },
    { name:'天赋觉醒',     icon:'✨', type:'good', desc:'训练中突然开窍，唱跳属性大幅提升',
      check(a) { return a.status === '训练中'; },
      effect(a) { a.singing = Math.min(99, a.singing + 8); a.dance = Math.min(99, a.dance + 8); } },
    { name:'品牌临时邀约', icon:'💝', type:'good', desc:'品牌方主动找上门，获得一笔代言收入',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { const b = Math.round(25 + Math.random() * 35); G.money += b; addLog(displayName(a) + ' 临时代言', 'plus', b); } },
    { name:'获年度新人提名',icon:'🏅', type:'good', desc:'行业认可度提升，粉丝量同步增长',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { G.fame += 18; a.fans = Math.round((a.fans || 0) * 1.2 + 10); a.pr = Math.min(100, (a.pr || 60) + 15); } },
    { name:'正能量行为被曝光',icon:'🌟',type:'good', desc:'助人善举被路人拍下传播，口碑大涨',
      effect(a) { a.pr = Math.min(100, (a.pr || 60) + 20); G.fame += 15; } },
    { name:'综艺名场面爆梗',icon:'😂', type:'good', desc:'综艺片段二次传播，带来大量新粉',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { a.fans = Math.round((a.fans || 0) * 1.3 + 8); a.pr = Math.min(100, (a.pr || 60) + 10); } },
    { name:'私生活遭曝光', icon:'📸', type:'bad',  desc:'舆论发酵，粉丝流失，公司声望受损',
      check(a) { return (a.fans || 0) > 5 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { const l = Math.round((a.fans || 0) * 0.22); a.fans = Math.max(0, (a.fans || 0) - l); G.fame = Math.max(0, G.fame - 10); a.pr = Math.max(0, (a.pr || 60) - 30); } },
    { name:'情绪低落申请休整',icon:'😔',type:'bad',  desc:'状态切换为休息中，本月停止接活',
      check(a) { return a.status === '工作中'; },
      effect(a) { a.status = '休息中'; } },
    { name:'训练中轻伤',   icon:'🩹', type:'bad',  desc:'需要短暂休养，暂停训练',
      check(a) { return a.status === '训练中'; },
      effect(a) { a.status = '休息中'; } },
    { name:'被偷拍同框',   icon:'🕵️', type:'bad',  desc:'被媒体拍到与神秘人同框，热搜发酵',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { a.pr = Math.max(0, (a.pr || 60) - 25); a.fans = Math.max(0, Math.round((a.fans || 0) * 0.9)); } },
    { name:'旧言论被翻出', icon:'🔍', type:'bad',  desc:'早年不当言论重新流传，舆论震荡',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { a.pr = Math.max(0, (a.pr || 60) - 30); G.fame = Math.max(0, G.fame - 8); } },
  ],
};
