// 练习生候选池
const POOL = [
  // ── 原有艺人 ──────────────────────────────────────────
  {name:'林晓晴', abbr:'晓', color:'#dbeafe', tc:'#1e40af', singing:72, dance:58, acting:45, rap:20, cost:30,  rarity:'普通',
   age:20, height:165, weight:48, zodiac:'双鱼座', hometown:'成都', personality:'温柔细腻', hobby:'看小说·养猫', mbti:'INFJ', dream:'开个人演唱会', specialty:'清纯唱腔'},

  {name:'张宇航', abbr:'宇', color:'#fef3c7', tc:'#92400e', singing:45, dance:80, acting:30, rap:65, cost:40,  rarity:'良好',
   age:22, height:178, weight:65, zodiac:'天蝎座', hometown:'北京', personality:'酷帅内敛', hobby:'街舞·打篮球', mbti:'ISTP', dream:'登上Billboard榜单', specialty:'街头舞蹈'},

  {name:'苏梦琪', abbr:'梦', color:'#fce7f3', tc:'#831843', singing:88, dance:62, acting:70, rap:15, cost:80,  rarity:'优秀',
   age:24, height:168, weight:52, zodiac:'狮子座', hometown:'上海', personality:'热情外向', hobby:'写词·烘焙', mbti:'ENFP', dream:'发行白金专辑', specialty:'流行歌姬'},

  {name:'陈浩然', abbr:'浩', color:'#dcfce7', tc:'#14532d', singing:55, dance:45, acting:92, rap:30, cost:100, rarity:'稀有',
   age:26, height:183, weight:72, zodiac:'摩羯座', hometown:'杭州', personality:'沉稳理性', hobby:'读剧本·冥想', mbti:'INTJ', dream:'拿下影帝奖杯', specialty:'影视表演',
   image:'陈浩然.png'},

  {name:'韩依依', abbr:'依', color:'#ede9fe', tc:'#4c1d95', singing:78, dance:75, acting:60, rap:45, cost:60,  rarity:'良好',
   age:19, height:162, weight:46, zodiac:'双子座', hometown:'广州', personality:'活泼可爱', hobby:'追番·画画', mbti:'ENFJ', dream:'成为顶级idol', specialty:'偶像舞台',
   image:'韩依依.png'},

  {name:'李铭宇', abbr:'铭', color:'#ffedd5', tc:'#7c2d12', singing:50, dance:55, acting:40, rap:90, cost:50,  rarity:'普通',
   age:21, height:176, weight:63, zodiac:'白羊座', hometown:'武汉', personality:'直爽坦率', hobby:'freestyle·打游戏', mbti:'ESTP', dream:'赢得说唱冠军', specialty:'说唱创作'},

  {name:'赵紫妍', abbr:'紫', color:'#d1fae5', tc:'#064e3b', singing:95, dance:70, acting:80, rap:25, cost:150, rarity:'✨传奇',
   age:25, height:170, weight:52, zodiac:'天秤座', hometown:'北京', personality:'优雅从容', hobby:'钢琴·品茶', mbti:'INFP', dream:'唱出传唱几十年的经典', specialty:'声乐演绎',
   image:'赵紫妍.png'},

  {name:'陆峰',   abbr:'峰', color:'#fef9c3', tc:'#713f12', singing:60, dance:88, acting:50, rap:72, cost:70,  rarity:'良好',
   age:23, height:180, weight:68, zodiac:'巨蟹座', hometown:'重庆', personality:'温暖随和', hobby:'爵士舞·摄影', mbti:'ISFJ', dream:'完成世界巡演', specialty:'舞台舞蹈'},

  // ── 新增艺人 ──────────────────────────────────────────
  {name:'方晴朗', abbr:'晴', color:'#e0f2fe', tc:'#0369a1', singing:62, dance:70, acting:55, rap:38, cost:45,  rarity:'普通',
   age:20, height:167, weight:50, zodiac:'射手座', hometown:'南京', personality:'开朗乐观', hobby:'游泳·听歌', mbti:'ESFP', dream:'站上大型舞台', specialty:'活力表演'},

  {name:'郑思远', abbr:'思', color:'#fdf2f8', tc:'#86198f', singing:42, dance:86, acting:32, rap:80, cost:55,  rarity:'良好',
   age:22, height:179, weight:66, zodiac:'水瓶座', hometown:'深圳', personality:'个性独特', hobby:'作曲·滑板', mbti:'INTP', dream:'融合东西方音乐风格', specialty:'音乐创作'},

  {name:'周小希', abbr:'希', color:'#ecfdf5', tc:'#065f46', singing:68, dance:48, acting:88, rap:22, cost:65,  rarity:'良好',
   age:21, height:166, weight:49, zodiac:'处女座', hometown:'苏州', personality:'认真细心', hobby:'看电影·瑜伽', mbti:'ISFP', dream:'夺得最佳女演员', specialty:'剧情表演'},

  {name:'吴天泽', abbr:'天', color:'#fff1f2', tc:'#9f1239', singing:91, dance:52, acting:40, rap:28, cost:85,  rarity:'优秀',
   age:24, height:175, weight:68, zodiac:'金牛座', hometown:'西安', personality:'执着坚定', hobby:'爬山·练声', mbti:'ISTJ', dream:'发行治愈系专辑', specialty:'声乐演绎'},

  {name:'沈雨桐', abbr:'桐', color:'#f5f0ff', tc:'#5b21b6', singing:58, dance:62, acting:52, rap:56, cost:35,  rarity:'普通',
   age:19, height:163, weight:47, zodiac:'双鱼座', hometown:'杭州', personality:'文静内敛', hobby:'写日记·收集贴纸', mbti:'INFP', dream:'被更多人认识', specialty:'综合表演'},

  {name:'曹梦瑶', abbr:'瑶', color:'#f0f9ff', tc:'#0c4a6e', singing:72, dance:84, acting:66, rap:24, cost:75,  rarity:'良好',
   age:22, height:169, weight:51, zodiac:'射手座', hometown:'成都', personality:'热情爱笑', hobby:'跳舞·美食探店', mbti:'ENFJ', dream:'成为综艺女王', specialty:'综艺舞台'},

  {name:'白子轩', abbr:'轩', color:'#f8fafc', tc:'#334155', singing:44, dance:66, acting:28, rap:94, cost:55,  rarity:'普通',
   age:23, height:177, weight:65, zodiac:'天蝎座', hometown:'上海', personality:'低调神秘', hobby:'创作rap·读哲学', mbti:'INTP', dream:'发行实验性说唱EP', specialty:'说唱制作'},

  {name:'夏晨阳', abbr:'晨', color:'#f0fdfa', tc:'#134e4a', singing:82, dance:79, acting:74, rap:58, cost:130, rarity:'稀有',
   age:23, height:181, weight:70, zodiac:'狮子座', hometown:'成都', personality:'阳光自信', hobby:'健身·旅行', mbti:'ESFJ', dream:'成为一代巨星', specialty:'全能表演',
   image:'夏晨阳.png'},

  // ── 更多艺人 ──────────────────────────────────────────
  {name:'宋雪儿', abbr:'雪', color:'#fef6ee', tc:'#c2410c', singing:83, dance:63, acting:52, rap:20, cost:65,  rarity:'良好',
   age:21, height:164, weight:48, zodiac:'双子座', hometown:'长沙', personality:'俏皮活泼', hobby:'唱K·逛街', mbti:'ESFP', dream:'成为甜歌女王', specialty:'甜美歌声'},

  {name:'丁俊豪', abbr:'丁', color:'#eef2ff', tc:'#3730a3', singing:36, dance:74, acting:44, rap:90, cost:50,  rarity:'良好',
   age:20, height:180, weight:67, zodiac:'摩羯座', hometown:'北京', personality:'努力勤恳', hobby:'跳街舞·打篮球', mbti:'ESTJ', dream:'成为全能偶像', specialty:'街头文化'},

  {name:'许心雨', abbr:'心', color:'#fff0f3', tc:'#9d174d', singing:76, dance:80, acting:84, rap:32, cost:110, rarity:'稀有',
   age:25, height:168, weight:52, zodiac:'天秤座', hometown:'香港', personality:'优雅灵动', hobby:'作曲·芭蕾', mbti:'INFJ', dream:'实现多元化艺人之路', specialty:'多栖发展'},

  {name:'冯子越', abbr:'越', color:'#e7f5ff', tc:'#1864ab', singing:52, dance:94, acting:36, rap:58, cost:70,  rarity:'良好',
   age:22, height:176, weight:64, zodiac:'水瓶座', hometown:'广州', personality:'飒爽干练', hobby:'街舞·格斗游戏', mbti:'ISTP', dream:'成为顶级舞蹈大师', specialty:'舞蹈技巧'},

  {name:'江小鱼', abbr:'鱼', color:'#fffde7', tc:'#6d4c41', singing:64, dance:54, acting:72, rap:44, cost:40,  rarity:'普通',
   age:20, height:165, weight:49, zodiac:'巨蟹座', hometown:'厦门', personality:'温柔善良', hobby:'钓鱼·手工', mbti:'ISFJ', dream:'成为演技派女演员', specialty:'清纯演技'},

  {name:'唐千羽', abbr:'羽', color:'#fef0ff', tc:'#7e22ce', singing:79, dance:67, acting:70, rap:32, cost:78,  rarity:'良好',
   age:24, height:170, weight:53, zodiac:'天蝎座', hometown:'北京', personality:'神秘优雅', hobby:'古典音乐·品酒', mbti:'INTJ', dream:'跨界多元艺术创作', specialty:'音乐表演'},

  {name:'贺文轩', abbr:'贺', color:'#f0f4ff', tc:'#1e3a8a', singing:46, dance:56, acting:96, rap:20, cost:120, rarity:'稀有',
   age:27, height:185, weight:78, zodiac:'白羊座', hometown:'北京', personality:'大气磁场', hobby:'读剧本·健身', mbti:'ENTJ', dream:'登上国际电影节领奖台', specialty:'影视表演'},

  {name:'林梓萱', abbr:'萱', color:'#fff5f5', tc:'#7f1d1d', singing:93, dance:87, acting:85, rap:68, cost:200, rarity:'✨传奇',
   age:24, height:172, weight:54, zodiac:'狮子座', hometown:'台北', personality:'自信耀眼', hobby:'音乐制作·时尚', mbti:'ENFP', dream:'成为亚洲天后', specialty:'全能天赋',
   image:'林梓萱.png'},
];

// 艺人发展方向
const DIRECTIONS = [
  {id:'歌手',  icon:'🎤', color:'#dbeafe', tc:'#1e40af', desc:'专注音乐，演出收入+25%（唱技≥70时生效）'},
  {id:'演员',  icon:'🎭', color:'#dcfce7', tc:'#14532d', desc:'影视接单，演技加成+25%（演技≥70时生效）'},
  {id:'主持人',icon:'📺', color:'#fff8e1', tc:'#92400e', desc:'综艺节目常驻，每月额外+2知名度'},
  {id:'全能',  icon:'⭐', color:'#fce7f3', tc:'#831843', desc:'均衡发展，综合演出收入+10%'},
];
