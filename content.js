// 内容发行类型
const CONTENT_TYPES = [
  { id:'single', name:'数字单曲', icon:'🎵', cost:20, duration:2, productionMonths:1,
    check()  { return G.buildings.studio.lv >= 1; }, req:'录音室 Lv.1+',
    income(a){ return Math.round(8 + (a.fans || 0) * 0.2 + (a.singing || 0) * 0.1); } },
  { id:'album',  name:'实体专辑', icon:'💿', cost:80, duration:4, productionMonths:2,
    check()  { return G.buildings.studio.lv >= 3; }, req:'录音室 Lv.3+',
    income(a){ return Math.round(20 + (a.fans || 0) * 0.6 + (a.singing || 0) * 0.25); } },
  { id:'mv',     name:'MV',     icon:'🎬', cost:50, duration:3, productionMonths:1,
    check()  { return G.buildings.mv.lv >= 1; }, req:'MV拍摄间 Lv.1+',
    income(a){ return Math.round(10 + (a.fans || 0) * 0.35 + ((a.singing || 0) + (a.dance || 0)) * 0.06); } },
  { id:'doc',    name:'纪录片', icon:'📹', cost:40, duration:2, productionMonths:2,
    check()  { return Object.values(G.buildings).some(b => b.lv >= 2); }, req:'任意设施 Lv.2+',
    income(a){ return Math.round(3 + (a.fans || 0) * 0.08); } },
];

// 随机标题库
const CONTENT_TITLES = {
  single: [
    '星光之下','初吻','告白','心动瞬间','约定','夜色','迷途','流星雨','温柔','秘密',
    '燃烧','梦想家','自由飞翔','光芒','未来已来','沉默的声音','时光机','等你归来',
    '海浪','呼吸','翅膀','无畏','绽放','月光下的你','彩虹','相信','烟火','第一次',
    '你的名字','晚风','不说再见','心跳','倒数','刹那','回忆里的你','一万次悲伤',
    '泡沫','旋转木马','想见你','原来你也在这里','南山南','成都',
  ],
  album: [
    '新世界','光年旅途','序章','盛夏余光','归途','印记','蜕变','初心',
    '破茧','星途','无限可能','青春进行式','万象更新','出发','黄金时代',
    '心之所向','独白','回声','潮流','时代','日落大道','长安','远方',
    '少年','异乡人','第一章','未完待续','自由宣言',
  ],
  mv: [
    '破晓','奔跑','追梦','怒放','起飞',
    '燃烧','绽放','飞翔','冲破','跃动','光速','无界','沸腾','超越','迸发',
    '点燃','爆发','升空','无畏','风暴',
  ],
  doc: [
    '追梦实录','幕后日记','成长记录','初心故事',
    '闪光时刻','我的舞台','青春档案','光与梦','发光体','未完待续',
    '在路上','破茧时刻','星途漫漫','出发吧少年',
  ],
};
