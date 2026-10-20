/* ============================================================
   研选家 · PPT Skills 图鉴 — 交互逻辑（仅外部登记册，支持实时同步）
   数据源：https://github.com/brycewang-stanford/many-ppt-skills
   实时同步：拉取编译后的最新数据集（源自 many-ppt-skills 登记册）
   ============================================================ */
(function () {
  'use strict';

  var BRAND = { name: '研选家', primary: '#11af8e', gold: '#fcd058', sky: '#8fd3f5', deep: '#0b4f45' };
  // 数据源仓库（登记册原始来源）
  var SRC_REPO = 'https://github.com/brycewang-stanford/many-ppt-skills';
  // 实时同步地址：编译后的完整数据集（源于 many-ppt-skills，含 star/评分/能力/样图）
  var SYNC_URL = 'https://raw.githubusercontent.com/newbimai/ppt-skills-web/main/assets/js/data.js';

  var A, SK, CAP, RM;
  function refreshData() {
    A = window.ATLAS || {};
    SK = A.skills || [];
    CAP = A.capMeta || [];
    RM = A.routeMeta || {};
  }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var rvar = function (r) { return 'var(--r-' + (r || 'list') + ')'; };
  var ROUTE_ZH = {
    pptx: '原生 PPTX', html: '网页 HTML', hybrid: '双路线', framework: '运行时',
    templates: '模板库', image: '出图优先', suite: '综合包', list: '清单'
  };
  var routeZh = function (r) { return ROUTE_ZH[r] || (RM[r] ? RM[r].split('—')[0].trim() : r); };
  var tierCls = function (t) { return t === 'S' || t === 'A' || t === 'B' ? 'tier-' + t.toLowerCase() : ''; };
  var LIC_LABEL = { permissive: 'MIT / Apache', copyleft: 'Copyleft', unknown: '未标注' };
  var FRESH_AFTER = '2026-03-01';

  // 图片：local 优先，失败回退 origin（用于同步后新增 skill 的远程样图）
  function imgTag(local, origin, alt, cls) {
    var src = local || origin || '';
    var oe = '';
    if (local && origin && local !== origin) {
      oe = ' onerror="this.onerror=null;this.src=\'' + esc(origin) + '\'"';
    }
    return '<img loading="lazy"' + (cls ? (' class="' + cls + '"') : '') + ' src="' + esc(src) +
      '" alt="' + esc(alt || '') + '"' + oe + '>';
  }

  /* ── 主题 ── */
  var themeBtn = $('#themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var d = document.documentElement, next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next;
    try { localStorage.setItem('atlas-theme', next); } catch (e) {}
  });

  /* ── Toast / 复制 ── */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1900);
  }
  function copy(text, msg) {
    var done = function () { toast(msg || '已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
    } else { fallback(text); done(); }
  }
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy-target]');
    if (c) {
      var t = $('#' + c.getAttribute('data-copy-target'));
      if (t) copy(t.textContent.replace('⧉', '').trim());
    }
    var b = e.target.closest('[data-copy-inline]');
    if (b) copy(b.getAttribute('data-copy-inline'));
  });

  /* ── 页面路由 ── */
  var pages = $$('.page'), navLinks = $$('#mainNav a');
  var valid = ['home', 'skills', 'gallery'];
  function go(name, push) {
    pages.forEach(function (p) { p.classList.toggle('active', p.dataset.page === name); });
    navLinks.forEach(function (a) { a.classList.toggle('on', a.dataset.tab === name); });
    if (push !== false) {
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }
  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); go(a.dataset.tab); });
  });
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) go(g.getAttribute('data-goto'));
  });
  var hash = (location.hash || '').replace('#', '');
  go(valid.indexOf(hash) >= 0 ? hash : 'home', false);
  window.addEventListener('hashchange', function () {
    var h = (location.hash || '').replace('#', '');
    if (valid.indexOf(h) >= 0) go(h, false);
  });

  /* ── 卡片 ── */
  function regCard(s) {
    var cover = s.cover ? imgTag(s.cover.local, s.cover.origin, '') : '';
    cover = cover ? '<div class="cover">' + cover + '</div>' : '';
    var tier = s.tier ? '<span class="chip ' + tierCls(s.tier) + '">' + esc(s.tier) + '</span>' : '';
    var lic = s.license ? '<span class="chip ghost">' + esc(s.license) + '</span>' : '';
    var read = s.handRead ? '<span class="chip owned">核读</span>' : '';
    var stars = s.stars ? '<span class="c-stars">★ ' + esc(s.starsText || s.stars) + '</span>' : '';
    return '<article class="card" data-id="' + esc(s.id) + '" style="--rc:' + rvar(s.route) + '">' +
      cover +
      '<div class="c-top"><div><h4>' + esc(s.name) + '</h4>' +
      '<div class="c-author">' + esc(s.author || '') + (s.repo ? ' · ' + esc(s.repo) : '') + '</div></div>' +
      '<span class="chip" style="background:color-mix(in srgb, ' + rvar(s.route) + ' 16%, transparent);color:' + rvar(s.route) + '">' +
      esc(s.routeLabel || routeZh(s.route)) + '</span></div>' +
      '<p class="c-tag">' + esc(s.tagline || '') + '</p>' +
      '<div class="c-foot">' + tier + read + lic + stars + '</div></article>';
  }

  /* ── 筛选 / 排序 / 搜索 状态 ── */
  var state = { q: '', route: '', tier: '', lic: '', flag: '', caps: [], sort: 'score', limit: 24 };
  var gState = { q: '', limit: 30 };

  function renderChips() {
    var rEl = $('#chipsRoute');
    if (rEl) {
      var routes = Object.keys(RM).filter(function (r) { return SK.some(function (s) { return s.route === r; }); });
      rEl.innerHTML = routes.map(function (r) {
        return '<button class="fchip' + (state.route === r ? ' on' : '') + '" data-route="' + r + '">' +
          esc(routeZh(r)) + ' ' + SK.filter(function (s) { return s.route === r; }).length + '</button>';
      }).join('');
    }
    var tEl = $('#chipsTier');
    if (tEl) tEl.innerHTML = ['S', 'A', 'B'].map(function (t) {
      var n = SK.filter(function (s) { return s.tier === t; }).length;
      return '<button class="fchip' + (state.tier === t ? ' on' : '') + '" data-tier="' + t + '">' + t + ' ' + n + '</button>';
    }).join('');
    var lEl = $('#chipsLic');
    if (lEl) lEl.innerHTML = ['permissive', 'copyleft', 'unknown'].map(function (l) {
      var n = SK.filter(function (s) { return s.licenseClass === l; }).length;
      return '<button class="fchip' + (state.lic === l ? ' on' : '') + '" data-lic="' + l + '">' + LIC_LABEL[l] + ' ' + n + '</button>';
    }).join('');
    var fEl = $('#chipsFlag');
    if (fEl) fEl.innerHTML = [
      { k: 'read', t: '人工核读' },
      { k: 'style', t: '有风格 ID' },
      { k: 'fresh', t: '近半年有更新' }
    ].map(function (f) {
      return '<button class="fchip' + (state.flag === f.k ? ' on' : '') + '" data-flag="' + f.k + '">' + f.t + '</button>';
    }).join('');
    var cEl = $('#chipsCap');
    if (cEl) {
      var keys = CAP.filter(function (c) { return SK.some(function (s) { return s.caps && s.caps[c.key] === 'yes'; }); });
      cEl.innerHTML = keys.map(function (c) {
        return '<button class="fchip' + (state.caps.indexOf(c.key) >= 0 ? ' on' : '') + '" data-cap="' + c.key +
          '" title="' + esc(c.why) + '">' + esc(c.label_zh) + '</button>';
      }).join('');
    }
  }

  function matchQ(s) {
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    return [s.name, s.author, s.repo, s.id, s.tagline, s.taglineEn, s.bestFor,
      (s.highlights || []).join(' '), (s.styleIds || []).join(' '), s.license]
      .join(' ').toLowerCase().indexOf(q) >= 0;
  }
  function filtered() {
    return SK.filter(function (s) {
      if (state.route && s.route !== state.route) return false;
      if (state.tier && s.tier !== state.tier) return false;
      if (state.lic && s.licenseClass !== state.lic) return false;
      if (state.flag === 'read' && !s.handRead) return false;
      if (state.flag === 'style' && !(s.styleIds && s.styleIds.length)) return false;
      if (state.flag === 'fresh' && String(s.pushedAt || '') < FRESH_AFTER) return false;
      for (var i = 0; i < state.caps.length; i++) {
        if (!s.caps || s.caps[state.caps[i]] !== 'yes') return false;
      }
      return matchQ(s);
    }).sort(function (a, b) {
      if (state.sort === 'stars') return (b.stars || 0) - (a.stars || 0);
      if (state.sort === 'name') return String(a.name).localeCompare(String(b.name), 'zh');
      if (state.sort === 'active') return String(b.pushedAt || '').localeCompare(String(a.pushedAt || ''));
      return (b.score && b.score.total || 0) - (a.score && a.score.total || 0);
    });
  }
  function render() {
    var list = filtered(), grid = $('#grid');
    if (!grid) return;
    grid.innerHTML = list.slice(0, state.limit).map(regCard).join('');
    var rc = $('#resultCount'); if (rc) rc.textContent = list.length + ' / ' + SK.length;
    var empty = $('#empty'); if (empty) empty.hidden = list.length > 0;
    var more = $('#moreBtn');
    if (more) {
      more.hidden = list.length <= state.limit;
      more.textContent = '加载更多（还有 ' + Math.max(0, list.length - state.limit) + ' 个）';
    }
  }

  /* ── 图库 ── */
  var GAL = [];
  function renderGallery() {
    var list = GAL.filter(function (g) {
      if (!gState.q) return true;
      return (g.style + ' ' + g.label + ' ' + g.skill).toLowerCase().indexOf(gState.q.toLowerCase()) >= 0;
    });
    var el = $('#giGrid'); if (!el) return;
    el.innerHTML = list.slice(0, gState.limit).map(function (g, i) {
      return '<figure class="gi" data-i="' + i + '">' +
        '<div class="gi-img">' + imgTag(g.src, g.origin, g.label) + '</div>' +
        '<figcaption class="gi-cap"><p>' + esc(g.label) + '</p><div class="row">' +
        (g.style ? '<span class="styleid" data-style="' + esc(g.style) + '" title="点击复制风格 ID">' + esc(g.style) + '</span>' : '') +
        '<span class="from">' + esc(g.skill) + '</span></div></figcaption></figure>';
    }).join('');
    var more = $('#giMore');
    if (more) {
      more.hidden = list.length <= gState.limit;
      more.textContent = '加载更多样图（还有 ' + Math.max(0, list.length - gState.limit) + '）';
    }
    window.__galList = list;
  }

  /* ── 抽屉 ── */
  var drawer = $('#drawer'), scrim = $('#drawerScrim'), dInner = $('#drawerInner');
  function openDrawer(html) {
    dInner.innerHTML = '<button class="dw-close" id="dwClose" aria-label="关闭">✕</button>' + html;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    scrim.hidden = false; document.body.style.overflow = 'hidden';
    var c = $('#dwClose'); if (c) c.addEventListener('click', closeDrawer);
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    scrim.hidden = true; document.body.style.overflow = '';
  }
  if (scrim) scrim.addEventListener('click', closeDrawer);

  function capLabel(k) {
    var c = CAP.filter(function (x) { return x.key === k; })[0];
    return c ? c.label_zh : k;
  }
  function drawReg(s) {
    var caps = CAP.map(function (c) {
      var v = s.caps && s.caps[c.key];
      var cls = v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'un';
      var mark = v === 'yes' ? '支持' : v === 'no' ? '不支持' : '未提及';
      return '<div class="cap ' + cls + '"><i></i>' + esc(c.label_zh) +
        ' <span style="margin-left:auto;opacity:.72">' + mark + '</span></div>';
    }).join('');
    var quotes = s.quotes || {}, qKeys = Object.keys(quotes);
    var quoteHtml = qKeys.length ? '<div class="dw-sec"><h5>原文证据（人工核读）</h5>' + qKeys.map(function (k) {
      return '<div class="quote"><b>' + esc(capLabel(k)) + '</b>' + esc(quotes[k]) + '</div>';
    }).join('') + '</div>' : '';
    var thumbs = (s.images || []).slice(0, 6);
    var thumbHtml = thumbs.length ? '<div class="dw-sec"><h5>样图</h5><div class="dw-thumbs">' +
      thumbs.map(function (im) { return imgTag(im.local, im.origin, im.label); }).join('') + '</div></div>' : '';
    var hl = (s.highlights || []).length ? '<div class="dw-sec"><h5>亮点</h5><ul>' +
      s.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></div>' : '';
    var inst = s.install && (s.install.command || s.install.method) ? (s.install.command || s.install.method) : '';
    var instHtml = inst ? '<div class="dw-sec"><h5>安装 / 触发</h5><div class="inst"><span>' + esc(inst) +
      '</span><button data-copy-inline="' + esc(inst) + '">复制</button></div></div>' : '';
    var styleIds = (s.styleIds || []).filter(function (id) { return !/^(git |python |npx |pip )/.test(id); });
    var styleHtml = styleIds.length ? '<div class="dw-sec"><h5>风格 ID</h5><div class="dw-meta">' +
      styleIds.map(function (id) {
        return '<span class="styleid" data-style="' + esc(id) + '" title="点击复制风格提示词">' + esc(id) + '</span>';
      }).join('') + '</div></div>' : '';

    return '<div class="dw-head"><div><h3>' + esc(s.name) + '</h3>' +
      '<div class="dw-sub">' + esc(s.author || '') + (s.repo
        ? ' · <a href="' + esc(s.url || '') + '" target="_blank" rel="noopener">' + esc(s.repo) + '</a>' : '') + '</div></div></div>' +
      '<p class="dw-tag">' + esc(s.tagline || '') + '</p>' +
      '<div class="dw-meta">' +
        '<span class="chip" style="background:color-mix(in srgb, ' + rvar(s.route) + ' 16%, transparent);color:' + rvar(s.route) + '">' +
        esc(s.routeLabel || routeZh(s.route)) + '</span>' +
        (s.tier ? '<span class="chip ' + tierCls(s.tier) + '">' + esc(s.tier) + '</span>' : '') +
        (s.handRead ? '<span class="chip owned">人工核读</span>' : '') +
        (s.license ? '<span class="chip ghost">' + esc(s.license) + '</span>' : '') +
        (s.stars ? '<span class="chip ghost">★ ' + esc(s.starsText || s.stars) + '</span>' : '') +
        (s.score && s.score.total ? '<span class="chip ghost">综合分 ' + s.score.total + '</span>' : '') +
        (s.pushedAt ? '<span class="chip ghost">更新于 ' + esc(s.pushedAt) + '</span>' : '') +
      '</div>' +
      (s.bestFor ? '<div class="dw-sec"><h5>适合</h5><p style="margin:0;color:var(--text-2);font-size:14px">' + esc(s.bestFor) + '</p></div>' : '') +
      styleHtml + hl + quoteHtml +
      '<div class="dw-sec"><h5>能力</h5><div class="cap-grid">' + caps + '</div></div>' +
      instHtml + thumbHtml +
      (s.url ? '<div class="dw-sec"><a class="btn sm" href="' + esc(s.url) + '" target="_blank" rel="noopener">打开仓库 →</a></div>' : '');
  }

  /* ── 命令面板 ── */
  var pal = $('#palette'), palInput = $('#palInput'), palList = $('#palList'), palIdx = 0, palResults = [];
  function palSearch(q) {
    q = (q || '').toLowerCase();
    return SK.filter(function (s) {
      return !q || (s.name + ' ' + s.tagline + ' ' + s.repo + ' ' + (s.styleIds || []).join(' '))
        .toLowerCase().indexOf(q) >= 0;
    }).slice(0, 18).map(function (s) {
      return { id: s.id, name: s.name, desc: (s.routeLabel || s.route) + ' · ' + (s.license || '') };
    });
  }
  function palRender() {
    palResults = palSearch(palInput.value);
    palIdx = 0;
    palList.innerHTML = palResults.map(function (r, i) {
      return '<div class="pal-item' + (i === 0 ? ' on' : '') + '" data-pi="' + i + '">' +
        '<span class="pi-name">' + esc(r.name) + '</span><span class="pi-desc">' + esc(r.desc) + '</span></div>';
    }).join('') || '<div class="pal-item">没有匹配项</div>';
  }
  function palOpen() { pal.hidden = false; palInput.value = ''; palRender(); setTimeout(function () { palInput.focus(); }, 20); }
  function palClose() { pal.hidden = true; }
  function palChoose(i) {
    var r = palResults[i]; if (!r) return;
    palClose();
    var s = SK.filter(function (x) { return x.id === r.id; })[0];
    if (s) openDrawer(drawReg(s));
  }
  function palMove(d) {
    var items = $$('.pal-item[data-pi]', palList);
    if (!items.length) return;
    palIdx = (palIdx + d + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle('on', i === palIdx); });
    items[palIdx].scrollIntoView({ block: 'nearest' });
  }

  /* ═══════════════ 渲染总入口（可被实时同步重跑） ═══════════════ */
  function renderAll() {
    var counts = (A.meta && A.meta.counts) || {};

    var heroTotal = $('#heroTotal'); if (heroTotal) heroTotal.textContent = SK.length;
    var lede = $('#heroLede');
    if (lede) lede.textContent = '收录 ' + SK.length + ' 个 AI 幻灯片 skill，其中 ' +
      (counts.hand_read || 39) + ' 个人工读过 SKILL.md；按真正决定选择的点对比 —— 输出路线、能力、许可、风格样图，全部是可核对的事实。';

    var statsEl = $('#heroStats');
    if (statsEl) {
      var byRoute = function (r) { return SK.filter(function (s) { return s.route === r; }).length; };
      var imgC = counts.imgCount || (A.meta && A.meta.imgCount) || 534;
      statsEl.innerHTML = [
        { v: SK.length, l: 'skill 总数', cls: 'is-brand' },
        { v: counts.hand_read || 39, l: '人工核读', cls: '' },
        { v: byRoute('html'), l: '网页 HTML', cls: '' },
        { v: byRoute('pptx'), l: '原生 PPTX', cls: '' },
        { v: counts.stars ? Math.round(counts.stars / 1000) + 'k' : '—', l: 'star 合计', cls: '' },
        { v: imgC, l: '风格样图', cls: '' }
      ].map(function (s) {
        return '<div class="stat ' + s.cls + '"><b>' + s.v + '</b><span>' + s.l + '</span></div>';
      }).join('');
    }

    var routesOrder = ['pptx', 'html', 'hybrid', 'image', 'framework', 'templates', 'suite'];
    var heroRoutes = $('#heroRoutes');
    if (heroRoutes) {
      heroRoutes.innerHTML = routesOrder.filter(function (r) { return RM[r]; }).map(function (r) {
        var n = SK.filter(function (s) { return s.route === r; }).length;
        return '<button class="pill" data-route="' + r + '" style="color:' + rvar(r) + '"><i></i>' +
          esc(routeZh(r)) + ' <b>' + n + '</b></button>';
      }).join('');
    }

    var rt = A.routeTable || [], routeCmp = $('#routeCmp');
    if (routeCmp && rt.length) {
      var strip = function (v) {
        return String(v || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '');
      };
      routeCmp.innerHTML = '<div class="rc-row head"><div class="rc-l"></div>' +
        '<div class="rc-col-html">HTML 路线</div><div class="rc-col-pptx">PPTX 路线</div></div>' +
        rt.map(function (row) {
          return '<div class="rc-row"><div class="rc-l">' + esc(strip(row.label)) + '</div>' +
            '<div>' + esc(strip(row.html)) + '</div><div>' + esc(strip(row.pptx)) + '</div></div>';
        }).join('');
    }
    var treeEl = $('#decisionTree');
    if (treeEl) treeEl.textContent = (A.decisionTree || []).join('\n');

    var fg = $('#featuredGrid');
    if (fg) {
      fg.innerHTML = SK.slice().sort(function (a, b) {
        return (b.score && b.score.total || 0) - (a.score && a.score.total || 0);
      }).slice(0, 6).map(regCard).join('');
    }

    renderChips();
    render();

    GAL = [];
    SK.forEach(function (s) {
      (s.images || []).forEach(function (im) {
        GAL.push({ src: im.local || im.origin, origin: im.origin || '', label: im.label || s.name, style: im.style || '', skill: s.name, id: s.id });
      });
    });
    renderGallery();

    var fbEl = $('#footBuilt');
    if (fbEl) {
      fbEl.textContent = (A.meta && A.meta.counts && A.meta.counts.refreshed) ||
        (A.meta && A.meta.builtAt) || '—';
    }
    updateSyncUI();
  }

  /* ═══════════════ 实时同步引擎 ═══════════════ */
  function parseReg(txt) {
    // 优先用沙箱求值（正确处理 JSON 字符串内的花括号）
    try {
      var fn = new Function('window', txt + '\n;return window.REG || window.ATLAS || null;');
      var reg = fn({});
      if (reg && reg.skills && reg.skills.length) return reg;
    } catch (e) {}
    // 退化：取 window.REG = {...} 之后的完整对象（对象位于文件末尾）
    var i = txt.indexOf('window.REG');
    if (i < 0) i = txt.indexOf('window.ATLAS');
    var j = txt.indexOf('{', i < 0 ? 0 : i);
    var end = txt.lastIndexOf('}');
    return JSON.parse(txt.slice(j, end + 1));
  }
  function wrapReg(reg) {
    var meta = Object.assign({}, reg.meta || {});
    meta.total = (meta.counts && meta.counts.total) || (reg.skills ? reg.skills.length : 0);
    meta.sourceUrl = SRC_REPO;
    meta.brand = BRAND;
    return {
      schema: 'ppt-skills-atlas/2',
      syncedAt: new Date().toISOString(),
      builtAt: (reg.meta && reg.meta.builtAt) || '',
      meta: meta, brand: BRAND,
      routeMeta: reg.routeMeta || {}, capMeta: reg.capMeta || [],
      installMethods: reg.installMethods || [], routeTable: reg.routeTable || [],
      decisionTree: reg.decisionTree || [],
      skills: (reg.skills || []).map(function (s) { var c = Object.assign({}, s); c.scope = 'registry'; return c; })
    };
  }
  function setSyncLoading(on) {
    $$('[data-sync]').forEach(function (b) {
      b.disabled = on;
      b.classList.toggle('loading', on);
      if (b.hasAttribute('data-sync-label')) {
        b.textContent = on ? '同步中…' : b.getAttribute('data-sync-label');
      }
    });
  }
  function updateSyncUI() {
    var st = $('#syncState');
    if (st) {
      // 仅当 syncedAt 为实时同步写入的 ISO 时间戳（含 T）才视为「已同步」
      var isLive = !!(A.syncedAt && A.syncedAt.indexOf('T') >= 0);
      if (isLive) {
        st.innerHTML = '已同步 GitHub · 构建于 ' + esc((A.builtAt || '').slice(0, 10) || '最新');
      } else {
        st.innerHTML = '本地快照 · ' + esc((A.meta && A.meta.counts && A.meta.counts.refreshed) || '—');
      }
    }
  }
  function syncFromGitHub() {
    setSyncLoading(true);
    fetch(SYNC_URL, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (txt) {
        var reg = parseReg(txt);
        if (!reg.skills || !reg.skills.length) throw new Error('数据为空');
        var atlas = wrapReg(reg);
        window.ATLAS = atlas;
        try { localStorage.setItem('atlas-data', JSON.stringify(atlas)); } catch (e) {}
        refreshData();
        renderAll();
        toast('已同步 ' + atlas.skills.length + ' 个 skill（GitHub 最新）');
      })
      .catch(function (err) {
        toast('同步失败：' + err.message + '（可继续用本地数据）');
      })
      .then(function () { setSyncLoading(false); });
  }

  /* ── 事件绑定（一次性，作用于常驻元素） ── */
  var heroRoutesEl = $('#heroRoutes');
  if (heroRoutesEl) heroRoutesEl.addEventListener('click', function (e) {
    var p = e.target.closest('[data-route]');
    if (!p) return;
    state.route = p.getAttribute('data-route');
    renderChips(); render();
    go('skills');
  });

  var qEl = $('#q');
  if (qEl) qEl.addEventListener('input', function () { state.q = qEl.value.trim(); state.limit = 24; render(); });
  var sortEl = $('#sortSel');
  if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });

  $$('.filterbar').forEach(function (fb) {
    fb.addEventListener('click', function (e) {
      var b = e.target.closest('.fchip'); if (!b) return;
      var k = Object.keys(b.dataset)[0], v = b.dataset[k];
      if (k === 'route') state.route = state.route === v ? '' : v;
      if (k === 'tier') state.tier = state.tier === v ? '' : v;
      if (k === 'lic') state.lic = state.lic === v ? '' : v;
      if (k === 'flag') state.flag = state.flag === v ? '' : v;
      if (k === 'cap') {
        var i = state.caps.indexOf(v);
        if (i >= 0) state.caps.splice(i, 1); else state.caps.push(v);
      }
      state.limit = 24; renderChips(); render();
    });
  });
  function resetAll() {
    state = { q: '', route: '', tier: '', lic: '', flag: '', caps: [], sort: state.sort, limit: 24 };
    if (qEl) qEl.value = '';
    renderChips(); render();
  }
  if ($('#resetBtn')) $('#resetBtn').addEventListener('click', resetAll);
  if ($('#emptyReset')) $('#emptyReset').addEventListener('click', resetAll);
  if ($('#moreBtn')) $('#moreBtn').addEventListener('click', function () { state.limit += 24; render(); });

  if ($('#gq')) $('#gq').addEventListener('input', function () { gState.q = $('#gq').value.trim(); gState.limit = 30; renderGallery(); });
  if ($('#giMore')) $('#giMore').addEventListener('click', function () { gState.limit += 30; renderGallery(); });

  if ($('#searchTrigger')) $('#searchTrigger').addEventListener('click', palOpen);
  if ($('#ctaSearch')) $('#ctaSearch').addEventListener('click', palOpen);
  if (palInput) palInput.addEventListener('input', palRender);
  if (pal) pal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) return palClose();
    var it = e.target.closest('[data-pi]');
    if (it) palChoose(+it.getAttribute('data-pi'));
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); pal.hidden ? palOpen() : palClose(); return;
    }
    if (!pal.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); palClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); palChoose(palIdx); }
      return;
    }
    if (e.key === 'Escape' && drawer.classList.contains('open')) { closeDrawer(); return; }
    if (e.key === 'Escape' && lb && !lb.hidden) { lb.hidden = true; return; }
    if (e.key === '/' && !typing) {
      if (document.querySelector('.page[data-page="skills"].active')) { e.preventDefault(); $('#q').focus(); }
    }
  });

  /* ── 全局点击委托：卡片 / 图库 / 风格ID / 同步 ── */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbIdx = 0;
  function openLB(i) {
    var list = window.__galList || [];
    if (!list[i]) return;
    lbIdx = i;
    lbImg.src = list[i].src;
    lbCap.textContent = (list[i].style ? list[i].style + ' · ' : '') + list[i].label + ' — ' + list[i].skill;
    lb.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var gi = e.target.closest('.gi');
    if (gi && !e.target.closest('.styleid')) openLB(+gi.dataset.i);
  });
  if ($('#lbClose')) $('#lbClose').addEventListener('click', function () { lb.hidden = true; });
  if ($('#lbPrev')) $('#lbPrev').addEventListener('click', function () {
    var n = (window.__galList || []).length || 1;
    openLB((lbIdx - 1 + n) % n);
  });
  if ($('#lbNext')) $('#lbNext').addEventListener('click', function () {
    var n = (window.__galList || []).length || 1;
    openLB((lbIdx + 1) % n);
  });
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) lb.hidden = true; });

  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-style]');
    if (s) {
      e.stopPropagation();
      var id = s.getAttribute('data-style');
      copy('用 ' + id + ' 这个模板，把【素材】做成一份【页数】页的 deck，面向【受众】，每页字少一点。', '已复制风格提示词：' + id);
    }
  });

  document.addEventListener('click', function (e) {
    var c = e.target.closest('.card');
    if (!c || !c.dataset.id) return;
    var s = SK.filter(function (x) { return x.id === c.dataset.id; })[0];
    if (s) openDrawer(drawReg(s));
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sync]');
    if (b) { e.preventDefault(); syncFromGitHub(); }
  });

  /* ── 初始化：优先使用已同步缓存，否则用本地快照 ── */
  (function loadInitial() {
    var cached = null;
    try { cached = localStorage.getItem('atlas-data'); } catch (e) {}
    if (cached) {
      try {
        var d = JSON.parse(cached);
        if (d && d.skills && d.skills.length) window.ATLAS = d;
      } catch (e) {}
    }
    refreshData();
    renderAll();
  })();
})();
