// 活动赛事（玩家主动参与，每月可选，需派艺人）
// compute(sel) 根据所选艺人动态计算奖励
// apply(sel, r) 执行效果并返回结果描述文字
const EVENTS = [
  {
    name:'校园歌唱比赛', icon:'🎵', bg:'#f0fdf4',
    desc:'参加全市高校联合歌唱比赛，派出的歌手越多阵容越强',
    cost:5, minArtists:1, statHint:'唱技', duration:1,
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
    cost:10, minArtists:1, statHint:'综合均值', duration:2,
    req:'需出道艺人 ≥1 且知名度≥30',
    check()    { return G.fame >= 30 && G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
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
    cost:0, minArtists:1, statHint:'粉丝量', duration:1,
    req:'需知名度≥50 且出道艺人',
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
    cost:50, minArtists:2, statHint:'唱+舞均值', duration:2,
    req:'需出道艺人≥2 且知名度≥80',
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
    name:'影视剧拍摄', icon:'🎬', bg:'#fef2f2',
    desc:'接下影视剧主演邀约，演技高的艺人能赢得更好口碑',
    cost:60, minArtists:1, statHint:'演技', duration:3,
    req:'需演技≥70的出道艺人 且知名度≥60',
    check()    { return G.fame >= 60 && G.artists.some(a => a.acting >= 70 && (a.status === '已出道' || a.status === '工作中')); },
    artistCheck(a) { return (a.status === '已出道' || a.status === '工作中') && a.acting >= 70; },
    compute(sel) {
      const best  = sel.reduce((b, a) => a.acting > b.acting ? a : b);
      const multi = 1 + 0.2 * (sel.length - 1);
      return { fame: Math.round((60 + best.acting * 0.8) * multi), money: Math.round((200 + best.acting * 2.5) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) + r.fame * 0.5); a.acting = Math.min(99, a.acting + 3); a.pr = Math.min(100, (a.pr || 60) + 12); });
      const best = sel.reduce((b, a) => a.acting > b.acting ? a : b);
      return displayName(best) + (sel.length > 1 ? ' 等' + sel.length + '人' : '') + '凭演技征服观众，口碑爆棚！';
    }
  },
  {
    name:'音乐节演出', icon:'🎸', bg:'#f0fdf4',
    desc:'登上顶级音乐节舞台，多艺人联合出阵人气爆发',
    cost:40, minArtists:2, statHint:'唱+舞均值', duration:2,
    req:'需出道艺人≥2 且知名度≥100',
    check()    { return G.fame >= 100 && G.artists.filter(a => a.status === '已出道' || a.status === '工作中').length >= 2; },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s, a) => s + (a.singing + a.dance) / 2, 0) / sel.length;
      const multi = 1 + 0.5 * (sel.length - 1);
      return { fame: Math.round((40 + avg * 0.5) * multi), money: Math.round((80 + avg * 1.5) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) * 1.15 + r.fame * 0.4); a.pr = Math.min(100, (a.pr || 60) + 10); });
      return sel.map(displayName).join('、') + ' 音乐节现场引爆全场，粉丝暴增！';
    }
  },
  {
    name:'直播带货', icon:'📱', bg:'#fffbeb',
    desc:'艺人开直播卖货，粉丝越多销售额越高',
    cost:0, minArtists:1, statHint:'粉丝量', duration:1,
    req:'需粉丝≥10万的出道艺人',
    check()    { return G.artists.some(a => (a.fans || 0) >= 10 && (a.status === '已出道' || a.status === '工作中')); },
    artistCheck(a) { return (a.status === '已出道' || a.status === '工作中') && (a.fans || 0) >= 10; },
    compute(sel) {
      const totalFans = sel.reduce((s, a) => s + (a.fans || 0), 0);
      const multi = 1 + 0.15 * (sel.length - 1);
      return { fame: Math.round(5 + totalFans * 0.03), money: Math.round(30 + totalFans * 0.8 * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.pr = Math.min(100, (a.pr || 60) + 3); });
      return sel.map(displayName).join('、') + ' 直播间销售额 ' + r.money + '万，粉丝互动热烈！';
    }
  },
  {
    name:'慈善义演', icon:'❤️', bg:'#fdf4ff',
    desc:'举办公益演出，提升口碑与社会形象，收益虽少但声誉大涨',
    cost:0, minArtists:1, statHint:'口碑', duration:1,
    req:'需出道艺人 ≥1 且知名度≥20',
    check()    { return G.fame >= 20 && G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const multi = 1 + 0.3 * (sel.length - 1);
      return { fame: Math.round(30 * multi), money: Math.round(10 * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.pr = Math.min(100, (a.pr || 60) + 20); a.fans = Math.round((a.fans || 0) + 5); });
      G.fame += 8;
      return sel.map(displayName).join('、') + ' 爱心义演获得社会广泛好评，口碑飙升！';
    }
  },
  {
    name:'海外巡演', icon:'✈️', bg:'#eff6ff',
    desc:'走向国际舞台，高费用高回报，解锁海外粉丝群体',
    cost:120, minArtists:2, statHint:'唱+舞+演技', duration:3,
    req:'需出道艺人≥2 且知名度≥250',
    check()    { return G.fame >= 250 && G.artists.filter(a => a.status === '已出道' || a.status === '工作中').length >= 2; },
    artistCheck(a) { return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s, a) => s + (a.singing + a.dance + a.acting) / 3, 0) / sel.length;
      const multi = 1 + 0.35 * (sel.length - 1);
      return { fame: Math.round((100 + avg * 1.2) * multi), money: Math.round((400 + avg * 4) * multi) };
    },
    apply(sel, r) {
      sel.forEach(a => { a.fans = Math.round((a.fans || 0) * 1.3 + r.fame * 0.6); a.pr = Math.min(100, (a.pr || 60) + 18); });
      G.fame += 20;
      return sel.map(displayName).join('、') + ' 海外巡演引发轰动，国际知名度大幅提升！';
    }
  },
];

