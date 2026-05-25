const G = {
  money: 800, fame: 12, month: 1,
  artists: [], log: [], usedEvents: [], lastEvents: [], monthlyHistory: [], releases: [], streamingDeal: false, feed: [], scoutedPool: [],
  monthlyIncome: 0, monthlyCost: 0,
  activeTrends: [], agents: [], rivals: [],
  pendingEvents: [], pendingReleases: [], pendingBuilds: [], timedEvents: [], lastAwardMonth: 0,
  buildingActions: {},
  buildings: {
    live:     {name:'直播间',      lv:0, maxLv:8, icon:'📺', cost:80,  effect:'直播内容月收入'},
    practice: {name:'训练室',      lv:1, maxLv:8, icon:'🎤', cost:60,  effect:'训练效率+20%/级'},
    studio:   {name:'录音室',      lv:1, maxLv:8, icon:'🎙️', cost:100, effect:'音乐制作加成'},
    mv:       {name:'影像制作室',  lv:0, maxLv:6, icon:'🎬', cost:200, effect:'影像内容收益+30%'},
    office:   {name:'经纪办公室',  lv:1, maxLv:6, icon:'🏢', cost:50,  effect:'可签约+2人/级'},
    merch:    {name:'商品企划部',  lv:0, maxLv:6, icon:'🛍️', cost:120, effect:'粉丝商品变现'},
    media:    {name:'宣传公关部',  lv:0, maxLv:6, icon:'📡', cost:150, effect:'降低负面事件概率'},
    health:   {name:'艺人护理室',  lv:0, maxLv:6, icon:'🏥', cost:100, effect:'防艺人停工'},
    lounge:   {name:'员工休息室',  lv:0, maxLv:6, icon:'☕', cost:90,  effect:'休息精力恢复+5/级'},
    legal:    {name:'法务部',      lv:0, maxLv:6, icon:'⚖️', cost:130, effect:'降低合同续签费'},
    rehearsal:{name:'排练室',      lv:0, maxLv:6, icon:'💃', cost:90,  effect:'演出月收益+10%/级'},
    wardrobe: {name:'服装间',      lv:0, maxLv:6, icon:'👗', cost:80,  effect:'粉丝增速+10%/级'},
    makeup:   {name:'化妆间',      lv:0, maxLv:6, icon:'💄', cost:70,  effect:'月口碑+1/级'},
  }
};

const LIVE_INCOME_PER_LEVEL = 15;



const COMPANY_SHARE_BY_RARITY={'普通':90,'良好':85,'优秀':80,'稀有':75,'✨传奇':70};
function defaultCompanyShare(a){return COMPANY_SHARE_BY_RARITY[a?.rarity]||85;}
function getCompanyShare(a){
  const pct=a?.companyShare??defaultCompanyShare(a);
  return Math.max(50,Math.min(95,Math.round(pct)));
}
function companyIncomeFromGross(gross,a){return Math.round(gross*getCompanyShare(a)/100);}
function normalizeArtistFinance(a){
  if(a.companyShare===undefined) a.companyShare=defaultCompanyShare(a);
  if(a.totalGrossIncome===undefined) a.totalGrossIncome=a.totalIncome||0;
  if(a.totalArtistShare===undefined) a.totalArtistShare=0;
}
function splitArtistIncome(a,gross){
  const company=companyIncomeFromGross(gross,a);
  const artist=Math.max(0,gross-company);
  a.totalGrossIncome=(a.totalGrossIncome||0)+gross;
  a.totalIncome=(a.totalIncome||0)+company;
  a.totalArtistShare=(a.totalArtistShare||0)+artist;
  return{company,artist,gross,pct:getCompanyShare(a)};
}

function displayName(a){return a.alias||a.name;}
const TRAITS={
  discipline:{name:'自律型',desc:'训练成长 +10%',bg:'#eff6ff',color:'#1d4ed8'},
  stage:{name:'舞台型',desc:'工作收入 +10%，工作精力消耗 +10%',bg:'#fff7ed',color:'#c2410c'},
  slowburn:{name:'慢热型',desc:'训练成长 -5%，出道后粉丝增长 +15%',bg:'#f0fdf4',color:'#15803d'},
  variety:{name:'综艺感',desc:'对外业务收益 +15%',bg:'#fdf4ff',color:'#a21caf'},
  camera:{name:'镜头感',desc:'MV / 影像内容收益 +15%',bg:'#f5f3ff',color:'#6d28d9'},
  sensitive:{name:'玻璃心',desc:'口碑低时更耗精力，口碑高时粉丝增长 +10%',bg:'#fff1f2',color:'#be123c'},
};
const TRAIT_IDS=Object.keys(TRAITS);
function traitInfo(a){return TRAITS[a?.trait]||null;}
function assignTrait(a){
  if(a.trait) return a.trait;
  const seed=String(a.name||'').split('').reduce((s,ch)=>s+ch.charCodeAt(0),0);
  a.trait=TRAIT_IDS[seed%TRAIT_IDS.length];
  return a.trait;
}
function traitTrainMult(a){return a.trait==='discipline'?1.1:a.trait==='slowburn'?0.95:1;}
function traitWorkMult(a){return a.trait==='stage'?1.1:1;}
function traitFanMult(a){return a.trait==='slowburn'?1.15:(a.trait==='sensitive'&&(a.pr||60)>=80?1.1:1);}
function traitEnergyDrainMult(a){return a.trait==='stage'?1.1:(a.trait==='sensitive'&&(a.pr||60)<50?1.2:1);}
function traitBusinessMult(a){return a.trait==='variety'?1.15:1;}
function traitContentMult(a,type){return a.trait==='camera'&&(type==='mv'||type==='doc')?1.15:1;}
function artistArchetype(a){
  const specialty=String(a?.specialty||'');
  const stats=[
    ['vocal',a?.singing||0],
    ['dance',a?.dance||0],
    ['acting',a?.acting||0],
    ['rap',a?.rap||0],
  ].sort((x,y)=>y[1]-x[1]);
  if(/影视|演技|剧情|演员/.test(specialty)||stats[0][0]==='acting') return {id:'acting',name:'影视演技派',icon:'🎭',desc:'影视活动收益 +12%，纪录片收益 +10%',color:'#14532d',bg:'#dcfce7'};
  if(/舞|偶像|舞台|综艺/.test(specialty)||stats[0][0]==='dance') return {id:'stage',name:'舞台表现型',icon:'💃',desc:'日常工作收益 +8%，粉丝增长 +6%',color:'#92400e',bg:'#fff7ed'};
  if(/说唱|创作|制作|街头/.test(specialty)||stats[0][0]==='rap') return {id:'rap',name:'创作说唱型',icon:'🎧',desc:'单曲收益 +10%，说唱热潮额外收益',color:'#831843',bg:'#fce7f3'};
  if(/全能|综合|多栖/.test(specialty)||stats[0][1]-stats[2][1]<=12) return {id:'allround',name:'全能适配型',icon:'⭐',desc:'活动与内容收益 +6%',color:'#4c1d95',bg:'#ede9fe'};
  return {id:'vocal',name:'声乐主唱型',icon:'🎤',desc:'单曲/专辑收益 +12%，训练唱功略快',color:'#1e40af',bg:'#dbeafe'};
}
function artistWorkMult(a){
  const t=artistArchetype(a).id;
  return t==='stage'?1.08:t==='allround'?1.06:1;
}
function artistFanMult(a){
  return artistArchetype(a).id==='stage'?1.06:1;
}
function artistTrainingBias(a,stat){
  const t=artistArchetype(a).id;
  if(t==='vocal'&&stat==='singing') return 1.18;
  if(t==='stage'&&stat==='dance') return 1.12;
  if(t==='acting'&&stat==='acting') return 1.16;
  if(t==='rap'&&stat==='rap') return 1.2;
  if(t==='allround') return 1.05;
  return 1;
}
function artistContentMult(a,type){
  const t=artistArchetype(a).id;
  if(t==='vocal'&&(type==='single'||type==='album')) return 1.12;
  if(t==='rap'&&type==='single') return hasTrend('rap_hot')?1.35:1.1;
  if(t==='acting'&&type==='doc') return 1.1;
  if(t==='allround') return 1.06;
  return 1;
}
function artistEventMult(a,eventName=''){
  const t=artistArchetype(a).id;
  if(t==='acting'&&/影视|电影|拍摄/.test(eventName)) return 1.12;
  if(t==='stage'&&/演唱会|音乐节|晚会|选秀/.test(eventName)) return 1.1;
  if(t==='vocal'&&/歌唱|音乐|演唱/.test(eventName)) return 1.1;
  if(t==='allround') return 1.06;
  return 1;
}
function artistDreamGoal(a){
  const dream=String(a?.dream||'');
  if(/演唱会|巡演/.test(dream)) return {id:'concert',title:'登上大型舞台',desc:'完成一次演唱会、音乐节或海外巡演',check(){return (G.completedEventNames||[]).some(n=>/演唱会|音乐节|海外巡演|晚会/.test(n));},reward:'粉丝 +20万，知名度 +25',apply(){a.fans=Math.round((a.fans||0)+20);G.fame+=25;}};
  if(/专辑|白金|音乐|经典|唱/.test(dream)) return {id:'music_release',title:'代表作诞生',desc:'上线单曲或专辑作品',check(){return (G.releases||[]).some(r=>r.artistNameRaw===a.name&&(r.type==='single'||r.type==='album'));},reward:'口碑 +12，知名度 +18',apply(){a.pr=Math.min(100,(a.pr||60)+12);G.fame+=18;}};
  if(/影帝|演员|电影|最佳女演员/.test(dream)) return {id:'acting_break',title:'演技被看见',desc:'完成影视剧拍摄或上线纪录片',check(){return (G.completedEventNames||[]).includes('影视剧拍摄')||(G.releases||[]).some(r=>r.artistNameRaw===a.name&&r.type==='doc');},reward:'演技 +5，知名度 +20',apply(){a.acting=Math.min(99,a.acting+5);G.fame+=20;}};
  if(/综艺|idol|偶像|舞台/.test(dream)) return {id:'variety_idol',title:'舞台破圈',desc:'完成选秀综艺、综艺邀请或粉丝运营',check(){return (G.completedEventNames||[]).some(n=>/选秀|综艺/.test(n))||(a.lastFanOp||0)>0;},reward:'粉丝 +15%，口碑 +10',apply(){a.fans=Math.round((a.fans||0)*1.15+5);a.pr=Math.min(100,(a.pr||60)+10);}};
  if(/Billboard|世界|国际|海外/.test(dream)) return {id:'international',title:'走向国际',desc:'完成海外巡演或知名度达到 500',check(){return (G.completedEventNames||[]).includes('海外巡演')||G.fame>=500;},reward:'粉丝 +30万，知名度 +30',apply(){a.fans=Math.round((a.fans||0)+30);G.fame+=30;}};
  return {id:'known',title:'被更多人认识',desc:'个人粉丝达到 50 万',check(){return (a.fans||0)>=50;},reward:'口碑 +8，知名度 +12',apply(){a.pr=Math.min(100,(a.pr||60)+8);G.fame+=12;}};
}
function artistDreamDone(a){
  return (a.personalGoals||[]).includes(artistDreamGoal(a).id);
}
function checkArtistDreams(){
  let completed=false;
  G.artists.forEach(a=>{
    if(!a.personalGoals) a.personalGoals=[];
    const goal=artistDreamGoal(a);
    if(a.personalGoals.includes(goal.id)||!goal.check()) return;
    a.personalGoals.push(goal.id);
    goal.apply();
    completed=true;
    G.lastEvents.push({name:displayName(a)+' 梦想达成',desc:goal.title+' · '+goal.reward,icon:'✨',type:'good'});
    pushFeed('✨',displayName(a)+' 梦想达成：'+goal.title,'special');
  });
  if(completed){updateStats();checkLongGoals();}
}
function staminaDrain(a,forTraining=false){
  const base={'✨传奇':10,'稀有':12,'优秀':14,'良好':15,'普通':18}[a.rarity]||15;
  const drain=forTraining?Math.max(5,base-3):base;
  return Math.round(drain*traitEnergyDrainMult(a));
}
function staminaRecovery(a){
  const base={'✨传奇':38,'稀有':33,'优秀':30,'良好':28,'普通':22}[a.rarity]||28;
  return base+(G.buildings?.health?.lv||0)*3+(G.buildings?.lounge?.lv||0)*5;
}
function recruitAcceptRate(p){
  const r={'✨传奇':[30,0.15,80],'稀有':[50,0.2,90],'优秀':[70,0.3,95]}[p.rarity];
  if(!r) return 100;
  return Math.min(r[2],Math.round(r[0]+G.fame*r[1]));
}
function renewRejectRate(a){
  const remaining=(a.contractEnd||G.month+24)-G.month;
  const overdue=remaining<0?-remaining:0;
  let risk=0;
  if(overdue>0) risk+=30+overdue*5;
  if((a.pr||60)<=40) risk+=20;
  if((a.energy??80)<=20&&a.status!=='休息中') risk+=15;
  risk-=(G.buildings.legal?.lv||0)*5;
  return Math.max(0,Math.min(80,risk));
}
function prBg(pr){return pr>=80?'#e8f5e9':pr>=60?'#e3f2fd':pr>=40?'#fff3e0':'#ffebee';}
function prColor(pr){return pr>=80?'#2e7d32':pr>=60?'#1565c0':pr>=40?'#e65100':'#c62828';}
function prLabel(pr){return pr>=80?'口碑爆棚':pr>=60?'口碑正常':pr>=40?'风波中':'口碑危机';}
function dirClass(d){return {'歌手':'singer','演员':'actor','主持人':'host','全能':'allround'}[d]||'';}
function dirIcon(d){return {'歌手':'🎤','演员':'🎭','主持人':'📺','全能':'⭐'}[d]||'';}

function openAliasEdit(i){
  currentAliasIdx=i;
  const a=G.artists[i];
  document.getElementById('alias-modal-title').textContent='为「'+a.name+'」设置艺名';
  document.getElementById('alias-input').value=a.alias||'';
  document.getElementById('modal-alias').classList.add('open');
  setTimeout(()=>document.getElementById('alias-input').focus(),50);
}
function closeAliasEdit(){document.getElementById('modal-alias').classList.remove('open');}
function saveAlias(){
  if(currentAliasIdx<0) return;
  const val=document.getElementById('alias-input').value.trim();
  G.artists[currentAliasIdx].alias=val;
  closeAliasEdit();
  saveGame();renderArtistList();maybeRefreshArtistScene();
  toast(val?'已设置艺名「'+val+'」':'已清除艺名','success');
}

function openDirectionSelect(i){
  currentDirIdx=i;
  const a=G.artists[i];
  document.getElementById('direction-artist-name').textContent='为「'+displayName(a)+'」选择发展方向';
  document.getElementById('direction-options').innerHTML=DIRECTIONS.map(d=>`
    <div class="direction-card ${a.direction===d.id?'selected':''}" onclick="selectDirection('${d.id}')">
      <div style="width:40px;height:40px;border-radius:10px;background:${d.color};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${d.icon}</div>
      <div><div style="font-size:13px;font-weight:600;color:#1a1a1a">${d.id}</div><div style="font-size:11px;color:#666;margin-top:3px">${d.desc}</div></div>
    </div>`).join('');
  document.getElementById('modal-direction').classList.add('open');
}
function closeDirectionSelect(){document.getElementById('modal-direction').classList.remove('open');}
function selectDirection(d){
  if(currentDirIdx<0) return;
  G.artists[currentDirIdx].direction=d;
  closeDirectionSelect();
  saveGame();renderArtistList();
  toast('已选择发展方向：'+dirIcon(d)+' '+d,'success');
}

const STARTER_GOALS=[
  {id:'recruit_first', title:'签约第一位练习生', reward:'资金 +20万，知名度 +3',
   check(){return G.artists.length>=1;}, apply(){G.money+=20;G.fame+=3;addLog('起步任务奖励：签约练习生','plus',20);}},
  {id:'build_live', title:'建造直播间', reward:'资金 +30万',
   check(){return G.buildings.live?.lv>=1;}, apply(){G.money+=30;addLog('起步任务奖励：建造直播间','plus',30);}},
  {id:'practice_lv2', title:'升级训练室到 Lv.2', reward:'知名度 +5',
   check(){return G.buildings.practice?.lv>=2;}, apply(){G.fame+=5;}},
  {id:'first_debut', title:'培养第一位出道艺人', reward:'粉丝 +5万，知名度 +10',
   check(){return hasPublicArtist();}, apply(){const a=G.artists.find(x=>x.status==='已出道'||x.status==='工作中');if(a)a.fans=Math.round((a.fans||0)+5);G.fame+=10;}},
  {id:'first_single', title:'发行第一首单曲', reward:'资金 +30万，知名度 +10',
   check(){return (G.releases||[]).some(r=>r.type==='single');}, apply(){G.money+=30;G.fame+=10;addLog('起步任务奖励：首支单曲','plus',30);}},
];

const COMPANY_STAGES=[
  {
    id:'basement',
    name:'地下练习室',
    desc:'把公司从空壳搭成能培养艺人的基础团队。',
    reward:'阶段奖励：资金 +25万，知名度 +8',
    goals:[
      {text:'签约 1 名练习生', check(){return G.artists.length>=1;}},
      {text:'建成直播间', check(){return G.buildings.live?.lv>=1;}},
      {text:'培养 1 名出道艺人', check(){return hasPublicArtist();}},
    ],
    apply(){G.money+=25;G.fame+=8;addLog('阶段奖励：地下练习室','plus',25);},
  },
  {
    id:'small_agency',
    name:'小型经纪公司',
    desc:'让第一位艺人有作品、有粉丝，公司开始稳定运转。',
    reward:'阶段奖励：资金 +50万，知名度 +15',
    goals:[
      {text:'发行 1 首数字单曲', check(){return (G.releases||[]).some(r=>r.type==='single');}},
      {text:'粉丝总量达到 30 万', check(){return totalFans()>=30;}},
      {text:'单月收入达到 80 万', check(){return (G.monthlyIncome||0)>=80;}},
    ],
    apply(){G.money+=50;G.fame+=15;addLog('阶段奖励：小型经纪公司','plus',50);},
  },
  {
    id:'emerging_label',
    name:'新兴厂牌',
    desc:'从单一艺人运营，扩展到多艺人、活动和宣传体系。',
    reward:'阶段奖励：资金 +80万，知名度 +25',
    goals:[
      {text:'签约 2 名艺人', check(){return G.artists.length>=2;}},
      {text:'完成 1 次活动赛事', check(){return (G.completedEventNames||[]).length>=1;}},
      {text:'建成宣传公关部', check(){return G.buildings.media?.lv>=1;}},
    ],
    apply(){G.money+=80;G.fame+=25;addLog('阶段奖励：新兴厂牌','plus',80);},
  },
];

function totalFans(){
  return G.artists.reduce((s,a)=>s+(a.fans||0),0);
}

function publicArtistCount(){
  return G.artists.filter(a=>a.status==='已出道'||a.status==='工作中').length;
}

function averageArtistPr(){
  if(!G.artists.length) return 60;
  return Math.round(G.artists.reduce((s,a)=>s+(a.pr||60),0)/G.artists.length);
}

function builtFacilityCount(){
  return Object.values(G.buildings||{}).filter(b=>b.lv>0).length;
}

function workingArtistCount(){
  return G.artists.filter(a=>a.status==='工作中'||a.status==='已出道').length;
}

function endingGrade(score){
  if(score>=90) return {rank:'S',title:'娱乐帝国',desc:'公司已经形成顶级艺人、内容和商业体系，可以被视为本局通关。',color:'#92400e',bg:'#fffbeb',border:'#f59e0b'};
  if(score>=75) return {rank:'A',title:'顶级公司',desc:'公司有稳定影响力和商业回报，距离行业统治者只差最后扩张。',color:'#166534',bg:'#f0fdf4',border:'#86efac'};
  if(score>=55) return {rank:'B',title:'知名厂牌',desc:'公司已经站稳脚跟，但艺人矩阵和内容生产还需要继续打磨。',color:'#1d4ed8',bg:'#eff6ff',border:'#bfdbfe'};
  if(score>=35) return {rank:'C',title:'勉强维持',desc:'公司能运转，但收入、口碑或艺人储备存在明显短板。',color:'#92400e',bg:'#fff7ed',border:'#fed7aa'};
  return {rank:'D',title:'经营危机',desc:'公司还没有建立稳定循环，需要优先处理现金流和艺人状态。',color:'#991b1b',bg:'#fef2f2',border:'#fecaca'};
}

function createEndingReport(reason='milestone'){
  const publicCount=publicArtistCount();
  const avgPr=averageArtistPr();
  const achCount=(G.achievements||[]).length;
  const releaseCount=(G.releases||[]).length;
  const net=(G.monthlyIncome||0)-(G.monthlyCost||0);
  const scoreParts=[
    Math.min(30,Math.round(G.fame/8000*30)),
    Math.min(15,Math.round(Math.max(0,G.money)/3000*15)),
    Math.min(12,publicCount*4),
    Math.min(12,releaseCount*2),
    Math.min(10,Math.round(avgPr/100*10)),
    Math.min(10,achCount),
    Math.min(6,builtFacilityCount()),
    net>0?5:0,
  ];
  const score=scoreParts.reduce((s,v)=>s+v,0);
  const grade=endingGrade(score);
  const highlights=[];
  if(G.fame>=8000) highlights.push('知名度达到 8000，已经完成“娱乐帝国”终极目标。');
  if(publicCount>=3) highlights.push('拥有 '+publicCount+' 名可公开运营艺人，阵容具备规模。');
  if(releaseCount>=6) highlights.push('累计上线 '+releaseCount+' 个作品，内容供给稳定。');
  if(avgPr>=80) highlights.push('平均口碑 '+avgPr+'，公众形象优秀。');
  if(net>0) highlights.push('最近月净利润 +'+net+' 万，经营现金流为正。');
  if(!highlights.length) highlights.push('本局仍处在打基础阶段，优先建立现金流和第一位核心艺人。');
  const weak=[];
  if(G.money<200) weak.push('资金储备偏低。');
  if(publicCount<2) weak.push('出道艺人数量不足。');
  if(releaseCount<3) weak.push('作品数量还不够支撑长期收益。');
  if(avgPr<60) weak.push('艺人口碑需要维护。');
  if(net<0) weak.push('最近月净利润为负。');
  return {
    reason,score,grade,
    month:G.month,
    money:G.money,
    fame:G.fame,
    fans:totalFans(),
    publicCount,
    artistCount:G.artists.length,
    releaseCount,
    achCount,
    avgPr,
    net,
    highlights,
    weak:weak.slice(0,4),
  };
}

function endingReportKey(reason){
  if(reason==='empire') return 'empire';
  return 'month_'+G.month;
}

function shouldShowEnding(reason){
  if(!G.endingReports) G.endingReports=[];
  const key=endingReportKey(reason);
  return !G.endingReports.includes(key);
}

function markEndingShown(reason){
  if(!G.endingReports) G.endingReports=[];
  const key=endingReportKey(reason);
  if(!G.endingReports.includes(key)) G.endingReports.push(key);
}

function detectCrisis(){
  const net=(G.monthlyIncome||0)-(G.monthlyCost||0);
  if(!G.crisisState) G.crisisState={negativeCashMonths:0,lastShownMonth:0};
  G.crisisState.negativeCashMonths=G.money<0?G.crisisState.negativeCashMonths+1:0;
  const reasons=[];
  if(G.crisisState.negativeCashMonths>=3) reasons.push('资金已连续 '+G.crisisState.negativeCashMonths+' 个月为负。');
  if(G.money<50&&workingArtistCount()===0&&G.artists.length>0) reasons.push('资金不足且没有可工作的艺人。');
  if(G.money<80&&G.artists.length===0) reasons.push('资金不足且旗下没有艺人。');
  if(G.artists.filter(a=>(a.pr||60)<40).length>=2) reasons.push('多名艺人处于口碑危机。');
  if(net<-80&&G.money<150) reasons.push('最近月净亏损较大，资金储备偏低。');
  if(!reasons.length) return null;
  return {
    month:G.month,
    reasons,
    canRestructure:true,
  };
}

function checkEndingAndCrisis(){
  const endingReason=G.fame>=8000?'empire':(G.month>=12&&G.month%12===0?'milestone':null);
  if(endingReason&&shouldShowEnding(endingReason)){
    const report=createEndingReport(endingReason);
    markEndingShown(endingReason);
    G.lastEndingReport=report;
    pushFeed('🏁','经营评价：'+report.grade.rank+' · '+report.grade.title,'special');
    showEndingReport(report);
  }
  const crisis=detectCrisis();
  if(crisis&&(!G.crisisState.lastShownMonth||G.month-G.crisisState.lastShownMonth>=3)){
    G.crisisState.lastShownMonth=G.month;
    G.lastCrisisReport=crisis;
    pushFeed('🚨','公司进入经营危机，需要重整策略','bad');
    showCrisisReport(crisis);
  }
}

function completedLongGoal(id){
  return (G.longGoals||[]).includes(id);
}

const LONG_GOALS=[
  {
    id:'two_public_artists',
    title:'双艺人阵容',
    desc:'拥有 2 名出道或工作中艺人',
    reward:'知名度 +15',
    progress(){return {value:publicArtistCount(),target:2,label:publicArtistCount()+'/2'};},
    check(){return publicArtistCount()>=2;},
    apply(){G.fame+=15;},
  },
  {
    id:'fans_100',
    title:'首个十万级粉丝盘',
    desc:'公司粉丝总量达到 100 万',
    reward:'资金 +60万，知名度 +20',
    progress(){return {value:totalFans(),target:100,label:totalFans()+'/100万'};},
    check(){return totalFans()>=100;},
    apply(){G.money+=60;G.fame+=20;addLog('长期目标奖励：粉丝破百万','plus',60);},
  },
  {
    id:'three_releases',
    title:'稳定内容供给',
    desc:'累计上线 3 个作品',
    reward:'知名度 +18',
    progress(){const v=(G.releases||[]).length;return {value:v,target:3,label:v+'/3'};},
    check(){return (G.releases||[]).length>=3;},
    apply(){G.fame+=18;},
  },
  {
    id:'three_events',
    title:'活动经验成熟',
    desc:'完成 3 次活动赛事',
    reward:'资金 +50万，知名度 +15',
    progress(){const v=(G.completedEventNames||[]).length;return {value:v,target:3,label:v+'/3'};},
    check(){return (G.completedEventNames||[]).length>=3;},
    apply(){G.money+=50;G.fame+=15;addLog('长期目标奖励：活动经验成熟','plus',50);},
  },
  {
    id:'income_150',
    title:'单月收入突破',
    desc:'单月收入达到 150 万',
    reward:'资金 +80万',
    progress(){const v=G.monthlyIncome||0;return {value:v,target:150,label:v+'/150万'};},
    check(){return (G.monthlyIncome||0)>=150;},
    apply(){G.money+=80;addLog('长期目标奖励：单月收入突破','plus',80);},
  },
];

function checkLongGoals(){
  if(!G.longGoals) G.longGoals=[];
  let completed=false;
  LONG_GOALS.forEach(goal=>{
    if(completedLongGoal(goal.id)||!goal.check()) return;
    G.longGoals.push(goal.id);
    goal.apply();
    completed=true;
    pushFeed('🏁','长期目标完成：'+goal.title+'（'+goal.reward+'）','good');
    toast('🏁 长期目标完成：'+goal.title,'success');
  });
  if(completed){saveGame();updateStats();renderLongGoals();}
}

function getStageProgress(stage){
  const done=stage.goals.filter(g=>g.check()).length;
  return {done,total:stage.goals.length,complete:done>=stage.goals.length};
}

function currentCompanyStage(){
  const completed=G.companyStages||[];
  return COMPANY_STAGES.find(s=>!completed.includes(s.id))||COMPANY_STAGES[COMPANY_STAGES.length-1];
}

function checkCompanyStages(){
  if(!G.companyStages) G.companyStages=[];
  let completed=false;
  COMPANY_STAGES.forEach(stage=>{
    if(G.companyStages.includes(stage.id)) return;
    if(!getStageProgress(stage).complete) return;
    G.companyStages.push(stage.id);
    stage.apply();
    completed=true;
    pushFeed('🏢','公司阶段完成：'+stage.name+'（'+stage.reward.replace('阶段奖励：','')+'）','good');
    toast('🏢 公司阶段完成：'+stage.name,'success');
  });
  if(completed){saveGame();updateStats();}
}

const ROUTE_GOALS=[
  {
    id:'cash_foundation',
    routeId:'cash',
    title:'现金流基础盘',
    reward:'资金 +40万，知名度 +5',
    check(){return ['live','merch','office'].every(k=>G.buildings[k]?.lv>0);},
    apply(){G.money+=40;G.fame+=5;addLog('路线任务奖励：现金流基础盘','plus',40);},
  },
  {
    id:'talent_foundation',
    routeId:'talent',
    title:'核心艺人培养线',
    reward:'全员精力 +15，知名度 +8',
    check(){return ['practice','lounge','health'].every(k=>G.buildings[k]?.lv>0);},
    apply(){G.artists.forEach(a=>{a.energy=Math.min(100,(a.energy??80)+15);});G.fame+=8;},
  },
  {
    id:'content_foundation',
    routeId:'content',
    title:'作品制作链路',
    reward:'资金 +30万，知名度 +10',
    check(){return ['studio','mv','media'].every(k=>G.buildings[k]?.lv>0);},
    apply(){G.money+=30;G.fame+=10;addLog('路线任务奖励：作品制作链路','plus',30);},
  },
];

function routeGoalFor(routeId){
  return ROUTE_GOALS.find(g=>g.routeId===routeId);
}

function routeGoalDone(id){
  return (G.routeGoals||[]).includes(id);
}

function checkRouteGoals(){
  if(!G.routeGoals) G.routeGoals=[];
  let completed=false;
  ROUTE_GOALS.forEach(goal=>{
    if(routeGoalDone(goal.id)||!goal.check()) return;
    G.routeGoals.push(goal.id);
    goal.apply();
    completed=true;
    const route=BUILDING_ROUTES.find(r=>r.id===goal.routeId);
    pushFeed(route?.icon||'🏗️','获得公司徽章：'+goal.title+'（'+goal.reward+'）','good');
    toast('🏅 获得公司徽章：'+goal.title,'success');
  });
  if(completed){saveGame();updateStats();renderCompanyBadges();}
}

function checkStarterGoals(){
  if(!G.starterGoals) G.starterGoals=[];
  let completed=false;
  STARTER_GOALS.forEach(goal=>{
    if(G.starterGoals.includes(goal.id)||!goal.check()) return;
    G.starterGoals.push(goal.id);
    goal.apply();
    completed=true;
    pushFeed('🎯','起步任务完成：'+goal.title+'（'+goal.reward+'）','good');
    toast('🎯 起步任务完成：'+goal.title,'success');
  });
  checkCompanyStages();
  checkRouteGoals();
  if(completed){saveGame();updateStats();}
}

function pushFeed(icon, text, type='info'){
  if(!G.feed) G.feed=[];
  const y=Math.floor((G.month-1)/12)+1;
  const mo=((G.month-1)%12)+1;
  G.feed.unshift({icon, text:String(text).slice(0,55), type, label:'第'+y+'年'+mo+'月'});
  if(G.feed.length>60) G.feed.length=60;
  renderFeed();
}

