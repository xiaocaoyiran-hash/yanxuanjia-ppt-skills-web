# PPT Skills 图鉴 · 运营使用版

227 个 AI 幻灯片 skill，按「输出路线 → 能力 → 许可 → 风格样图」一页挑对。
数据源：`brycewang-stanford/many-ppt-skills` 登记册（CC BY 4.0）。

## 两大能力

1. **实时同步 GitHub 最新数据** — 顶栏与首页徽章均有「↻ 同步 GitHub」按钮，一键拉取编译后的最新数据集（源自 many-ppt-skills 登记册，含 star / 综合分 / 能力矩阵 / 风格样图），前端即时重渲染，并用 `localStorage` 缓存，断网也能看上次同步结果。
2. **数据源仓库直链** — 首页徽章与页脚均链接到 <https://github.com/brycewang-stanford/many-ppt-skills>，可溯源自更新、提交 issue。

## 本地预览

```bash
cd yanxuanjia-ppt-skills-web
python -m http.server 8099 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8099/>

> 必须用 HTTP 打开，直接双击 `index.html`（file://）时浏览器会拦截部分本地资源。

## 结构

```
yanxuanjia-ppt-skills-web/
├── index.html            唯一入口，hash 路由 #home / #skills / #gallery
├── data/skills.json      结构化数据源（meta + routeMeta + capMeta + skills 227）
├── assets/
│   ├── css/app.css       品牌化样式，light-first
│   ├── js/data.js        由 skills.json 生成的运行时副本，勿手改
│   ├── js/app.js         路由 / 筛选 / 搜索 / 抽屉 / 图库 / 复制 / 实时同步
│   ├── brand/            logo.png（浅色用）+ logo-reverse.png（深色用）
│   └── img/              534 张项目公开样图，全相对路径
├── deploy-gh.sh          一键发布 GitHub Pages
├── .nojekyll
└── .gitignore
```

## 品牌

| 用途 | 值 |
|---|---|
| 品牌标准色 | `#11af8e` |
| 品牌辅助色 | `#fcd058`、`#8fd3f5` |
| 浅色主题 / 深色主题 | 普通 logo / 反白 logo |

## 许可

- 登记册数据来源 `brycewang-stanford/many-ppt-skills`，CC BY 4.0，页脚保留来源链接。
- 样图来自各项目 README，版权归原作者。
- 综合分按公开数据计算，不是实测质量排名。
- `Guizang PPT Skill` 为 AGPL-3.0，对外产品中慎用。

## 部署（GitHub Pages）

```bash
gh auth login          # 首次
bash deploy-gh.sh      # 建仓 + 推送 + 开 Pages
```

目标地址：`https://xiaocaoyiran-hash.github.io/yanxuanjia-ppt-skills-web/`

后续更新同样只需 `bash deploy-gh.sh`。
