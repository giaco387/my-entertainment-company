const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'index.html');

function fail(message) {
  console.error('check failed: ' + message);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function checkHtmlReferences() {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const refs = [
    ...html.matchAll(/<link[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
  ].map(match => match[1]).filter(src => !/^https?:\/\//.test(src));

  assert(refs.includes('styles.css'), 'index.html must load styles.css');
  assert(refs.includes('app.js'), 'index.html must load app.js');
  refs.forEach(ref => {
    assert(fs.existsSync(path.join(ROOT, ref)), 'missing referenced asset: ' + ref);
  });

  const feedIndex = html.indexOf('id="feed-panel"');
  const appIndex = html.indexOf('src="app.js"');
  assert(feedIndex >= 0, 'feed panel is missing');
  assert(appIndex > feedIndex, 'app.js should load after feed panel markup');

  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  const expectedScripts = [
    'artists.js',
    'events.js',
    'content.js',
    'achievements.js',
    'market.js',
    'agents.js',
    'app.js',
  ];
  assert(
    expectedScripts.every((script, index) => scripts[index] === script),
    'script loading order changed; app.js depends on data files loaded first',
  );
}

function checkJavaScriptSyntax() {
  const files = fs.readdirSync(ROOT).filter(file => file.endsWith('.js'));
  files.forEach(file => {
    execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'pipe' });
  });
}

function checkActivityRules() {
  const code = read('events.js') + '\nglobalThis.__events = { EVENTS, TIMED_EVENTS };';
  const ctx = {
    G: {
      fame: 80,
      artists: [
        { status: '训练中', singing: 65, dance: 50, acting: 72, rap: 40, fans: 10, pr: 60 },
      ],
    },
    displayName: artist => artist.name || '测试艺人',
  };
  vm.runInNewContext(code, ctx);

  const events = ctx.__events.EVENTS;
  const campus = events.find(event => event.name === '校园歌唱比赛');
  const movie = events.find(event => event.name === '影视剧拍摄');
  const endorsement = events.find(event => event.name === '品牌代言活动');
  const concert = events.find(event => event.name === '演唱会巡演');

  assert(campus && campus.check(), 'qualified trainee should enter campus singing contest');
  assert(movie && movie.check(), 'qualified non-resting artist should enter film shooting');
  assert(endorsement && !endorsement.check(), 'brand endorsement should still require public artist');
  assert(concert && !concert.check(), 'concert tour should still require public artists');

  ctx.G.artists[0].status = '休息中';
  assert(!campus.check(), 'resting artist should not enter campus singing contest');
}

checkHtmlReferences();
checkJavaScriptSyntax();
checkActivityRules();

console.log('All checks passed.');
