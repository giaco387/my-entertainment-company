// 练习生候选池
const POOL = [
  {name:'林晓晴', abbr:'晓', color:'#dbeafe', tc:'#1e40af', singing:72, dance:58, acting:45, rap:20, cost:30,  rarity:'普通'},
  {name:'张宇航', abbr:'宇', color:'#fef3c7', tc:'#92400e', singing:45, dance:80, acting:30, rap:65, cost:40,  rarity:'良好'},
  {name:'苏梦琪', abbr:'梦', color:'#fce7f3', tc:'#831843', singing:88, dance:62, acting:70, rap:15, cost:80,  rarity:'优秀'},
  {name:'陈浩然', abbr:'浩', color:'#dcfce7', tc:'#14532d', singing:55, dance:45, acting:92, rap:30, cost:100, rarity:'稀有'},
  {name:'韩依依', abbr:'依', color:'#ede9fe', tc:'#4c1d95', singing:78, dance:75, acting:60, rap:45, cost:60,  rarity:'良好'},
  {name:'李铭宇', abbr:'铭', color:'#ffedd5', tc:'#7c2d12', singing:50, dance:55, acting:40, rap:90, cost:50,  rarity:'普通'},
  {name:'赵紫妍', abbr:'紫', color:'#d1fae5', tc:'#064e3b', singing:95, dance:70, acting:80, rap:25, cost:150, rarity:'✨传奇'},
  {name:'陆峰',   abbr:'峰', color:'#fef9c3', tc:'#713f12', singing:60, dance:88, acting:50, rap:72, cost:70,  rarity:'良好'},
];

// 艺人发展方向
const DIRECTIONS = [
  {id:'歌手',  icon:'🎤', color:'#dbeafe', tc:'#1e40af', desc:'专注音乐，演出收入+25%（唱技≥70时生效）'},
  {id:'演员',  icon:'🎭', color:'#dcfce7', tc:'#14532d', desc:'影视接单，演技加成+25%（演技≥70时生效）'},
  {id:'主持人',icon:'📺', color:'#fff8e1', tc:'#92400e', desc:'综艺节目常驻，每月额外+2声望'},
  {id:'全能',  icon:'⭐', color:'#fce7f3', tc:'#831843', desc:'均衡发展，综合演出收入+10%'},
];