function renderFeed(){
  const el=document.getElementById('feed-list');
  if(!el) return;
  if(!G.feed||!G.feed.length){
    el.innerHTML='<div style="padding:24px 14px;text-align:center;color:#d0cdc8;font-size:12px;line-height:2.2">还没有动态<br>推进游戏后<br>会在这里更新</div>';
    return;
  }
  el.innerHTML=G.feed.map(item=>`
    <div class="fi fi-${item.type}">
      <div class="fi-month">${item.label}</div>
      <div class="fi-body">${item.icon} ${item.text}</div>
    </div>`).join('');
}

let _feedOpen=true;
function toggleFeed(){
  _feedOpen=!_feedOpen;
  document.getElementById('feed-panel').classList.toggle('collapsed',!_feedOpen);
  document.getElementById('feed-tab').textContent=_feedOpen?'动态':'动态';
  document.querySelector('.content').style.paddingRight=_feedOpen?'250px':'20px';
}

function clearFeed(){
  G.feed=[];
  renderFeed();
}

function saveGame(){
  localStorage.setItem('mec_save', JSON.stringify(G));
}

function loadGame(){
  const raw=localStorage.getItem('mec_save');
  if(!raw) return false;
  try{
    const saved=JSON.parse(raw);
    Object.assign(G, saved);
    // 补全旧存档缺失的建筑
    const defaultBuildings={
      merch: {name:'商品企划部', lv:0, maxLv:4, icon:'🛍️', cost:120, effect:'粉丝商品变现'},
      media:    {name:'宣传公关部',  lv:0, maxLv:4, icon:'📡', cost:150, effect:'降低负面事件概率'},
      health:   {name:'艺人护理室',  lv:0, maxLv:3, icon:'🏥', cost:100, effect:'防艺人停工'},
      lounge:   {name:'员工休息室',  lv:0, maxLv:6, icon:'☕', cost:90,  effect:'休息精力恢复+5/级'},
      legal:    {name:'法务部',      lv:0, maxLv:4, icon:'⚖️', cost:130, effect:'降低合同续签费'},
      rehearsal:{name:'排练室',      lv:0, maxLv:6, icon:'💃', cost:90,  effect:'演出月收益+10%/级'},
      wardrobe: {name:'服装间',      lv:0, maxLv:6, icon:'👗', cost:80,  effect:'粉丝增速+10%/级'},
      makeup:   {name:'化妆间',      lv:0, maxLv:6, icon:'💄', cost:70,  effect:'月口碑+1/级'},
    };
    Object.entries(defaultBuildings).forEach(([k,v])=>{if(!G.buildings[k]) G.buildings[k]=v;});
    const buildingRenames={
      live:'直播间',
      mv:'影像制作室',
      merch:'商品企划部',
      media:'宣传公关部',
      health:'艺人护理室',
    };
    Object.entries(buildingRenames).forEach(([k,name])=>{if(G.buildings[k]) G.buildings[k].name=name;});
    if(G.buildings.live) G.buildings.live.effect='直播内容月收入';
    if(G.buildings.mv) G.buildings.mv.effect='影像内容收益+30%';
    if(G.buildings.merch) G.buildings.merch.effect='粉丝商品变现';
    if(!G.pendingBuilds) G.pendingBuilds=[];
    G.pendingBuilds=G.pendingBuilds.filter(p=>p.k!=='fanshall');
    if(!G.lastAwardMonth) G.lastAwardMonth=0;
    if(!G.timedEvents) G.timedEvents=[];
    if(!G.endingReports) G.endingReports=[];
    if(!G.crisisState) G.crisisState={negativeCashMonths:0,lastShownMonth:0};
    if(!G.businessActions) G.businessActions={month:G.month,count:0,used:{}};
    if(G.businessActions.month===undefined) G.businessActions.month=G.month;
    if(G.businessActions.count===undefined) G.businessActions.count=0;
    if(!G.businessActions.used) G.businessActions.used={};
    if(!G.scoutedPool) G.scoutedPool=[];
    pruneScoutedPool();
    G.artists.forEach(a=>{
      if(a.energy===undefined) a.energy=80;
      if(!a.personalGoals) a.personalGoals=[];
      normalizeArtistFinance(a);
    });
    // 更新旧存档的 maxLv 上限
    const newMaxLv={live:8,practice:8,studio:8,mv:6,office:6,merch:6,media:6,health:6,lounge:6,legal:6,rehearsal:6,wardrobe:6,makeup:6};
    Object.entries(newMaxLv).forEach(([k,m])=>{if(G.buildings[k]&&G.buildings[k].maxLv<m) G.buildings[k].maxLv=m;});
    if(G.buildings.fanshall) delete G.buildings.fanshall;
    if(G.buildingActions&&G.buildingActions.fanshall) delete G.buildingActions.fanshall;
    return true;
  }catch(e){return false;}
}

function newGame(){
  if(!confirm('确定开始新游戏吗？当前进度将清除！')) return;
  localStorage.removeItem('mec_save');
  location.reload();
}

function enterRoom(key){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('section-room').classList.add('active');
  document.getElementById('nav-buildings').classList.add('active');
  const b=G.buildings[key];
  document.getElementById('room-icon-title').textContent=b.icon+' '+b.name;
  document.getElementById('room-lv-badge').textContent='Lv.'+b.lv+'/'+b.maxLv;
  const section=document.getElementById('section-room');
  let bg=section.querySelector('.scene-bg');
  if(!bg){bg=document.createElement('div');bg.className='scene-bg';section.insertBefore(bg,section.firstChild);}
  bg.innerHTML=getRoomScene(key,b);
  renderRoomArtistPanel();
}

function exitRoom(){showSection('buildings');}

function renderRoomArtistPanel(){
  const el=document.getElementById('room-artist-panel');
  if(!G.artists.length){el.innerHTML='<div style="color:rgba(255,255,255,.38);font-size:12px">还没有签约艺人，前往艺人管理招募吧</div>';return;}
  el.innerHTML=`<div style="font-size:10px;color:rgba(255,255,255,.4);margin-bottom:8px;font-weight:600;letter-spacing:.5px">在场艺人</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px">
    ${G.artists.map(a=>`<div class="room-artist-chip">
      <div style="width:38px;height:38px;border-radius:50%;background:${a.color};color:${a.tc};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid rgba(255,255,255,.35);box-shadow:0 2px 8px rgba(0,0,0,.4)">${a.abbr}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap">${displayName(a)}</div>
      <div class="status-badge ${statusCls(a.status)}" style="font-size:9px;padding:1px 5px">${a.status}</div>
    </div>`).join('')}
  </div>`;
}

function roomSceneArtists(){
  if(!G.artists.length) return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,.22)">还没有艺人 ...</div>`;
  const cnt=G.artists.length, sp=Math.min(88/(cnt+1),16);
  return G.artists.map((a,i)=>{
    const left=6+(i+1)*sp;
    return `<div style="position:absolute;bottom:8px;left:${left}%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:36px;height:36px;border-radius:50%;background:${a.color};color:${a.tc};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,.45);box-shadow:0 2px 10px rgba(0,0,0,.5)">${a.abbr}</div>
      <div style="font-size:8px;color:rgba(255,255,255,.75);white-space:nowrap">${displayName(a)}</div>
    </div>`;
  }).join('');
}

function getLoungeScene(){
  const artists=roomSceneArtists();
  return `
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,#f6efe4 0%,#ead7bd 54%,#927556 55%,#6f573f 100%)"></div>
    <div style="position:absolute;inset:0;background:
      linear-gradient(90deg,rgba(255,255,255,.16) 0 1px,transparent 1px 11%),
      linear-gradient(0deg,rgba(80,55,34,.18) 0 1px,transparent 1px 18%);opacity:.45"></div>
    <div style="position:absolute;left:7%;top:12%;width:28%;height:25%;background:#fff8ed;border:4px solid #8b6b4c;box-shadow:0 10px 24px rgba(55,35,20,.25)">
      <div style="position:absolute;inset:12%;background:linear-gradient(135deg,#b9d7e8,#f7fbff 55%,#f0c98d)"></div>
      <div style="position:absolute;left:16%;right:16%;bottom:18%;height:6%;background:#5f7f50;border-radius:99px"></div>
    </div>
    <div style="position:absolute;right:10%;top:18%;width:16%;height:34%;background:#36312d;border-radius:8px 8px 3px 3px;box-shadow:0 12px 28px rgba(0,0,0,.28)">
      <div style="position:absolute;left:18%;right:18%;top:10%;height:28%;background:#111;border-radius:4px"></div>
      <div style="position:absolute;left:23%;right:23%;top:45%;height:9%;background:#d4a24a;border-radius:99px"></div>
      <div style="position:absolute;left:18%;right:18%;bottom:12%;height:18%;background:#f3eadb;border-radius:0 0 12px 12px"></div>
    </div>
    <div style="position:absolute;left:14%;right:22%;bottom:23%;height:9%;background:#b88458;border-radius:10px;box-shadow:0 12px 20px rgba(60,35,18,.28)">
      <div style="position:absolute;left:9%;top:-42px;width:54px;height:54px;background:#f7efe2;border:6px solid #a0744e;border-radius:50%"></div>
      <div style="position:absolute;right:11%;top:-36px;width:46px;height:46px;background:#e7f0dc;border:6px solid #a0744e;border-radius:50%"></div>
    </div>
    <div style="position:absolute;left:20%;bottom:13%;width:44px;height:58px;background:#7c583b;border-radius:7px 7px 3px 3px;box-shadow:0 8px 18px rgba(0,0,0,.18)"></div>
    <div style="position:absolute;right:33%;bottom:13%;width:44px;height:58px;background:#7c583b;border-radius:7px 7px 3px 3px;box-shadow:0 8px 18px rgba(0,0,0,.18)"></div>
    <div style="position:absolute;left:48%;top:16%;width:18%;height:15%;background:#f7f0e3;border-radius:6px;box-shadow:0 8px 18px rgba(60,35,18,.14)">
      <div style="padding:11px 14px;font-size:14px;font-weight:700;color:#7a5538;letter-spacing:1px">BREAK</div>
      <div style="height:2px;margin:0 14px;background:#ddc8ac"></div>
      <div style="padding:8px 14px;font-size:10px;color:#9a7655">tea · music · recharge</div>
    </div>
    <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#14b8a6,#f59e0b,#ef4444,#14b8a6)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:22%;background:linear-gradient(180deg,rgba(65,42,27,.62),rgba(31,24,20,.86));border-top:2px solid rgba(255,255,255,.18)">
      ${artists}
    </div>`;
}

function getRoomScene(key,b){
  if(key==='lounge') return getLoungeScene();
  const imgs={live:'rooms/room-live.jpg',practice:'rooms/room-practice.jpg',studio:'rooms/room-studio.jpg',mv:'rooms/room-mv.jpg',office:'rooms/room-office.jpg'};
  const accents={live:'linear-gradient(90deg,#2563eb,#4f46e5,#7c3aed,#4f46e5,#2563eb)',practice:'linear-gradient(90deg,#a3e635,#65a30d,#a3e635)',studio:'linear-gradient(90deg,#92400e,#f59e0b,#92400e)',mv:'linear-gradient(90deg,#7c3aed,#fff,#7c3aed)',office:'linear-gradient(90deg,#0ea5e9,#6366f1,#0ea5e9)'};
  const extras={live:`<div style="position:absolute;top:12%;right:7%;padding:4px 10px;background:#dc2626;border-radius:4px;font-size:11px;font-weight:700;color:#fff;letter-spacing:1px;box-shadow:0 0 10px rgba(220,38,38,.5)">● LIVE</div>`};
  const artists=roomSceneArtists();
  return `
    <div style="position:absolute;inset:0;background:url('${imgs[key]}') center/cover no-repeat"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.55) 100%)"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:5px;background:${accents[key]||'#fff'}"></div>
    ${extras[key]||''}
    <div style="position:absolute;bottom:0;left:0;right:0;height:22%;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.82));border-top:2px solid rgba(255,255,255,.15)">
      ${artists}
    </div>`;
}

function renderScene(id){
  const section=document.getElementById('section-'+id);
  let bg=section.querySelector('.scene-bg');
  if(!bg){bg=document.createElement('div');bg.className='scene-bg';section.insertBefore(bg,section.firstChild);}
  section.classList.remove('dark-scene');
  const fns={overview:sceneOverview,artists:sceneArtists,buildings:sceneBuildings,business:sceneBusiness,events:sceneEvents,finance:sceneFinance,content:sceneContent,achievements:sceneAchievements,market:sceneMarket,agents:sceneAgents,rivals:sceneRivals};
  if(fns[id]) bg.innerHTML=fns[id]();
}

function maybeRefreshArtistScene(){
  if(document.getElementById('section-artists').classList.contains('active')) renderScene('artists');
}

