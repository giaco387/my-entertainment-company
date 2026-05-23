# 我的娱乐公司 - 开发说明

## 项目概况

这是一个纯前端单页面模拟经营游戏。技术栈是 HTML、CSS 和 Vanilla JS，无构建步骤，也没有第三方运行时依赖。直接用浏览器打开 `index.html` 即可运行。

存档使用 `localStorage`，key 为 `mec_save`。主要游戏状态集中在 `app.js` 的全局对象 `G`。

## 文件结构

| 文件 | 职责 |
|------|------|
| `index.html` | 页面结构、弹窗、动态流容器、脚本加载顺序 |
| `styles.css` | 全局样式、布局、组件样式、响应式规则 |
| `app.js` | 主游戏状态、UI 渲染、月结算、设施、招募、合同、财务等核心逻辑 |
| `artists.js` | 初始艺人池、发展方向配置 |
| `events.js` | 主动活动、限时活动、月度随机事件 |
| `content.js` | 内容发行类型和标题池 |
| `achievements.js` | 成就定义 |
| `market.js` | 市场趋势定义 |
| `agents.js` | 经纪人定义 |
| `check.js` | 轻量自检脚本 |
| `rooms/` | 设施房间图片 |

## 运行和检查

运行游戏：

```bash
# 直接打开 index.html，或用任意静态服务器打开项目目录
```

修改后建议先跑：

```bash
npm run check
```

当前检查会验证：

- `index.html` 引用的本地 CSS/JS 文件存在。
- `app.js` 在动态流 DOM 之后加载。
- 项目内所有 `.js` 文件能通过 `node --check`。
- 活动赛事关键规则没有回退，比如校园歌唱比赛允许合格练习生参加，演唱会仍要求公开艺人。

## 关键状态

`G` 是唯一主要存档对象，常见字段：

| 字段 | 说明 |
|------|------|
| `money` / `fame` / `month` | 资金、知名度、当前月份 |
| `artists` | 已签约艺人 |
| `buildings` | 设施等级、费用、上限 |
| `pendingEvents` / `pendingReleases` / `pendingBuilds` | 进行中的活动、内容和施工 |
| `usedEvents` / `usedEventArtists` | 当月活动限制 |
| `monthlyHistory` / `log` | 财务历史和流水 |
| `feed` / `lastEvents` | 实时动态和本月事件 |
| `achievements` / `completedEventNames` | 成就相关记录 |
| `activeTrends` / `agents` / `rivals` | 市场、经纪人、竞争对手 |

改动存档字段时，要在 `init()` 或 `loadGame()` 的旧存档补全逻辑里补默认值。

## 维护建议

- 配置型内容优先放在独立数据文件，比如活动改 `events.js`，艺人改 `artists.js`。
- UI 结构改 `index.html`，样式改 `styles.css`，核心流程再改 `app.js`。
- 月结算逻辑集中在 `nextMonth()`，它会影响收入、成本、活动完成、随机事件、合同提醒和存档，改动前先确认顺序。
- 新增活动时同时提供 `check()`、`artistCheck()`、`compute()` 和 `apply()`，并考虑是否需要更新 `check.js` 的回归规则。
- 用户能看到的收益建议区分“总流水、公司收入、艺人分成”，不要直接把总流水加入 `G.money`。