// 月度随机事件（被动触发，不需要玩家参与）
const MONTHLY_EVENTS = {
  industry: [
    { name:'年末颁奖季来临',     icon:'🏆', type:'good', desc:'全行业热度上升，知名度与收益同步提升',
      effect() { G.fame += 15; G.money += 30; addLog('颁奖季热度奖励', 'plus', 30); } },
    { name:'流媒体平台提升版权分成', icon:'📱', type:'good', desc:'内容平台调整政策，本月多获一笔分成',
      effect() { const b = Math.max(20, G.artists.filter(a => a.status === '工作中' || a.status === '已出道').length * 15); G.money += b; addLog('平台分成额外奖励', 'plus', b); } },
    { name:'权威媒体正面报道',    icon:'📰', type:'good', desc:'行业形象提升，公司知名度大幅增加',
      effect() { G.fame += 22; } },
    { name:'资本看好文娱赛道',    icon:'💼', type:'good', desc:'市场信心回升，临时获得合作投资',
      check() { return G.fame >= 30; },
      effect() { G.money += 100; addLog('行业投资红利', 'plus', 100); } },
    { name:'新兴音乐节举办',      icon:'🎸', type:'good', desc:'行业举办大型音乐节，演出机会增多，收益上涨',
      check() { return G.artists.some(a => a.status === '已出道' || a.status === '工作中'); },
      effect() { const b = 40 + G.artists.filter(a => a.status === '工作中' || a.status === '已出道').length * 10; G.money += b; G.fame += 10; addLog('音乐节行业红利', 'plus', b); } },
    { name:'跨界联名热潮',        icon:'🤝', type:'good', desc:'品牌联名风潮带动代言市场，公司知名度提升',
      check() { return G.fame >= 50; },
      effect() { G.fame += 18; G.money += 50; addLog('联名热潮收益', 'plus', 50); } },
    { name:'监管部门出台整改通知',icon:'📋', type:'bad',  desc:'合规整改产生额外支出',
      effect() { G.money = Math.max(0, G.money - 30); addLog('合规整改费用', 'minus', 30); } },
    { name:'广告市场整体下行',    icon:'📉', type:'bad',  desc:'演出报价普遍走低，收入受损',
      effect() { const p = Math.max(10, Math.round(G.monthlyIncome * 0.15)); G.money = Math.max(0, G.money - p); addLog('广告市场下行损失', 'minus', p); } },
    { name:'行业丑闻引发信任危机',icon:'😰', type:'bad',  desc:'整体口碑环境变差，知名度受损',
      effect() { G.fame = Math.max(0, G.fame - 12); } },
    { name:'行业监管突然收紧',    icon:'🚨', type:'bad',  desc:'政策收紧影响演出市场，收入和知名度双降',
      effect() { G.money = Math.max(0, G.money - 50); G.fame = Math.max(0, G.fame - 10); addLog('监管收紧损失', 'minus', 50); } },
  ],
  company: [
    { name:'知名制作人寻求合作', icon:'🎼', type:'good', desc:'训练中的艺人本月属性额外提升',
      check() { return G.artists.some(a => a.status === '训练中'); },
      effect() { G.artists.filter(a => a.status === '训练中').forEach(a => { a.singing = Math.min(99, a.singing + 5); a.dance = Math.min(99, a.dance + 5); }); } },
    { name:'商务合作签约',       icon:'🤝', type:'good', desc:'一笔商务合作带来额外收入',
      effect() { G.money += 50; addLog('商务合作收入', 'plus', 50); } },
    { name:'热门综艺节目邀约',   icon:'📺', type:'good', desc:'节目方支付合作费，知名度同步提升',
      check() { return G.artists.length > 0; },
      effect() { G.money += 60; G.fame += 18; addLog('综艺合作费', 'plus', 60); } },
    { name:'粉丝自发应援',       icon:'💖', type:'good', desc:'粉丝自掏腰包为旗下艺人打榜，带动人气增长',
      check() { return G.artists.some(a => (a.fans || 0) >= 20 && (a.status === '已出道' || a.status === '工作中')); },
      effect() {
        const pool = G.artists.filter(a => (a.fans || 0) >= 20 && (a.status === '已出道' || a.status === '工作中'));
        const a = pool[Math.floor(Math.random() * pool.length)];
        a.fans = Math.round((a.fans || 0) * 1.15 + 10); G.fame += 8;
        return displayName(a) + '粉丝自发应援，人气上涨！';
      }},
    { name:'作品意外获奖提名',   icon:'🏅', type:'good', desc:'发行作品入围行业大奖，公司声誉提升',
      check() { return (G.releases || []).length > 0; },
      effect() { G.fame += 25; G.money += 30; addLog('作品获奖提名奖励', 'plus', 30); } },
    { name:'设施设备故障',       icon:'🔧', type:'bad',  desc:'维修费用支出，影响正常运营',
      check() { return Object.values(G.buildings).some(b => b.lv > 0); },
      effect() {
        const built = Object.entries(G.buildings).filter(([, b]) => b.lv > 0);
        const [, b]  = built[Math.floor(Math.random() * built.length)];
        G.money = Math.max(0, G.money - 40); addLog(b.name + ' 维修费', 'minus', 40);
        return b.name + '出现故障，花费40万维修';
      }},
    { name:'竞争对手恶意施压',   icon:'😤', type:'bad',  desc:'口碑冲击导致部分粉丝流失',
      check() { return G.artists.some(a => (a.fans || 0) > 3); },
      effect() {
        const pool = G.artists.filter(a => (a.fans || 0) > 3);
        const a    = pool[Math.floor(Math.random() * pool.length)];
        const loss = Math.round((a.fans || 0) * 0.1);
        a.fans = Math.max(0, (a.fans || 0) - loss);
        return displayName(a) + '受到口碑冲击，流失' + loss + '万粉丝';
      }},
    { name:'合作方临时毁约',     icon:'💔', type:'bad',  desc:'商务合作被临时取消，损失违约金',
      check() { return G.money >= 20; },
      effect() { const p = Math.max(20, Math.round(G.money * 0.05)); G.money = Math.max(0, G.money - p); addLog('合作方毁约损失', 'minus', p); } },
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
    { name:'翻唱作品意外走红', icon:'🎤', type:'good', desc:'翻唱视频在社交平台疯传，吸引大批新粉',
      check(a) { return a.singing >= 60 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { a.fans = Math.round((a.fans || 0) * 1.25 + 20); a.pr = Math.min(100, (a.pr || 60) + 12); G.fame += 6; } },
    { name:'老粉集体回流',   icon:'💫', type:'good', desc:'久违的老粉因某条动态重新回归，忠实粉丝增加',
      check(a) { return (a.fans || 0) >= 15 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { a.fans = Math.round((a.fans || 0) + 15 + (a.fans || 0) * 0.08); a.pr = Math.min(100, (a.pr || 60) + 8); } },
    { name:'演技获导演盛赞', icon:'🎭', type:'good', desc:'参演作品中导演公开夸赞，演技口碑大涨',
      check(a) { return a.acting >= 65 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { a.acting = Math.min(99, a.acting + 4); a.fans = Math.round((a.fans || 0) + 10); G.fame += 10; } },
    { name:'私生活遭曝光', icon:'📸', type:'bad',  desc:'口碑受损，粉丝流失，公司知名度受损',
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
    { name:'旧言论被翻出', icon:'🔍', type:'bad',  desc:'早年不当言论重新流传，口碑受损',
      check(a) { return a.status === '已出道' || a.status === '工作中'; },
      effect(a) { a.pr = Math.max(0, (a.pr || 60) - 30); G.fame = Math.max(0, G.fame - 8); } },
    { name:'代言产品翻车', icon:'💥', type:'bad',  desc:'代言品牌发生质量事故，被迫道歉，口碑受损',
      check(a) { return (a.fans || 0) > 10 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { a.pr = Math.max(0, (a.pr || 60) - 35); a.fans = Math.max(0, Math.round((a.fans || 0) * 0.85)); G.fame = Math.max(0, G.fame - 12); } },
    { name:'粉圈爆发撕逼', icon:'⚔️', type:'bad',  desc:'粉丝内部矛盾激化，大量脱粉，形象受损',
      check(a) { return (a.fans || 0) > 20 && (a.status === '已出道' || a.status === '工作中'); },
      effect(a) { const l = Math.round((a.fans || 0) * 0.12); a.fans = Math.max(0, (a.fans || 0) - l); a.pr = Math.max(0, (a.pr || 60) - 15); } },
    { name:'体力透支被迫休息', icon:'😮‍💨', type:'bad', desc:'长期高强度工作导致体力崩溃，不得不休整',
      check(a) { return a.status === '工作中'; },
      effect(a) { a.status = '休息中'; G.fame = Math.max(0, G.fame - 5); } },
  ],
};

// 限时活动（随机触发，有过期时间）
const TIMED_EVENTS = [
  {
    id:'variety_invite',
    name:'综艺节目录制邀请', icon:'🎙️', bg:'#fef9c3',
    desc:'知名综艺节目向旗下艺人发出录制邀请，时不我待！',
    cost:5, minArtists:1, statHint:'综合均值', duration:2,
    req:'旗下总粉丝≥5万',
    spawnChance: 0.20,
    check()      { return G.artists.reduce((s,a)=>s+(a.fans||0),0) >= 5; },
    artistCheck(a){ return a.status === '已出道' || a.status === '工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s,a)=>s+(a.singing+a.dance+a.acting)/3,0)/sel.length;
      const multi = 1 + 0.3*(sel.length-1);
      return { fame: Math.round((30+avg*0.5)*multi), money: Math.round((40+avg*0.6)*multi) };
    },
    apply(sel, r) {
      sel.forEach(a=>{ a.fans=Math.round((a.fans||0)+r.fame*0.5); a.pr=Math.min(100,(a.pr||60)+8); });
      return sel.map(displayName).join('、')+' 综艺节目圆满录制，话题热度暴增！';
    }
  },
  {
    id:'movie_promo',
    name:'电影宣传配合活动', icon:'🎬', bg:'#fef2f2',
    desc:'某大制作电影邀请旗下演技派艺人参与宣传，曝光机会难得！',
    cost:15, minArtists:1, statHint:'演技', duration:2,
    req:'旗下有演技≥65的出道艺人',
    spawnChance: 0.18,
    check()      { return G.artists.some(a=>a.acting>=65&&(a.status==='已出道'||a.status==='工作中')); },
    artistCheck(a){ return (a.status==='已出道'||a.status==='工作中')&&a.acting>=65; },
    compute(sel) {
      const best  = sel.reduce((b,a)=>a.acting>b.acting?a:b);
      const multi = 1+0.2*(sel.length-1);
      return { fame: Math.round((50+best.acting*0.7)*multi), money: Math.round((80+best.acting*1.5)*multi) };
    },
    apply(sel, r) {
      sel.forEach(a=>{ a.fans=Math.round((a.fans||0)+r.fame*0.4); a.acting=Math.min(99,a.acting+2); a.pr=Math.min(100,(a.pr||60)+10); });
      const best=sel.reduce((b,a)=>a.acting>b.acting?a:b);
      return displayName(best)+(sel.length>1?' 等'+sel.length+'人':'')+' 参与电影宣传，演技口碑大涨！';
    }
  },
  {
    id:'brand_popup',
    name:'品牌快闪合作', icon:'🏪', bg:'#fffbeb',
    desc:'知名品牌邀请举办限时快闪活动，窗口期只有两个月！',
    cost:8, minArtists:1, statHint:'粉丝量', duration:1,
    req:'公司知名度≥60',
    spawnChance: 0.20,
    check()      { return G.fame>=60&&G.artists.some(a=>a.status==='已出道'||a.status==='工作中'); },
    artistCheck(a){ return a.status==='已出道'||a.status==='工作中'; },
    compute(sel) {
      const totalFans=sel.reduce((s,a)=>s+(a.fans||0),0);
      return { fame: Math.round(10+totalFans*0.1), money: Math.round(80+totalFans*1.5) };
    },
    apply(sel, r) {
      sel.forEach(a=>{ a.pr=Math.min(100,(a.pr||60)+6); a.fans=Math.round((a.fans||0)+r.fame*0.3); });
      return sel.map(displayName).join('、')+' 品牌快闪活动大获成功，收益颇丰！';
    }
  },
  {
    id:'new_year_gala',
    name:'跨年晚会演出', icon:'🌃', bg:'#f0f9ff',
    desc:'顶级卫视跨年晚会向旗下艺人发来出演邀请，只在年末才有机会！',
    cost:20, minArtists:1, statHint:'唱+舞均值', duration:1,
    req:'公司知名度≥120 且月份为11或12月',
    spawnChance: 0.90,
    yearEnd: true,
    check()      { return G.fame>=120&&G.artists.some(a=>a.status==='已出道'||a.status==='工作中'); },
    artistCheck(a){ return a.status==='已出道'||a.status==='工作中'; },
    compute(sel) {
      const avg   = sel.reduce((s,a)=>s+(a.singing+a.dance)/2,0)/sel.length;
      const multi = 1+0.4*(sel.length-1);
      return { fame: Math.round((80+avg*0.8)*multi), money: Math.round((200+avg*2)*multi) };
    },
    apply(sel, r) {
      sel.forEach(a=>{ a.fans=Math.round((a.fans||0)*1.2+r.fame*0.6); a.pr=Math.min(100,(a.pr||60)+15); });
      G.fame+=10;
      return sel.map(displayName).join('、')+' 跨年晚会压轴登场，全国观众见证！';
    }
  },
  {
    id:'charity_concert',
    name:'公益联唱活动', icon:'🎤', bg:'#ecfdf5',
    desc:'多家公司联合举办公益演唱，参与即可提升口碑与社会形象',
    cost:0, minArtists:1, statHint:'口碑', duration:1,
    req:'旗下有已出道艺人',
    spawnChance: 0.15,
    check()      { return G.artists.some(a=>a.status==='已出道'||a.status==='工作中'); },
    artistCheck(a){ return a.status==='已出道'||a.status==='工作中'; },
    compute(sel) {
      const multi=1+0.25*(sel.length-1);
      return { fame: Math.round(20*multi), money: Math.round(5*multi) };
    },
    apply(sel, r) {
      sel.forEach(a=>{ a.pr=Math.min(100,(a.pr||60)+18); a.fans=Math.round((a.fans||0)+8); });
      G.fame+=12;
      return sel.map(displayName).join('、')+' 公益联唱感动全场，口碑与知名度双丰收！';
    }
  },
];