function sceneOverview(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneArtists(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneBuildings(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneEvents(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneFinance(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneContent(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

function sceneBusiness(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#fbfaf8 0%,#f5f4f0 100%)"></div>`;
}

function renderContent(){
  renderReleaseCreator();
  renderActiveReleases();
  renderStreamingInfo();
}

function renderReleaseCreator(){
  const el=document.getElementById('release-creator');
  if(!G.artists.length){el.innerHTML='<div style="font-size:13px;color:#999">请先在「艺人管理」签约练习生</div>';return;}
  if(!contentCustomTitle){contentCustomTitle=pickUniqueContentTitle(contentTypeId);}
  const a=G.artists[contentArtistIdx]||G.artists[0];
  const busyLeft=a?artistReleaseBusyLeft(a):0;
  const canReleaseSelected=a&&(a.status==='已出道'||a.status==='工作中')&&busyLeft<=0;
  const selectedType=CONTENT_TYPES.find(t=>t.id===contentTypeId)||CONTENT_TYPES[0];
  const selectedSynergy=a&&selectedType?contentSynergy(a,selectedType.id):{mult:1,tags:[]};
  const baseEstimate=a&&selectedType?selectedType.income(a):0;
  const boostedEstimate=Math.round(baseEstimate*selectedSynergy.mult);
  el.innerHTML=`
    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:#999;margin-bottom:6px;font-weight:600">选择艺人</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="rc-artists">
        ${G.artists.map((a,i)=>{
          const left=artistReleaseBusyLeft(a);
          const available=(a.status==='已出道'||a.status==='工作中')&&left<=0;
          return `<button onclick="selectReleaseArtist(${i})" id="rca-${i}" class="btn btn-sm" title="${left>0?'宣传/制作期中，还需'+left+'个月':''}" style="display:flex;align-items:center;gap:5px;${contentArtistIdx===i?'background:#1a1a1a;color:#fff;border-color:#1a1a1a':''}${!available?'opacity:.45;':''}">
          <span style="width:22px;height:22px;border-radius:50%;background:${a.color};color:${a.tc};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${a.abbr}</span>
          ${displayName(a)}${left>0?'<span style="font-size:10px;color:#e65100"> · '+left+'月</span>':''}
        </button>`;
        }).join('')}
      </div>
      ${busyLeft>0?`<div style="font-size:11px;color:#e65100;margin-top:8px;background:#fff3e0;border:1px solid #ffcc80;border-radius:8px;padding:7px 9px">⏳ ${displayName(a)} 上个作品还在制作/宣传期，还需 ${busyLeft} 个月才能发行新作品。</div>`:''}
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:#999;margin-bottom:6px;font-weight:600">内容类型</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px" id="rc-types">
        ${CONTENT_TYPES.map(t=>{
          const sy=a?contentSynergy(a,t.id):{mult:1,tags:[]};
          return `<button onclick="selectReleaseType('${t.id}')" id="rct-${t.id}" class="btn" style="flex-direction:column;align-items:flex-start;gap:3px;padding:10px 12px;${contentTypeId===t.id?'background:#f0ede6;border-color:#1a1a1a;':''}${!t.check()?'opacity:.4;':''}">
          <div style="font-size:15px">${t.icon} <strong style="font-size:13px">${t.name}</strong> <span style="font-size:11px;color:#999;font-weight:400">${t.cost}万</span></div>
          <div style="font-size:10px;color:#999">${t.req} · 制作${t.productionMonths}个月 · 热度${t.duration}个月</div>
          <div style="font-size:10px;color:#2e7d32">预估首月收益 ~${Math.round(t.income(G.artists[contentArtistIdx]||G.artists[0])*sy.mult*1.5)}万${sy.tags.length?' · '+sy.tags.length+'项联动':''}</div>
        </button>`;
        }).join('')}
      </div>
      <div style="margin-top:10px;padding:9px 11px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:11px;color:#166534;line-height:1.6">
        <strong>当前联动：</strong>${selectedSynergy.tags.length?selectedSynergy.tags.join(' / '):'暂无，可尝试先发单曲再发 MV，或提升直播间、宣传公关部、影像制作室。'}
        <br><strong>收益变化：</strong>基础 ${baseEstimate}万 → 联动后 ${boostedEstimate}万（首月约 ${Math.round(boostedEstimate*1.5)}万）
      </div>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:#999;margin-bottom:6px;font-weight:600">作品名称</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="rc-title-input" type="text" value="${contentCustomTitle||''}" oninput="updateReleaseTitle(this.value)"
          style="flex:1;padding:8px 11px;border:1.5px solid #e8e5de;border-radius:8px;font-size:13px;outline:none;background:#fff;font-family:inherit"
          placeholder="输入作品名称…" maxlength="30">
        <button class="btn btn-sm" onclick="refreshReleaseTitle()" title="换一个随机名称" style="flex-shrink:0;padding:8px 10px">🎲</button>
      </div>
    </div>
    <button class="btn btn-primary" onclick="releaseContent()" ${canReleaseSelected?'':'disabled'} style="width:100%;justify-content:center;padding:10px">
      ${canReleaseSelected?'🚀 确认发行':'⏳ 艺人暂不可发行'}
    </button>`;
}

function artistReleaseBusyLeft(a){
  return Math.max(0,(a.releaseBusyUntil||0)-G.month);
}

function selectReleaseArtist(i){
  contentArtistIdx=i;
  renderReleaseCreator();
}
function selectReleaseType(id){
  contentTypeId=id;
  contentCustomTitle=pickUniqueContentTitle(id);
  renderReleaseCreator();
}
function refreshReleaseTitle(){
  contentCustomTitle=pickUniqueContentTitle(contentTypeId);
  renderReleaseCreator();
}
function updateReleaseTitle(val){
  contentCustomTitle=val;
}

function contentBaseTitle(title){
  return String(title||'').replace(/^.+? - /,'').trim();
}

function usedContentTitles(){
  const used=new Set();
  [...(G.releases||[]),...(G.pendingReleases||[])].forEach(r=>{
    const t=contentBaseTitle(r.title);
    if(t) used.add(t);
  });
  return used;
}

function pickUniqueContentTitle(typeId){
  const titleList=CONTENT_TITLES[typeId]||['新作品'];
  const used=usedContentTitles();
  const candidates=titleList.filter(t=>!used.has(t));
  if(candidates.length) return candidates[Math.floor(Math.random()*candidates.length)];
  const base=titleList[Math.floor(Math.random()*titleList.length)]||'新作品';
  const suffixes=['II','特别版','2026','重制版','最终章'];
  for(const suffix of suffixes){
    const candidate=base+' '+suffix;
    if(!used.has(candidate)) return candidate;
  }
  let n=2;
  while(used.has(base+' '+n)) n++;
  return base+' '+n;
}

function recentReleaseForArtist(a,type,window=2){
  return [...(G.releases||[]),...(G.pendingReleases||[])].some(r=>
    r.artistNameRaw===a.name&&r.type===type&&Math.abs((r.releasedAt||r.goLiveAt)-G.month)<=window
  );
}

function contentSynergy(a,type){
  let mult=traitContentMult(a,type)*artistContentMult(a,type);
  const tags=[];
  const archetype=artistArchetype(a);
  if(artistContentMult(a,type)>1) tags.push(archetype.name);
  if(type==='single'&&G.buildings.live?.lv>=2){mult*=1.15;tags.push('直播预热');}
  if(type==='mv'&&recentReleaseForArtist(a,'single')){mult*=1.2;tags.push('单曲联动');}
  if(type==='doc'&&recentReleaseForArtist(a,'album')){mult*=1.25;tags.push('专辑纪录片');}
  if((type==='mv'||type==='doc')&&G.buildings.mv?.lv>0){mult*=1+G.buildings.mv.lv*0.04;tags.push('影像制作室');}
  if(G.buildings.media?.lv>0){mult*=1+G.buildings.media.lv*0.03;tags.push('宣传公关');}
  const contentRouteLv=routeLevel('content');
  if(contentRouteLv>0){mult*=contentRouteIncomeMult();tags.push('内容制作路线+'+(contentRouteLv*5)+'%');}
  return{mult,tags};
}

function releaseContent(){
  if(!G.artists.length){toast('请先签约艺人','error');return;}
  const a=G.artists[contentArtistIdx];
  if(!a){toast('请选择艺人','error');return;}
  if(a.status!=='已出道'&&a.status!=='工作中'){toast('只有出道艺人才能发行内容','error');return;}
  const busyLeft=artistReleaseBusyLeft(a);
  if(busyLeft>0){toast(displayName(a)+' 仍在作品制作/宣传期，还需 '+busyLeft+' 个月','error');return;}
  const t=CONTENT_TYPES.find(x=>x.id===contentTypeId);
  if(!t){toast('请选择内容类型','error');return;}
  if(!t.check()){toast('设施条件不满足：'+t.req,'error');return;}
  if(G.money<t.cost){toast('资金不足 '+t.cost+' 万','error');return;}
  const titleList=CONTENT_TITLES[t.id];
  const inputEl=document.getElementById('rc-title-input');
  const rawTitle=(inputEl&&inputEl.value.trim())||contentCustomTitle||titleList[Math.floor(Math.random()*titleList.length)];
  if(usedContentTitles().has(rawTitle)){toast('作品名「'+rawTitle+'」已使用，请换一个名称','error');return;}
  const title=displayName(a)+' - '+rawTitle;
  G.money-=t.cost;
  const goLiveAt=G.month+t.productionMonths;
  a.releaseBusyUntil=goLiveAt+t.duration;
  const synergy=contentSynergy(a,t.id);
  G.pendingReleases.push({type:t.id,artistName:displayName(a),artistNameRaw:a.name,title,releasedAt:goLiveAt,baseIncome:Math.round(t.income(a)*synergy.mult),duration:t.duration,goLiveAt,productionMonths:t.productionMonths,synergy:synergy.tags});
  addLog(title+' 制作费','minus',t.cost);
  contentCustomTitle=pickUniqueContentTitle(contentTypeId);
  saveGame();renderContent();updateStats();checkAchievements();
  toast('🎬 「'+title+'」开始制作，'+t.productionMonths+'个月后正式发布！','success');
}

function contentTypeInfo(id){
  return CONTENT_TYPES.find(t=>t.id===id)||{name:'作品',icon:'🎵'};
}

function estimateReleaseFirstMonthIncome(r){
  const streamBonus=G.streamingDeal&&(r.type==='single'||r.type==='album')?1.5:1;
  const trendContent=(hasTrend('streaming_rise')&&(r.type==='single'||r.type==='album')?1.4:1)*(hasTrend('platform_fee')?0.7:1)*(hasAgent('producer')?1.3:1);
  return Math.round(r.baseIncome*1.5*streamBonus*trendContent);
}

function releaseMarketVerdict(income,r){
  if(income>=90) return '首月大爆，平台和粉丝反馈都很强';
  if(income>=60) return '表现亮眼，已经具备继续加码宣传的价值';
  if(income>=35) return '稳定传播，适合作为艺人代表作继续经营';
  if(r.synergy?.length) return '小范围破圈，联动效果开始显现';
  return '反响平稳，后续需要活动或宣传继续推一把';
}

function releaseDebutDesc(r){
  const t=contentTypeInfo(r.type);
  const firstIncome=estimateReleaseFirstMonthIncome(r);
  const synergy=r.synergy?.length?' · 联动：'+r.synergy.join(' / '):'';
  return t.name+'正式上线，预计首月收益约 '+firstIncome+'万。'+releaseMarketVerdict(firstIncome,r)+synergy;
}

function renderActiveReleases(){
  const el=document.getElementById('active-releases');
  const badge=document.getElementById('release-count-badge');
  const pending=G.pendingReleases||[];
  const active=G.releases||[];
  if(!active.length&&!pending.length){
    el.innerHTML='<div style="font-size:13px;color:#999">还没有发行任何内容</div>';
    if(badge) badge.textContent='';
    return;
  }
  let html='';
  if(pending.length){
    html+=pending.map((r,i)=>{
      const typeIcon=CONTENT_TYPES.find(t=>t.id===r.type)?.icon||'🎵';
      const left=r.goLiveAt-G.month;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i<pending.length-1||active.length?'border-bottom:1px solid #f0ede6':''}">
        <div style="width:42px;height:42px;border-radius:10px;background:#f0e6ff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;opacity:.6">${typeIcon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#666">${r.title}</div>
          <div style="font-size:11px;color:#7c3aed;font-weight:500;margin-top:3px">🔨 制作中 · 还需 ${left} 个月上线</div>
          ${r.synergy?.length?`<div style="font-size:10px;color:#15803d;margin-top:2px">联动：${r.synergy.join(' / ')}</div>`:''}
        </div>
        <div style="font-size:12px;color:#7c3aed;font-weight:600;flex-shrink:0">制作中</div>
      </div>`;
    }).join('');
  }
  if(!active.length){el.innerHTML=html;if(badge)badge.textContent=pending.length+'部制作中';return;}
  const sorted=[...active].sort((a,b)=>b.releasedAt-a.releasedAt);
  if(badge) badge.textContent=(pending.length?pending.length+'部制作中 · ':'')+sorted.length+'部上线';
  el.innerHTML=html+sorted.map((r,i)=>{
    const age=G.month-r.releasedAt;
    const isActive=r.type==='doc'?age<r.duration:true;
    const mult=age===0?1.5:age===1?1.0:age===2?0.6:0.2;
    const streamBonus=G.streamingDeal&&(r.type==='single'||r.type==='album')?1.5:1;
    const thisMonthIncome=Math.round(r.baseIncome*mult*streamBonus);
    const heatPct=r.type==='doc'?Math.max(0,Math.round((1-age/r.duration)*100)):Math.max(5,Math.round((1-age/4)*100));
    const heatColor=heatPct>60?'#16a34a':heatPct>30?'#e65100':'#dc2626';
    const typeIcon=CONTENT_TYPES.find(t=>t.id===r.type)?.icon||'🎵';
    const phaseLabel=age===0?'🔥 新鲜发布':age<=1?'📈 上升期':age<=2?'➡️ 平稳期':age<=3?'📉 长尾期':'💤 长尾';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i<sorted.length-1?'border-bottom:1px solid #f0ede6':''}">
      <div style="width:42px;height:42px;border-radius:10px;background:#f0e6ff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${typeIcon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="font-size:10px;color:#999">第${age+1}个月</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#f0ede6;color:#666">${phaseLabel}</span>
        </div>
        ${r.synergy?.length?`<div style="font-size:10px;color:#15803d;margin-top:2px">联动：${r.synergy.join(' / ')}</div>`:''}
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px">
          <div style="flex:1;height:4px;background:#f0ede6;border-radius:99px;overflow:hidden;max-width:100px">
            <div style="height:100%;border-radius:99px;background:${heatColor};width:${heatPct}%;transition:width .4s"></div>
          </div>
          <span style="font-size:10px;color:${heatColor};font-weight:600">热度 ${heatPct}%</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:${isActive?'#2e7d32':'#999'}">${r.type==='doc'?(isActive?'+'+Math.max(1,Math.round(mult*4))+'知名度':'已完结'):(isActive?'+'+thisMonthIncome+'万/月':'长尾 +'+thisMonthIncome+'万')}</div>
        <div style="font-size:10px;color:#999;margin-top:1px">${streamBonus>1?'📱平台加成×1.5':''}</div>
      </div>
    </div>`;
  }).join('');
}

function renderStreamingInfo(){
  const el=document.getElementById('streaming-info');
  const canSign=G.buildings.studio.lv>=2&&G.fame>=40;
  if(G.streamingDeal){
    el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:4px 0">
      <div style="font-size:28px">📱</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:#2e7d32">✅ 已签约流媒体平台</div>
        <div style="font-size:12px;color:#666;margin-top:3px">单曲 / 专辑发行收益 ×1.5，长期有效</div>
      </div>
    </div>`;
  } else {
    el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:4px 0">
      <div style="font-size:28px;opacity:${canSign?1:.4}">📱</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">流媒体平台合约</div>
        <div style="font-size:12px;color:#666;margin-top:3px">签约后单曲/专辑收益永久 ×1.5 · 费用 50万</div>
        <div style="font-size:11px;color:#999;margin-top:2px">解锁条件：录音室 Lv.2 且知名度 ≥ 40</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="signStreaming()" ${canSign?'':'disabled'}>签约 50万</button>
    </div>`;
  }
}

function signStreaming(){
  if(G.buildings.studio.lv<2){toast('需要录音室 Lv.2+','error');return;}
  if(G.fame<40){toast('需要知名度 ≥ 40','error');return;}
  if(G.money<50){toast('资金不足 50万','error');return;}
  G.money-=50;
  G.streamingDeal=true;
  addLog('签约流媒体平台','minus',50);
  saveGame();renderContent();updateStats();checkAchievements();
  toast('📱 流媒体合约签署成功！单曲/专辑收益永久×1.5','success');
}

let contentArtistIdx=0, contentTypeId='single', contentCustomTitle='';

function checkAchievements(){
  let newUnlocks=[];
  ACHIEVEMENTS.forEach(ach=>{
    if(!(G.achievements||[]).includes(ach.id)&&ach.check()){
      G.achievements.push(ach.id);
      newUnlocks.push(ach);
    }
  });
  if(newUnlocks.length){
    saveGame();
    if(document.getElementById('section-achievements').classList.contains('active')) renderAchievements();
    newUnlocks.forEach((ach,i)=>{
      setTimeout(()=>showAchToast(ach),i*1200);
      pushFeed('🏆','解锁成就：'+ach.icon+' '+ach.name,'special');
    });
  }
}

function showAchToast(ach){
  const el=document.getElementById('ach-toast');
  el.innerHTML=`<div style="font-size:10px;opacity:.7;margin-bottom:3px;letter-spacing:.5px">🏆 成就解锁</div><div style="font-size:15px">${ach.icon} ${ach.name}</div><div style="font-size:11px;opacity:.7;margin-top:3px">${ach.desc}</div>`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),3200);
}

function renderAchievements(){
  const cats=['里程碑','艺人','建设','内容','活动'];
  const unlocked=G.achievements||[];
  const total=ACHIEVEMENTS.length;
  document.getElementById('ach-progress').innerHTML=
    `已解锁 <strong style="color:#1a1a1a">${unlocked.length}</strong> / ${total} &nbsp;·&nbsp; `+
    `<span style="font-size:12px">${Math.round(unlocked.length/total*100)}% 完成度</span>`;
  document.getElementById('ach-list').innerHTML=cats.map(cat=>{
    const list=ACHIEVEMENTS.filter(a=>a.cat===cat);
    return `<div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:600;color:#999;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">${cat}</div>
      <div class="ach-grid">
        ${list.map(ach=>{
          const done=unlocked.includes(ach.id);
          return `<div class="ach-card ${done?'unlocked':'locked'}">
            <div class="ach-icon">${ach.icon}</div>
            <div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.desc}</div>
            ${done?'<div style="font-size:10px;color:#92400e;font-weight:600;margin-top:2px">✅ 已解锁</div>':''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function sceneAchievements(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

// ── 市场动态 ───────────────────────────────────────────
function hasTrend(id){ return (G.activeTrends||[]).some(t=>t.id===id); }

function updateTrends(){
  G.activeTrends=(G.activeTrends||[]).map(t=>({...t,remaining:t.remaining-1})).filter(t=>t.remaining>0);
  if(G.activeTrends.length<3&&Math.random()<0.35){
    const used=new Set(G.activeTrends.map(t=>t.id));
    const pool=TREND_POOL.filter(t=>!used.has(t.id));
    if(pool.length){
      const tr=pool[Math.floor(Math.random()*pool.length)];
      G.activeTrends.push({...tr,remaining:tr.duration});
    }
  }
}

function renderMarket(){
  const badge=document.getElementById('trend-count-badge');
  const list=document.getElementById('trend-list');
  const tip=document.getElementById('market-tip');
  if(!G.activeTrends||!G.activeTrends.length){
    badge.textContent='暂无活跃趋势';
    list.innerHTML='<div style="font-size:13px;color:#999;padding:8px 0">当前市场平稳，等待下一月触发新趋势</div>';
  } else {
    badge.textContent=G.activeTrends.length+' 条活跃';
    list.innerHTML=G.activeTrends.map(t=>`
      <div class="trend-card" style="border-color:${t.bad?'#fca5a5':'#a7f3d0'}">
        <div class="trend-icon" style="background:${t.bad?'#fee2e2':'#dcfce7'}">${t.icon}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:14px;font-weight:600">${t.name}</span>
            <span style="font-size:10px;padding:1px 7px;border-radius:99px;background:${t.bad?'#fee2e2':'#dcfce7'};color:${t.bad?'#dc2626':'#16a34a'}">${t.cat}</span>
            <span style="font-size:10px;color:#999">剩余 ${t.remaining} 月</span>
          </div>
          <div style="font-size:12px;color:#666">${t.desc}</div>
        </div>
      </div>`).join('');
  }
  const hasBad=G.activeTrends&&G.activeTrends.some(t=>t.bad);
  tip.innerHTML=hasBad?'⚠️ 市场存在负面趋势，请注意防范影响！':'💡 当前市场趋势对公司有利，把握机会扩大收益！';
  tip.style.background=hasBad?'#fff1f2':'#fff8e1';
  tip.style.borderColor=hasBad?'#fca5a5':'#ffe082';
  tip.style.color=hasBad?'#dc2626':'#5d4037';
}

function sceneMarket(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

// ── 经纪人 ─────────────────────────────────────────────
function hasAgent(id){ return (G.agents||[]).includes(id); }
function agentData(id){ return AGENT_POOL.find(a=>a.id===id); }

function hireAgent(id){
  const ag=agentData(id);
  if(!ag) return;
  const hireCost=ag.salary*6;
  if(G.money<hireCost){toast('资金不足 '+hireCost+' 万（6个月预付）','error');return;}
  if(hasAgent(id)){toast('该经纪人已在职','error');return;}
  G.money-=hireCost;
  (G.agents=G.agents||[]).push(id);
  addLog('签约'+ag.name,'minus',hireCost);
  saveGame();renderAgents();updateStats();
  toast('🤝 '+ag.name+' 加入团队！','success');
}

function fireAgent(id){
  const ag=agentData(id);
  if(!ag||!hasAgent(id)) return;
  G.agents=(G.agents||[]).filter(x=>x!==id);
  saveGame();renderAgents();updateStats();
  toast(ag.name+' 已离职','success');
}

function renderAgents(){
  const grid=document.getElementById('agent-grid');
  const salaryInfo=document.getElementById('agent-salary-info');
  const tip=document.getElementById('agents-tip');
  const totalSalary=(G.agents||[]).reduce((s,id)=>{const ag=agentData(id);return s+(ag?ag.salary:0);},0);
  salaryInfo.textContent=totalSalary+' 万/月';
  salaryInfo.style.color=totalSalary>0?'#c62828':'#999';
  tip.textContent='招募专业经纪人提升各方面效率，每位经纪人每月收取薪资（首次需预付6个月）。当前在职：'+(G.agents||[]).length+'名';
  grid.innerHTML=AGENT_POOL.map(ag=>{
    const hired=hasAgent(ag.id);
    const hireCost=ag.salary*6;
    return `<div class="agent-card ${hired?'hired':''}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:40px;height:40px;border-radius:12px;background:${hired?'#dcfce7':'#f5f4f0'};display:flex;align-items:center;justify-content:center;font-size:20px">${ag.icon}</div>
        <div>
          <div style="font-size:13px;font-weight:600">${ag.name}</div>
          <div style="font-size:11px;color:#999">${ag.cat} · ${ag.salary}万/月</div>
        </div>
      </div>
      <div style="font-size:12px;color:#666;line-height:1.6;flex:1">${ag.desc}</div>
      ${hired
        ?`<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;color:#16a34a;font-weight:600">✅ 在职</span><button class="btn btn-sm" onclick="fireAgent('${ag.id}')">辞退</button></div>`
        :`<button class="btn btn-sm btn-primary" onclick="hireAgent('${ag.id}')">签约 ${hireCost}万</button>`
      }
    </div>`;
  }).join('');
}

function sceneAgents(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

// ── 竞争对手 ───────────────────────────────────────────
const RIVAL_TEMPLATES=[
  {name:'星辰娱乐',icon:'⭐',color:'#eff6ff'},
  {name:'极光传媒',icon:'🌊',color:'#f0fdf4'},
  {name:'幻影文化',icon:'🎭',color:'#fdf4ff'},
];

function initRivals(){
  if(G.rivals&&G.rivals.length) return;
  G.rivals=RIVAL_TEMPLATES.slice(0,2).map(r=>({
    ...r,
    fame:Math.max(20,Math.round(G.fame*0.8+15)),
    lastAction:'',
  }));
}

function doRivalAction(){
  if(!G.rivals||!G.rivals.length) return;
  G.rivals.forEach(r=>{
    r.fame=Math.round(r.fame*1.04+3);
    const roll=Math.random();
    if(roll<0.3&&G.artists.some(a=>(a.fans||0)>3)){
      const pool=G.artists.filter(a=>(a.fans||0)>3);
      const a=pool[Math.floor(Math.random()*pool.length)];
      const loss=Math.max(1,Math.round((a.fans||0)*0.07));
      a.fans=Math.max(0,(a.fans||0)-loss);
      r.lastAction='抢夺资源：'+displayName(a)+' 流失 '+loss+' 万粉丝';
    } else if(roll<0.5&&G.fame>20){
      const fLoss=Math.max(3,Math.round(G.fame*0.04));
      G.fame=Math.max(0,G.fame-fLoss);
      r.lastAction='散布负面消息，公司知名度 -'+fLoss;
    } else {
      r.lastAction='保持低调，专注内部发展';
    }
    if(r.lastAction) G.lastEvents.push({name:r.name+' 动态',desc:r.lastAction,icon:r.icon,type:'bad'});
  });
}

function doRivalCounter(i,action){
  const r=G.rivals[i];
  if(!r) return;
  if(action==='suppress'){
    if(G.money<50){toast('资金不足 50万','error');return;}
    G.money-=50;
    r.fame=Math.max(0,Math.round(r.fame*0.85));
    addLog('压制'+r.name,'minus',50);
    toast('💪 成功压制 '+r.name+'，对方知名度-15%','success');
  } else if(action==='collab'){
    if(G.money<30){toast('资金不足 30万','error');return;}
    G.money-=30;G.fame+=15;
    addLog('与'+r.name+'合作','minus',30);
    toast('🤝 与 '+r.name+' 达成合作，知名度+15','success');
  }
  saveGame();renderRivals();updateStats();
}

function renderRivals(){
  const el=document.getElementById('rivals-list');
  const tip=document.getElementById('rivals-tip');
  if(!G.rivals||!G.rivals.length){
    el.innerHTML='<div style="font-size:13px;color:#999;padding:20px 0;text-align:center">暂无竞争对手，推进游戏后自动出现</div>';
    return;
  }
  const maxThreat=G.rivals.some(r=>r.fame>G.fame);
  tip.innerHTML=maxThreat?'⚠️ 注意！有对手知名度已超越你，需要加快发展！':'💪 目前你的公司在竞争中占据优势，继续保持！';
  tip.style.background=maxThreat?'#fff1f2':'#fff8e1';
  tip.style.borderColor=maxThreat?'#fca5a5':'#ffe082';
  tip.style.color=maxThreat?'#dc2626':'#5d4037';
  el.innerHTML=G.rivals.map((r,i)=>`
    <div class="rival-card" style="border-color:${r.fame>G.fame?'#fca5a5':'#e8e5de'}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="width:42px;height:42px;border-radius:12px;background:${r.color};display:flex;align-items:center;justify-content:center;font-size:20px">${r.icon}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">${r.name}</div>
          <div style="font-size:12px;color:#666;margin-top:2px">知名度 <strong style="color:${r.fame>G.fame?'#dc2626':'#16a34a'}">${r.fame}</strong>（我方：${G.fame}）</div>
        </div>
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${r.fame>G.fame?'#fee2e2':'#dcfce7'};color:${r.fame>G.fame?'#dc2626':'#16a34a'};font-weight:600">${r.fame>G.fame?'⚠️ 威胁':'✅ 弱势'}</span>
      </div>
      ${r.lastAction?`<div style="font-size:12px;color:#666;background:#f5f4f0;padding:8px 10px;border-radius:8px;margin-bottom:10px">上次动态：${r.lastAction}</div>`:''}
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="doRivalCounter(${i},'suppress')">💰 压制 50万</button>
        <button class="btn btn-sm btn-success" onclick="doRivalCounter(${i},'collab')">🤝 合作 30万</button>
      </div>
    </div>`).join('');
}

function sceneRivals(){
  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#faf9f7 0%,#f5f4f0 100%)"></div>`;
}

// ── 合同管理 ───────────────────────────────────────────
function contractAttitude(a){
  const fans=a.fans||0,pr=a.pr||60;
  const remaining=(a.contractEnd||G.month+24)-G.month;
  const overdue=remaining<0?-remaining:0;
  if(fans>=500)
    return{label:'天王天后',icon:'👑',desc:'顶级流量，最多接受2年合约，溢价幅度极高',costMult:1.8,maxYears:2,bg:'#fef9c3',tc:'#92400e'};
  if(fans>=100||pr>=80)
    return{label:'傲娇强硬',icon:'😤',desc:'人气旺盛，拒绝签3年以上长约，要求溢价续签',costMult:1.35,maxYears:3,bg:'#fef3c7',tc:'#b45309'};
  if(overdue>0){
    const mult=Math.min(2.5,1+overdue*0.15);
    return{label:'心生去意',icon:'😔',desc:'合同已逾期'+overdue+'个月，续签费每月上涨15%，请尽快处理',costMult:mult,maxYears:5,bg:'#ffebee',tc:'#c62828'};
  }
  if(pr<=40||(a.energy??80)<=20&&a.status!=='休息中')
    return{label:'感激支持',icon:'🥺',desc:pr<=40?'正处于口碑危机，感谢公司不离不弃，接受优惠条款':'精力透支，感激公司照顾，愿意让步',costMult:0.8,maxYears:5,bg:'#f0fdf4',tc:'#16a34a'};
  return{label:'接受标准',icon:'😊',desc:'状态稳定，接受公司标准续签条款',costMult:1.0,maxYears:5,bg:'#f5f4f0',tc:'#555'};
}

function calcRenewCost(a,months,offerPct=100){
  const legalDisc=(G.buildings.legal?.lv||0)*0.1;
  const base=Math.round((30+(a.fans||0)*0.5)*(1-legalDisc));
  const durMult={12:0.7,24:1.0,36:1.25,48:1.5,60:1.75}[months]||1.0;
  const att=contractAttitude(a);
  const suggested=Math.round(base*durMult*att.costMult);
  const offerMult=Math.max(0.8,Math.min(2,offerPct/100));
  const cost=Math.max(1,Math.round(suggested*offerMult));
  const baseRisk=renewRejectRate(a);
  const offerBonus=Math.round((offerMult-1)*60);
  const risk=Math.max(0,Math.min(95,baseRisk-offerBonus));
  return{cost,suggested,base,durMult,attMult:att.costMult,offerPct:Math.round(offerMult*100),offerMult,baseRisk,risk,success:100-risk};
}

function renderContracts(){
  const el=document.getElementById('contract-list');
  if(!G.artists.length){el.innerHTML='<div style="color:#999;font-size:13px">暂无艺人</div>';return;}
  el.innerHTML=G.artists.map((a,i)=>{
    if(a.wantLeave){
      const daysLeft=(a.leaveDeadline||0)-G.month;
      return `<div class="contract-row" style="border:1.5px solid #fca5a5;background:#fff5f5;border-radius:10px">
        <div class="avatar" style="background:${a.color};color:${a.tc};flex-shrink:0">${a.abbr}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${displayName(a)}</div>
          <div style="font-size:11px;margin-top:2px;color:#dc2626">💔 拒绝续签，${daysLeft>0?daysLeft+'个月后':'即将'}离开公司</div>
          <div style="font-size:10px;margin-top:2px;color:#ef4444;opacity:.75">可花费1.5倍费用紧急挽留</div>
        </div>
        <button class="btn btn-sm" onclick="retainArtist(${i})" style="background:#dc2626;color:#fff;border-color:#dc2626;white-space:nowrap">💔 挽留</button>
      </div>`;
    }
    const remaining=(a.contractEnd||G.month+24)-G.month;
    const isExpired=remaining<=0;
    const isExpiring=remaining>0&&remaining<=6;
    const canRenew=remaining<=6;
    const att=contractAttitude(a);
    return `<div class="contract-row">
      <div class="avatar" style="background:${a.color};color:${a.tc};flex-shrink:0">${a.abbr}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600">${displayName(a)}</div>
        <div style="font-size:11px;margin-top:2px;color:${isExpired?'#dc2626':isExpiring?'#e65100':'#2e7d32'}">
          ${isExpired?'⚠️ 合同已到期！':isExpiring?'⏰ 剩余 '+remaining+' 个月':'✅ 剩余 '+remaining+' 个月'}
        </div>
        ${canRenew?`<div style="font-size:10px;margin-top:3px;display:inline-block;background:${att.bg};color:${att.tc};padding:1px 7px;border-radius:99px;font-weight:600">${att.icon} ${att.label}</div>`:''}
      </div>
      <button class="btn btn-sm ${canRenew?'btn-primary':''}" onclick="${canRenew?'openRenewModal('+i+')':''}" ${canRenew?'':'disabled'}>
        ${canRenew?'进入谈判':'未到期'}
      </button>
    </div>`;
  }).join('');
}

let renewIdx=-1,renewMonths=24,renewOfferPct=100;

function openRenewModal(i){
  renewIdx=i;renewMonths=24;renewOfferPct=100;
  renderRenewModal();
  document.getElementById('modal-renew-contract').classList.add('open');
}

function renderRenewModal(){
  const a=G.artists[renewIdx];
  const remaining=(a.contractEnd||G.month+24)-G.month;
  const att=contractAttitude(a);
  const {cost,suggested,base,durMult,attMult,offerPct,success,risk}=calcRenewCost(a,renewMonths,renewOfferPct);
  const affordable=G.money>=cost;
  const durations=[{m:12,label:'1年',suffix:'-30%'},{m:24,label:'2年',suffix:'标准'},{m:36,label:'3年',suffix:'+25%'},{m:48,label:'4年',suffix:'+50%'},{m:60,label:'5年',suffix:'+75%'}];
  const riskDesc=risk>=50?'高风险：艺人很可能拒绝续签并提出解约':risk>=30?'中等风险：艺人有顾虑，建议改善条件再谈':risk>0?'低风险：轻微顾虑，谈判有望成功':'';
  const riskHtml=risk>0?'<div style="background:#fff0f0;border-radius:10px;padding:10px 14px;margin-bottom:16px;border-left:3px solid #f87171"><div style="font-size:12px;font-weight:700;color:#dc2626">⚠️ 拒绝风险：'+risk+'%</div><div style="font-size:10px;color:#ef4444;margin-top:3px;opacity:.85">'+riskDesc+'</div></div>':'';
  document.getElementById('renew-contract-content').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div class="modal-title" style="margin:0">续签谈判</div>
      <button class="btn btn-sm" onclick="closeRenewModal()">✕</button>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="avatar" style="background:${a.color};color:${a.tc};width:44px;height:44px;font-size:16px;flex-shrink:0">${a.abbr}</div>
      <div>
        <div style="font-size:15px;font-weight:700">${displayName(a)}</div>
        <div style="font-size:11px;color:${remaining<=0?'#dc2626':remaining<=6?'#e65100':'#999'};margin-top:2px">
          ${remaining<=0?'合同已到期 '+(-remaining)+'个月':'合同剩余 '+remaining+' 个月'}
        </div>
      </div>
    </div>
    <div style="background:${att.bg};border-radius:10px;padding:12px 14px;margin-bottom:12px;border-left:3px solid ${att.tc}">
      <div style="font-size:13px;font-weight:700;color:${att.tc}">${att.icon} 艺人态度：${att.label}</div>
      <div style="font-size:11px;color:${att.tc};opacity:.85;margin-top:4px;line-height:1.6">${att.desc}</div>
    </div>
    ${riskHtml}
    <div style="font-size:11px;font-weight:700;color:#aaa;letter-spacing:.5px;margin-bottom:8px">选择续签时长</div>
    <div style="display:flex;gap:5px;margin-bottom:16px">
      ${durations.map(({m,label,suffix})=>{
        const allowed=m/12<=att.maxYears;
        const sel=renewMonths===m;
        return `<button class="btn btn-sm ${sel?'btn-primary':''}" onclick="${allowed?'selectRenewDuration('+m+')':''}" ${allowed?'':'disabled'} title="${allowed?'':att.label+'：拒绝此合约时长'}" style="flex:1;flex-direction:column;gap:1px;padding:6px 2px${!allowed?';opacity:.3':''}">
          <span style="font-size:12px;font-weight:600">${label}</span>
          <span style="font-size:9px;${suffix==='标准'?'opacity:.6':suffix[0]==='-'?'color:#16a34a':'color:#e65100'}">${suffix}</span>
        </button>`;
      }).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:#aaa;letter-spacing:.5px;margin-bottom:8px">选择报价</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px">
      ${[90,100,120,140,160,180].map(p=>`
        <button class="btn btn-sm ${renewOfferPct===p?'btn-primary':''}" onclick="selectRenewOffer(${p})" style="padding:6px 2px;flex-direction:column;gap:1px">
          <span style="font-size:12px;font-weight:600">${p}%</span>
          <span style="font-size:9px;${p<100?'color:#16a34a':p===100?'opacity:.6':'color:#e65100'}">${p<100?'省钱':p===100?'标准':p<140?'加价':p<160?'诚意':'重金'}</span>
        </button>`).join('')}
    </div>
    <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:11px;color:#bbb;margin-bottom:4px">预计续签费用</div>
      <div style="font-size:22px;font-weight:800;color:${affordable?'#1a1a1a':'#dc2626'}">${cost} 万</div>
      <div style="font-size:10px;color:#ccc;margin-top:3px">标准${suggested}万 · 基础${base}万 × ${durMult}（时长）× ${attMult.toFixed(2)}（态度）</div>
      <div style="font-size:10px;color:#999;margin-top:4px">当前报价 ${offerPct}% · 成功率 ${success}%</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="closeRenewModal()" style="flex:1;justify-content:center">取消</button>
      <button class="btn ${affordable?'btn-primary':''}" onclick="${affordable?'confirmRenew()':''}" ${affordable?'':'disabled'} style="flex:2;justify-content:center">
        ${affordable?'💼 确认续签 · '+cost+'万':'资金不足 · '+cost+'万'}
      </button>
    </div>`;
}

function selectRenewDuration(m){renewMonths=m;renderRenewModal();}
function selectRenewOffer(p){renewOfferPct=p;renderRenewModal();}

function confirmRenew(){
  const a=G.artists[renewIdx];
  const{cost,risk}=calcRenewCost(a,renewMonths,renewOfferPct);
  if(G.money<cost){toast('资金不足 '+cost+' 万','error');return;}
  if(risk>0&&Math.floor(Math.random()*100)<risk){
    closeRenewModal();
    a.wantLeave=true;
    a.leaveDeadline=G.month+2;
    saveGame();renderContracts();updateSidebar();
    pushFeed('💔',displayName(a)+' 拒绝续签！将在2个月内离开','bad');
    toast('💔 '+displayName(a)+' 拒绝了续签！将在2个月后离开，可花费1.5倍费用紧急挽留','error');
    return;
  }
  G.money-=cost;
  a.contractEnd=Math.max(G.month,(a.contractEnd||G.month))+renewMonths;
  a.wantLeave=false;
  a.leaveDeadline=0;
  addLog(displayName(a)+' 合同续签 '+(renewMonths/12)+'年','minus',cost);
  saveGame();renderContracts();updateStats();updateSidebar();
  pushFeed('📋','续签 '+displayName(a)+' '+(renewMonths/12)+'年，花费'+cost+'万','good');
  closeRenewModal();
  toast('✅ '+displayName(a)+' 续签成功，再续'+(renewMonths/12)+'年！','success');
}

function closeRenewModal(){
  document.getElementById('modal-renew-contract').classList.remove('open');
  renewIdx=-1;
}

function retainArtist(i){
  const a=G.artists[i];
  if(!a||!a.wantLeave) return;
  const{cost}=calcRenewCost(a,24,100);
  const retainCost=Math.round(cost*1.5);
  if(G.money<retainCost){toast('资金不足 '+retainCost+' 万（挽留费用）','error');return;}
  if(!confirm('花费 '+retainCost+' 万 挽留 '+displayName(a)+'？\n（费用为正常续签的1.5倍，必定成功，续签24个月）')) return;
  G.money-=retainCost;
  a.contractEnd=G.month+24;
  a.wantLeave=false;
  a.leaveDeadline=0;
  addLog('紧急挽留 '+displayName(a),'minus',retainCost);
  saveGame();renderContracts();updateStats();updateSidebar();
  pushFeed('🤝','成功挽留 '+displayName(a)+'，续签24个月','good');
  toast('🤝 成功挽留 '+displayName(a)+'！','success');
}

// ── 粉丝运营 ───────────────────────────────────────────
function renderFanOps(){
  const el=document.getElementById('fanops-list');
  const tip=document.getElementById('fanops-tip');
  if(!G.artists.length){el.innerHTML='<div style="color:#999;font-size:13px">暂无艺人</div>';return;}
  const bonus=hasTrend('social_viral');
  tip.innerHTML=bonus?'📣 社交媒体热潮中！所有粉丝运营效果 ×1.5，这个月大力推广吧！':'💝 粉丝运营每月每位艺人限操作一次，提升粉丝量与好感度';
  el.innerHTML=G.artists.map((a,i)=>{
    const used=a.lastFanOp>=G.month;
    const ok=a.status==='已出道'||a.status==='工作中';
    return `<div class="artist-row" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div class="avatar" style="background:${a.color};color:${a.tc};flex-shrink:0">${a.abbr}</div>
      <div style="flex:1;min-width:110px">
        <div style="font-size:13px;font-weight:600;margin-bottom:3px">${displayName(a)} <span class="status-badge ${statusCls(a.status)}">${a.status}</span></div>
        <div style="font-size:11px;color:#999">${a.fans||0}万粉丝 · 口碑${a.pr||60}</div>
        ${used?'<div style="font-size:11px;color:#999;margin-top:2px">✅ 本月已操作</div>':''}
        ${!ok?'<div style="font-size:11px;color:#e65100;margin-top:2px">需出道后才可操作</div>':''}
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="btn btn-sm" onclick="doFanAction(${i},'social')" ${used||!ok?'disabled':''}>📱 社媒推广 免费</button>
        <button class="btn btn-sm" onclick="doFanAction(${i},'fanclub')" ${used||!ok?'disabled':''}>🎪 粉丝应援 10万</button>
        <button class="btn btn-sm btn-primary" onclick="doFanAction(${i},'offline')" ${used||!ok?'disabled':''}>🎤 线下见面 30万</button>
      </div>
    </div>`;
  }).join('');
}

function doFanAction(i,action){
  const a=G.artists[i];
  if(a.lastFanOp>=G.month){toast('本月已操作过了','error');return;}
  if(a.status!=='已出道'&&a.status!=='工作中'){toast('只有出道艺人才能进行粉丝运营','error');return;}
  const mult=hasTrend('social_viral')?1.5:1;
  let fanGain=0,prGain=0;
  if(action==='social'){
    fanGain=Math.round((3+Math.random()*5)*mult);
    prGain=3;
  } else if(action==='fanclub'){
    if(G.money<10){toast('资金不足 10万','error');return;}
    G.money-=10; addLog(displayName(a)+' 粉丝应援','minus',10);
    fanGain=Math.round((8+Math.random()*10)*mult);
    prGain=8;
  } else if(action==='offline'){
    if(G.money<30){toast('资金不足 30万','error');return;}
    G.money-=30; addLog(displayName(a)+' 线下见面会','minus',30);
    fanGain=Math.round((20+Math.random()*20+(a.fans||0)*0.05)*mult);
    prGain=15;
  }
  a.fans=Math.round((a.fans||0)+fanGain);
  a.pr=Math.min(100,(a.pr||60)+prGain);
  a.lastFanOp=G.month;
  saveGame();renderFanOps();renderArtistList();updateStats();
  toast('💝 '+displayName(a)+' 粉丝 +'+fanGain+'万，口碑 +'+prGain,'success');
}

function init(){
  const hasSave=loadGame();
  if(!G.usedEvents) G.usedEvents=[];
  if(!G.usedEventArtists||Array.isArray(G.usedEventArtists)) G.usedEventArtists={};
  if(!G.lastEvents) G.lastEvents=[];
  if(!G.feed) G.feed=[];
  if(!G.achievements) G.achievements=[];
  if(!G.completedEventNames) G.completedEventNames=[];
  G.artists.forEach(a=>{if(a._hadCrisis===undefined) a._hadCrisis=false;});
  if(!G.monthlyHistory) G.monthlyHistory=[];
  if(!G.lastMonthlyReport) G.lastMonthlyReport=null;
  if(!G.lastTrainingResults) G.lastTrainingResults=[];
  if(!G.releases) G.releases=[];
  if(G.streamingDeal===undefined) G.streamingDeal=false;
  if(!G.activeTrends) G.activeTrends=[];
  if(!G.agents) G.agents=[];
  if(!G.rivals) G.rivals=[];
  if(!G.pendingEvents) G.pendingEvents=[];
  if(!G.pendingReleases) G.pendingReleases=[];
  if(!G.buildingActions) G.buildingActions={};
  if(!G.unlockedTabs) G.unlockedTabs=[];
  if(!G.starterGoals) G.starterGoals=[];
  if(!G.companyStages) G.companyStages=[];
  if(!G.routeGoals) G.routeGoals=[];
  if(!G.longGoals) G.longGoals=[];
  if(!G.scoutedPool) G.scoutedPool=[];
  pruneScoutedPool();
  G.artists.forEach(a=>{
    assignTrait(a);
    if(!a.personalGoals) a.personalGoals=[];
    normalizeArtistFinance(a);
    if(a.pr===undefined) a.pr=60;
    if(!a.contractEnd) a.contractEnd=G.month+24;
    if(!a.lastFanOp) a.lastFanOp=0;
    if(a.releaseBusyUntil&&a.releaseBusyUntil<=G.month) delete a.releaseBusyUntil;
  });
  if(!G.rivals.length) initRivals();
  checkStarterGoals();
  checkCompanyStages();
  checkRouteGoals();
  checkLongGoals();
  renderBuildings();renderBusiness();renderEvents();updateOverview();updateStats();updateSidebar();
  if(G.artists.length) renderArtistList();
  renderScene('overview');
  startDayTick();
  if(hasSave){checkAchievements();toast('读取存档成功，继续上次游戏','success');}
  else checkAchievements();
  renderFeed();
  _initDone=true;
}

function showSection(id){
  const lockEntry=TAB_UNLOCK.find(t=>t.id===id);
  if(lockEntry&&!lockEntry.check()){toast('🔒 尚未解锁 · '+lockEntry.hint,'error');return;}
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('section-'+id).classList.add('active');
  document.getElementById('nav-'+id).classList.add('active');
  renderScene(id);
  if(id==='finance') renderFinance();
  if(id==='content') renderContent();
  if(id==='business') renderBusiness();
  if(id==='achievements') renderAchievements();
  if(id==='market') renderMarket();
  if(id==='agents') renderAgents();
  if(id==='rivals') renderRivals();
}

function goTo(id,tab){
  showSection(id);
  if(id==='artists'&&tab){
    const btn=[...document.querySelectorAll('.tab')].find(b=>b.getAttribute('onclick')?.includes("'"+tab+"'"));
    if(btn) switchTab(tab,btn);
  }
}

function switchTab(tab,el){
  artistTabCur=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-roster').style.display=tab==='roster'?'':'none';
  document.getElementById('tab-train').style.display=tab==='train'?'':'none';
  document.getElementById('tab-pr').style.display=tab==='pr'?'':'none';
  document.getElementById('tab-contracts').style.display=tab==='contracts'?'':'none';
  document.getElementById('tab-fanops').style.display=tab==='fanops'?'':'none';
  if(tab==='train') renderTrainList();
  if(tab==='pr') renderPrTab();
  if(tab==='contracts') renderContracts();
  if(tab==='fanops') renderFanOps();
}

function renderArtistList(){
  const el=document.getElementById('artist-list');
  if(!G.artists.length){el.innerHTML='<div style="color:#999;font-size:13px;padding:8px 0">暂无艺人，点击「招募练习生」开始！</div>';return;}
  el.innerHTML=G.artists.map((a,i)=>{
    const archetype=artistArchetype(a);
    const dream=artistDreamGoal(a);
    const dreamDone=artistDreamDone(a);
    return `
    <div class="artist-row">
      <div class="avatar" style="background:${a.color};color:${a.tc}">${a.abbr}</div>
      <div class="artist-info">
        <div class="artist-name" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span>${displayName(a)}</span>
          ${a.alias?`<span style="font-size:10px;color:#bbb;font-weight:400">${a.name}</span>`:''}
          <button class="alias-edit-btn" onclick="openAliasEdit(${i})">✏️</button>
        </div>
        <div class="artist-tags">
          ${a.singing>60?'<span class="tag singing">唱</span>':''}
          ${a.dance>60?'<span class="tag dance">舞</span>':''}
          ${a.acting>60?'<span class="tag acting">演</span>':''}
          ${a.rap>60?'<span class="tag rap">说唱</span>':''}
          ${(a.status!=='休息中'&&(a.energy??80)<=30)?'<span class="tag" style="background:#fee2e2;color:#c62828">需休息</span>':''}
          <span class="status-badge ${statusCls(a.status)}">${a.status}</span>
          <span class="tag" title="${archetype.desc}" style="background:${archetype.bg};color:${archetype.color}">${archetype.icon} ${archetype.name}</span>
          ${traitInfo(a)?`<span class="tag" title="${traitInfo(a).desc}" style="background:${traitInfo(a).bg};color:${traitInfo(a).color}">特质：${traitInfo(a).name}</span>`:''}
          ${a.direction?`<span class="direction-badge dir-${dirClass(a.direction)}">${dirIcon(a.direction)} ${a.direction}</span>`:''}
          ${a.status==='已出道'?`<button class="btn btn-sm" style="font-size:10px;padding:2px 7px;height:auto;line-height:1.6" onclick="openDirectionSelect(${i})">${a.direction?'换方向':'选方向'}</button>`:''}
          <span class="tag" style="background:${prBg(a.pr||60)};color:${prColor(a.pr||60)}">口碑 ${a.pr||60}</span>
          <span class="tag" title="${dream.desc} · ${dream.reward}" style="background:${dreamDone?'#f0fdf4':'#fffbeb'};color:${dreamDone?'#166534':'#92400e'}">${dreamDone?'梦想达成':'梦想：'+dream.title}</span>
          <span class="tag" style="background:#eef2ff;color:#3730a3">公司分成 ${getCompanyShare(a)}%</span>
        </div>
      </div>
      <div style="flex:1;max-width:130px">
        <div class="bar-wrap"><span style="font-size:10px;color:#999;width:14px">唱</span><div class="bar-bg"><div class="bar-fill bar-blue" style="width:${a.singing}%"></div></div><span class="bar-val">${a.singing}</span></div>
        <div class="bar-wrap" style="margin-top:3px"><span style="font-size:10px;color:#999;width:14px">舞</span><div class="bar-bg"><div class="bar-fill bar-amber" style="width:${a.dance}%"></div></div><span class="bar-val">${a.dance}</span></div>
        <div class="bar-wrap" style="margin-top:3px"><span style="font-size:10px;color:#999;width:14px">演</span><div class="bar-bg"><div class="bar-fill bar-green" style="width:${a.acting}%"></div></div><span class="bar-val">${a.acting}</span></div>
        <div class="bar-wrap" style="margin-top:3px"><span style="font-size:10px;color:#999;width:14px">说</span><div class="bar-bg"><div class="bar-fill bar-pink" style="width:${a.rap}%"></div></div><span class="bar-val">${a.rap}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex-shrink:0">
        <div style="font-size:11px;color:#999;white-space:nowrap">${a.fans||0}万粉</div>
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="openSignedArtistProfile(${i})">资料</button>
      </div>
    </div>
  `;}).join('');
}

function renderTrainList(){
  const el=document.getElementById('train-list');
  if(!G.artists.length){el.innerHTML='<div style="color:#999;font-size:13px">暂无艺人</div>';return;}
  const eff=(1+(G.buildings.practice.lv*0.2))*(hasTrend('training_boost')?1.4:1)*(hasAgent('trainer')?1.4:1);
  el.innerHTML=G.artists.map((a,i)=>{
    const energy=a.energy===undefined?80:a.energy;
    const eColor=energy>60?'#16a34a':energy>20?'#d97706':'#dc2626';
    const eLabel=energy>60?'充沛':energy>20?'疲惫':'耗尽';
    const pr=a.pr||60;
    const prMult=pr>=80?1.3:pr>=60?1.0:pr>=40?0.7:0.3;
    const mvBonus=G.buildings.mv.lv>0?1.3:1;
    const workGrossEst=Math.round(((a.singing+a.dance)/12+4)*mvBonus*prMult*traitWorkMult(a));
    const workEst=companyIncomeFromGross(workGrossEst,a);
    const trainMax=Math.round(3*eff*traitTrainMult(a));
    const healthBonus=(G.buildings.health?.lv||0)*3;
    const singingGap=Math.max(0,76-a.singing);
    const danceGap=Math.max(0,66-a.dance);
    const monthsToDebut=Math.max(singingGap,danceGap)?Math.max(1,Math.ceil(Math.max(singingGap,danceGap)/Math.max(1,trainMax/2))):0;
    const debutTip=a.status==='训练中'&&monthsToDebut>0
      ? `距离出道：唱功 +${singingGap}，舞蹈 +${danceGap} · 预计约 ${monthsToDebut} 个月`
      : a.status==='训练中'?'已接近出道标准，继续训练即可':''; 
    const preview={
      '训练中':`唱/舞 +0~${trainMax} · 演 +0~${Math.round(trainMax*0.7)} · 精力 -${staminaDrain(a,true)}${energy>=80?' ✨高精力+10%':energy<=20?' ⚠️效率-40%':''}`,
      '工作中':`预计公司收入 +${workEst}~${companyIncomeFromGross(workGrossEst+8,a)}万 · 分成${getCompanyShare(a)}% · 精力 -${staminaDrain(a)}${a.restedLastMonth?' · 休整加成+15%':''}${energy>=80?' ✨高精力+10%':energy<=20?' ⚠️效率-40%':''}`,
      '休息中':`精力 +${staminaRecovery(a)}`,
      '已出道':`预计公司收入 +${workEst}~${companyIncomeFromGross(workGrossEst+8,a)}万 · 分成${getCompanyShare(a)}% · 精力 -${staminaDrain(a)}${a.restedLastMonth?' · 休整加成+15%':''}${energy>=80?' ✨高精力+10%':energy<=20?' ⚠️效率-40%':''}`,
    }[a.status]||'';
    const archetype=artistArchetype(a);
    const dream=artistDreamGoal(a);
    const dreamDone=artistDreamDone(a);
    return `<div class="artist-row" style="flex-wrap:wrap;gap:8px;align-items:flex-start">
      <div class="avatar" style="background:${a.color};color:${a.tc};flex-shrink:0">${a.abbr}</div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:13px;font-weight:600;display:flex;gap:5px;align-items:center;flex-wrap:wrap">${displayName(a)} <span class="tag" title="${archetype.desc}" style="background:${archetype.bg};color:${archetype.color}">${archetype.icon} ${archetype.name}</span> ${traitInfo(a)?`<span class="tag" title="${traitInfo(a).desc}" style="background:${traitInfo(a).bg};color:${traitInfo(a).color}">${traitInfo(a).name}</span>`:''}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <span style="font-size:10px;color:#999;flex-shrink:0">⚡ 精力</span>
          <div style="flex:1;height:6px;background:#f0ede6;border-radius:99px;overflow:hidden;max-width:90px">
            <div style="height:100%;border-radius:99px;background:${eColor};width:${energy}%;transition:width .4s"></div>
          </div>
          <span style="font-size:10px;font-weight:700;color:${eColor}">${energy} · ${eLabel}</span>
        </div>
        ${preview?`<div style="font-size:10px;color:#555;margin-top:4px;background:#f5f4f0;padding:3px 7px;border-radius:5px">📊 ${preview}</div>`:''}
        ${debutTip?`<div style="font-size:10px;color:#1d4ed8;margin-top:4px;background:#eff6ff;border:1px solid #bfdbfe;padding:3px 7px;border-radius:5px">🎯 ${debutTip}</div>`:''}
        <div style="font-size:10px;color:${dreamDone?'#166534':'#92400e'};margin-top:4px;background:${dreamDone?'#f0fdf4':'#fffbeb'};border:1px solid ${dreamDone?'#bbf7d0':'#fde68a'};padding:3px 7px;border-radius:5px">${dreamDone?'✨ 梦想已达成':'✨ 梦想：'+dream.title+' · '+dream.desc}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end">
        <div style="display:flex;gap:5px">
          <button class="btn btn-sm" onclick="setStatus(${i},'训练中')" ${a.status==='训练中'?'disabled':''}>训练</button>
          <button class="btn btn-sm btn-success" onclick="setStatus(${i},'工作中')" ${a.status==='工作中'||a.status==='已出道'?'disabled':''}>接工作</button>
          <button class="btn btn-sm" onclick="setStatus(${i},'休息中')" ${a.status==='休息中'?'disabled':''}>休息</button>
        </div>
        <div style="font-size:10px;color:#aaa;text-align:right;line-height:1.4">「接工作」为每月自动结算的日常收入<br>与活动赛事的大型项目互不冲突，可叠加</div>
      </div>
    </div>`;
  }).join('');
}

function renderPrTab(){
  const el=document.getElementById('pr-list');
  if(!G.artists.length){el.innerHTML='<div style="color:#999;font-size:13px">暂无艺人</div>';return;}
  el.innerHTML=G.artists.map((a,i)=>{
    const pr=a.pr||60;
    const canFanmeet=G.artists.some(x=>x.status==='工作中'||x.status==='已出道');
    return `<div class="artist-row" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div class="avatar" style="background:${a.color};color:${a.tc};flex-shrink:0">${a.abbr}</div>
      <div style="flex:1;min-width:120px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">${displayName(a)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <div style="flex:1;height:7px;background:#f0ede6;border-radius:99px;overflow:hidden;max-width:120px">
            <div style="height:100%;border-radius:99px;background:${prColor(pr)};width:${pr}%;transition:width .4s"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${prColor(pr)}">${pr}</span>
        </div>
        <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${prBg(pr)};color:${prColor(pr)};font-weight:600">${prLabel(pr)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="btn btn-sm" onclick="doPrAction(${i},'clarify')" ${pr>=60?'disabled':''} title="口碑低于60时有效">澄清声明 <strong>5万</strong></button>
        <button class="btn btn-sm btn-primary" onclick="doPrAction(${i},'news')">策划正面新闻 <strong>20万</strong></button>
        <button class="btn btn-sm btn-success" onclick="doPrAction(${i},'fanmeet')" ${!canFanmeet?'disabled':''} title="${canFanmeet?'':'需先有出道艺人'}">粉丝见面会 <strong>30万</strong></button>
      </div>
    </div>`;
  }).join('');
}

function doPrAction(i,action){
  const a=G.artists[i];
  const pr=a.pr||60;
  if(action==='clarify'){
    if(pr>=60){toast('当前口碑正常，无需澄清','error');return;}
    if(G.money<5){toast('资金不足 5万','error');return;}
    G.money-=5; a.pr=Math.min(100,pr+15);
    addLog('为'+displayName(a)+'发表澄清声明','minus',5);
    toast(displayName(a)+' 口碑 +15，现为 '+a.pr,'success');
  } else if(action==='news'){
    if(G.money<20){toast('资金不足 20万','error');return;}
    G.money-=20;
    addLog('为'+displayName(a)+'策划正面新闻','minus',20);
    if(Math.random()<0.3){
      a.pr=Math.max(0,pr-10);
      toast('操作被识破！'+displayName(a)+' 口碑 -10，现为 '+a.pr,'error');
    } else {
      a.pr=Math.min(100,pr+30);
      toast(displayName(a)+' 正面新闻奏效，口碑 +30，现为 '+a.pr,'success');
    }
  } else if(action==='fanmeet'){
    if(!G.artists.some(x=>x.status==='工作中'||x.status==='已出道')){toast('需要至少一名出道艺人','error');return;}
    if(G.money<30){toast('资金不足 30万','error');return;}
    G.money-=30;
    a.pr=Math.min(100,pr+25);
    a.fans=Math.round((a.fans||0)*1.15+5);
    addLog('为'+displayName(a)+'举办粉丝见面会','minus',30);
    toast(displayName(a)+' 见面会圆满！口碑 +25，粉丝 +15%','success');
    renderArtistList();
  }
  saveGame(); renderPrTab(); updateStats();
}

function statusCls(s){return s==='训练中'?'status-training':s==='已出道'?'status-debut':s==='工作中'?'status-working':'status-idle';}

function setStatus(i,s){
  G.artists[i].status=s;
  renderArtistList();renderTrainList();updateSidebar();saveGame();
  toast(displayName(G.artists[i])+' 状态已更新为「'+s+'」','success');
}

function getBuildingContrib(k,b){
  if(b.lv===0) return null;
  if(k==='live')     return `每月稳定收入 +${b.lv*LIVE_INCOME_PER_LEVEL}万`;
  if(k==='practice') return `训练效率 +${b.lv*20}%（当前${Math.round(b.lv*20)}%加成）`;
  if(k==='studio'){
    const can=['数字单曲'];
    if(b.lv>=2) can.push('MV','纪录片');
    if(b.lv>=3) can.push('实体专辑');
    return '可发行：'+can.join(' / ');
  }
  if(k==='mv')       return `演出 & 内容发行收益 ×1.3`;
  if(k==='office')   return `签约上限 ${2+b.lv*2}人（当前${G.artists.length}人）`;
  if(k==='merch'){
    const tf=G.artists.reduce((s,a)=>s+(a.fans||0),0);
    return `粉丝月收益 +${Math.round(tf/100*b.lv*2)}万（当前${tf}万粉丝）`;
  }
  if(k==='media')  return `负面事件概率 -${b.lv*8}%，口碑效果增强`;
  if(k==='health') return `防意外停工 · 休息艺人每月口碑恢复+3`;
  if(k==='lounge') return `休息艺人精力恢复 +${b.lv*5}/月，主动茶歇可抢救低精力`;
  if(k==='legal')     return `合同续签费 -${b.lv*10}% · 发声明口碑 +${15+b.lv*5}`;
  if(k==='rehearsal') return `出道艺人演出月收益 +${b.lv*10}%`;
  if(k==='wardrobe')  return `出道艺人粉丝增速 +${b.lv*10}%`;
  if(k==='makeup')    return `全员每月口碑 +${b.lv}`;
  return null;
}

function getBuildingRole(k){
  return {
    live:'直播内容制作：提供稳定现金流',
    practice:'练习生成长：提升唱歌、舞蹈、演技属性',
    studio:'音乐制作：解锁单曲、专辑等发行内容',
    mv:'影像内容制作：强化 MV 与上线内容收益',
    office:'经纪事务：提升签约容量与商务拓展',
    merch:'商品企划：把粉丝规模转化为商品收入',
    media:'宣传公关：降低负面事件并修复口碑',
    health:'艺人护理：处理疲劳与停工风险',
    lounge:'日常休整：补充精力，辅助休息恢复',
    legal:'合同法务：降低续签成本，处理声明',
    rehearsal:'舞台联排：出道艺人演出前排练增收',
    wardrobe:'服装造型：提升粉丝增长与形象表现',
    makeup:'妆发造型：提升艺人口碑和镜头状态',
  }[k]||'公司运营支持设施';
}

const BUILDING_ROUTES=[
  {
    id:'cash',
    name:'现金流路线',
    icon:'💰',
    desc:'优先解决每月收入，适合稳健扩张。',
    keys:['live','merch','office'],
    color:'#166534',
    bg:'#f0fdf4',
    border:'#bbf7d0',
  },
  {
    id:'talent',
    name:'艺人养成路线',
    icon:'🎤',
    desc:'强化训练、状态恢复和舞台表现，适合培养核心艺人。',
    keys:['practice','lounge','health','rehearsal'],
    color:'#92400e',
    bg:'#fffbeb',
    border:'#fde68a',
  },
  {
    id:'content',
    name:'内容制作路线',
    icon:'🎬',
    desc:'提升作品发行、形象包装和传播效率，适合走作品爆发。',
    keys:['studio','mv','wardrobe','makeup','media'],
    color:'#1d4ed8',
    bg:'#eff6ff',
    border:'#bfdbfe',
  },
  {
    id:'management',
    name:'公司管理',
    icon:'🏢',
    desc:'支撑签约容量、合同风险和长期经营。',
    keys:['office','legal','media'],
    color:'#475569',
    bg:'#f8fafc',
    border:'#e2e8f0',
  },
];

function buildingRoutesFor(k){
  return BUILDING_ROUTES.filter(r=>r.keys.includes(k));
}

function primaryBuildingRoute(k){
  return buildingRoutesFor(k)[0]||BUILDING_ROUTES[3];
}

function routeBuiltCount(route){
  return route.keys.filter(k=>G.buildings[k]?.lv>0).length;
}

function routeLevel(id){
  const route=BUILDING_ROUTES.find(r=>r.id===id);
  if(!route) return 0;
  const count=routeBuiltCount(route);
  return count>=route.keys.length?2:count>=3?1:0;
}

function routeBonusText(route){
  const lv=routeLevel(route.id);
  if(!lv) return '建成 3 个设施后激活路线加成';
  if(route.id==='cash') return lv>=2?'稳定现金流 +10%':'稳定现金流 +5%';
  if(route.id==='talent') return lv>=2?'训练效率 +10%，休息恢复 +5':'训练效率 +5%，休息恢复 +3';
  if(route.id==='content') return lv>=2?'作品发行收益 +10%':'作品发行收益 +5%';
  return '管理效率提升';
}

function routeGoalText(route){
  const goal=routeGoalFor(route.id);
  if(!goal) return '';
  if(routeGoalDone(goal.id)) return '路线任务已完成：'+goal.title;
  return '路线任务：'+goal.title+' · '+goal.reward;
}

function cashRouteIncomeMult(){
  return 1+routeLevel('cash')*0.05;
}

function talentRouteTrainMult(){
  return 1+routeLevel('talent')*0.05;
}

function talentRouteRestBonus(){
  return routeLevel('talent')*3+(routeLevel('talent')>=2?2:0);
}

function contentRouteIncomeMult(){
  return 1+routeLevel('content')*0.05;
}

function routeNextStep(route){
  const unbuilt=route.keys.find(k=>G.buildings[k]&&G.buildings[k].lv===0);
  if(unbuilt) return '建议补齐：'+G.buildings[unbuilt].name;
  const upgradable=route.keys.find(k=>G.buildings[k]&&G.buildings[k].lv<G.buildings[k].maxLv&&!(G.pendingBuilds||[]).some(p=>p.k===k));
  if(upgradable) return '可继续升级：'+G.buildings[upgradable].name;
  return '路线设施已基本成型';
}

function renderBuildingRoutes(){
  const el=document.getElementById('building-route-panel');
  if(!el) return;
  el.innerHTML=`<div class="route-panel">
    ${BUILDING_ROUTES.slice(0,3).map(route=>{
      const done=routeBuiltCount(route);
      const pct=Math.round(done/route.keys.length*100);
      return `<div class="route-card" style="background:${route.bg};border-color:${route.border}">
        <div class="route-card-head">
          <span>${route.icon} ${route.name}</span>
          <strong style="color:${route.color}">${done}/${route.keys.length}</strong>
        </div>
        <div class="route-desc">${route.desc}</div>
        <div class="route-meter"><div style="width:${pct}%;background:${route.color}"></div></div>
        <div class="route-bonus" style="color:${route.color}">${routeBonusText(route)}</div>
        <div class="route-goal" style="border-color:${route.border};color:${route.color}">${routeGoalText(route)}</div>
        <div class="route-next">${routeNextStep(route)}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function getBuildingActionCfg(k){
  return {
    live:     {label:'直播专题', cost:20,  desc:'额外获得本级双倍直播收入'},
    practice: {label:'集中培训', cost:15,  desc:'所有训练中艺人全属性 +5'},
    studio:   {label:'加急录制', cost:30,  desc:'最早的制作中内容立即完成'},
    mv:       {label:'精制特效', cost:35,  desc:'当前所有上线内容额外结算一次收益'},
    office:   {label:'商务拓展', cost:0,   desc:'随机获得商务合作收益'},
    merch:    {label:'商品企划', cost:30,  desc:'出道艺人粉丝×1.12，带动商品收益'},
    media:    {label:'公关排期', cost:25,  desc:'全员口碑+12，移除最差负面趋势'},
    health:    {label:'状态评估', cost:20,  desc:'粉丝最多的休息艺人立即恢复工作'},
    lounge:    {label:'下午茶补给', cost:12,  desc:'低精力艺人精力+20并口碑+5'},
    legal:     {label:'发声明',   cost:20,  desc:'为口碑最差艺人发布官方声明，消除负面影响'},
    rehearsal: {label:'联排演练', cost:25,  desc:'本月工作中艺人演出收益翻倍'},
    wardrobe:  {label:'换装发布', cost:20,  desc:'出道艺人粉丝+12%，口碑+8'},
    makeup:    {label:'精修造型', cost:15,  desc:'出道艺人口碑+20'},
  }[k];
}

function hasPublicArtist(){
  return G.artists.some(a=>a.status==='已出道'||a.status==='工作中');
}

function getBuildingStageGroups(){
  const hasArtist=G.artists.length>=1;
  const publicArtist=hasPublicArtist();
  return [
    {
      title:'核心设施',
      note:'先围绕培养、发行、签约和现金流建立主循环。',
      keys:['practice','studio','office','live'],
      visible:true,
    },
    {
      title:'艺人支持',
      note:'签约艺人后开放，用于造型、休整、护理、宣传和影像物料。',
      keys:['lounge','wardrobe','makeup','health','media','mv'],
      visible:hasArtist,
      lockedHint:'签约第一位艺人后显示',
    },
    {
      title:'演出与商业',
      note:'艺人公开活动后再重点投入，把舞台表现和粉丝规模变成收入。',
      keys:['rehearsal','merch'],
      visible:publicArtist||G.artists.reduce((s,a)=>s+(a.fans||0),0)>=10,
      lockedHint:'艺人出道或粉丝规模提升后显示',
    },
    {
      title:'公司管理',
      note:'团队扩大后再处理合同、声明和长期管理成本。',
      keys:['legal'],
      visible:G.artists.length>=2||G.fame>=30,
      lockedHint:'签约 2 名艺人或知名度达到 30 后显示',
    },
  ];
}

function doFacilityAction(k){
  const b=G.buildings[k];
  if(!b||b.lv===0){toast('请先建造该设施','error');return;}
  if((G.buildingActions||{})[k]>=G.month){toast('本月已使用过该行动','error');return;}
  const cfg=getBuildingActionCfg(k);
  if(!cfg) return;
  // 前置条件检查
  if(k==='practice'&&!G.artists.some(a=>a.status==='训练中')){toast('当前没有训练中的艺人','error');return;}
  if(k==='studio'&&!G.pendingReleases?.length){toast('当前没有制作中的内容','error');return;}
  if(k==='mv'&&!G.releases?.length){toast('当前没有上线的内容','error');return;}
  if(k==='merch'&&!G.artists.some(a=>a.status==='工作中'||a.status==='已出道')){toast('需要至少一名出道艺人','error');return;}
  if(k==='health'&&!G.artists.some(a=>a.status==='休息中')){toast('当前没有休息中的艺人','error');return;}
  if(k==='lounge'&&!G.artists.some(a=>(a.energy??80)<100)){toast('当前艺人精力都很充足','error');return;}
  if(k==='legal'&&!G.artists.some(a=>(a.pr||60)<90)){toast('当前没有艺人需要公关危机处理','error');return;}
  if(k==='rehearsal'&&!G.artists.some(a=>a.status==='工作中'||a.status==='已出道')){toast('需要至少一名出道艺人','error');return;}
  if(k==='wardrobe'&&!G.artists.some(a=>a.status==='工作中'||a.status==='已出道')){toast('需要至少一名出道艺人','error');return;}
  if(k==='makeup'&&!G.artists.some(a=>a.status==='工作中'||a.status==='已出道')){toast('需要至少一名出道艺人','error');return;}
  if(G.money<cfg.cost){toast('资金不足 '+cfg.cost+' 万','error');return;}
  if(cfg.cost>0){G.money-=cfg.cost;addLog(b.name+'·'+cfg.label,'minus',cfg.cost);}
  if(!G.buildingActions) G.buildingActions={};
  G.buildingActions[k]=G.month;
  let result='';
  if(k==='live'){
    const bonus=b.lv*LIVE_INCOME_PER_LEVEL*2;
    G.money+=bonus; addLog('直播专题收益','plus',bonus);
    result='额外收益 +'+bonus+'万';
  } else if(k==='practice'){
    const list=G.artists.filter(a=>a.status==='训练中');
    list.forEach(a=>{a.singing=Math.min(99,a.singing+5);a.dance=Math.min(99,a.dance+5);a.acting=Math.min(99,a.acting+3);});
    result=list.length+'名艺人全属性 +5（+3演技）';
  } else if(k==='studio'){
    const target=G.pendingReleases.reduce((a,b)=>a.goLiveAt<b.goLiveAt?a:b);
    target.goLiveAt=G.month;
    result='「'+target.title+'」下月完成制作';
  } else if(k==='mv'){
    let bonus=0;
    G.releases.forEach(r=>{
      const age=G.month-r.releasedAt;
      const mult=age===0?1.5:age===1?1.0:age===2?0.6:0.2;
      const g=Math.round(r.baseIncome*mult*0.5);
      if(g>0){bonus+=g;}
    });
    if(bonus>0){G.money+=bonus;addLog('影像精修收益','plus',bonus);}
    result='内容精制额外收益 +'+bonus+'万';
  } else if(k==='office'){
    const bonus=Math.round(20+Math.random()*40*b.lv);
    G.money+=bonus; addLog('商务拓展收益','plus',bonus);
    result='获得商务合作 +'+bonus+'万';
  } else if(k==='merch'){
    const working=G.artists.filter(a=>a.status==='工作中'||a.status==='已出道');
    let bonus=0;
    working.forEach(a=>{const prev=a.fans||0;a.fans=Math.round(prev*1.12);bonus+=Math.round(prev*0.08*b.lv);});
    if(bonus>0){G.money+=bonus;addLog('商品企划销售收益','plus',bonus);}
    result=working.length+'名艺人粉丝×1.12，商品收益 +'+bonus+'万';
  } else if(k==='media'){
    G.artists.forEach(a=>{a.pr=Math.min(100,(a.pr||60)+12);});
    const bad=(G.activeTrends||[]).find(t=>t.bad);
    if(bad){G.activeTrends=G.activeTrends.filter(t=>t!==bad);result='全员口碑+12，已移除负面趋势「'+bad.name+'」';}
    else result='全员口碑+12（当前无负面趋势）';
  } else if(k==='health'){
    const resting=G.artists.filter(a=>a.status==='休息中');
    const target=resting.reduce((b,a)=>((a.fans||0)>(b.fans||0)?a:b));
    target.status='工作中';
    result=displayName(target)+' 复健完毕，已恢复工作状态';
  } else if(k==='lounge'){
    const list=[...G.artists]
      .sort((a,b)=>(a.energy??80)-(b.energy??80))
      .slice(0,Math.min(3,G.artists.length))
      .filter(a=>(a.energy??80)<100);
    list.forEach(a=>{
      a.energy=Math.min(100,(a.energy??80)+20+b.lv*3);
      a.pr=Math.min(100,(a.pr||60)+5);
    });
    result=list.map(a=>displayName(a)).join('、')+' 精力恢复，口碑+5';
  } else if(k==='legal'){
    const target=[...G.artists].sort((a,b)=>(a.pr||60)-(b.pr||60))[0];
    const boost=15+(G.buildings.legal?.lv||1)*5;
    const before=target.pr||60;
    target.pr=Math.min(100,before+boost);
    result=displayName(target)+` 发布官方声明，口碑 ${before}→${target.pr}`;
  } else if(k==='rehearsal'){
    if(!G.rehearsalBoostMonth) G.rehearsalBoostMonth=0;
    G.rehearsalBoostMonth=G.month;
    result='本月出道艺人演出收益翻倍';
  } else if(k==='wardrobe'){
    const list=G.artists.filter(a=>a.status==='工作中'||a.status==='已出道');
    list.forEach(a=>{a.fans=Math.round((a.fans||0)*1.12);a.pr=Math.min(100,(a.pr||60)+8);});
    result=list.length+'名艺人粉丝+12%，口碑+8';
  } else if(k==='makeup'){
    const list=G.artists.filter(a=>a.status==='工作中'||a.status==='已出道');
    list.forEach(a=>{a.pr=Math.min(100,(a.pr||60)+20);});
    result=list.length+'名艺人口碑+20';
  }
  saveGame();renderBuildings();updateStats();updateOverview();
  if(k==='practice'||k==='merch'||k==='media'||k==='health'||k==='lounge'||k==='legal'||k==='wardrobe'||k==='makeup') renderArtistList();
  toast('✨ '+cfg.label+'：'+result,'success');
}

function renderBuildings(){
  const el=document.getElementById('build-grid');
  renderBuildingRoutes();
  const renderCard=(k,b)=>{
    const lockEntry=BUILDING_UNLOCK[k];
    const locked=lockEntry&&!lockEntry.check();
    const contrib=getBuildingContrib(k,b);
    const cfg=getBuildingActionCfg(k);
    const role=getBuildingRole(k);
    const route=primaryBuildingRoute(k);
    const routeTags=buildingRoutesFor(k);
    const used=(G.buildingActions||{})[k]>=G.month;
    const pending=(G.pendingBuilds||[]).find(p=>p.k===k);
    const monthsLeft=pending?pending.completeAt-G.month:0;
    if(locked) return `
    <div class="build-card" style="pointer-events:none;border:1.5px dashed #d1d5db;background:#fafafa">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:38px;height:38px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;opacity:.5">${b.icon}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:#6b7280">${b.name}</div>
          <div style="font-size:11px;color:#9ca3af">${b.effect}</div>
        </div>
      </div>
      <div class="build-route-tags">${routeTags.map(r=>`<span style="background:${r.bg};border-color:${r.border};color:${r.color}">${r.icon} ${r.name}</span>`).join('')}</div>
      <div style="font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;padding:5px 9px;border-radius:6px">用途：${role}</div>
      <div style="display:flex;align-items:flex-start;gap:6px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:7px 10px">
        <span style="font-size:13px;flex-shrink:0">🔒</span>
        <div>
          <div style="font-size:11px;font-weight:700;color:#854d0e;margin-bottom:1px">解锁条件</div>
          <div style="font-size:12px;color:#92400e">${lockEntry.hint}</div>
        </div>
      </div>
      <div class="lv-bar"><div class="lv-fill" style="width:0%"></div></div>
      <button class="btn btn-sm" disabled style="color:#9ca3af">尚未解锁</button>
    </div>`;
    return `
    <div class="build-card" style="border-color:${b.lv>0?route.border:'#e8e5de'}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:38px;height:38px;border-radius:10px;background:${b.lv>0?'#f0fdf4':'#f5f4f0'};display:flex;align-items:center;justify-content:center;font-size:18px">${pending?'🔨':b.icon}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${b.name}</div>
          <div style="font-size:11px;color:${pending?'#d97706':'#999'}">${pending?'施工中 → Lv.'+pending.targetLv+'（还需'+monthsLeft+'月）':(b.lv===0?'未建设':'Lv.'+b.lv+'/'+b.maxLv)}</div>
        </div>
      </div>
      <div class="build-route-tags">${routeTags.map(r=>`<span style="background:${r.bg};border-color:${r.border};color:${r.color}">${r.icon} ${r.name}</span>`).join('')}</div>
      <div style="font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;padding:5px 9px;border-radius:6px">用途：${role}</div>
      ${contrib?`<div style="font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;padding:5px 9px;border-radius:6px;font-weight:500">📊 ${contrib}</div>`
               :`<div style="font-size:11px;color:#999;background:#f5f4f0;padding:5px 9px;border-radius:6px">${b.effect}</div>`}
      <div class="lv-bar"><div class="lv-fill" style="width:${(b.lv/b.maxLv)*100}%"></div></div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm ${b.lv===0&&!pending?'btn-primary':''}" onclick="upgradeBuilding('${k}')" ${(b.lv>=b.maxLv||pending)?'disabled':''}>
            ${pending?'🔨 建设中':(b.lv===0?'建造':'升级')+' ('+b.cost+'万)'}
          </button>
          ${b.lv>0?`<button class="btn btn-sm" onclick="enterRoom('${k}')">进入 →</button>`:''}
        </div>
        ${b.lv>0&&cfg?`<button class="btn btn-sm" style="justify-content:center;background:${used?'':'#fefce8'};border-color:${used?'':'#fde047'};color:${used?'':'#854d0e'}" onclick="doFacilityAction('${k}')" ${used?'disabled':''}>
          ${used?'✅ 本月已行动':'⚡ '+cfg.label+(cfg.cost>0?' · '+cfg.cost+'万':' · 免费')}
        </button>`:''}
      </div>
    </div>`;
  };
  el.innerHTML=getBuildingStageGroups().map(group=>{
    if(!group.visible){
      return `<div class="build-group build-group-locked">
        <div class="build-group-head">
          <div>
            <div class="build-group-title">${group.title}</div>
            <div class="build-group-note">${group.lockedHint}</div>
          </div>
          <span class="build-group-badge">稍后开放</span>
        </div>
      </div>`;
    }
    return `<div class="build-group">
      <div class="build-group-head">
        <div>
          <div class="build-group-title">${group.title}</div>
          <div class="build-group-note">${group.note}</div>
        </div>
      </div>
      <div class="build-group-grid">
        ${group.keys.filter(k=>G.buildings[k]).map(k=>renderCard(k,G.buildings[k])).join('')}
      </div>
    </div>`;
  }).join('');
}

function buildDuration(targetLv){
  if(targetLv<=1) return 1;
  if(targetLv<=3) return 2;
  if(targetLv<=5) return 3;
  return 4;
}
function upgradeBuilding(k){
  const b=G.buildings[k];
  const lockEntry=BUILDING_UNLOCK[k];
  if(lockEntry&&!lockEntry.check()){toast('🔒 '+b.name+' 尚未解锁 · '+lockEntry.hint,'error');return;}
  if(b.lv>=b.maxLv){toast('已达最高等级','error');return;}
  if((G.pendingBuilds||[]).some(p=>p.k===k)){toast('该设施正在建设中','error');return;}
  if(G.money<b.cost){toast('资金不足 '+b.cost+' 万！','error');return;}
  const paid=b.cost;
  const targetLv=b.lv+1;
  const dur=buildDuration(targetLv);
  G.money-=paid;
  b.cost=Math.round(b.cost*1.5);
  if(!G.pendingBuilds) G.pendingBuilds=[];
  G.pendingBuilds.push({k, targetLv, completeAt:G.month+dur});
  addLog((targetLv===1?'开工建造':'开始升级')+b.name+'→Lv.'+targetLv,'minus',paid);
  renderBuildings();updateStats();updateOverview();saveGame();
  toast(b.name+(targetLv===1?' 开始建造，':'  Lv.'+targetLv+' 施工中，')+dur+'个月后完工','success');
}

function eventCategory(ev){
  const n=ev.name;
  if(n.includes('选秀')||n.includes('校园')) return '新人曝光';
  if(n.includes('品牌')||n.includes('直播')) return '商业合作';
  if(n.includes('演唱会')||n.includes('音乐节')||n.includes('巡演')||n.includes('义演')) return '舞台演出';
  if(n.includes('影视')) return '影视通告';
  return '综合活动';
}

function eventFitScore(ev,a){
  if(!a) return 0;
  const hint=ev.statHint||'';
  let score=0;
  if(hint.includes('唱+舞+演')) score=(a.singing+a.dance+a.acting)/3;
  else if(hint.includes('唱+舞')) score=(a.singing+a.dance)/2;
  else if(hint.includes('综合')) score=(a.singing+a.dance+a.acting)/3;
  else if(hint.includes('唱')) score=a.singing;
  else if(hint.includes('舞')) score=a.dance;
  else if(hint.includes('演')) score=a.acting;
  else if(hint.includes('粉丝')) score=Math.min(100,(a.fans||0)*3);
  else if(hint.includes('口碑')) score=a.pr||60;
  else score=(a.singing+a.dance+a.acting+a.rap)/4;
  if((a.energy??80)<30) score-=18;
  if((a.pr||60)<50) score-=10;
  return Math.max(0,Math.min(100,Math.round(score)));
}

function eventFitLabel(score){
  return score>=80?['高','#15803d','#dcfce7']:score>=60?['中','#1d4ed8','#dbeafe']:['低','#b45309','#fef3c7'];
}

function eventRiskText(a){
  const risks=[];
  if((a.energy??80)<30) risks.push('精力低');
  if((a.pr||60)<50) risks.push('口碑风险');
  return risks.join(' / ');
}

function eventRewardRange(ev){
  const eligible=G.artists.filter(a=>ev.artistCheck(a));
  if(!eligible.length) return null;
  const ranked=[...eligible].sort((a,b)=>eventFitScore(ev,b)-eventFitScore(ev,a));
  const minSel=ranked.slice(-Math.max(ev.minArtists,1));
  const bestSel=ranked.slice(0,Math.max(ev.minArtists,Math.min(ranked.length,ev.minArtists+1)));
  const low=ev.compute(minSel);
  const high=ev.compute(bestSel);
  return{low,high};
}

function renderEvents(){
  const el=document.getElementById('event-list');
  const pending=G.pendingEvents||[];
  const timed=G.timedEvents||[];
  let html='';
  // 限时活动
  if(timed.length){
    html+=`<div style="font-size:11px;font-weight:700;color:#b45309;letter-spacing:.5px;margin-bottom:8px">⚡ 限时机会（${timed.length}）</div>`;
    html+=timed.map(te=>{
      const ev=TIMED_EVENTS.find(t=>t.id===te.id);
      if(!ev) return '';
      const remaining=te.expiresAt-G.month;
      const alreadyPending=(G.pendingEvents||[]).some(p=>p.timedEventId===te.id);
      const ok=ev.check();
      const btnLabel=alreadyPending?'进行中':ok?'立即参加 →':'条件不足';
      return `
      <div class="event-item" style="border:2px solid #fde68a;background:#fffbeb;position:relative">
        <div style="position:absolute;top:6px;right:8px;font-size:10px;background:#fef3c7;color:#92400e;border-radius:99px;padding:2px 8px;font-weight:600">⏰ 还有 ${remaining} 个月消失</div>
        <div class="event-icon" style="background:${ev.bg}">${ev.icon}</div>
        <div class="event-info">
          <div class="event-name">${ev.name}</div>
          <div class="event-desc">${ev.desc}</div>
          <div style="font-size:11px;color:#999;margin-top:3px">📋 ${ev.req}${ev.cost>0?' · 报名费 '+ev.cost+'万':''}</div>
          <div style="font-size:11px;color:#7c3aed;margin-top:3px;font-weight:500">👤 至少 ${ev.minArtists} 名 · ${ev.statHint} · ⏳ ${ev.duration}个月后结算</div>
        </div>
        <button class="btn btn-sm ${ok&&!alreadyPending?'btn-primary':''}" style="flex-shrink:0;align-self:center;white-space:nowrap;background:${ok&&!alreadyPending?'#d97706':''}; color:${ok&&!alreadyPending?'#fff':''}" onclick="${ok&&!alreadyPending?'openTimedEventModal(\''+te.id+'\')':''}" ${alreadyPending||!ok?'disabled':''}>
          ${btnLabel}
        </button>
      </div>`;
    }).filter(Boolean).join('');
    html+=`<div style="font-size:11px;font-weight:600;color:#999;letter-spacing:.5px;margin:12px 0 8px">进行中 / 常规活动</div>`;
  }
  // 进行中的活动
  if(pending.length){
    if(!timed.length) html+=`<div style="font-size:11px;font-weight:600;color:#7c3aed;letter-spacing:.5px;margin-bottom:8px">⏳ 进行中（${pending.length}）</div>`;
    html+=pending.map(pe=>`
      <div class="event-item" style="border-color:#e9d5ff;background:#fdf4ff">
        <div class="event-icon" style="background:${pe.bg||'#f5f4f0'}">${pe.icon}</div>
        <div class="event-info">
          <div class="event-name">${pe.name}</div>
          <div style="font-size:12px;color:#7c3aed;font-weight:500;margin-top:4px">⏳ 还需 ${pe.completeAt-G.month} 个月揭晓结果</div>
          <div style="font-size:11px;color:#999;margin-top:3px">预计奖励：⭐+${pe.r.fame} 知名度 · 💰+${pe.r.money}万</div>
        </div>
        <div style="font-size:12px;color:#7c3aed;font-weight:600;flex-shrink:0;align-self:center">进行中</div>
      </div>`).join('');
    if(!timed.length) html+=`<div style="font-size:11px;font-weight:600;color:#999;letter-spacing:.5px;margin:12px 0 8px">可参加活动</div>`;
  }
  html+=EVENTS.map((ev,i)=>{
    const used=G.usedEvents.includes(i);
    const ok=ev.check();
    const btnLabel=used?'本月已参加':ok?'选派艺人 →':'条件不足';
    const range=eventRewardRange(ev);
    return `
    <div class="event-item" style="opacity:${!ok&&!used?0.6:1}">
      <div class="event-icon" style="background:${ev.bg}">${ev.icon}</div>
      <div class="event-info">
        <div class="event-name">${ev.name}</div>
        <div class="event-desc">${ev.desc}</div>
        <div style="font-size:11px;color:#999;margin-top:3px">📋 ${ev.req}${ev.cost>0?' · 报名费 '+ev.cost+'万':''}</div>
        <div style="font-size:11px;color:#7c3aed;margin-top:3px;font-weight:500">👤 至少 ${ev.minArtists} 名 · 推荐属性：${ev.statHint} · ${eventCategory(ev)} · ⏳ ${ev.duration}个月</div>
        <div class="event-reward" style="color:#666">${range?`预计：⭐ ${range.low.fame}~${range.high.fame} · 💰 ${range.low.money}~${range.high.money}万`:'🏅 知名度  💰 收益（按选派艺人动态计算）'}</div>
        <div style="font-size:10px;color:#999;margin-top:3px">风险：消耗艺人档期；低精力或低口碑艺人不建议参加</div>
      </div>
      <button class="btn btn-sm ${ok&&!used?'btn-primary':''}" style="flex-shrink:0;align-self:center;white-space:nowrap" onclick="${ok&&!used?'openEventModal('+i+')':''}" ${used||!ok?'disabled':''}>
        ${btnLabel}
      </button>
    </div>`;
  }).join('');
  el.innerHTML=html;
}

function openEventModal(i){
  currentEventIdx=i;
  currentEventIsTimed=false;
  currentTimedEventId=null;
  selectedEventArtists=[];
  const ev=EVENTS[i];
  document.getElementById('event-modal-title').textContent=ev.icon+' '+ev.name;
  document.getElementById('event-modal-desc').textContent=ev.desc;
  document.getElementById('event-modal-cost').textContent=ev.cost>0?'⚠️ 报名费用：'+ev.cost+' 万':'';
  document.getElementById('event-select-hint').textContent='至少选 '+ev.minArtists+' 名艺人出战，多派多得（关键属性：'+ev.statHint+'）';
  renderEventArtistList();
  updateEventOutcomePreview();
  document.getElementById('modal-event').classList.add('open');
}

function openTimedEventModal(id){
  const ev=TIMED_EVENTS.find(t=>t.id===id);
  if(!ev) return;
  currentEventIdx=-1;
  currentEventIsTimed=true;
  currentTimedEventId=id;
  selectedEventArtists=[];
  document.getElementById('event-modal-title').textContent='⚡ '+ev.icon+' '+ev.name;
  document.getElementById('event-modal-desc').textContent=ev.desc;
  document.getElementById('event-modal-cost').textContent=ev.cost>0?'⚠️ 报名费用：'+ev.cost+' 万':'';
  document.getElementById('event-select-hint').textContent='至少选 '+ev.minArtists+' 名艺人出战，多派多得（关键属性：'+ev.statHint+'）';
  renderEventArtistList();
  updateEventOutcomePreview();
  document.getElementById('modal-event').classList.add('open');
}

function closeEventModal(){
  document.getElementById('modal-event').classList.remove('open');
  currentEventIdx=-1;
  currentEventIsTimed=false;
  currentTimedEventId=null;
  selectedEventArtists=[];
}

function artistEventLimit(a){
  const avg=(a.singing+a.dance+a.acting+a.rap)/4;
  if(avg>=85) return 3;
  if(avg>=70) return 2;
  return 1;
}

function renderEventArtistList(){
  if(currentEventIdx<0&&!currentEventIsTimed) return;
  const ev=currentEventIsTimed?TIMED_EVENTS.find(t=>t.id===currentTimedEventId):EVENTS[currentEventIdx];
  if(!ev) return;
  const el=document.getElementById('event-artist-list');
  const eligible=G.artists.filter(a=>ev.artistCheck(a));
  if(!eligible.length){
    el.innerHTML='<div style="font-size:13px;color:#999;padding:8px 0">没有符合条件的艺人</div>';
    return;
  }
  el.innerHTML=eligible.map(a=>{
    const ai=G.artists.indexOf(a);
    const sel=selectedEventArtists.includes(ai);
    const used=(G.usedEventArtists||{})[ai]||0;
    const limit=artistEventLimit(a);
    const busy=!sel&&used>=limit;
    const clickable=!busy;
    const avg=Math.round((a.singing+a.dance+a.acting+a.rap)/4);
    const fit=eventFitScore(ev,a);
    const [fitText,fitColor,fitBg]=eventFitLabel(fit);
    const risk=eventRiskText(a);
    const slotTag=limit>1
      ?`<span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:99px;font-weight:600;margin-left:4px">可接${limit}场/月</span>`
      :'';
    const usedTag=used>0
      ?`<span style="font-size:10px;color:#999;font-weight:400;margin-left:5px">本月已参加${used}场${busy?' · 已满':'（还剩'+(limit-used)+'场）'}</span>`
      :'';
    return `<div ${clickable?'onclick="toggleEventArtist('+ai+')"':''} style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1.5px solid ${sel?'#1a1a1a':'#e8e5de'};border-radius:10px;${clickable?'cursor:pointer;':'cursor:not-allowed;'}margin-bottom:7px;background:${sel?'#f0ede6':busy?'#fafafa':'#fff'};opacity:${busy?0.45:1};transition:all .15s">
      <div style="width:34px;height:34px;border-radius:50%;background:${a.color};color:${a.tc};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${a.abbr}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${displayName(a)}${slotTag}${usedTag}</div>
        <div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">
          <span style="font-size:10px;color:#555;background:#e3f2fd;padding:1px 5px;border-radius:99px">唱${a.singing}</span>
          <span style="font-size:10px;color:#555;background:#fff8e1;padding:1px 5px;border-radius:99px">舞${a.dance}</span>
          <span style="font-size:10px;color:#555;background:#e8f5e9;padding:1px 5px;border-radius:99px">演${a.acting}</span>
          <span style="font-size:10px;color:#555;background:#f5f4f0;padding:1px 5px;border-radius:99px">${a.fans||0}万粉</span>
          <span style="font-size:10px;padding:1px 5px;border-radius:99px;background:${prBg(a.pr||60)};color:${prColor(a.pr||60)}">口碑${a.pr||60}</span>
          <span style="font-size:10px;color:#888;background:#f0ede6;padding:1px 5px;border-radius:99px">均${avg}</span>
          <span style="font-size:10px;color:${fitColor};background:${fitBg};padding:1px 5px;border-radius:99px">匹配${fitText} ${fit}</span>
          ${risk?`<span style="font-size:10px;color:#b91c1c;background:#fee2e2;padding:1px 5px;border-radius:99px">${risk}</span>`:''}
        </div>
      </div>
      <div style="font-size:20px">${sel?'✅':busy?'🔒':'⬜'}</div>
    </div>`;
  }).join('');
}

function toggleEventArtist(ai){
  if(currentEventIdx<0&&!currentEventIsTimed) return;
  const a=G.artists[ai];
  const used=(G.usedEventArtists||{})[ai]||0;
  if(used>=artistEventLimit(a)&&!selectedEventArtists.includes(ai)) return;
  const idx=selectedEventArtists.indexOf(ai);
  if(idx>=0){
    selectedEventArtists.splice(idx,1);
  } else {
    selectedEventArtists.push(ai);
  }
  renderEventArtistList();
  updateEventOutcomePreview();
}

function updateEventOutcomePreview(){
  if(currentEventIdx<0&&!currentEventIsTimed) return;
  const ev=currentEventIsTimed?TIMED_EVENTS.find(t=>t.id===currentTimedEventId):EVENTS[currentEventIdx];
  if(!ev) return;
  const btn=document.getElementById('event-confirm-btn');
  const preview=document.getElementById('event-outcome-preview');
  const ready=selectedEventArtists.length>=ev.minArtists;
  btn.disabled=!ready;
  if(ready){
    const sel=selectedEventArtists.map(i=>G.artists[i]);
    const r=ev.compute(sel);
    const personalMult=sel.reduce((s,a)=>s+artistEventMult(a,ev.name),0)/sel.length;
    if(personalMult>1){r.fame=Math.round(r.fame*personalMult);r.money=Math.round(r.money*personalMult);}
    const avgFit=Math.round(sel.reduce((s,a)=>s+eventFitScore(ev,a),0)/sel.length);
    const risks=sel.map(eventRiskText).filter(Boolean);
    preview.style.display='';
    preview.innerHTML=`<div style="font-size:11px;color:#999;font-weight:600;margin-bottom:6px">预计收益（已选 ${sel.length} 人）</div>
      <div style="display:flex;gap:20px;margin-bottom:6px">
        <span style="color:#2e7d32;font-weight:700;font-size:15px">⭐ +${r.fame} 知名度</span>
        <span style="color:#1565c0;font-weight:700;font-size:15px">💰 +${r.money} 万</span>
      </div>
      <div style="font-size:11px;color:#7c3aed;font-weight:500">匹配度 ${avgFit}/100 · ⏳ 进行中 ${ev.duration} 个月后结算奖励</div>
      ${risks.length?`<div style="font-size:11px;color:#b91c1c;margin-top:4px">风险提示：${[...new Set(risks)].join(' / ')}</div>`:''}`;
  } else {
    preview.style.display='none';
  }
}

function confirmEventWithArtists(){
  if(currentEventIdx<0&&!currentEventIsTimed) return;
  const ev=currentEventIsTimed?TIMED_EVENTS.find(t=>t.id===currentTimedEventId):EVENTS[currentEventIdx];
  if(!ev) return;
  if(selectedEventArtists.length<ev.minArtists){toast('至少选 '+ev.minArtists+' 名艺人','error');return;}
  if(!currentEventIsTimed&&G.usedEvents.includes(currentEventIdx)){toast('本月已参加过此活动','error');return;}
  if(!ev.check()){toast('条件不满足','error');return;}
  if(G.money<ev.cost){toast('资金不足！','error');return;}
  const sel=selectedEventArtists.map(i=>G.artists[i]);
  const r=ev.compute(sel);
  const personalMult=sel.reduce((s,a)=>s+artistEventMult(a,ev.name),0)/sel.length;
  if(personalMult>1){r.fame=Math.round(r.fame*personalMult);r.money=Math.round(r.money*personalMult);}
  if(!currentEventIsTimed){
    if(hasTrend('idol_boom')&&ev.name==='新人选秀综艺'){r.fame=Math.round(r.fame*1.5);r.money=Math.round(r.money*1.5);}
    if(hasTrend('concert_craze')&&ev.name==='演唱会巡演'){r.fame=Math.round(r.fame*1.5);r.money=Math.round(r.money*1.5);}
    if(ev.name==='品牌代言活动'){const m=(hasTrend('ad_market_up')?1.6:1)*(hasAgent('biz')?1.4:1);r.money=Math.round(r.money*m);r.fame=Math.round(r.fame*m);}
    G.usedEvents.push(currentEventIdx);
  }
  if(hasTrend('economy_down')){r.money=Math.round(r.money*0.75);}
  if(!G.usedEventArtists||Array.isArray(G.usedEventArtists)) G.usedEventArtists={};
  selectedEventArtists.forEach(ai=>{
    G.usedEventArtists[ai]=(G.usedEventArtists[ai]||0)+1;
    const a=G.artists[ai];
    if(G.usedEventArtists[ai]>1) a.energy=Math.max(0,(a.energy||80)-10);
  });
  if(ev.cost>0){G.money-=ev.cost;addLog(ev.name+' 报名费','minus',ev.cost);}
  const completeAt=G.month+ev.duration;
  const entry={name:ev.name,icon:ev.icon,bg:ev.bg,artistIndices:[...selectedEventArtists],r,completeAt,duration:ev.duration};
  if(currentEventIsTimed){
    entry.timedEventId=currentTimedEventId;
    G.timedEvents=(G.timedEvents||[]).filter(te=>te.id!==currentTimedEventId);
  } else {
    entry.evIdx=currentEventIdx;
  }
  G.pendingEvents.push(entry);
  closeEventModal();
  updateStats();updateOverview();updateTips();renderEvents();saveGame();checkAchievements();
  toast('🎬 '+ev.name+' 已开始！'+ev.duration+'个月后揭晓结果','success');
}

let recruitPool=[];
let recruitContractMonths=24;
function contractCostMult(m){return{12:0.7,24:1.0,36:1.25,48:1.5,60:1.75}[m]||1.0;}
function calcRecruitCost(base){return Math.round(base*contractCostMult(recruitContractMonths));}

const SCOUT_ROUTES=[
  {id:'campus',label:'校园选拔',cost:25,count:3,desc:'稳定新人',focus:['singing','acting'],weights:{'普通':45,'良好':34,'优秀':15,'稀有':5,'✨传奇':1}},
  {id:'street',label:'街头发掘',cost:40,count:3,desc:'舞台感更强',focus:['dance','rap'],weights:{'普通':34,'良好':36,'优秀':20,'稀有':8,'✨传奇':2}},
  {id:'online',label:'网络达人',cost:55,count:4,desc:'初始粉丝更高',focus:['singing','rap'],weights:{'普通':30,'良好':34,'优秀':24,'稀有':10,'✨传奇':2},costMult:1.08,fanBonus:true},
  {id:'overseas',label:'海外试训',cost:80,count:4,desc:'更容易出高潜',focus:['singing','dance','acting'],weights:{'普通':22,'良好':32,'优秀':28,'稀有':14,'✨传奇':4},costMult:1.15},
];

const SCOUT_RARITY_PROFILE={
  '普通':{min:32,max:68,cost:[24,48]},
  '良好':{min:44,max:78,cost:[42,76]},
  '优秀':{min:56,max:88,cost:[72,118]},
  '稀有':{min:66,max:96,cost:[108,168]},
  '✨传奇':{min:78,max:99,cost:[165,240]},
};
const SCOUT_SURNAMES=['林','苏','顾','叶','沈','许','周','白','夏','秦','温','陆','江','程','宋','唐','黎','洛','纪','阮'];
const SCOUT_GIVENS=['星遥','若宁','安澜','知夏','南乔','景行','云舒','鹿鸣','时雨','予安','青禾','洛尘','一澈','念初','以沫','清越','明栀','书言','晏辞','可颂'];
const SCOUT_COLORS=[
  {color:'#e0f2fe',tc:'#0369a1'},{color:'#fef3c7',tc:'#92400e'},{color:'#fce7f3',tc:'#831843'},
  {color:'#dcfce7',tc:'#14532d'},{color:'#ede9fe',tc:'#4c1d95'},{color:'#fff1f2',tc:'#9f1239'},
  {color:'#f0fdfa',tc:'#134e4a'},{color:'#eef2ff',tc:'#3730a3'}
];
const SCOUT_ZODIAC=['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
const SCOUT_HOMETOWNS=['北京','上海','广州','深圳','成都','杭州','南京','重庆','武汉','长沙','厦门','青岛','台北','香港','首尔','东京'];
const SCOUT_PERSONALITIES=['清冷专注','元气外向','沉稳自律','灵气十足','反差感强','温柔坚定','镜头感强','野心明确'];
const SCOUT_HOBBIES=['写歌·看展','街舞·滑板','拍短片·剪辑','健身·旅行','配音·读剧本','作曲·咖啡','时尚·摄影','说唱·球鞋'];
const SCOUT_MBTI=['INFJ','INFP','ENFP','ENFJ','ISTP','ISFP','INTJ','ENTJ','ESFP','ESTP'];
const SCOUT_DREAMS=['成为下一代顶流','完成万人巡演','拿到年度新人奖','推出代表作专辑','站上国际舞台','成为全能艺人','拍出破圈作品','打造个人厂牌'];
const SCOUT_SPECIALTY={
  singing:['声线辨识度','现场稳定度','高音爆发力','情绪唱腔'],
  dance:['舞台律动','编舞理解','爆发型舞蹈','镜头走位'],
  acting:['镜头表现','角色理解','情绪共情','台词质感'],
  rap:['词曲创作','节奏控制','即兴说唱','潮流表达']
};

function scoutPick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function scoutRand(min,max){return Math.floor(min+Math.random()*(max-min+1));}
function scoutClamp(n){return Math.max(20,Math.min(99,Math.round(n)));}

function pruneScoutedPool(){
  if(!G.scoutedPool) G.scoutedPool=[];
  const signed=new Set((G.artists||[]).map(a=>a.name));
  G.scoutedPool=G.scoutedPool.filter(p=>p&&p.name&&!signed.has(p.name)&&(!p.expiresAt||p.expiresAt>G.month));
}

function scoutUniqueName(extraUsed=[]){
  const used=new Set([
    ...POOL.map(p=>p.name),
    ...(G.artists||[]).map(a=>a.name),
    ...(G.scoutedPool||[]).map(p=>p.name),
    ...(recruitPool||[]).map(p=>p.name),
    ...extraUsed,
  ]);
  for(let i=0;i<120;i++){
    const name=scoutPick(SCOUT_SURNAMES)+scoutPick(SCOUT_GIVENS);
    if(!used.has(name)) return name;
  }
  return scoutPick(SCOUT_SURNAMES)+scoutPick(SCOUT_GIVENS)+scoutRand(10,99);
}

function rollScoutRarity(route){
  const weights={...route.weights};
  if(hasAgent('scout')){
    weights['普通']=Math.max(5,(weights['普通']||0)-10);
    weights['优秀']=(weights['优秀']||0)+5;
    weights['稀有']=(weights['稀有']||0)+4;
    weights['✨传奇']=(weights['✨传奇']||0)+1;
  }
  const entries=Object.entries(weights);
  const total=entries.reduce((s,entry)=>s+entry[1],0);
  let roll=Math.random()*total;
  for(const [rarity,weight] of entries){
    roll-=weight;
    if(roll<=0) return rarity;
  }
  return '普通';
}

function createScoutedCandidate(route, extraUsed=[]){
  const rarity=rollScoutRarity(route);
  const profile=SCOUT_RARITY_PROFILE[rarity]||SCOUT_RARITY_PROFILE['普通'];
  const stats={
    singing:scoutRand(profile.min,profile.max),
    dance:scoutRand(profile.min,profile.max),
    acting:scoutRand(profile.min,profile.max),
    rap:scoutRand(profile.min,profile.max),
  };
  const focus=scoutPick(route.focus);
  stats[focus]=scoutClamp(stats[focus]+scoutRand(8,18));
  if(rarity==='稀有'||rarity==='✨传奇'){
    Object.keys(stats).forEach(k=>{stats[k]=scoutClamp(stats[k]+scoutRand(2,8));});
  }
  const strongest=Object.entries(stats).sort((a,b)=>b[1]-a[1])[0][0];
  const avg=Math.round((stats.singing+stats.dance+stats.acting+stats.rap)/4);
  const color=scoutPick(SCOUT_COLORS);
  const name=scoutUniqueName(extraUsed);
  let cost=Math.round((scoutRand(profile.cost[0],profile.cost[1])+avg*0.35)*(route.costMult||1));
  if(hasAgent('scout')) cost=Math.max(20,Math.round(cost*0.94));
  return {
    name,abbr:Array.from(name).slice(-1)[0],color:color.color,tc:color.tc,
    ...stats,cost,rarity,
    age:scoutRand(18,25),height:scoutRand(160,185),weight:scoutRand(45,76),
    zodiac:scoutPick(SCOUT_ZODIAC),hometown:scoutPick(SCOUT_HOMETOWNS),
    personality:scoutPick(SCOUT_PERSONALITIES),hobby:scoutPick(SCOUT_HOBBIES),
    mbti:scoutPick(SCOUT_MBTI),dream:scoutPick(SCOUT_DREAMS),
    specialty:scoutPick(SCOUT_SPECIALTY[strongest]),
    startFans:route.fanBonus?scoutRand(6,14):scoutRand(1,4),
    isScouted:true,source:route.label,scoutedAt:G.month,expiresAt:G.month+3
  };
}

function refreshRecruitPool(){
  pruneScoutedPool();
  const signed=new Set(G.artists.map(a=>a.name));
  const discovered=(G.scoutedPool||[]).filter(p=>!signed.has(p.name));
  const blocked=new Set([...signed,...discovered.map(p=>p.name)]);
  const available=POOL.filter(p=>!blocked.has(p.name));
  recruitPool=[
    ...discovered,
    ...[...available].sort(()=>Math.random()-0.5).slice(0,hasAgent('scout')?6:4)
  ];
}

function renderScoutRoutes(){
  pruneScoutedPool();
  const moneyEl=document.getElementById('modal-money');
  if(moneyEl) moneyEl.textContent=G.money;
  const info=document.getElementById('scout-info');
  if(info){
    const remain=(G.scoutedPool||[]).map(p=>(p.expiresAt||G.month)-G.month).filter(n=>n>0);
    const expireText=remain.length?' · 最短'+Math.min(...remain)+'个月后失效':'';
    info.textContent='已发现候选人 '+(G.scoutedPool||[]).length+' 人'+expireText;
  }
  const badge=document.getElementById('scout-agent-badge');
  if(badge) badge.style.display=hasAgent('scout')?'inline-block':'none';
  const el=document.getElementById('scout-route-list');
  if(!el) return;
  el.innerHTML=SCOUT_ROUTES.map(route=>{
    const affordable=G.money>=route.cost;
    const found=route.count+(hasAgent('scout')?1:0);
    return `<button class="btn btn-sm" onclick="doScoutSearch('${route.id}')" ${affordable?'':'disabled'} style="align-items:flex-start;flex-direction:column;gap:2px;padding:8px;opacity:${affordable?'1':'.5'}">
      <span style="display:flex;justify-content:space-between;width:100%;gap:6px;font-size:11px;font-weight:800;color:#1a1a1a"><span>${route.label}</span><span>${route.cost}万</span></span>
      <span style="font-size:9px;color:#999;text-align:left;line-height:1.4">${route.desc} · ${found}人</span>
    </button>`;
  }).join('');
}

function doScoutSearch(routeId){
  const route=SCOUT_ROUTES.find(r=>r.id===routeId);
  if(!route) return;
  pruneScoutedPool();
  if(G.money<route.cost){toast('资金不足 '+route.cost+' 万！','error');return;}
  G.money-=route.cost;
  const count=route.count+(hasAgent('scout')?1:0);
  const found=[];
  for(let i=0;i<count;i++){
    found.push(createScoutedCandidate(route, found.map(p=>p.name)));
  }
  G.scoutedPool=[...found,...(G.scoutedPool||[])].slice(0,12);
  addLog('星探搜寻·'+route.label,'minus',route.cost);
  refreshRecruitPool();
  renderRecruitList();
  updateStats();updateOverview();saveGame();
  pushFeed('🔎','星探通过'+route.label+'发现 '+found.length+' 名候选人','info');
  toast('星探发现 '+found.length+' 名候选人，候选人将在3个月后失效','success');
}

function selectContractDuration(m){
  recruitContractMonths=m;
  [12,24,36,48,60].forEach(v=>{
    const btn=document.getElementById('cd-'+v);
    if(!btn) return;
    btn.className='btn btn-sm'+(v===m?' btn-primary':'');
    btn.style.flex='1';btn.style.flexDirection='column';btn.style.gap='1px';btn.style.padding='6px 3px';
  });
  renderRecruitList();
}

const RARITY_STYLE={
  '✨传奇':{bg:'#fef9c3',tc:'#92400e',border:'#fde047'},
  '稀有':  {bg:'#ede9fe',tc:'#5b21b6',border:'#c4b5fd'},
  '优秀':  {bg:'#dbeafe',tc:'#1e40af',border:'#93c5fd'},
  '良好':  {bg:'#dcfce7',tc:'#14532d',border:'#86efac'},
  '普通':  {bg:'#f5f4f0',tc:'#555',   border:'#e8e5de'},
};

function artistPhotoHTML(p){
  if(p.image) return `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;display:block">`;
  return `<svg viewBox="0 0 100 128" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    <rect width="100" height="128" fill="${p.color}"/>
    <text x="50" y="96" text-anchor="middle" font-size="88" font-weight="900" fill="${p.tc}" opacity="0.1" font-family="serif">${p.abbr}</text>
    <circle cx="50" cy="44" r="23" fill="${p.tc}" opacity="0.38"/>
    <path d="M-2,128 Q5,86 50,82 Q95,86 102,128 Z" fill="${p.tc}" opacity="0.28"/>
  </svg>`;
}

function renderRecruitList(){
  const el=document.getElementById('recruit-list');
  renderScoutRoutes();
  if(!recruitPool||!recruitPool.length){
    el.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;font-size:12px;border:1px dashed #e8e5de;border-radius:12px;background:#fbfaf7">暂无可招募候选人，可以先安排星探搜寻</div>';
    return;
  }
  el.innerHTML=recruitPool.map((p,i)=>{
    const cost=calcRecruitCost(p.cost);
    const affordable=G.money>=cost;
    const avg=Math.round((p.singing+p.dance+p.acting+p.rap)/4);
    const rs=RARITY_STYLE[p.rarity]||RARITY_STYLE['普通'];
    const acceptRate=recruitAcceptRate(p);
    const arColor=acceptRate>=90?'#86efac':acceptRate>=70?'#fde68a':'#fca5a5';
    const archetype=artistArchetype(p);
    const dream=artistDreamGoal(p);
    const scoutTag=p.isScouted?'<div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px">星探 · '+p.source+'</div>':'';
    const scoutNote=p.isScouted?'<div style="font-size:10px;color:#8b5cf6;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:5px 7px;margin-bottom:8px;display:flex;justify-content:space-between"><span>星探候选</span><span>'+Math.max(1,(p.expiresAt||G.month+1)-G.month)+'个月后失效</span></div>':'';
    return `
    <div style="border-radius:14px;overflow:hidden;background:#fff;border:1.5px solid ${affordable?'#e8e5de':'#f0ede6'};${affordable?'':'opacity:.55'};transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,.10)'" onmouseleave="this.style.boxShadow=''">
      <div style="position:relative;aspect-ratio:3/4;overflow:hidden;background:${p.color};cursor:pointer" onclick="openArtistProfile(${i})">
        ${artistPhotoHTML(p)}
        ${scoutTag}
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .2s;display:flex;align-items:center;justify-content:center"
             onmouseenter="this.style.background='rgba(0,0,0,.32)';this.querySelector('span').style.opacity='1'"
             onmouseleave="this.style.background='rgba(0,0,0,0)';this.querySelector('span').style.opacity='0'">
          <span style="color:#fff;font-size:11px;font-weight:600;background:rgba(255,255,255,.18);padding:5px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.5);opacity:0;transition:opacity .2s;pointer-events:none">查看详情</span>
        </div>
        <div style="position:absolute;top:8px;right:8px;background:${rs.bg};color:${rs.tc};border:1px solid ${rs.border};font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px">${p.rarity}</div>
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.62));padding:20px 10px 10px">
          <div style="color:#fff;font-size:14px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.4)">${p.name}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">
            <span style="color:rgba(255,255,255,.75);font-size:10px">均值 ${avg}</span>
            ${acceptRate<100?'<span style="font-size:9px;font-weight:700;color:'+arColor+';background:rgba(0,0,0,.45);padding:1px 6px;border-radius:99px">接受率'+acceptRate+'%</span>':'<span style="color:rgba(255,255,255,.55);font-size:9px">档案 →</span>'}
          </div>
        </div>
      </div>
      <div style="padding:10px">
        ${scoutNote}
        <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px">
          ${[['唱',p.singing,'#3b82f6'],['舞',p.dance,'#f59e0b'],['演',p.acting,'#22c55e'],['说',p.rap,'#ec4899']].map(([lbl,val,clr])=>`
          <div style="display:flex;align-items:center;gap:5px;font-size:10px">
            <span style="width:12px;color:#aaa;flex-shrink:0">${lbl}</span>
            <div style="flex:1;height:4px;background:#f0ede6;border-radius:99px;overflow:hidden">
              <div style="height:100%;background:${clr};border-radius:99px;width:${val}%"></div>
            </div>
            <span style="width:20px;text-align:right;color:#555;font-weight:600;font-size:10px">${val}</span>
          </div>`).join('')}
        </div>
        <div style="display:grid;gap:5px;margin-bottom:10px">
          <div style="font-size:10px;color:${archetype.color};background:${archetype.bg};border-radius:7px;padding:5px 7px;font-weight:700">${archetype.icon} ${archetype.name}</div>
          <div style="font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:5px 7px;line-height:1.4">梦想：${dream.title}</div>
        </div>
        <button class="btn ${affordable?'btn-primary':''}" onclick="${affordable?'recruit('+i+')':''}" ${affordable?'':'disabled'} style="width:100%;justify-content:center;padding:7px;font-size:12px">
          ${affordable?'💼 签约 · '+cost+'万':'资金不足 · '+cost+'万'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function openRecruit(){
  const maxArtists=2+G.buildings.office.lv*2;
  if(G.artists.length>=maxArtists){toast('艺人数量已满，请升级经纪办公室','error');return;}
  refreshRecruitPool();
  document.getElementById('modal-money').textContent=G.money;
  renderScoutRoutes();
  selectContractDuration(recruitContractMonths);
  document.getElementById('modal-recruit').classList.add('open');
}

function closeRecruit(){document.getElementById('modal-recruit').classList.remove('open');}

function recruit(i){
  const p=recruitPool[i];
  const cost=calcRecruitCost(p.cost);
  if(G.money<cost){toast('资金不足 '+cost+' 万！','error');return;}
  const rate=recruitAcceptRate(p);
  if(rate<100&&Math.floor(Math.random()*100)>=rate){
    pushFeed('😔',p.name+' 婉拒了签约邀请（接受率'+rate+'%）','bad');
    toast('😔 '+p.name+' 婉拒了邀请，认为公司知名度还不够高（接受率'+rate+'%）','error');
    return;
  }
  G.money-=cost;
  G.scoutedPool=(G.scoutedPool||[]).filter(sp=>sp.name!==p.name);
  const {isScouted,source,scoutedAt,expiresAt,startFans,...artistData}=p;
  const newArtist={...artistData,status:'训练中',fans:startFans||Math.floor(Math.random()*3+1),alias:'',direction:null,totalIncome:0,totalGrossIncome:0,totalArtistShare:0,totalCost:cost,companyShare:defaultCompanyShare(artistData),pr:60,energy:100,contractEnd:G.month+recruitContractMonths,lastFanOp:0,personalGoals:[]};
  assignTrait(newArtist);
  G.artists.push(newArtist);
  addLog('签约'+p.name+'（'+recruitContractMonths+'个月）','minus',cost);
  checkStarterGoals();
  updateStats();renderArtistList();updateOverview();updateSidebar();saveGame();checkAchievements();maybeRefreshArtistScene();closeRecruit();
  pushFeed('🤝','签约 '+p.name+'（'+p.rarity+'）','good');
  toast('成功签约 '+p.name+'！','success');
}

let profilePoolIdx=-1;

function openSignedArtistProfile(i){
  const p=G.artists[i];
  if(!p) return;
  const avg=Math.round((p.singing+p.dance+p.acting+p.rap)/4);
  const rs=RARITY_STYLE[p.rarity]||RARITY_STYLE['普通'];
  const contractLeft=(p.contractEnd||G.month)-G.month;
  const trait=traitInfo(p);
  const archetype=artistArchetype(p);
  const dreamGoal=artistDreamGoal(p);
  const dreamDone=artistDreamDone(p);
  const singingGap=Math.max(0,76-p.singing);
  const danceGap=Math.max(0,66-p.dance);
  const canDebut=singingGap===0&&danceGap===0;
  const pr=p.pr||60, energy=p.energy??80;
  const mvBonus=G.buildings.mv?.lv>0?1.3:1;
  const prMult=pr>=80?1.3:pr>=60?1:pr>=40?0.7:0.3;
  const workGrossEst=Math.round(((p.singing+p.dance)/12+4)*mvBonus*prMult*traitWorkMult(p));
  const advice=[];
  if(!canDebut) advice.push('优先补足出道门槛：唱功还差 '+singingGap+'，舞蹈还差 '+danceGap+'。');
  if(p.acting>=70) advice.push('演技突出，适合考虑演员路线或影视类活动。');
  if(p.singing>=70) advice.push('唱功较强，适合音乐发行和歌手路线。');
  if(p.trait==='variety') advice.push('综艺感特质适合频繁安排对外业务。');
  if(p.trait==='sensitive') advice.push('玻璃心需要维持口碑，低口碑时不宜高强度工作。');
  if(energy<=30) advice.push('当前精力偏低，建议先休息。');
  if(!advice.length) advice.push('状态稳定，可以根据公司阶段安排训练、工作或内容发行。');
  document.getElementById('artist-profile-content').innerHTML=`
  <div style="background:linear-gradient(135deg,${p.color},${p.color}99);padding:24px;display:flex;gap:18px;border-radius:20px 20px 0 0;align-items:flex-start">
    <div style="width:110px;height:147px;border-radius:12px;overflow:hidden;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.2)">
      ${artistPhotoHTML(p)}
    </div>
    <div style="flex:1;min-width:0;padding-top:2px">
      <span style="display:inline-block;background:${rs.bg};color:${rs.tc};border:1px solid ${rs.border};font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;margin-bottom:8px">${p.rarity}</span>
      <div style="font-size:26px;font-weight:800;color:#1a1a1a;line-height:1.2;margin-bottom:6px">${displayName(p)}</div>
      ${p.alias?`<div style="font-size:11px;color:#666;margin-bottom:8px">本名：${p.name}</div>`:''}
      <div style="display:inline-flex;background:rgba(255,255,255,.65);padding:3px 10px;border-radius:99px;margin-bottom:12px">
        <span style="font-size:11px;color:#555;font-weight:600">${p.specialty||'综合表演'}</span>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div><div style="font-size:9px;color:#888;margin-bottom:1px">综合均值</div><div style="font-size:20px;font-weight:800;color:#1a1a1a">${avg}</div></div>
        <div><div style="font-size:9px;color:#888;margin-bottom:1px">粉丝</div><div style="font-size:20px;font-weight:800;color:#1a1a1a">${p.fans||0}万</div></div>
        <div><div style="font-size:9px;color:#888;margin-bottom:1px">合同剩余</div><div style="font-size:20px;font-weight:800;color:${contractLeft<=3?'#dc2626':'#1a1a1a'}">${contractLeft}月</div></div>
      </div>
    </div>
  </div>
  <div style="padding:20px;display:flex;flex-direction:column;gap:16px">
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">📋 基本档案</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['年龄',(p.age||'?')+'岁'],['身高',(p.height||'?')+'cm'],['体重',(p.weight||'?')+'kg'],['星座',p.zodiac||'未知'],['家乡',p.hometown||'未知'],['MBTI',p.mbti||'未知']].map(([k,v])=>`
        <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;color:#ccc;margin-bottom:4px">${k}</div>
          <div style="font-size:13px;font-weight:700;color:#1a1a1a">${v}</div>
        </div>`).join('')}
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">🎭 个人特质</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${[['性格',p.personality||'未知'],['特长',p.specialty||'综合表演']].map(([k,v])=>`
        <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;color:#ccc;margin-bottom:3px">${k}</div>
          <div style="font-size:12px;font-weight:600;color:#333">${v}</div>
        </div>`).join('')}
      </div>
      ${trait?`<div style="background:${trait.bg};color:${trait.color};border-radius:10px;padding:10px 14px;margin-bottom:8px">
        <span style="font-size:10px;opacity:.7">系统特质</span>
        <span style="font-size:12px;font-weight:800;margin-left:10px">${trait.name}</span>
        <div style="font-size:11px;margin-top:4px">${trait.desc}</div>
      </div>`:''}
      <div style="background:${archetype.bg};color:${archetype.color};border-radius:10px;padding:10px 14px;margin-bottom:8px">
        <span style="font-size:10px;opacity:.7">个人定位</span>
        <span style="font-size:12px;font-weight:800;margin-left:10px">${archetype.icon} ${archetype.name}</span>
        <div style="font-size:11px;margin-top:4px">${archetype.desc}</div>
      </div>
      <div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;margin-bottom:8px">
        <span style="font-size:10px;color:#ccc">爱好</span>
        <span style="font-size:12px;font-weight:600;color:#333;margin-left:10px">${p.hobby||'未知'}</span>
      </div>
      <div style="background:linear-gradient(135deg,${p.color}55,${p.color}22);border-left:3px solid ${p.tc};border-radius:0 10px 10px 0;padding:12px 14px">
        <div style="font-size:10px;color:#aaa;margin-bottom:4px">✨ 梦想</div>
        <div style="font-size:13px;font-weight:700;color:${p.tc}">${p.dream||'成为更好的艺人'}</div>
      </div>
      <div style="margin-top:8px;background:${dreamDone?'#f0fdf4':'#fffbeb'};border:1px solid ${dreamDone?'#bbf7d0':'#fde68a'};border-radius:10px;padding:10px 14px">
        <div style="font-size:10px;color:${dreamDone?'#166534':'#92400e'};font-weight:800;margin-bottom:4px">${dreamDone?'梦想任务已完成':'梦想任务'}</div>
        <div style="font-size:12px;font-weight:800;color:${dreamDone?'#166534':'#92400e'}">${dreamGoal.title}</div>
        <div style="font-size:11px;color:#666;margin-top:3px">${dreamGoal.desc}</div>
        <div style="font-size:10px;color:#666;font-weight:700;margin-top:5px">${dreamGoal.reward}</div>
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">🎵 演艺能力</div>
      ${[['演唱',p.singing,'#3b82f6'],['舞蹈',p.dance,'#f59e0b'],['演技',p.acting,'#22c55e'],['说唱',p.rap,'#ec4899']].map(([lbl,val,clr])=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <span style="width:30px;font-size:11px;color:#888;font-weight:600">${lbl}</span>
        <div style="flex:1;height:6px;background:#f0ede6;border-radius:99px;overflow:hidden">
          <div style="height:100%;background:${clr};border-radius:99px;width:${val}%"></div>
        </div>
        <span style="width:24px;text-align:right;font-size:13px;font-weight:700;color:#333">${val}</span>
      </div>`).join('')}
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">🧭 经营诊断</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
        <div style="background:${canDebut?'#f0fdf4':'#eff6ff'};border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">出道状态</div>
          <div style="font-size:12px;font-weight:800;color:${canDebut?'#15803d':'#1d4ed8'}">${canDebut?'已达标':'唱+'+singingGap+' / 舞+'+danceGap}</div>
        </div>
        <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">预计月收入</div>
          <div style="font-size:12px;font-weight:800;color:#1a1a1a">${companyIncomeFromGross(workGrossEst,p)}~${companyIncomeFromGross(workGrossEst+8,p)}万</div>
        </div>
        <div style="background:${energy<=30?'#fef2f2':'#f8f9fa'};border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">工作状态</div>
          <div style="font-size:12px;font-weight:800;color:${energy<=30?'#dc2626':'#1a1a1a'}">${energy<=30?'建议休息':'可安排'}</div>
        </div>
      </div>
      <div style="background:#fafaf9;border:1px solid #f0ede6;border-radius:10px;padding:10px 12px;font-size:12px;color:#555;line-height:1.7">
        ${advice.slice(0,3).map(x=>'<div>• '+x+'</div>').join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-top:1px solid #f0ede6;padding-top:14px">
      <button class="btn btn-sm" onclick="profileSetStatus(${i},'训练中')">安排训练</button>
      <button class="btn btn-sm btn-success" onclick="profileSetStatus(${i},'工作中')" ${p.status==='训练中'&&!canDebut?'disabled':''}>安排工作</button>
      <button class="btn btn-sm" onclick="profileSetStatus(${i},'休息中')">安排休息</button>
      <button class="btn btn-sm" onclick="closeArtistProfile();goTo('artists','pr')">打开公关</button>
      <button class="btn btn-sm" onclick="closeArtistProfile();goTo('artists','contracts')">查看合同</button>
      <button class="btn btn-sm" onclick="closeArtistProfile()">关闭</button>
    </div>
  </div>`;
  document.getElementById('modal-artist-profile').classList.add('open');
}

function profileSetStatus(i,status){
  closeArtistProfile();
  setStatus(i,status);
  goTo('artists','train');
}

function openArtistProfile(i){
  profilePoolIdx=i;
  const p=recruitPool[i];
  const cost=calcRecruitCost(p.cost);
  const affordable=G.money>=cost;
  const avg=Math.round((p.singing+p.dance+p.acting+p.rap)/4);
  const rs=RARITY_STYLE[p.rarity]||RARITY_STYLE['普通'];
  const pRate=recruitAcceptRate(p);
  const pRateColor=pRate>=90?'#16a34a':pRate>=70?'#d97706':pRate>=50?'#ea580c':'#dc2626';
  const archetype=artistArchetype(p);
  const dreamGoal=artistDreamGoal(p);
  const pRateHint=pRate<100?'<div style="margin-bottom:8px;padding:7px 12px;border-radius:8px;background:'+pRateColor+'18;border:1px solid '+pRateColor+'44;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:700;color:'+pRateColor+'">💭 接受率 '+pRate+'%</span><span style="font-size:10px;color:#999">'+(pRate>=90?'很可能接受签约':pRate>=70?'暧昧观望，可提升知名度':'可能拒绝，建议提升知名度')+'</span></div>':'';
  const scoutProfileNote=p.isScouted?'<div style="margin-bottom:8px;padding:7px 12px;border-radius:8px;background:#f5f3ff;border:1px solid #ddd6fe;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:700;color:#7c3aed">🔎 星探候选 · '+p.source+'</span><span style="font-size:10px;color:#999">'+Math.max(1,(p.expiresAt||G.month+1)-G.month)+'个月后失效</span></div>':'';
  document.getElementById('artist-profile-content').innerHTML=`
  <div style="background:linear-gradient(135deg,${p.color},${p.color}99);padding:24px;display:flex;gap:18px;border-radius:20px 20px 0 0;align-items:flex-start">
    <div style="width:110px;height:147px;border-radius:12px;overflow:hidden;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.2)">
      ${artistPhotoHTML(p)}
    </div>
    <div style="flex:1;min-width:0;padding-top:2px">
      <span style="display:inline-block;background:${rs.bg};color:${rs.tc};border:1px solid ${rs.border};font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;margin-bottom:8px">${p.rarity}</span>
      <div style="font-size:26px;font-weight:800;color:#1a1a1a;line-height:1.2;margin-bottom:6px">${p.name}</div>
      <div style="display:inline-flex;background:rgba(255,255,255,.65);padding:3px 10px;border-radius:99px;margin-bottom:12px">
        <span style="font-size:11px;color:#555;font-weight:600">${p.specialty}</span>
      </div>
      <div style="display:flex;gap:20px">
        <div><div style="font-size:9px;color:#888;margin-bottom:1px">综合均值</div><div style="font-size:20px;font-weight:800;color:#1a1a1a">${avg}</div></div>
        <div><div style="font-size:9px;color:#888;margin-bottom:1px">基础签约费</div><div style="font-size:20px;font-weight:800;color:${affordable?'#16a34a':'#dc2626'}">${cost}万</div></div>
      </div>
    </div>
  </div>
  <div style="padding:20px;display:flex;flex-direction:column;gap:16px">
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">📋 基本档案</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['年龄',p.age+'岁'],['身高',p.height+'cm'],['体重',p.weight+'kg'],['星座',p.zodiac],['家乡',p.hometown],['MBTI',p.mbti]].map(([k,v])=>`
        <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;color:#ccc;margin-bottom:4px">${k}</div>
          <div style="font-size:13px;font-weight:700;color:#1a1a1a">${v}</div>
        </div>`).join('')}
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">🎭 个人特质</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${[['性格',p.personality],['特长',p.specialty]].map(([k,v])=>`
        <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;color:#ccc;margin-bottom:3px">${k}</div>
          <div style="font-size:12px;font-weight:600;color:#333">${v}</div>
        </div>`).join('')}
      </div>
      <div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;margin-bottom:8px">
        <span style="font-size:10px;color:#ccc">爱好</span>
        <span style="font-size:12px;font-weight:600;color:#333;margin-left:10px">${p.hobby}</span>
      </div>
      <div style="background:linear-gradient(135deg,${p.color}55,${p.color}22);border-left:3px solid ${p.tc};border-radius:0 10px 10px 0;padding:12px 14px">
        <div style="font-size:10px;color:#aaa;margin-bottom:4px">✨ 梦想</div>
        <div style="font-size:13px;font-weight:700;color:${p.tc}">${p.dream}</div>
      </div>
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:${archetype.bg};color:${archetype.color};border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;opacity:.75;margin-bottom:3px">预测定位</div>
          <div style="font-size:12px;font-weight:800">${archetype.icon} ${archetype.name}</div>
          <div style="font-size:10px;margin-top:4px;line-height:1.45">${archetype.desc}</div>
        </div>
        <div style="background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;opacity:.75;margin-bottom:3px">梦想任务</div>
          <div style="font-size:12px;font-weight:800">${dreamGoal.title}</div>
          <div style="font-size:10px;margin-top:4px;line-height:1.45">${dreamGoal.desc}</div>
        </div>
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-bottom:10px">🎵 演艺能力</div>
      ${[['演唱',p.singing,'#3b82f6'],['舞蹈',p.dance,'#f59e0b'],['演技',p.acting,'#22c55e'],['说唱',p.rap,'#ec4899']].map(([lbl,val,clr])=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <span style="width:30px;font-size:11px;color:#888;font-weight:600">${lbl}</span>
        <div style="flex:1;height:6px;background:#f0ede6;border-radius:99px;overflow:hidden">
          <div style="height:100%;background:${clr};border-radius:99px;width:${val}%"></div>
        </div>
        <span style="width:24px;text-align:right;font-size:13px;font-weight:700;color:#333">${val}</span>
      </div>`).join('')}
    </div>
    <div style="border-top:1px solid #f0ede6;padding-top:14px">
      <div style="font-size:11px;color:#ccc;text-align:center;margin-bottom:10px">当前合约期 <strong style="color:#999">${recruitContractMonths}个月</strong>，可在招募列表调整</div>
      ${scoutProfileNote}
      ${pRateHint}
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="closeArtistProfile()" style="flex:1;justify-content:center">← 返回</button>
        <button class="btn ${affordable?'btn-primary':''}" onclick="${affordable?'recruitFromProfile()':''}" ${affordable?'':'disabled'} style="flex:2;justify-content:center;padding:9px;font-size:13px">
          ${affordable?'💼 立即签约 · '+cost+'万':'资金不足 · '+cost+'万'}
        </button>
      </div>
    </div>
  </div>`;
  document.getElementById('modal-artist-profile').classList.add('open');
}

function closeArtistProfile(){
  document.getElementById('modal-artist-profile').classList.remove('open');
  profilePoolIdx=-1;
}

function recruitFromProfile(){
  if(profilePoolIdx<0) return;
  const idx=profilePoolIdx;
  closeArtistProfile();
  recruit(idx);
}

function triggerMonthlyEvents(){
  const results=[];
  const stage=G.fame>=150?'mature':hasPublicArtist()?'debut':'startup';
  const stageLabel={startup:'初创期',debut:'出道期',mature:'成熟期'}[stage];
  const stageFilter=ev=>{
    if(stage==='startup') return !['行业监管突然收紧','财务审计发现漏洞','代言产品翻车','粉圈爆发撕逼','私生活遭曝光'].includes(ev.name);
    if(stage==='debut') return !['财务审计发现漏洞'].includes(ev.name);
    return true;
  };
  // 颁奖典礼邀请：知名度≥150、6个月冷却、概率随知名度增长
  if(G.fame>=150 && G.artists.some(a=>a.status==='已出道'||a.status==='工作中')){
    const cooldown=G.month-(G.lastAwardMonth||0)>=6;
    const chance=Math.min(0.45,0.15+(G.fame-150)*0.001);
    if(cooldown&&Math.random()<chance){
      const eligible=G.artists.filter(a=>a.status==='已出道'||a.status==='工作中');
      const best=eligible.reduce((b,a)=>{
        const sa=(a.singing+a.dance+a.acting)/3,sb=(b.singing+b.dance+b.acting)/3;return sa>sb?a:b;
      });
      const s=(best.singing+best.dance+best.acting)/3;
      const trendMult=hasTrend('music_award')?1.8:1;
      const fameGain=Math.round((100+s*0.8)*trendMult);
      const moneyGain=Math.round((60+s*0.6)*trendMult);
      best.fans=Math.round((best.fans||0)+fameGain*0.4);
      best.pr=Math.min(100,(best.pr||60)+18);
      G.fame+=15; G.money+=moneyGain; G.lastAwardMonth=G.month;
      addLog('颁奖典礼出席','plus',moneyGain);
      results.push({name:'🏆 颁奖典礼邀请',desc:displayName(best)+'受邀出席年度颁奖典礼，荣获大奖！知名度+15 · 收益+'+moneyGain+'万',icon:'🏆',type:'good'});
    }
  }
  if(G.month%3===0){
    const pool=MONTHLY_EVENTS.industry.filter(e=>(!e.check||e.check())&&stageFilter(e));
    if(pool.length){
      const ev=pool[Math.floor(Math.random()*pool.length)];
      const extra=ev.effect();
      results.push({name:ev.name,desc:extra||ev.desc,icon:ev.icon,type:ev.type,stage:stageLabel});
    }
  }
  if(Math.random()<0.15){
    const pool=MONTHLY_EVENTS.company.filter(e=>(!e.check||e.check())&&stageFilter(e));
    if(pool.length){
      const ev=pool[Math.floor(Math.random()*pool.length)];
      const extra=ev.effect();
      results.push({name:ev.name,desc:extra||ev.desc,icon:ev.icon,type:ev.type,stage:stageLabel});
    }
  }
  G.artists.forEach(a=>{
    const _badChance=(hasTrend('scandal_season')?0.20:0.10)*Math.max(0.1,1-(G.buildings.media?.lv||0)*0.08);
    if(Math.random()<_badChance){
      const pool=MONTHLY_EVENTS.artist.filter(e=>(!e.check||e.check(a))&&stageFilter(e));
      if(pool.length){
        const ev=pool[Math.floor(Math.random()*pool.length)];
        const extra=ev.effect(a);
        results.push({name:displayName(a)+' · '+ev.name,desc:extra||ev.desc,icon:ev.icon,type:ev.type,stage:stageLabel});
      }
    }
  });
  return results;
}

function renderLastEvents(){
  const card=document.getElementById('events-card');
  const el=document.getElementById('monthly-events-list');
  if((!G.lastEvents||!G.lastEvents.length)&&!G.lastMonthlyReport){card.style.display='none';return;}
  card.style.display='';
  if(!G.lastEvents||!G.lastEvents.length){
    el.innerHTML='<div style="font-size:12px;color:#999">本月暂无重要事件。</div>';
    return;
  }
  el.innerHTML=G.lastEvents.map((ev,i)=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;${i<G.lastEvents.length-1?'border-bottom:1px solid #f0ede6':''}">
      <span style="font-size:20px;flex-shrink:0;line-height:1.3">${ev.icon}</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:${ev.type==='good'?'#2e7d32':'#c62828'}">${ev.name} ${ev.stage?`<span style="font-size:10px;color:#999;background:#f5f4f0;border-radius:99px;padding:1px 7px;margin-left:4px">${ev.stage}</span>`:''}</div>
        <div style="font-size:12px;color:#666;margin-top:2px">${ev.desc}</div>
      </div>
    </div>
  `).join('');
}

function topMonthLogs(type,limit=4){
  return (G.log||[]).filter(l=>l.month===G.month&&l.type===type)
    .sort((a,b)=>b.val-a.val)
    .slice(0,limit);
}

function closestLongGoals(limit=3){
  return LONG_GOALS.filter(g=>!completedLongGoal(g.id))
    .map(goal=>{
      const p=goal.progress();
      const ratio=Math.max(0,Math.min(1,p.value/p.target));
      return {goal,progress:p,ratio};
    })
    .sort((a,b)=>b.ratio-a.ratio)
    .slice(0,limit);
}

function buildNextMonthAdvice(){
  const items=[];
  const near=closestLongGoals(1)[0];
  if(near&&near.ratio>=0.5) items.push('长期目标「'+near.goal.title+'」已完成 '+near.progress.label+'，可以优先冲刺。');
  const trainee=G.artists.find(a=>a.status==='训练中');
  if(trainee){
    const singingGap=Math.max(0,76-trainee.singing);
    const danceGap=Math.max(0,66-trainee.dance);
    if(singingGap||danceGap) items.push(displayName(trainee)+' 距离出道还差唱功 '+singingGap+'、舞蹈 '+danceGap+'，继续训练最划算。');
  }
  if(G.artists.some(a=>a.status!=='休息中'&&(a.energy??80)<=30)) items.push('先安排低精力艺人休息，避免被迫停工。');
  if((G.pendingBuilds||[]).length) items.push('推进施工中的设施，完工后再追加投资。');
  if((G.pendingReleases||[]).length) items.push('等待制作中作品上线，观察首月收益。');
  if(G.artists.some(a=>a.status==='已出道')) items.push('把已出道艺人安排为工作中，开始产生演出收入。');
  if(!G.releases?.length&&hasPublicArtist()) items.push('考虑制作第一首数字单曲，建立内容收入。');
  if(G.buildings.live.lv===0) items.push('优先建造直播间，补充稳定现金流。');
  if(!items.length) items.push('经营状态稳定，可以规划下一项设施或尝试参加活动赛事。');
  return items.slice(0,3);
}

function createMonthlyReport(income,cost,events){
  const net=income-cost;
  const year=Math.floor((G.month-1)/12)+1;
  const month=((G.month-1)%12)+1;
  const stage=currentCompanyStage();
  const stageProgress=getStageProgress(stage);
  const notableArtists=G.artists.map(a=>({
    name:displayName(a),
    status:a.status,
    fans:a.fans||0,
    energy:a.energy??80,
    pr:a.pr||60,
  })).sort((a,b)=>(b.fans-a.fans)||((a.energy)-(b.energy))).slice(0,3);
  return {
    title:'第'+year+'年'+month+'月 月度简报',
    income,cost,net,
    money:G.money,
    fame:G.fame,
    fans:totalFans(),
    stage:{name:stage.name,done:stageProgress.done,total:stageProgress.total},
    incomeLogs:topMonthLogs('plus',4),
    costLogs:topMonthLogs('minus',4),
    events:(events||[]).slice(0,6),
    training:G.lastTrainingResults||[],
    longGoals:closestLongGoals(3).map(x=>({
      title:x.goal.title,
      desc:x.goal.desc,
      reward:x.goal.reward,
      value:x.progress.value,
      target:x.progress.target,
      label:x.progress.label,
      pct:Math.max(4,Math.min(100,Math.round(x.ratio*100))),
    })),
    artists:notableArtists,
    advice:buildNextMonthAdvice(),
  };
}

function renderMonthlyReport(report){
  if(!report) return '';
  const moneyColor=report.net>=0?'#2e7d32':'#c62828';
  const rows=(list,empty,type)=>list?.length?list.map(l=>`
    <div class="report-row">
      <strong>${l.desc}</strong>
      <span class="${type}">${type==='plus'?'+':'-'}${l.val}万</span>
    </div>`).join(''):`<div class="report-row"><span>${empty}</span><span></span></div>`;
  const eventRows=report.events.length?report.events.map(ev=>`
    <div class="report-event ${ev.name.includes('正式发布')?'release-event':''}">
      <span>${ev.icon}</span>
      <div><strong>${ev.name}</strong><div style="margin-top:2px">${ev.desc}</div></div>
    </div>`).join(''):'<div class="report-row"><span>本月没有重要事件。</span><span></span></div>';
  return `
    <div class="report-head">
      <div>
        <div class="report-title">${report.title}</div>
        <div class="report-sub">阶段：${report.stage.name} · 目标 ${report.stage.done}/${report.stage.total}</div>
      </div>
      <button class="btn btn-sm" onclick="closeMonthlyReport()">✕</button>
    </div>
    <div class="report-body">
      <div class="report-kpis">
        <div class="report-kpi"><div class="report-kpi-label">月收入</div><div class="report-kpi-val">+${report.income}</div></div>
        <div class="report-kpi"><div class="report-kpi-label">月支出</div><div class="report-kpi-val">-${report.cost}</div></div>
        <div class="report-kpi"><div class="report-kpi-label">月净利润</div><div class="report-kpi-val" style="color:${moneyColor}">${report.net>=0?'+':''}${report.net}</div></div>
        <div class="report-kpi"><div class="report-kpi-label">月底资金</div><div class="report-kpi-val">${report.money}</div></div>
      </div>
      <div class="report-section">
        <div class="report-section-title">收入来源</div>
        <div class="report-list">${rows(report.incomeLogs,'本月没有收入记录。','plus')}</div>
      </div>
      <div class="report-section">
        <div class="report-section-title">主要支出</div>
        <div class="report-list">${rows(report.costLogs,'本月没有主要支出。','minus')}</div>
      </div>
      <div class="report-section">
        <div class="report-section-title">艺人状态</div>
        <div class="report-list">${report.artists.length?report.artists.map(a=>`
          <div class="report-row">
            <strong>${a.name} · ${a.status}</strong>
            <span>粉丝 ${a.fans}万 · 精力 ${a.energy} · 口碑 ${a.pr}</span>
          </div>`).join(''):'<div class="report-row"><span>暂无艺人。</span><span></span></div>'}</div>
      </div>
      ${report.training?.length?`<div class="report-section">
        <div class="report-section-title">训练成长</div>
        <div class="report-list">${report.training.map(t=>`
          <div class="report-row">
            <strong>${t.name}</strong>
            <span>${t.summary}</span>
          </div>`).join('')}</div>
      </div>`:''}
      ${report.longGoals?.length?`<div class="report-section">
        <div class="report-section-title">长期目标进度</div>
        <div class="report-goal-list">${report.longGoals.map(g=>`
          <div class="report-goal">
            <div class="report-goal-head"><strong>${g.title}</strong><span>${g.label}</span></div>
            <div class="report-goal-desc">${g.desc}</div>
            <div class="report-goal-bar"><div style="width:${g.pct}%"></div></div>
            <div class="report-goal-reward">${g.reward}</div>
          </div>`).join('')}</div>
      </div>`:''}
      <div class="report-section">
        <div class="report-section-title">重要事件</div>
        ${eventRows}
      </div>
      <div class="report-section">
        <div class="report-section-title">下月建议</div>
        <div class="report-next">${report.advice.map((a,i)=>(i+1)+'. '+a).join('<br>')}</div>
      </div>
    </div>`;
}

function showMonthlyReport(){
  if(!G.lastMonthlyReport){toast('暂无月度简报，推进月份后生成','error');return;}
  document.getElementById('monthly-report-content').innerHTML=renderMonthlyReport(G.lastMonthlyReport);
  document.getElementById('modal-monthly-report').classList.add('open');
}

function closeMonthlyReport(){
  document.getElementById('modal-monthly-report').classList.remove('open');
}

function renderEndingReport(report){
  const g=report.grade;
  const weak=report.weak.length?report.weak:['没有明显短板，可以继续冲击更高评级。'];
  return `
    <div class="ending-head">
      <div>
        <div class="ending-title">${report.reason==='empire'?'终局达成':'阶段经营评价'}</div>
        <div class="ending-sub">第 ${report.month} 月 · 评分 ${report.score}/100 · 你可以继续经营，不会强制结束</div>
      </div>
      <button class="btn btn-sm" onclick="closeEndingReport()">✕</button>
    </div>
    <div class="ending-body">
      <div class="ending-grade" style="background:${g.bg};border-color:${g.border}">
        <div class="ending-rank" style="color:${g.color}">${g.rank}</div>
        <div>
          <div class="ending-grade-title" style="color:${g.color}">${g.title}</div>
          <div class="ending-grade-desc">${g.desc}</div>
        </div>
      </div>
      <div class="ending-kpis">
        <div class="ending-kpi"><div class="ending-kpi-label">知名度</div><div class="ending-kpi-val">${report.fame}</div></div>
        <div class="ending-kpi"><div class="ending-kpi-label">资金</div><div class="ending-kpi-val">${report.money}</div></div>
        <div class="ending-kpi"><div class="ending-kpi-label">出道艺人</div><div class="ending-kpi-val">${report.publicCount}/${report.artistCount}</div></div>
        <div class="ending-kpi"><div class="ending-kpi-label">作品 / 成就</div><div class="ending-kpi-val">${report.releaseCount}/${report.achCount}</div></div>
      </div>
      <div class="report-section">
        <div class="report-section-title">本局亮点</div>
        <div class="ending-list">${report.highlights.map(x=>`<div class="ending-list-row"><span>✓</span><span>${x}</span></div>`).join('')}</div>
      </div>
      <div class="report-section">
        <div class="report-section-title">后续短板</div>
        <div class="ending-list">${weak.map(x=>`<div class="ending-list-row"><span>•</span><span>${x}</span></div>`).join('')}</div>
      </div>
      <div class="ending-actions">
        <button class="btn" onclick="closeEndingReport()">继续经营</button>
        <button class="btn btn-primary" onclick="goTo('overview');closeEndingReport()">回到总览</button>
      </div>
    </div>`;
}

function showEndingReport(report){
  const el=document.getElementById('ending-report-content');
  if(!el) return;
  el.innerHTML=renderEndingReport(report);
  document.getElementById('modal-ending-report').classList.add('open');
}

function closeEndingReport(){
  document.getElementById('modal-ending-report').classList.remove('open');
}

function renderCrisisReport(report){
  return `
    <div class="ending-head">
      <div>
        <div class="ending-title">经营危机</div>
        <div class="ending-sub">这不是强制失败。你可以继续硬扛，也可以选择公司重整。</div>
      </div>
      <button class="btn btn-sm" onclick="closeCrisisReport()">✕</button>
    </div>
    <div class="ending-body">
      <div class="ending-grade">
        <div class="ending-rank">!</div>
        <div>
          <div class="ending-grade-title" style="color:#991b1b">公司进入高风险状态</div>
          <div class="ending-grade-desc">当前经营循环已经不稳定，优先处理现金流、艺人状态和口碑问题。</div>
        </div>
      </div>
      <div class="report-section">
        <div class="report-section-title">危机原因</div>
        <div class="ending-list">${report.reasons.map(x=>`<div class="ending-list-row"><span>⚠</span><span>${x}</span></div>`).join('')}</div>
      </div>
      <div class="report-section">
        <div class="report-section-title">重整效果</div>
        <div class="ending-list">
          <div class="ending-list-row"><span>+</span><span>获得 300 万救助资金，避免直接断档。</span></div>
          <div class="ending-list-row"><span>+</span><span>低口碑艺人恢复到 55，休息中艺人恢复 25 点精力。</span></div>
          <div class="ending-list-row"><span>-</span><span>公司知名度降低 15%，本局会记录一次重整。</span></div>
        </div>
      </div>
      <div class="ending-actions">
        <button class="btn" onclick="closeCrisisReport()">继续硬扛</button>
        <button class="btn btn-primary" onclick="restructureCompany()">公司重整</button>
      </div>
    </div>`;
}

function showCrisisReport(report){
  const el=document.getElementById('crisis-report-content');
  if(!el) return;
  el.innerHTML=renderCrisisReport(report);
  document.getElementById('modal-crisis-report').classList.add('open');
}

function closeCrisisReport(){
  document.getElementById('modal-crisis-report').classList.remove('open');
}

function restructureCompany(){
  G.money+=300;
  G.fame=Math.max(0,Math.round(G.fame*0.85));
  G.restructureCount=(G.restructureCount||0)+1;
  G.crisisState={negativeCashMonths:0,lastShownMonth:G.month};
  G.artists.forEach(a=>{
    if((a.pr||60)<55) a.pr=55;
    if(a.status==='休息中') a.energy=Math.min(100,(a.energy??50)+25);
  });
  addLog('公司重整救助资金','plus',300);
  pushFeed('🛟','公司完成重整：资金+300万，知名度-15%','special');
  closeCrisisReport();
  saveGame();updateStats();updateOverview();renderArtistList();updateSidebar();
  toast('公司重整完成，先稳住现金流。','success');
}

function nextMonth(){
  G.month++;
  gameDay=1;
  G.usedEvents=[];
  G.usedEventArtists={};
  G.lastEvents=[];
  G.lastTrainingResults=[];
  pruneScoutedPool();
  if(!G.businessActions) G.businessActions={month:G.month,count:0,used:{}};
  if(G.businessActions.month!==G.month) G.businessActions={month:G.month,count:0,used:{}};
  let income=0,cost=0;
  updateTrends();
  const agentSalary=(G.agents||[]).reduce((s,id)=>{const ag=agentData(id);return s+(ag?ag.salary:0);},0);
  if(agentSalary>0){cost+=agentSalary;addLog('经纪人团队薪资','minus',agentSalary);}
  // 完成待处理活动
  const doneEvents=(G.pendingEvents||[]).filter(pe=>pe.completeAt<=G.month);
  G.pendingEvents=(G.pendingEvents||[]).filter(pe=>pe.completeAt>G.month);
  doneEvents.forEach(pe=>{
    const ev=pe.timedEventId?TIMED_EVENTS.find(t=>t.id===pe.timedEventId):EVENTS[pe.evIdx];
    if(!ev) return;
    const sel=pe.artistIndices.map(i=>G.artists[i]).filter(Boolean);
    income+=pe.r.money; G.fame+=pe.r.fame;
    addLog(pe.name+' 奖励','plus',pe.r.money);
    const msg=sel.length?ev.apply(sel,pe.r):'';
    if(!(G.completedEventNames||[]).includes(pe.name))(G.completedEventNames=G.completedEventNames||[]).push(pe.name);
    G.lastEvents.push({name:pe.name+' 结果出炉',desc:(msg||'活动圆满结束')+' · 知名度+'+pe.r.fame+' 收益+'+pe.r.money+'万',icon:pe.icon,type:'good'});
  });
  if(doneEvents.length){checkCompanyStages();checkLongGoals();}
  // 完成待处理建设
  const doneBuilds=(G.pendingBuilds||[]).filter(p=>p.completeAt<=G.month);
  G.pendingBuilds=(G.pendingBuilds||[]).filter(p=>p.completeAt>G.month);
  doneBuilds.forEach(p=>{
    const b=G.buildings[p.k];
    if(b) b.lv=p.targetLv;
    G.lastEvents.push({name:b.name+(p.targetLv===1?' 建造完成':' 升级至 Lv.'+p.targetLv),desc:'设施正式投入使用，效果已生效！',icon:b.icon,type:'good'});
  });
  if(doneBuilds.length){checkStarterGoals();checkRouteGoals();}
  // 完成待处理内容发行
  const doneReleases=(G.pendingReleases||[]).filter(r=>r.goLiveAt<=G.month);
  G.pendingReleases=(G.pendingReleases||[]).filter(r=>r.goLiveAt>G.month);
  doneReleases.forEach(r=>{
    const {goLiveAt,productionMonths,...release}=r;
    G.releases.push(release);
    const t=contentTypeInfo(r.type);
    G.lastEvents.push({name:t.icon+' 「'+r.title+'」正式发布',desc:releaseDebutDesc(r),icon:t.icon,type:'good'});
  });
  if(doneReleases.length){checkStarterGoals();checkLongGoals();}
  const lv=G.buildings;
  const cashMult=cashRouteIncomeMult();
  if(lv.live.lv>0){const g=Math.round(lv.live.lv*LIVE_INCOME_PER_LEVEL*cashMult);income+=g;addLog('直播间收入','plus',g);}
  if(lv.merch&&lv.merch.lv>0){const tf=G.artists.reduce((s,a)=>s+(a.fans||0),0);const g=Math.round(tf/100*lv.merch.lv*2*cashMult);if(g>0){income+=g;addLog('商品企划收益','plus',g);}}
  if(lv.health&&lv.health.lv>0) G.artists.filter(a=>a.status==='休息中').forEach(a=>{a.pr=Math.min(100,(a.pr||60)+3);});
  if(lv.lounge&&lv.lounge.lv>0) G.artists.filter(a=>a.status==='休息中').forEach(a=>{a.pr=Math.min(100,(a.pr||60)+1);});
  if(lv.makeup?.lv>0) G.artists.forEach(a=>{a.pr=Math.min(100,(a.pr||60)+(lv.makeup.lv));});
  (G.releases||[]).forEach(r=>{
    const age=G.month-r.releasedAt;
    if(r.type==='doc'&&age>=r.duration) return;
    const mult=age===0?1.5:age===1?1.0:age===2?0.6:0.2;
    const streamBonus=G.streamingDeal&&(r.type==='single'||r.type==='album')?1.5:1;
    const trendContent=(hasTrend('streaming_rise')&&(r.type==='single'||r.type==='album')?1.4:1)*(hasTrend('platform_fee')?0.7:1)*(hasAgent('producer')?1.3:1);
    const g=Math.round(r.baseIncome*mult*streamBonus*trendContent*contentRouteIncomeMult());
    if(r.type==='doc'){G.fame+=Math.max(1,Math.round(mult*4));}
    if(g>0){income+=g;addLog(r.title+' 发行收益','plus',g);}
  });
  G.artists.forEach(a=>{if(a.releaseBusyUntil&&a.releaseBusyUntil<=G.month) delete a.releaseBusyUntil;});
  const exhausted=[];
  G.artists.forEach(a=>{
    if(a.energy===undefined) a.energy=80;
    const energyMult=a.energy>=80?1.1:a.energy<=20?0.6:1.0;
    const eff=(1+(lv.practice.lv*0.2))*(hasTrend('training_boost')?1.4:1)*(hasAgent('trainer')?1.4:1)*traitTrainMult(a)*talentRouteTrainMult();
    if(a.status==='训练中'){
      const before={singing:a.singing,dance:a.dance,acting:a.acting,energy:a.energy};
      const gainS=Math.round(Math.random()*3*eff*energyMult*artistTrainingBias(a,'singing'));
      const gainD=Math.round(Math.random()*3*eff*energyMult*artistTrainingBias(a,'dance'));
      const gainA=Math.round(Math.random()*2*eff*energyMult*artistTrainingBias(a,'acting'));
      a.singing=Math.min(99,a.singing+gainS);
      a.dance=Math.min(99,a.dance+gainD);
      a.acting=Math.min(99,a.acting+gainA);
      const singingGap=Math.max(0,76-a.singing);
      const danceGap=Math.max(0,66-a.dance);
      const totalGain=(a.singing-before.singing)+(a.dance-before.dance)+(a.acting-before.acting);
      let trainingNote=singingGap||danceGap
        ? '距出道：唱功 +'+singingGap+'，舞蹈 +'+danceGap
        : '已达到出道标准';
      if(totalGain>=5) G.lastEvents.push({name:displayName(a)+' 训练进步明显',desc:'唱功 +'+(a.singing-before.singing)+'，舞蹈 +'+(a.dance-before.dance)+'，演技 +'+(a.acting-before.acting)+' · '+trainingNote,icon:'📈',type:'good'});
      (G.lastTrainingResults=G.lastTrainingResults||[]).push({
        name:displayName(a),
        summary:'唱 +'+(a.singing-before.singing)+' / 舞 +'+(a.dance-before.dance)+' / 演 +'+(a.acting-before.acting)+' · '+trainingNote+' · 精力 '+before.energy+'→'+Math.max(0,before.energy-staminaDrain(a,true)),
      });
      if(a.singing>75&&a.dance>65){a.status='已出道';toast(displayName(a)+' 训练达标，成功出道！🎉','success');checkStarterGoals();checkLongGoals();}
      cost+=5; a.totalCost=(a.totalCost||0)+5;
      a.energy=Math.max(0,a.energy-staminaDrain(a,true));
    }
    if(a.status==='工作中'||a.status==='已出道'){
      const mvBonus=lv.mv.lv>0?1.3:1;
      const rehearsalBonus=1+(lv.rehearsal?.lv||0)*0.1+(G.rehearsalBoostMonth===G.month?1.0:0);
      const wardrobeBonus=1+(lv.wardrobe?.lv||0)*0.1;
      const pr=a.pr||60;
      const prMult=pr>=80?1.3:pr>=60?1.0:pr>=40?0.7:0.3;
      let base=(a.singing+a.dance)/12+Math.random()*8;
      if(a.direction==='歌手'&&a.singing>=70) base*=1.25;
      else if(a.direction==='演员'&&a.acting>=70) base*=1.25;
      else if(a.direction==='全能') base*=1.1;
      const economyMult=hasTrend('economy_down')?0.75:1;
      const actingMult=(hasTrend('acting_trend')&&a.acting>=70)?1.4:1;
      const restBoost=a.restedLastMonth?1.15:1;
      const gross=Math.round(base*mvBonus*rehearsalBonus*prMult*economyMult*actingMult*energyMult*traitWorkMult(a)*artistWorkMult(a)*restBoost);
      const share=splitArtistIncome(a,gross);
      income+=share.company; a.fans=Math.round((a.fans||0)+gross/8*wardrobeBonus*traitFanMult(a)*artistFanMult(a));
      if(a.direction==='主持人') G.fame+=2;
      addLog(displayName(a)+' 演出收入（公司'+share.pct+'%）','plus',share.company);
      a.energy=Math.max(0,a.energy-staminaDrain(a));
      a.restedLastMonth=false;
    }
    if(a.status==='休息中'){
      cost+=2; a.totalCost=(a.totalCost||0)+2;
      a.energy=Math.min(100,a.energy+staminaRecovery(a)+talentRouteRestBonus());
      a.restedLastMonth=true;
    }
    if(a.energy<=0&&a.status!=='休息中'){
      a.energy=0; a.status='休息中';
      exhausted.push(a);
    }
    const _pr=a.pr||60;
    if(_pr<40) a._hadCrisis=true;
    if(_pr<40&&(a.fans||0)>0) a.fans=Math.max(0,Math.round((a.fans||0)*0.95));
  });
  G.money+=income-cost;
  G.monthlyIncome=income; G.monthlyCost=cost;
  G.fame+=Math.floor(income/25+1);
  (G.monthlyHistory=G.monthlyHistory||[]).push({month:G.month,income,cost});
  if(G.monthlyHistory.length>24) G.monthlyHistory.shift();
  checkCompanyStages();
  checkLongGoals();
  // 限时活动：过期移除
  const {month:calMonth}=gameCalendar();
  if(!G.timedEvents) G.timedEvents=[];
  const expiredTimed=G.timedEvents.filter(te=>te.expiresAt<=G.month);
  G.timedEvents=G.timedEvents.filter(te=>te.expiresAt>G.month);
  expiredTimed.forEach(te=>{
    const ev=TIMED_EVENTS.find(t=>t.id===te.id);
    if(ev) G.lastEvents.push({name:'⚡ '+ev.name+' 机会错过',desc:'限时活动窗口期已过，此次机会已消失',icon:ev.icon,type:'bad'});
  });
  // 限时活动：随机触发新事件（最多同时2个，每个id不重复触发）
  const activeTimedIds=new Set(G.timedEvents.map(te=>te.id));
  const pendingTimedIds=new Set((G.pendingEvents||[]).filter(pe=>pe.timedEventId).map(pe=>pe.timedEventId));
  if(G.timedEvents.length<2){
    const candidates=TIMED_EVENTS.filter(ev=>{
      if(activeTimedIds.has(ev.id)||pendingTimedIds.has(ev.id)) return false;
      if(ev.yearEnd&&(calMonth<11)) return false;
      return ev.check();
    });
    for(const ev of candidates){
      if(G.timedEvents.length>=2) break;
      if(Math.random()<ev.spawnChance){
        G.timedEvents.push({id:ev.id,spawnedAt:G.month,expiresAt:G.month+2});
        G.lastEvents.push({name:'⚡ 新限时机会：'+ev.name,desc:ev.desc+' · 请在2个月内参加，机会稍纵即逝！',icon:ev.icon,type:'good'});
      }
    }
  }
  G.lastEvents.push(...triggerMonthlyEvents());
  checkArtistDreams();
  exhausted.forEach(a=>G.lastEvents.push({name:displayName(a)+' · 精力耗尽',desc:'长期高强度工作导致精力耗尽，已被迫休息！记得让艺人定期休整。',icon:'😮‍💨',type:'bad'}));
  if(G.month%3===0) doRivalAction();
  if(hasAgent('pr')&&G.artists.length){
    const worst=G.artists.reduce((b,a)=>((a.pr||60)<(b.pr||60)?a:b));
    worst.pr=Math.min(100,(worst.pr||60)+10);
  }
  G.artists.forEach(a=>{
    if(!a.contractEnd) a.contractEnd=G.month+24;
    if(a.contractEnd===G.month&&!a.wantLeave){
      G.lastEvents.push({name:displayName(a)+' 合同到期',desc:'合同已到期！请前往「艺人管理→合同」及时续签，否则艺人将流失',icon:'📋',type:'bad'});
    }
    if(a.contractEnd-G.month===2&&!a.wantLeave){
      G.lastEvents.push({name:displayName(a)+' 合同即将到期',desc:'合同还剩2个月，建议尽快前往合同页面谈判续签',icon:'⏰',type:'bad'});
    }
  });
  // 处理拒绝续签离开的艺人
  const leavingNow=G.artists.filter(a=>a.wantLeave&&(a.leaveDeadline||0)<=G.month);
  leavingNow.forEach(a=>{
    G.lastEvents.push({name:displayName(a)+' 已离开公司',desc:'因续签谈判破裂，'+displayName(a)+'正式离开公司。',icon:'💔',type:'bad'});
    pushFeed('💔',displayName(a)+' 正式离开了公司','bad');
  });
  if(leavingNow.length) G.artists=G.artists.filter(a=>!(a.wantLeave&&(a.leaveDeadline||0)<=G.month));
  updateStats();renderArtistList();updateOverview();updateTips();updateSidebar();renderEvents();maybeRefreshArtistScene();saveGame();checkAchievements();
  startDayTick();
  const{year,month}=gameCalendar();
  const evMsg=G.lastEvents.length?' · '+G.lastEvents.length+'件事件':'';
  // 精力预警推送
  G.artists.forEach(a=>{
    const e=a.energy??80;
    if(a.status!=='休息中'&&e<=30)
      pushFeed('⚡',displayName(a)+' 精力仅剩 '+e+'，建议安排休息','bad');
  });
  // 推送到动态流（逆序插入使最终月度汇总显示在最顶）
  [...G.lastEvents].reverse().forEach(ev=>pushFeed(ev.icon,ev.name,ev.type==='bad'?'bad':ev.type==='good'?'good':'info'));
  const _net=income-cost;
  pushFeed('📅','收入+'+income+'万  支出-'+cost+'万  净'+(_net>=0?'+':'')+_net+'万',_net>=0?'good':'bad');
  G.lastMonthlyReport=createMonthlyReport(income,cost,G.lastEvents);
  checkEndingAndCrisis();
  saveGame();
  showMonthlyReport();
  toast('第'+year+'年'+month+'月结算 ▸ 收入+'+income+'万  支出-'+cost+'万'+evMsg,'success');
}

let gameDay=1, _dayTick=null;

function gameCalendar(){
  const total=G.month-1;
  return{year:Math.floor(total/12)+1,month:(total%12)+1};
}
function daysInGameMonth(){
  const{month}=gameCalendar();
  return[31,28,31,30,31,30,31,31,30,31,30,31][month-1];
}
function updateDateDisplay(){
  const{year,month}=gameCalendar();
  const el=document.getElementById('game-date');
  if(el) el.textContent='第'+year+'年'+month+'月'+gameDay+'日';
}
function startDayTick(){
  if(_dayTick) clearInterval(_dayTick);
  const max=daysInGameMonth();
  _dayTick=setInterval(()=>{
    if(gameDay<max){gameDay++;updateDateDisplay();}
    else{clearInterval(_dayTick);_dayTick=null;nextMonth();}
  },1500);
}

function updateStats(){
  document.getElementById('money').textContent=G.money;
  document.getElementById('fame').textContent=G.fame;
  updateDateDisplay();
}

const BUSINESS_TYPES={
  signing:{
    id:'signing',
    name:'签售会',
    icon:'💝',
    desc:'租赁商场、书店或展馆场地，提升粉丝与口碑。',
    baseCost:35,
    baseReward:28,
    baseFans:8,
    basePR:10,
    energy:18,
    require(){return G.artists.some(a=>a.status==='工作中'||a.status==='已出道');},
    unlock(){return G.artists.length>=1;},
    hint:'需要至少一名出道或工作中的艺人',
  },
  endorsement:{
    id:'endorsement',
    name:'品牌代言',
    icon:'🛍️',
    desc:'对接外部品牌合作，收益高但更看口碑与粉丝匹配。',
    baseCost:20,
    baseReward:45,
    baseFans:4,
    basePR:6,
    energy:14,
    require(){return G.artists.some(a=>(a.fans||0)>=20&&(a.pr||60)>=50);},
    unlock(){return G.artists.length>=1;},
    hint:'至少有一名粉丝和口碑都达标的艺人',
  },
  booking:{
    id:'booking',
    name:'商业演出',
    icon:'🎤',
    desc:'接外部商演和城市活动，稳定赚钱，消耗精力较多。',
    baseCost:0,
    baseReward:38,
    baseFans:3,
    basePR:3,
    energy:22,
    require(){return G.artists.some(a=>a.status==='工作中'||a.status==='已出道');},
    unlock(){return G.artists.some(a=>a.status==='已出道'||a.status==='工作中');},
    hint:'第一位艺人出道后开放',
  }
};

function businessStatus(){
  const used=(G.businessActions&&G.businessActions.used)||{};
  return Object.keys(used).length;
}

function businessEligibleArtists(type){
  return G.artists.filter(a=>{
    if(type==='endorsement') return (a.fans||0)>=20&&(a.pr||60)>=50&&(a.status==='工作中'||a.status==='已出道');
    return a.status==='工作中'||a.status==='已出道';
  });
}

function renderBusiness(){
  const list=document.getElementById('business-list');
  const ready=document.getElementById('business-ready');
  const used=document.getElementById('business-used');
  const count=document.getElementById('business-count');
  if(!list) return;
  if(!G.businessActions) G.businessActions={month:0,count:0,used:{}};
  if(!G.businessActions.used) G.businessActions.used={};
  if(G.businessActions.month!==G.month){
    G.businessActions.month=G.month;
    G.businessActions.count=0;
    G.businessActions.used={};
  }
  const unlocked=Object.values(BUSINESS_TYPES);
  const readyCount=G.artists.filter(a=>a.status==='工作中'||a.status==='已出道').length;
  if(ready) ready.textContent=readyCount;
  if(used) used.textContent=businessStatus();
  if(count) count.textContent=unlocked.length;
  const monthUsed=businessStatus();
  const monthLabel='本月已安排 '+monthUsed+' 单';
  const cards=[
    {
      key:'signing',
      extra:'适合在热度高的月份冲粉丝。',
      scale:'粉丝 +'+BUSINESS_TYPES.signing.baseFans+'万，口碑 +'+BUSINESS_TYPES.signing.basePR,
    },
    {
      key:'endorsement',
      extra:'口碑和粉丝越高，报价越高。',
      scale:'收益高 · 风险低则更稳定',
    },
    {
      key:'booking',
      extra:'适合稳定期持续接单。',
      scale:'收益 +'+BUSINESS_TYPES.booking.baseReward+'万起',
    },
  ];
  list.innerHTML=cards.map(card=>{
    const cfg=BUSINESS_TYPES[card.key];
    const locked=!cfg.unlock();
    const eligible=businessEligibleArtists(card.key);
    const options=eligible.map((a,i)=>`<option value="${G.artists.indexOf(a)}">${displayName(a)} · ${a.fans||0}万粉 · 口碑${a.pr||60}</option>`).join('');
    const selectHtml=eligible.length?`<select id="biz-select-${card.key}" style="width:100%;padding:8px 10px;border:1px solid #d0cec7;border-radius:8px;background:#fff;font-size:12px">${options}</select>`:'<div style="font-size:12px;color:#999;padding:4px 0">暂无合适艺人</div>';
    return `<div class="business-card ${locked?'locked':''}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div style="width:40px;height:40px;border-radius:10px;background:${locked?'#f3f4f6':'#fef3c7'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${cfg.icon}</div>
          <div style="min-width:0">
            <div style="font-size:13px;font-weight:600">${cfg.name}</div>
            <div style="font-size:11px;color:#666;margin-top:2px">${cfg.desc}</div>
          </div>
        </div>
        <div style="font-size:11px;color:${locked?'#c29b00':'#999'};white-space:nowrap">${locked?'未开放':'已开放'}</div>
      </div>
      <div style="font-size:11px;color:#7c3aed;background:#f5f3ff;border:1px solid #ddd6fe;padding:7px 9px;border-radius:8px">${card.scale}</div>
      <div style="font-size:11px;color:#999">${cfg.hint}</div>
      <div style="font-size:11px;color:#666">${card.extra}</div>
      <div style="font-size:11px;color:#999">${monthLabel}</div>
      <div>${selectHtml}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm" onclick="runBusiness('${card.key}')" ${locked||!eligible.length?'disabled':''}>执行业务</button>
      </div>
    </div>`;
  }).join('');
}

function runBusiness(key){
  const cfg=BUSINESS_TYPES[key];
  if(!cfg) return;
  if(!cfg.unlock()){toast('该业务尚未开放','error');return;}
  if(!G.businessActions||G.businessActions.month!==G.month){G.businessActions={month:G.month,count:0,used:{}};}
  if(!G.businessActions.used) G.businessActions.used={};
  if(G.businessActions.used[key]===G.month){toast('该业务本月已安排过了','error');return;}
  if(G.businessActions.count>=3){toast('本月业务次数已满','error');return;}
  const eligible=businessEligibleArtists(key);
  if(!eligible.length){toast('没有合适的艺人可安排','error');return;}
  const select=document.getElementById('biz-select-'+key);
  const idx=select?parseInt(select.value,10):G.artists.indexOf(eligible[0]);
  const a=G.artists[idx];
  if(!a) return;
  const pr=(a.pr||60);
  const fans=(a.fans||0);
  let reward=cfg.baseReward+Math.round(fans*0.25)+(pr>=80?20:pr>=60?10:0);
  let fansGain=cfg.baseFans+Math.round(fans*0.04);
  let prGain=cfg.basePR+Math.max(0,Math.floor((pr-50)/10));
  if(key==='endorsement'){
    reward+=Math.round((fans/5)+(pr>=80?15:0));
    if(pr<60) reward=Math.round(reward*0.8);
  }
  if(key==='signing'){
    reward=Math.round(reward*0.8);
    fansGain+=4;
  }
  if(key==='booking'){
    reward+=Math.round((a.singing+a.dance+a.acting)/6);
  }
  reward=Math.round(reward*traitBusinessMult(a)*artistEventMult(a,cfg.name));
  if(G.money<cfg.baseCost){toast('资金不足 '+cfg.baseCost+'万','error');return;}
  if(cfg.baseCost>0){
    G.money-=cfg.baseCost;
    addLog(cfg.name+' 场地/合作费','minus',cfg.baseCost);
  }
  G.money+=reward;
  G.fame+=Math.max(1,Math.floor(reward/20));
  a.fans=Math.round((a.fans||0)+fansGain);
  a.pr=Math.min(100,(a.pr||60)+prGain);
  a.energy=Math.max(0,(a.energy??80)-cfg.energy);
  G.businessActions.count++;
  G.businessActions.used[key]=G.month;
  addLog(displayName(a)+' · '+cfg.name,'plus',reward);
  pushFeed(cfg.icon,'完成'+cfg.name+'：'+displayName(a)+' 收益+'+reward+'万','good');
  saveGame();
  renderBusiness();
  renderArtistList();
  updateStats();
  updateOverview();
  updateSidebar();
  toast(cfg.name+' 执行成功，收益+'+reward+'万','success');
}

const BUILDING_UNLOCK={
  merch:   { hint:'旗下总粉丝达到10万后解锁', check(){ return G.artists.reduce((s,a)=>s+(a.fans||0),0)>=10; } },
  mv:      { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
  media:   { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
  health:    { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
  lounge:    { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
  legal:     { hint:'签约2名艺人或知名度达到30后解锁', check(){ return G.artists.length>=2||G.fame>=30; } },
  rehearsal: { hint:'第一位艺人出道后解锁',      check(){ return hasPublicArtist(); } },
  wardrobe:  { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
  makeup:    { hint:'签约第一位艺人后解锁',      check(){ return G.artists.length>=1; } },
};

const TAB_UNLOCK=[
  {id:'content',      label:'内容发行',   hint:'签约第一位练习生后解锁',
   check(){return G.artists.length>=1||G.month>=3;}},
  {id:'finance',      label:'财务报表',   hint:'签约第一位练习生后解锁',
   check(){return G.artists.length>=1||G.month>=3;}},
  {id:'events',       label:'活动赛事',   hint:'签约第一位练习生后解锁',
   check(){return G.artists.length>=1||G.month>=3;}},
  {id:'market',       label:'市场动态',   hint:'第一位艺人出道后解锁',
   check(){return G.artists.some(a=>a.status==='已出道'||a.status==='工作中')||G.month>=6;}},
  {id:'achievements', label:'成就中心',   hint:'解锁第一个成就后开放',
   check(){return (G.achievements||[]).length>=1||G.month>=3;}},
  {id:'agents',       label:'经纪人团队', hint:'知名度达到80后解锁',
   check(){return G.fame>=80||G.month>=9;}},
  {id:'rivals',       label:'竞争对手',   hint:'知名度达到150后解锁',
   check(){return G.fame>=150||G.month>=12;}},
];
let _initDone=false;

function updateNavUnlocks(){
  if(!G.unlockedTabs) G.unlockedTabs=[];
  TAB_UNLOCK.forEach(t=>{
    const btn=document.getElementById('nav-'+t.id);
    if(!btn) return;
    const ok=t.check();
    const tracked=G.unlockedTabs.includes(t.id);
    if(ok&&!tracked){
      G.unlockedTabs.push(t.id);
      if(_initDone) toast('🔓 '+t.label+' 已解锁！','success');
    }
    btn.classList.toggle('locked',!ok);
  });
}

function updateSidebar(){
  document.getElementById('artist-count').textContent=G.artists.length;
  const lv=G.fame<200?'⭐ 初创公司':G.fame<800?'⭐⭐ 新兴公司':G.fame<2500?'⭐⭐⭐ 知名公司':G.fame<8000?'⭐⭐⭐⭐ 顶级公司':'🌟 娱乐帝国';
  document.getElementById('company-level').textContent=lv;
  const lowEnergy=G.artists.filter(a=>a.status!=='休息中'&&(a.energy??80)<=30);
  const lowEnergyNames=lowEnergy.map(a=>displayName(a));
  const badge=document.getElementById('artist-energy-badge');
  if(lowEnergy.length){
    badge.textContent=lowEnergy.length;
    badge.title='需休息：'+lowEnergyNames.join('、');
    badge.style.display='';
  } else {
    badge.style.display='none';
    badge.title='';
  }
  const expiringContracts=G.artists.filter(a=>a.wantLeave||((a.contractEnd||G.month+24)-G.month)<=6);
  const cbadge=document.getElementById('artist-contract-badge');
  if(expiringContracts.length){cbadge.textContent=expiringContracts.length;cbadge.style.display='';}
  else cbadge.style.display='none';
  const tb=document.getElementById('tab-badge-train');
  if(tb){
    if(lowEnergy.length){
      tb.textContent=lowEnergy.length;
      tb.title='需休息：'+lowEnergyNames.join('、');
      tb.style.display='';
    } else {
      tb.style.display='none';
      tb.title='';
    }
  }
  const tcb=document.getElementById('tab-badge-contracts');
  if(tcb){if(expiringContracts.length){tcb.textContent=expiringContracts.length;tcb.style.display='';}else tcb.style.display='none';}
  updateNavUnlocks();
}

function updateOverview(){
  const income=G.monthlyIncome||0;
  const cost=G.monthlyCost||0;
  const net=income-cost;
  const lowEnergy=G.artists.filter(a=>a.status!=='休息中'&&(a.energy??80)<=30);
  const lowPr=G.artists.filter(a=>(a.pr||60)<45);
  const expiring=G.artists.filter(a=>a.wantLeave||((a.contractEnd||G.month+24)-G.month)<=3);
  const pendingBuilds=G.pendingBuilds||[];
  const riskCount=lowEnergy.length+lowPr.length+expiring.length;
  document.getElementById('ov-money').textContent=G.money;
  document.getElementById('ov-income').textContent=income;
  document.getElementById('ov-net').textContent=net;
  document.getElementById('ov-net').style.color=net>=0?'#2e7d32':'#c62828';
  document.getElementById('ov-artists').textContent=G.artists.length;
  document.getElementById('ov-fans').textContent=G.artists.reduce((s,a)=>s+(a.fans||0),0);
  document.getElementById('ov-fame').textContent=G.fame;
  document.getElementById('ov-risk').textContent=riskCount;
  document.getElementById('ov-risk').style.color=riskCount?'#c62828':'#2e7d32';
  renderOverviewArtistStatus();
  renderCompanyBadges();
  renderLongGoals();
  renderOverviewTodos({lowEnergy,lowPr,expiring,pendingBuilds});
  renderOverviewTrend();
  const fac=document.getElementById('facility-status');
  const built=Object.entries(G.buildings).filter(([,b])=>b.lv>0);
  const focusKeys=['practice','studio','office','live','lounge','media','rehearsal','merch'];
  const visible=focusKeys.map(k=>[k,G.buildings[k]]).filter(([,b])=>b&&b.lv>0);
  const rows=(pendingBuilds.length?pendingBuilds.map(p=>[p.k,G.buildings[p.k],p]):visible.length?visible:built.slice(0,8));
  fac.innerHTML=rows.length?rows.map(([k,b,p])=>`
    <div class="progress-row">
      <span class="progress-label" style="width:90px">${b.icon} ${b.name}</span>
      <div class="bar-bg"><div class="bar-fill bar-blue" style="width:${(b.lv/b.maxLv)*100}%"></div></div>
      <span class="bar-val" style="width:70px;text-align:right">${p?'施工→Lv.'+p.targetLv:b.lv===0?'未建':'Lv.'+b.lv+'/'+b.maxLv}</span>
    </div>
  `).join(''):'<div style="font-size:12px;color:#999">暂无已建设设施，建议先建造直播间或升级训练室。</div>';
  updateTips();
  renderLastEvents();
}

function renderOverviewArtistStatus(){
  const counts={training:0,debut:0,working:0,resting:0};
  G.artists.forEach(a=>{
    if(a.status==='训练中') counts.training++;
    else if(a.status==='已出道') counts.debut++;
    else if(a.status==='工作中') counts.working++;
    else if(a.status==='休息中') counts.resting++;
  });
  const el=document.getElementById('artist-status-overview');
  if(!el) return;
  el.innerHTML=`
    <div class="overview-kpi-grid">
      <div class="overview-kpi"><div class="overview-kpi-val">${counts.training}</div><div class="overview-kpi-label">训练中</div></div>
      <div class="overview-kpi"><div class="overview-kpi-val">${counts.debut}</div><div class="overview-kpi-label">待安排出道艺人</div></div>
      <div class="overview-kpi"><div class="overview-kpi-val">${counts.working}</div><div class="overview-kpi-label">工作中</div></div>
      <div class="overview-kpi"><div class="overview-kpi-val">${counts.resting}</div><div class="overview-kpi-label">休息中</div></div>
    </div>`;
}

function routeGoalBadgeMeta(goal){
  const route=BUILDING_ROUTES.find(r=>r.id===goal.routeId)||{};
  return {
    icon:route.icon||'🏅',
    routeName:route.name||'经营路线',
    color:route.color||'#475569',
    bg:route.bg||'#f8fafc',
    border:route.border||'#e2e8f0',
  };
}

function renderCompanyBadges(){
  const el=document.getElementById('company-badges-overview');
  if(!el) return;
  const done=ROUTE_GOALS.filter(g=>routeGoalDone(g.id));
  if(done.length){
    el.innerHTML=`<div class="company-badge-list">
      ${done.map(goal=>{
        const m=routeGoalBadgeMeta(goal);
        return `<div class="company-badge" style="background:${m.bg};border-color:${m.border}">
          <div class="company-badge-icon">${m.icon}</div>
          <div>
            <div class="company-badge-name" style="color:${m.color}">${goal.title}</div>
            <div class="company-badge-sub">${m.routeName}已成型</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
    return;
  }
  const next=ROUTE_GOALS.find(g=>!routeGoalDone(g.id));
  const m=routeGoalBadgeMeta(next);
  el.innerHTML=`<div class="company-badge-empty" style="border-color:${m.border};background:${m.bg}">
    <div style="font-size:20px">${m.icon}</div>
    <div>
      <div style="font-size:12px;font-weight:800;color:${m.color}">下一个徽章：${next.title}</div>
      <div style="font-size:11px;color:#666;margin-top:2px;line-height:1.5">${next.reward} · 前往设施建设完成路线任务</div>
    </div>
  </div>`;
}

function renderLongGoals(){
  const el=document.getElementById('long-goals-overview');
  if(!el) return;
  const open=LONG_GOALS.filter(g=>!completedLongGoal(g.id)).slice(0,4);
  if(!open.length){
    el.innerHTML='<div class="long-goal-done">当前长期目标已全部完成，可以继续扩张艺人阵容和设施路线。</div>';
    return;
  }
  el.innerHTML=open.map(goal=>{
    const p=goal.progress();
    const pct=Math.max(4,Math.min(100,Math.round(p.value/p.target*100)));
    return `<div class="long-goal-item">
      <div class="long-goal-head"><span>${goal.title}</span><strong>${p.label}</strong></div>
      <div class="long-goal-desc">${goal.desc}</div>
      <div class="long-goal-bar"><div style="width:${pct}%"></div></div>
      <div class="long-goal-reward">${goal.reward}</div>
    </div>`;
  }).join('');
}

function actionTarget(section,tab){
  return "goTo('"+section+"'"+(tab?",'"+tab+"'":"")+")";
}

function actionCard(id,kind,icon,title,desc,target,cta){
  return {id,kind,icon,title,desc,target,cta:cta||'去处理'};
}

function isSameAction(a,b){
  return a&&b&&(a.id===b.id||a.title===b.title);
}

function firstAvailableEvent(){
  const timed=(G.timedEvents||[]).map(te=>TIMED_EVENTS.find(ev=>ev.id===te.id)).filter(ev=>ev&&ev.check());
  if(timed.length) return timed[0];
  return EVENTS.find(ev=>ev.check());
}

function bestContentTypeForRecommendation(){
  if(!G.artists.some(a=>a.status==='已出道'||a.status==='工作中')) return null;
  const pendingBusy=(G.pendingReleases||[]).length>=2;
  if(pendingBusy) return null;
  return [...CONTENT_TYPES].reverse().find(t=>t.check&&t.check()&&G.money>=t.cost)||null;
}

function getOverviewActionPlan(){
  const risks=[];
  const actions=[];
  const opportunities=[];
  const lowEnergy=G.artists.filter(a=>a.status!=='休息中'&&(a.energy??80)<=30).sort((a,b)=>(a.energy??80)-(b.energy??80));
  const lowPr=G.artists.filter(a=>(a.pr||60)<45).sort((a,b)=>(a.pr||60)-(b.pr||60));
  const expiring=G.artists.filter(a=>a.wantLeave||((a.contractEnd||G.month+24)-G.month)<=3).sort((a,b)=>((a.contractEnd||G.month+24)-G.month)-((b.contractEnd||G.month+24)-G.month));

  lowEnergy.slice(0,2).forEach(a=>risks.push(actionCard(
    'energy-'+a.name,'risk','⚡',
    displayName(a)+' 需要休息',
    '精力只剩 '+(a.energy??80)+'，继续训练或工作容易被迫停工。',
    actionTarget('artists','train'),'安排状态'
  )));
  lowPr.slice(0,2).forEach(a=>risks.push(actionCard(
    'pr-'+a.name,'risk','📢',
    displayName(a)+' 口碑偏低',
    '当前口碑 '+(a.pr||60)+'，收益会打折，低于 40 还会持续掉粉。',
    actionTarget('artists','pr'),'去公关'
  )));
  expiring.slice(0,2).forEach(a=>{
    const remain=(a.contractEnd||G.month+24)-G.month;
    risks.push(actionCard(
      'contract-'+a.name,'risk','📋',
      displayName(a)+(a.wantLeave?' 有离队风险':' 合同临近到期'),
      a.wantLeave?'续签谈判破裂，仍可尝试紧急挽留。':'还剩 '+remain+' 个月，拖久后续签成本和流失风险都会上升。',
      actionTarget('artists','contracts'),'处理合同'
    ));
  });
  if(G.money<100) risks.push(actionCard(
    'cash-low','risk','💰',
    '资金安全线偏低',
    '当前资金低于 100 万，优先安排低成本收益来源，避免同时开太多建设。',
    actionTarget('business'),'找收入'
  ));

  if(!G.artists.length) actions.push(actionCard(
    'recruit-first','stage','👤',
    '签约第一位练习生',
    '没有艺人时，训练、活动和内容发行都无法真正启动。',
    actionTarget('artists'),'去招募'
  ));
  if(G.buildings.live.lv===0) actions.push(actionCard(
    'build-live','stage','📺',
    '建造直播间',
    '直播间提供每月固定收入，能托住早期现金流。',
    actionTarget('buildings'),'去建设'
  ));
  const trainee=G.artists.find(a=>a.status==='训练中');
  if(trainee){
    const singingGap=Math.max(0,76-trainee.singing);
    const danceGap=Math.max(0,66-trainee.dance);
    actions.push(actionCard(
      'train-'+trainee.name,'stage','🎤',
      '推进 '+displayName(trainee)+' 出道',
      singingGap||danceGap?'距离出道还差唱功 '+singingGap+'、舞蹈 '+danceGap+'。':'已达到出道线，推进月份即可完成出道结算。',
      actionTarget('artists','train'),'看训练'
    ));
  }
  const debut=G.artists.find(a=>a.status==='已出道');
  if(debut) actions.push(actionCard(
    'start-work-'+debut.name,'stage','💼',
    '安排 '+displayName(debut)+' 开始工作',
    '已出道但还未进入工作状态，先让艺人产生稳定收入。',
    actionTarget('artists','train'),'安排工作'
  ));
  const contentType=bestContentTypeForRecommendation();
  if(contentType) actions.push(actionCard(
    'release-'+contentType.id,'stage','🎵',
    '发行'+contentType.name,
    '已有出道艺人和制作条件，作品上线后会带来阶段性收益。',
    actionTarget('content'),'去发行'
  ));
  if(G.artists.length<2&&G.money>=120&&publicArtistCount()>=1) actions.push(actionCard(
    'recruit-second','stage','👥',
    '补充第二位艺人',
    '多艺人阵容能打开更多活动和长期目标，避免收入只依赖单人。',
    actionTarget('artists'),'继续招募'
  ));
  const stage=currentCompanyStage();
  const nextStageGoal=stage.goals.find(g=>!g.check());
  if(nextStageGoal&&!actions.some(a=>a.desc.includes(nextStageGoal.text))) actions.push(actionCard(
    'stage-next','stage','🏢',
    '完成阶段目标',
    '当前阶段下一步：'+nextStageGoal.text+'。',
    nextStageGoal.text.includes('宣传')?actionTarget('buildings'):nextStageGoal.text.includes('活动')?actionTarget('events'):nextStageGoal.text.includes('发行')?actionTarget('content'):actionTarget('overview'),
    '查看'
  ));

  const ev=firstAvailableEvent();
  if(ev) opportunities.push(actionCard(
    'event-'+ev.name,'opportunity','🏆',
    ev.name+'可参加',
    (G.timedEvents||[]).some(te=>te.id===ev.id)?'限时机会已出现，错过后会过期。':'条件已满足，可以派艺人换取收益和知名度。',
    actionTarget('events'),'去参加'
  ));
  if((G.activeTrends||[]).some(t=>t.id==='streaming_rise')&&contentType) opportunities.push(actionCard(
    'trend-content','opportunity','📈',
    '市场利好内容发行',
    '流媒体趋势正在提升单曲/专辑收益，适合安排作品上线。',
    actionTarget('content'),'抓机会'
  ));
  if(G.fame>=80&&(G.agents||[]).length===0) opportunities.push(actionCard(
    'hire-agent','opportunity','👔',
    '招募第一位经纪人',
    '经纪人能放大训练、公关或内容效率，适合公司进入扩张期后配置。',
    actionTarget('agents'),'去签约'
  ));
  if((G.pendingBuilds||[]).length) opportunities.push(actionCard(
    'pending-build','opportunity','🔨',
    '等待设施完工',
    (G.pendingBuilds||[]).slice(0,2).map(p=>G.buildings[p.k].name+' 还需 '+Math.max(0,p.completeAt-G.month)+' 月').join('，')+'。',
    actionTarget('buildings'),'看建设'
  ));

  const picked=[];
  [...risks,...actions,...opportunities].forEach(a=>{
    if(picked.length<3&&!picked.some(x=>isSameAction(x,a))) picked.push(a);
  });
  if(!picked.length) picked.push(actionCard(
    'stable','opportunity','✅',
    '经营状态稳定',
    '本月没有紧急问题，可以推进月份，或规划下一项设施、内容和活动。',
    actionTarget('overview'),'留在总览'
  ));

  const stageProgress=getStageProgress(stage);
  const currentGoal=picked[0];
  return {stage,stageProgress,nextStageGoal,currentGoal,actions:picked,risks};
}

function renderOverviewTodos(ctx){
  const plan=getOverviewActionPlan();
  const items=[];
  plan.risks.forEach(a=>items.push([a.icon,a.title+'：'+a.desc,a.target,a.cta]));
  (G.pendingReleases||[]).slice(0,2).forEach(r=>items.push(['🎵','「'+r.title+'」制作中，预计第 '+r.goLiveAt+' 月上线',actionTarget('content'),'查看']));
  ctx.pendingBuilds.slice(0,2).forEach(p=>items.push(['🔨',G.buildings[p.k].name+' 施工中，还需 '+Math.max(0,p.completeAt-G.month)+' 月',actionTarget('buildings'),'查看']));
  if(!items.length) items.push(['✅','暂无紧急事项，可以按「本月重点」规划下一步','','']);
  const el=document.getElementById('todo-overview');
  if(el) el.innerHTML=items.slice(0,6).map(i=>`<div class="todo-item"><span>${i[0]}</span><div style="flex:1">${i[1]}</div>${i[2]?`<button class="btn btn-sm todo-btn" onclick="${i[2]}">${i[3]||'去处理'}</button>`:''}</div>`).join('');
}

function renderOverviewTrend(){
  const el=document.getElementById('trend-overview');
  if(!el) return;
  const history=(G.monthlyHistory||[]).slice(-3);
  if(!history.length){el.innerHTML='<div style="font-size:12px;color:#999">推进月份后显示最近 3 个月经营走势。</div>';return;}
  const max=Math.max(1,...history.flatMap(h=>[h.income,h.cost,Math.abs(h.income-h.cost)]));
  el.innerHTML=history.map(h=>{
    const net=h.income-h.cost;
    return `
      <div class="trend-row"><span>第${h.month}月 收</span><div class="trend-bars"><div class="trend-fill" style="width:${Math.max(4,h.income/max*100)}%;background:#60a5fa"></div></div><span>${h.income}万</span></div>
      <div class="trend-row"><span>第${h.month}月 支</span><div class="trend-bars"><div class="trend-fill" style="width:${Math.max(4,h.cost/max*100)}%;background:#f87171"></div></div><span>${h.cost}万</span></div>
      <div class="trend-row"><span>净利</span><div class="trend-bars"><div class="trend-fill" style="width:${Math.max(4,Math.abs(net)/max*100)}%;background:${net>=0?'#4ade80':'#fb923c'}"></div></div><span>${net}万</span></div>`;
  }).join('');
}

function updateTips(){
  const plan=getOverviewActionPlan();
  const completed=(G.starterGoals||[]).length;
  const stage=plan.stage;
  const stageProgress=plan.stageProgress;
  const stageDone=(G.companyStages||[]).includes(stage.id);
  const stagePct=Math.round(stageProgress.done/stageProgress.total*100);
  const mainAction=plan.currentGoal;
  const actionHtml=`<div class="action-console">
    <div class="action-goal-card">
      <div>
        <div class="action-eyebrow">本月主目标</div>
        <div class="action-goal-title">${mainAction.icon} ${mainAction.title}</div>
        <div class="action-goal-desc">${mainAction.desc}</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="${mainAction.target}">${mainAction.cta}</button>
    </div>
    <div class="action-card-list">
      ${plan.actions.map(a=>`
        <div class="action-card action-${a.kind}">
          <div class="action-icon">${a.icon}</div>
          <div class="action-body">
            <div class="action-title">${a.title}</div>
            <div class="action-desc">${a.desc}</div>
          </div>
          <button class="btn btn-sm action-btn" onclick="${a.target}">${a.cta}</button>
        </div>
      `).join('')}
    </div>
  </div>`;
  const stageHtml=`<div class="company-stage">
    <div class="stage-head">
      <div>
        <div class="stage-eyebrow">公司成长阶段</div>
        <div class="stage-title">${stageDone?'阶段已完成':stage.name}</div>
      </div>
      <div class="stage-count">${stageProgress.done}/${stageProgress.total}</div>
    </div>
    <div class="stage-desc">${stage.desc}</div>
    <div class="stage-bar"><div style="width:${stagePct}%"></div></div>
    <div class="stage-goals">
      ${stage.goals.map(g=>{
        const done=g.check();
        return `<div class="stage-goal ${done?'done':''}"><span>${done?'✓':'○'}</span><span>${g.text}</span></div>`;
      }).join('')}
    </div>
    <div class="stage-reward">${stageDone?'所有当前阶段目标已完成，可以继续扩大经营。':stage.reward}</div>
  </div>`;
  const goalHtml=`<div class="starter-goals">
    <div class="starter-head"><span>起步任务</span><span>${completed}/${STARTER_GOALS.length}</span></div>
    ${STARTER_GOALS.map(g=>{
      const done=(G.starterGoals||[]).includes(g.id);
      return `<div class="starter-goal ${done?'done':''}"><span>${done?'✓':'○'}</span><div><div>${g.title}</div><small>${g.reward}</small></div></div>`;
    }).join('')}
  </div>`;
  const endingProgress=Math.max(2,Math.min(100,Math.round(G.fame/8000*100)));
  const nextReview=G.month<12?12:(Math.floor(G.month/12)+1)*12;
  const crisis=detectCrisis();
  const endingHtml=`<div class="ending-overview ${crisis?'danger':''}">
    <div class="ending-overview-head">
      <div>
        <div class="stage-eyebrow">${G.fame>=8000?'终局目标已完成':'终局目标'}</div>
        <div class="stage-title">${G.fame>=8000?'娱乐帝国达成':'成为娱乐帝国'}</div>
      </div>
      <button class="btn btn-sm" onclick="showEndingReport(createEndingReport('manual'))">查看评价</button>
    </div>
    <div class="stage-desc">${crisis?'当前存在经营危机，请优先处理风险。':'知名度达到 8000 视为本局通关；从第 12 月开始，每 12 个月进行一次年度评级。'} 下一次评级：第 ${nextReview} 月。</div>
    <div class="stage-bar"><div style="width:${endingProgress}%"></div></div>
    <div class="stage-reward">当前知名度 ${G.fame}/8000${G.restructureCount?' · 已重整 '+G.restructureCount+' 次':''}</div>
  </div>`;
  document.getElementById('monthly-tips').innerHTML=actionHtml+endingHtml+stageHtml+goalHtml;
}

function renderFinance(){
  document.getElementById('fin-money').textContent=G.money;
  document.getElementById('fin-income').textContent=G.monthlyIncome;
  document.getElementById('fin-cost').textContent=G.monthlyCost;
  const netEl=document.getElementById('fin-net');
  netEl.textContent=G.monthlyIncome-G.monthlyCost;
  netEl.style.color=G.monthlyIncome-G.monthlyCost>=0?'#2e7d32':'#c62828';

  // 年度统计
  const curYear=Math.ceil(G.month/12)||1;
  const yearStart=(curYear-1)*12+1;
  document.getElementById('fin-year-label').textContent=curYear;
  const yh=(G.monthlyHistory||[]).filter(h=>h.month>=yearStart);
  const yInc=yh.reduce((s,h)=>s+h.income,0);
  const yCost=yh.reduce((s,h)=>s+h.cost,0);
  document.getElementById('fin-year-income').textContent=yInc;
  document.getElementById('fin-year-cost').textContent=yCost;
  const ynEl=document.getElementById('fin-year-net');
  ynEl.textContent=yInc-yCost;
  ynEl.style.color=yInc-yCost>=0?'#2e7d32':'#c62828';



  // 艺人收支明细
  const artEl=document.getElementById('artist-finance-list');
  if(!G.artists.length){
    artEl.innerHTML='<div style="color:#999;font-size:13px">暂无艺人</div>';
  } else {
    const sorted=[...G.artists].sort((a,b)=>((b.totalIncome||0)-(b.totalCost||0))-((a.totalIncome||0)-(a.totalCost||0)));
    artEl.innerHTML=sorted.map((a,i)=>{
      const inc=a.totalIncome||0;
      const gross=a.totalGrossIncome||inc;
      const artistShare=a.totalArtistShare||0;
      const cost=a.totalCost||0;
      const net=inc-cost;
      const maxBar=Math.max(inc,cost,1);
      return `<div style="padding:12px 0;${i<sorted.length-1?'border-bottom:1px solid #f0ede6':''}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="avatar" style="background:${a.color};color:${a.tc};width:34px;height:34px;font-size:12px">${a.abbr}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${displayName(a)}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">
              <span class="status-badge ${statusCls(a.status)}" style="font-size:10px">${a.status}</span>
              <span style="font-size:10px;color:#3730a3;background:#eef2ff;border-radius:99px;padding:2px 7px;font-weight:600">公司${getCompanyShare(a)}%</span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:700;color:${net>=0?'#2e7d32':'#c62828'}">${net>=0?'+':''}${net}万</div>
            <div style="font-size:10px;color:#999">净贡献</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div style="font-size:10px;color:#2e7d32;font-weight:500;margin-bottom:3px">公司累计收入 ${inc}万</div>
            <div style="height:5px;background:#f0ede6;border-radius:99px;overflow:hidden">
              <div style="height:100%;background:#16a34a;border-radius:99px;width:${Math.round(inc/maxBar*100)}%"></div>
            </div>
            <div style="font-size:9px;color:#999;margin-top:3px">总流水 ${gross}万 · 艺人分成 ${artistShare}万</div>
          </div>
          <div>
            <div style="font-size:10px;color:#c62828;font-weight:500;margin-bottom:3px">累计成本 ${cost}万</div>
            <div style="height:5px;background:#f0ede6;border-radius:99px;overflow:hidden">
              <div style="height:100%;background:#dc2626;border-radius:99px;width:${Math.round(cost/maxBar*100)}%"></div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // 收支记录
  const log=document.getElementById('income-log');
  if(!G.log.length){log.innerHTML='<div style="font-size:13px;color:#999">暂无记录</div>';return;}
  log.innerHTML=G.log.slice().reverse().map(l=>`
    <div class="log-item">
      <span style="color:#666">${l.desc}</span>
      <span class="${l.type==='plus'?'log-plus':'log-minus'}">${l.type==='plus'?'+':'-'}${l.val}万</span>
    </div>
  `).join('');
}

function addLog(desc,type,val){
  G.log.push({desc,type,val:Math.round(val),month:G.month});
  if(G.log.length>50) G.log.shift();
}

function toast(msg,type='success'){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast toast-'+type+' show';
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2800);
}

document.getElementById('modal-recruit').addEventListener('click',function(e){if(e.target===this)closeRecruit();});
document.getElementById('modal-artist-profile').addEventListener('click',function(e){if(e.target===this)closeArtistProfile();});
document.getElementById('modal-renew-contract').addEventListener('click',function(e){if(e.target===this)closeRenewModal();});
document.getElementById('modal-alias').addEventListener('click',function(e){if(e.target===this)closeAliasEdit();});
document.getElementById('modal-direction').addEventListener('click',function(e){if(e.target===this)closeDirectionSelect();});
document.getElementById('modal-event').addEventListener('click',function(e){if(e.target===this)closeEventModal();});
document.getElementById('modal-monthly-report').addEventListener('click',function(e){if(e.target===this)closeMonthlyReport();});
document.getElementById('modal-ending-report').addEventListener('click',function(e){if(e.target===this)closeEndingReport();});
document.getElementById('modal-crisis-report').addEventListener('click',function(e){if(e.target===this)closeCrisisReport();});
document.getElementById('alias-input').addEventListener('keydown',function(e){if(e.key==='Enter')saveAlias();});

init();
