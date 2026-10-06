/* PM Steps Workbook: core.
 *
 * State, saving, the query API used by sections and graphics, the block renderers,
 * navigation and export. Sections are declared in js/sections/*.js with PM.section({...});
 * see docs/SECTION-API.md for the contract.
 *
 * State shape: { v: 1, f: {fieldKey: value}, t: {tableKey: [rows]}, x: {tableKey: {rowId: {col: value}}} }
 *   f  single fields
 *   t  rows of own tables (each row has a stable _id)
 *   x  values of derived tables (rows come from another table) and fixed-row tables, keyed by row id
 */
(function () {
  'use strict';
  const PM = (window.PM = window.PM || {});
  const S = PM.svg;

  PM.sections = [];
  PM.tables = {};
  PM.fieldSpecs = {};
  PM.examples = [];

  // =====================================================================================
  // Utilities
  // =====================================================================================
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const U = (PM.util = {
    MONTHS,
    esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    clone(o) {
      return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
    },
    uid(prefix) {
      return (prefix || 'r') + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
    },
    isEmpty(v) {
      return v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0);
    },
    dayNum: (iso) => S.dayNum(iso),
    isoOfDay: (n) => S.isoOfDay(n),
    isDate(iso) {
      return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso);
    },
    /** b - a in days (signed), or null. */
    diffDays(a, b) {
      const x = S.dayNum(a);
      const y = S.dayNum(b);
      return x == null || y == null ? null : Math.round(y - x);
    },
    addDays(iso, n) {
      const d = S.dayNum(iso);
      return d == null ? '' : S.isoOfDay(d + n);
    },
    /** Inclusive length of {start, end} in calendar days, or null. */
    spanDays(d) {
      if (!d || !d.start || !d.end) return null;
      return U.diffDays(d.start, d.end) + 1;
    },
    minDate(list) {
      const v = list.filter(U.isDate).sort();
      return v.length ? v[0] : '';
    },
    maxDate(list) {
      const v = list.filter(U.isDate).sort();
      return v.length ? v[v.length - 1] : '';
    },
    /** Days of [aStart, aEnd] that fall inside [bStart, bEnd], inclusive. */
    overlapDays(aStart, aEnd, bStart, bEnd) {
      const s = Math.max(S.dayNum(aStart), S.dayNum(bStart));
      const e = Math.min(S.dayNum(aEnd), S.dayNum(bEnd));
      return e >= s ? e - s + 1 : 0;
    },
    /** ['2026-02', '2026-03', ...] from the month of startISO to the month of endISO. */
    months(startISO, endISO) {
      if (!U.isDate(startISO) || !U.isDate(endISO) || endISO < startISO) return [];
      const out = [];
      let y = +startISO.slice(0, 4);
      let m = +startISO.slice(5, 7);
      const ey = +endISO.slice(0, 4);
      const em = +endISO.slice(5, 7);
      while (y < ey || (y === ey && m <= em)) {
        out.push(y + '-' + String(m).padStart(2, '0'));
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
        if (out.length > 240) break;
      }
      return out;
    },
    monthStart: (ym) => ym + '-01',
    monthEnd(ym) {
      const y = +ym.slice(0, 4);
      const m = +ym.slice(5, 7);
      return S.isoOfDay(Date.UTC(y, m, 1) / 86400000 - 1);
    },
    monthLabel(ym) {
      if (!ym) return '';
      return MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
    },
    monthShort(ym) {
      if (!ym) return '';
      return MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(2, 4);
    },
    fmtDate(iso) {
      if (!U.isDate(iso)) return iso || '';
      return +iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4);
    },
    fmtDateShort(iso) {
      if (!U.isDate(iso)) return iso || '';
      return +iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1];
    },
    /** Parse a number typed by a person: "1,5", "1.234,50", "1,234.50", "40%", "€ 900". */
    num(v) {
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (v == null) return null;
      let s = String(v).trim().replace(/[\s€$£%]|CHF/g, '');
      if (!s) return null;
      if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
      else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
      else s = s.replace(',', '.');
      const n = Number(s);
      return isFinite(n) ? n : NaN;
    },
    fmtNum(n, dec) {
      if (n == null || n === '' || !isFinite(n)) return '';
      const d = dec == null ? (Math.abs(n - Math.round(n)) < 1e-9 ? 0 : Math.abs(n) < 10 ? 2 : 1) : dec;
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    fmtMoney(n, cur) {
      if (n == null || n === '' || !isFinite(n)) return '';
      const whole = Math.abs(n - Math.round(n)) < 1e-9;
      const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
      return (n < 0 ? '−' : '') + (cur || '€') + ' ' + s;
    },
    fmtPct(n) {
      if (n == null || n === '' || !isFinite(n)) return '';
      return U.fmtNum(n, Math.abs(n - Math.round(n)) < 1e-9 ? 0 : 1) + '%';
    },
    sum(list, fn) {
      let t = 0;
      for (const x of list) {
        const v = fn ? fn(x) : x;
        if (typeof v === 'number' && isFinite(v)) t += v;
      }
      return t;
    },
    /** Natural order for WBS codes: 1.2 < 1.10, 1.2 < 1.2.1. */
    codeCmp(a, b) {
      const pa = String(a || '').split('.');
      const pb = String(b || '').split('.');
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        if (pa[i] === undefined) return -1;
        if (pb[i] === undefined) return 1;
        const na = parseInt(pa[i], 10);
        const nb = parseInt(pb[i], 10);
        if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
        if (isNaN(na) || isNaN(nb)) {
          const c = pa[i].localeCompare(pb[i]);
          if (c) return c;
        }
      }
      return 0;
    },
    codeLevel(code) {
      const c = String(code || '').trim().replace(/\.$/, '');
      return c ? c.split('.').length : 0;
    },
    parentCode(code) {
      const c = String(code || '').trim().replace(/\.$/, '');
      const i = c.lastIndexOf('.');
      return i > 0 ? c.slice(0, i) : '';
    },
    /** "1.2.1, 1.3.2 SS; 1.4.1 FS+5" -> [{code, type, lag}] */
    parsePred(str) {
      const out = [];
      String(str || '')
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((part) => {
          const m = /^([0-9]+(?:\.[0-9]+)*)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*(?:d|days?)?$/i.exec(part);
          if (m) out.push({ code: m[1], type: (m[2] || 'FS').toUpperCase(), lag: m[3] ? parseInt(m[3].replace(/\s/g, ''), 10) : 0 });
          else out.push({ code: part, type: 'FS', lag: 0, invalid: true });
        });
      return out;
    },
    /** Type of a WBS line from its code and the codes of the other lines. */
    wbsKind(r, q) {
      const lvl = U.codeLevel(r.code);
      if (!lvl) return '';
      if (lvl === 1) return 'Project';
      if (lvl === 2) return /^\d+\.1$/.test(String(r.code).trim()) ? 'PM phase' : 'Phase';
      const code = String(r.code).trim();
      const hasKids = q.raw('wbs').some((o) => o.code && U.parentCode(o.code) === code);
      return hasKids ? 'Group' : 'Work package';
    },
    debounce(fn, ms) {
      let t = null;
      const d = function () {
        const args = arguments;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), ms);
      };
      d.flush = () => {
        clearTimeout(t);
        fn();
      };
      return d;
    },
  });

  // =====================================================================================
  // Registration
  // =====================================================================================
  PM.defineTable = function (spec) {
    if (!spec || !spec.key) throw new Error('defineTable needs a key');
    PM.tables[spec.key] = Object.assign({}, PM.tables[spec.key] || {}, spec);
    return PM.tables[spec.key];
  };
  PM.defineField = function (spec) {
    if (!spec || !spec.key) throw new Error('defineField needs a key');
    PM.fieldSpecs[spec.key] = Object.assign({}, PM.fieldSpecs[spec.key] || {}, spec);
    return PM.fieldSpecs[spec.key];
  };
  PM.example = function (fragment) {
    PM.examples.push(fragment);
  };
  /** Headline numbers a module offers to the overview: PM.metric('totalCost', {label, kind: 'money'|'number'|'text', fn: q => value, section}). */
  PM.metrics = {};
  PM.metric = function (key, spec) {
    PM.metrics[key] = Object.assign({ key }, spec);
  };
  /** Render functions one module shares with another: PM.graphics.methodPyramid = (q, pal) => svg. */
  PM.graphics = PM.graphics || {};
  PM.section = function (spec) {
    if (!spec || !spec.id) throw new Error('section needs an id');
    if (PM.sections.some((s) => s.id === spec.id)) {
      console.error('Duplicate section id', spec.id);
      return;
    }
    (spec.blocks || []).forEach(registerBlock);
    PM.sections.push(spec);
    PM.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  function registerBlock(b) {
    if (!b) return;
    if (b.type === 'group') {
      (b.blocks || []).forEach(registerBlock);
      return;
    }
    if (b.type === 'table') {
      if (b.columns) {
        if (PM.tables[b.key] && PM.tables[b.key].columns && PM.tables[b.key]._owner !== b) {
          console.warn('Table "' + b.key + '" is defined twice; the first definition is kept.');
        } else {
          PM.defineTable(Object.assign({}, b, { _owner: b }));
        }
      }
    } else if (b.type === 'fields') {
      (b.fields || []).forEach((f) => {
        if (!f.key) return;
        const known = PM.fieldSpecs[f.key];
        if (!known || f.kind || f.compute) PM.defineField(Object.assign({}, known || {}, f));
      });
    } else if (b.type === 'checklist') {
      PM.defineField({ key: b.key, label: b.title || b.key, kind: 'checklist', items: b.items });
    }
  }

  function tableSpec(key) {
    return PM.tables[key] || { key, columns: [] };
  }
  function fieldSpec(key) {
    return PM.fieldSpecs[key] || { key, label: key, kind: 'text' };
  }
  function resolveCols(spec, q) {
    const cols = typeof spec.columns === 'function' ? spec.columns(q) || [] : spec.columns || [];
    return cols;
  }
  function defaultsOf(key) {
    const spec = tableSpec(key);
    return (spec.defaults || []).map((r, i) => Object.assign({ _id: key + '-d' + i }, U.clone(r)));
  }
  PM.tableSpec = tableSpec;
  PM.fieldSpec = fieldSpec;

  // =====================================================================================
  // State
  // =====================================================================================
  const blank = () => ({ v: 1, f: {}, t: {}, x: {} });
  let state = blank();
  let exampleState = null;
  let viewExample = false;
  let ver = 0;
  let qCache = null;

  function normalize(st) {
    const out = blank();
    if (st && typeof st === 'object') {
      if (st.f && typeof st.f === 'object') out.f = U.clone(st.f);
      if (st.t && typeof st.t === 'object') for (const k in st.t) if (Array.isArray(st.t[k])) out.t[k] = U.clone(st.t[k]);
      if (st.x && typeof st.x === 'object') for (const k in st.x) if (st.x[k] && typeof st.x[k] === 'object') out.x[k] = U.clone(st.x[k]);
    }
    for (const k in out.t) out.t[k].forEach((r) => {
      if (!r._id) r._id = U.uid();
    });
    return out;
  }
  function hasContent(st) {
    return !!(st && (Object.keys(st.f).length || Object.keys(st.t).length || Object.keys(st.x).length));
  }
  function buildExample() {
    const st = blank();
    for (const frag of PM.examples) {
      if (frag.f) Object.assign(st.f, U.clone(frag.f));
      if (frag.t) for (const k in frag.t) st.t[k] = U.clone(frag.t[k]);
      if (frag.x) for (const k in frag.x) st.x[k] = Object.assign(st.x[k] || {}, U.clone(frag.x[k]));
    }
    return st;
  }
  function view() {
    return viewExample ? exampleState || (exampleState = buildExample()) : state;
  }

  // =====================================================================================
  // Query API (what sections, computed columns and graphics read)
  // =====================================================================================
  function makeQ(st) {
    const cache = new Map();
    const computing = new Set();
    const q = {
      state: st,
      util: U,
      svg: S,
      example: viewExample,
      readOnly: viewExample,
      /** Field value; computed fields run their compute; empty -> default or fallback. */
      f(key, fallback) {
        const spec = PM.fieldSpecs[key];
        if (spec && spec.compute) {
          try {
            return spec.compute(q);
          } catch (e) {
            console.error('Field compute failed', key, e);
            return '';
          }
        }
        const v = st.f[key];
        if (!U.isEmpty(v)) return v;
        if (spec && spec.default !== undefined) return spec.default;
        return fallback !== undefined ? fallback : '';
      },
      /** Stored rows of an own table, or its template rows if it was never edited. No computed columns. */
      raw(key) {
        const rows = st.t[key];
        if (rows) return rows;
        const k = '__raw:' + key;
        if (!cache.has(k)) cache.set(k, defaultsOf(key));
        return cache.get(k);
      },
      /** Rows of any table with computed columns filled in. Derived rows carry the source fields. */
      rows(key) {
        if (cache.has(key)) return cache.get(key);
        if (computing.has(key)) {
          console.warn('Circular table reference at', key);
          return [];
        }
        computing.add(key);
        const spec = tableSpec(key);
        let base;
        try {
          if (spec.from) {
            const own = st.x[key] || {};
            base = q.rows(spec.from)
              .filter((r) => !spec.filter || spec.filter(r, q))
              .map((sr) => Object.assign({}, sr, own[sr._id] || {}, { _id: sr._id, _src: sr }));
          } else if (spec.fixed) {
            const own = st.x[key] || {};
            const fixed = typeof spec.fixed === 'function' ? spec.fixed(q) : spec.fixed;
            base = fixed.map((fr) => Object.assign({}, fr, own[fr._id] || {}, { _id: fr._id }));
          } else {
            base = q.raw(key).map((r) => Object.assign({}, r));
          }
          const cols = resolveCols(spec, q);
          for (const c of cols) {
            if (!c.compute) continue;
            for (const r of base) {
              try {
                r[c.key] = c.compute(r, q);
              } catch (e) {
                console.error('Compute failed', key + '.' + c.key, e);
                r[c.key] = null;
              }
            }
          }
        } finally {
          computing.delete(key);
        }
        cache.set(key, base);
        return base;
      },
      row(key, id) {
        return q.rows(key).find((r) => r._id === id) || null;
      },
      cols(key) {
        return resolveCols(tableSpec(key), q);
      },
      /** Value, or the template placeholder when the value is empty. */
      label(row, key) {
        if (!row) return '';
        const v = row[key];
        if (!U.isEmpty(v)) return v;
        return (row._ph && row._ph[key]) || '';
      },
      isPlaceholder(row, key) {
        return !!row && U.isEmpty(row[key]) && !!(row._ph && row._ph[key]);
      },
      people() {
        return q.rows('people');
      },
      person(id) {
        return id ? q.people().find((p) => p._id === id) || null : null;
      },
      name(id) {
        const p = q.person(id);
        return p ? p.name || p.initials || q.label(p, 'name') : '';
      },
      initials(id) {
        const p = q.person(id);
        if (!p) return '';
        if (p.initials) return p.initials;
        const n = p.name || '';
        return n.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
      },
      /** People holding a role from PM.ROLES. */
      withRole(role) {
        return q.people().filter((p) => Array.isArray(p.roles) && p.roles.includes(role));
      },
      /** WBS lines that have a code, sorted by code; each row has level and kind. */
      wbs() {
        const k = '__wbs';
        if (!cache.has(k)) cache.set(k, q.rows('wbs').filter((r) => String(r.code || '').trim()).sort((a, b) => U.codeCmp(a.code, b.code)));
        return cache.get(k);
      },
      wbsRow(id) {
        return q.wbs().find((r) => r._id === id) || null;
      },
      wbsByCode(code) {
        code = String(code || '').trim();
        return q.wbs().find((r) => String(r.code).trim() === code) || null;
      },
      wbsLabel(id) {
        const r = q.wbsRow(id);
        return r ? (r.code + ' ' + (q.label(r, 'name') || '')).trim() : '';
      },
      children(code) {
        code = String(code || '').trim();
        return q.wbs().filter((r) => U.parentCode(r.code) === code);
      },
      phases() {
        return q.wbs().filter((r) => r.level === 2);
      },
      /** Work packages: lines on level 3 or deeper that have no children. */
      wps() {
        return q.wbs().filter((r) => r.level >= 3 && r.kind === 'Work package');
      },
      /** Dates of a WBS line: its own schedule entry, else the span of its children. */
      dates(id) {
        const k = '__dates:' + id;
        if (cache.has(k)) return cache.get(k);
        cache.set(k, { start: '', end: '' });
        const r = q.wbsRow(id);
        const own = (st.x.schedule || {})[id] || {};
        let out = { start: own.start || '', end: own.end || '', actualStart: own.actualStart || '', actualEnd: own.actualEnd || '', progress: own.progress, pred: own.pred || '' };
        if (r && (!out.start || !out.end || !out.actualStart || !out.actualEnd)) {
          const kids = q.children(r.code).map((c) => q.dates(c._id));
          if (kids.length) {
            if (!out.start) out.start = U.minDate(kids.map((d) => d.start));
            if (!out.end) out.end = U.maxDate(kids.map((d) => d.end));
            if (!out.actualStart && kids.every((d) => d.actualStart)) out.actualStart = U.minDate(kids.map((d) => d.actualStart));
            if (!out.actualEnd && kids.every((d) => d.actualEnd)) out.actualEnd = U.maxDate(kids.map((d) => d.actualEnd));
          }
        }
        cache.set(k, out);
        return out;
      },
      /** Project start and end: the time boundaries, else the span of the schedule. */
      projectDates() {
        const all = q.wbs().map((r) => q.dates(r._id));
        const ms = q.rows('milestones');
        const start = q.f('time.startDate') || U.minDate(all.map((d) => d.start).concat(ms.map((m) => m.baseline)));
        const end = q.f('time.endDate') || U.maxDate(all.map((d) => d.end).concat(ms.map((m) => m.baseline)));
        return { start, end };
      },
      cur() {
        return q.f('meta.currency') || '€';
      },
      money: (n) => U.fmtMoney(n, q.cur()),
      num: (n, d) => U.fmtNum(n, d),
      pct: (n) => U.fmtPct(n),
      date: (iso) => U.fmtDate(iso),
      /** Display text for any value of a column. */
      fmt(col, v, row) {
        return fmtValue(col, v, q, row);
      },
    };
    return q;
  }
  function Q() {
    if (!qCache || qCache.ver !== ver || qCache.example !== viewExample) qCache = { ver, example: viewExample, q: makeQ(view()) };
    return qCache.q;
  }
  PM.q = Q;

  function optionList(col, q, row) {
    let opts = typeof col.options === 'function' ? col.options(q, row) : col.options || [];
    return (opts || []).map((o) => (typeof o === 'object' ? { value: String(o.value), label: o.label == null ? String(o.value) : String(o.label) } : { value: String(o), label: String(o) }));
  }

  function fmtValue(col, v, q, row) {
    const kind = col.kind || 'text';
    if (U.isEmpty(v) && v !== 0) return '';
    switch (kind) {
      case 'money':
        return U.fmtMoney(v, q.cur());
      case 'number':
        return typeof v === 'number' ? U.fmtNum(v, col.dec) : String(v);
      case 'percent':
        return typeof v === 'number' ? U.fmtPct(v) : String(v);
      case 'date':
        return U.fmtDate(v);
      case 'month':
        return U.monthLabel(v);
      case 'person':
        return q.name(v) || '';
      case 'people':
        return (Array.isArray(v) ? v : [v]).map((id) => q.name(id)).filter(Boolean).join(', ');
      case 'wbs':
        return q.wbsLabel(v);
      case 'multi':
        return Array.isArray(v) ? v.join(', ') : String(v);
      case 'check':
        return v ? 'Yes' : '';
      case 'rating': {
        const opts = optionList(col, q, row);
        const o = opts[Number(v) - 1];
        return o ? o.label : String(v);
      }
      case 'select': {
        const o = optionList(col, q, row).find((x) => x.value === String(v));
        return o ? o.label : String(v);
      }
      default:
        if (typeof v === 'number') return U.fmtNum(v, col.dec);
        return String(v);
    }
  }
  PM.fmtValue = (col, v, row) => fmtValue(col, v, Q(), row);

  // =====================================================================================
  // Mutations
  // =====================================================================================
  const listeners = [];
  function changed(paths, opts) {
    ver += 1;
    paths.forEach((p) => Store.markDirty(p));
    if (!(opts && opts.silent)) listeners.forEach((fn) => fn(paths));
  }
  function guard() {
    if (viewExample) {
      toast('The example is read-only. Turn off “Example” to edit your own file.');
      return false;
    }
    return true;
  }
  function materialize(key) {
    if (!state.t[key]) state.t[key] = defaultsOf(key);
  }
  function isDerived(key) {
    const s = tableSpec(key);
    return !!(s.from || s.fixed);
  }
  const history = [];
  function snapshot(label) {
    history.push({ label, state: U.clone(state) });
    if (history.length > 30) history.shift();
  }
  function restoreSnapshot(snap) {
    const before = state;
    state = snap.state;
    const paths = Store.allPaths(before, state);
    ver += 1;
    paths.forEach((p) => Store.markDirty(p));
    App.rerender();
  }

  const api = (PM.api = {
    setField(key, value) {
      if (!guard()) return;
      const old = state.f[key];
      if (U.isEmpty(value)) {
        if (old === undefined) return;
        delete state.f[key];
      } else {
        if (JSON.stringify(old) === JSON.stringify(value)) return;
        state.f[key] = value;
      }
      changed(['fields']);
    },
    setCell(key, id, col, value) {
      if (!guard()) return;
      if (isDerived(key)) {
        const map = (state.x[key] = state.x[key] || {});
        const o = map[id] || {};
        const old = o[col];
        if (U.isEmpty(value)) {
          if (old === undefined) return;
          delete o[col];
        } else {
          if (JSON.stringify(old) === JSON.stringify(value)) return;
          o[col] = value;
        }
        if (Object.keys(o).length) map[id] = o;
        else delete map[id];
        changed(['links/' + key]);
      } else {
        materialize(key);
        const r = state.t[key].find((x) => x._id === id);
        if (!r) return;
        const old = r[col];
        if (U.isEmpty(value)) {
          if (old === undefined) return;
          delete r[col];
        } else {
          if (JSON.stringify(old) === JSON.stringify(value)) return;
          r[col] = value;
        }
        if (r._ph && !U.isEmpty(value)) delete r._ph[col];
        changed(['tables/' + key]);
      }
    },
    addRow(key, afterId, values) {
      if (!guard() || isDerived(key)) return null;
      materialize(key);
      const row = Object.assign({ _id: U.uid() }, values || {});
      const rows = state.t[key];
      const i = afterId ? rows.findIndex((r) => r._id === afterId) : -1;
      if (i >= 0) rows.splice(i + 1, 0, row);
      else rows.push(row);
      changed(['tables/' + key]);
      return row._id;
    },
    deleteRow(key, id) {
      if (!guard() || isDerived(key)) return;
      materialize(key);
      const rows = state.t[key];
      const i = rows.findIndex((r) => r._id === id);
      if (i < 0) return;
      snapshot('Delete row');
      rows.splice(i, 1);
      changed(['tables/' + key]);
      toastUndo('Row deleted.');
    },
    moveRow(key, id, dir) {
      if (!guard() || isDerived(key)) return;
      materialize(key);
      const rows = state.t[key];
      const i = rows.findIndex((r) => r._id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rows.length) return;
      const tmp = rows[i];
      rows[i] = rows[j];
      rows[j] = tmp;
      changed(['tables/' + key]);
    },
    setRows(key, rows) {
      if (!guard() || isDerived(key)) return;
      state.t[key] = rows.map((r) => Object.assign({ _id: r._id || U.uid() }, r));
      changed(['tables/' + key]);
    },
    sortRows(key, colKey) {
      if (!guard() || isDerived(key)) return;
      materialize(key);
      state.t[key].sort((a, b) => U.codeCmp(a[colKey], b[colKey]));
      changed(['tables/' + key]);
    },
    /** Remove every entry of a section (tables, fields, checklists). Undo is offered. */
    clearSection(sec) {
      if (!guard()) return;
      snapshot('Clear section');
      const paths = new Set();
      walkBlocks(sec, (b) => {
        if (b.type === 'fields') (b.fields || []).forEach((f) => {
          if (state.f[f.key] !== undefined) {
            delete state.f[f.key];
            paths.add('fields');
          }
        });
        if (b.type === 'checklist' && state.f[b.key] !== undefined) {
          delete state.f[b.key];
          paths.add('fields');
        }
        if (b.type === 'table') {
          if (isDerived(b.key)) {
            if (state.x[b.key]) {
              delete state.x[b.key];
              paths.add('links/' + b.key);
            }
          } else if (state.t[b.key]) {
            delete state.t[b.key];
            paths.add('tables/' + b.key);
          }
        }
        if (b.type === 'step' && state.x.steps && state.x.steps[b.step]) {
          delete state.x.steps[b.step];
          paths.add('links/steps');
        }
        if (b.type === 'custom' && b.keys) b.keys.forEach((k) => {
          if (k.startsWith('f:') && state.f[k.slice(2)] !== undefined) {
            delete state.f[k.slice(2)];
            paths.add('fields');
          }
          if (k.startsWith('t:') && state.t[k.slice(2)]) {
            delete state.t[k.slice(2)];
            paths.add('tables/' + k.slice(2));
          }
          if (k.startsWith('x:') && state.x[k.slice(2)]) {
            delete state.x[k.slice(2)];
            paths.add('links/' + k.slice(2));
          }
        });
      });
      if (!paths.size) {
        history.pop();
        toast('Nothing to clear in this section.');
        return;
      }
      ver += 1;
      paths.forEach((p) => Store.markDirty(p));
      App.rerender();
      toastUndo('Section cleared.');
    },
  });

  function walkBlocks(sec, fn) {
    (sec.blocks || []).forEach((b) => {
      fn(b);
      if (b.type === 'group') (b.blocks || []).forEach(fn);
    });
  }

  // =====================================================================================
  // Saving: claude.ai db when the page runs as an Artifact, browser storage always
  // =====================================================================================
  const LS_KEY = 'pm-steps-workbook.v1';
  const Store = {
    mode: 'local', // 'local' | 'db'
    db: null,
    dirty: new Set(),
    inflight: new Set(),
    flushing: false,
    error: null,
    readOnlyDb: false,
    lsTimer: null,
    flushTimer: null,

    lsRead() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    lsWrite() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, state, dirty: [...Store.dirty, ...Store.inflight], savedAt: new Date().toISOString() }));
      } catch (e) {
        /* storage blocked or full: the db copy still works */
      }
    },
    markDirty(path) {
      Store.dirty.add(path);
      clearTimeout(Store.lsTimer);
      Store.lsTimer = setTimeout(Store.lsWrite, 250);
      clearTimeout(Store.flushTimer);
      Store.flushTimer = setTimeout(() => Store.flush(), 900);
      updatePill();
    },
    /** Every storage path that differs between two states (or exists in either). */
    allPaths(a, b) {
      const out = new Set(['fields']);
      [a, b].forEach((st) => {
        Object.keys(st.t).forEach((k) => out.add('tables/' + k));
        Object.keys(st.x).forEach((k) => out.add('links/' + k));
      });
      Object.keys(PM.tables).forEach((k) => out.add((isDerived(k) ? 'links/' : 'tables/') + k));
      return [...out];
    },
    bodyOf(path) {
      if (path === 'fields') return { f: state.f, savedAt: new Date().toISOString() };
      const [kind, key] = path.split('/');
      if (kind === 'tables') return { rows: state.t[key] === undefined ? null : state.t[key] };
      return { map: state.x[key] || {} };
    },
    refOf(path) {
      return path === 'fields' ? Store.db.doc('file/fields') : Store.db.doc(path);
    },
    async flush() {
      if (Store.mode !== 'db' || !Store.db || Store.readOnlyDb) return;
      if (Store.flushing) {
        Store.again = true;
        return;
      }
      Store.flushing = true;
      updatePill();
      try {
        while (Store.dirty.size) {
          const path = Store.dirty.values().next().value;
          Store.dirty.delete(path);
          Store.inflight.add(path);
          try {
            const body = Store.bodyOf(path);
            const size = JSON.stringify(body).length;
            if (size > 250000) throw { code: 'too_large', message: path + ' is ' + Math.round(size / 1024) + ' KB' };
            await Store.refOf(path).set(U.clone(body));
            Store.error = null;
          } catch (e) {
            Store.dirty.add(path);
            Store.inflight.delete(path);
            Store.onError(e);
            break;
          }
          Store.inflight.delete(path);
        }
      } finally {
        Store.flushing = false;
        Store.lsWrite();
        updatePill();
      }
      if (Store.again) {
        Store.again = false;
        if (Store.dirty.size && !Store.error) Store.flush();
      }
    },
    onError(e) {
      const code = (e && e.code) || 'unavailable';
      Store.error = code;
      if (code === 'unavailable' || code === 'resource_exhausted') {
        clearTimeout(Store.flushTimer);
        Store.flushTimer = setTimeout(() => {
          Store.error = null;
          Store.flush();
        }, code === 'unavailable' ? 2000 + Math.random() * 3000 : 12000);
      } else if (code === 'invalid_argument') {
        Store.readOnlyDb = true;
        toast('This copy can’t save to the shared file. Your changes are kept in this browser.');
      } else if (code === 'too_large') {
        toast('One table is too large to save online (' + e.message + '). Shorten some long texts; everything is still kept in this browser.');
      } else if (code === 'quota_exceeded') {
        toast('The online storage for this file is full. Export a backup, then delete unused rows.');
      } else {
        Store.mode = 'local';
        toast('Online saving stopped. Your changes are kept in this browser.');
      }
      updatePill();
    },
    async init() {
      const local = Store.lsRead();
      let localDirty = [];
      if (local && local.state) {
        state = normalize(local.state);
        localDirty = Array.isArray(local.dirty) ? local.dirty : [];
        ver += 1;
      }
      App.rerender();
      const claude = window.claude;
      if (!claude || typeof claude.use !== 'function') {
        Store.mode = 'local';
        updatePill();
        return;
      }
      Store.mode = 'connecting';
      updatePill();
      let db = null;
      try {
        db = await claude.use('db');
      } catch (e) {
        db = null;
      }
      if (!db) {
        Store.mode = 'local';
        updatePill();
        return;
      }
      Store.db = db;
      try {
        const [fieldsSnap, tablesSnap, linksSnap] = await Promise.all([
          db.doc('file/fields').get(),
          db.collection('tables').limit(1000).get(),
          db.collection('links').limit(1000).get(),
        ]);
        const remote = blank();
        if (fieldsSnap.exists) remote.f = U.clone((fieldsSnap.data() || {}).f || {});
        tablesSnap.docs.forEach((d) => {
          const rows = (d.data() || {}).rows;
          if (Array.isArray(rows)) remote.t[d.id] = U.clone(rows);
        });
        linksSnap.docs.forEach((d) => {
          const map = (d.data() || {}).map;
          if (map && typeof map === 'object') remote.x[d.id] = U.clone(map);
        });
        Store.mode = 'db';
        if (hasContent(remote)) {
          // The online file is the record. Changes this browser made while offline go on top of it.
          const merged = normalize(remote);
          for (const path of localDirty) {
            if (path === 'fields') merged.f = U.clone(state.f);
            else {
              const [kind, key] = path.split('/');
              if (kind === 'tables') {
                if (state.t[key] === undefined) delete merged.t[key];
                else merged.t[key] = U.clone(state.t[key]);
              } else if (kind === 'links') {
                if (state.x[key] === undefined) delete merged.x[key];
                else merged.x[key] = U.clone(state.x[key]);
              }
            }
          }
          state = merged;
          localDirty.forEach((p) => Store.dirty.add(p));
        } else if (hasContent(state)) {
          Store.allPaths(state, state).forEach((p) => Store.dirty.add(p));
        }
        ver += 1;
        Store.lsWrite();
        App.rerender();
        Store.subscribe();
        if (Store.dirty.size) Store.flush();
        updatePill();
      } catch (e) {
        Store.mode = 'local';
        Store.db = null;
        updatePill();
        console.warn('Online file unavailable', e);
      }
    },
    subscribe() {
      const db = Store.db;
      const onErr = (e) => {
        if (e && e.code === 'unavailable') setTimeout(() => Store.subscribe(), 5000);
      };
      try {
        db.doc('file/fields').onSnapshot((s) => Store.applyRemote('fields', s.exists ? s.data() : null, s.metadata), onErr);
        db.collection('tables').limit(1000).onSnapshot((qs) => {
          qs.docChanges().forEach((ch) => Store.applyRemote('tables/' + ch.doc.id, ch.type === 'removed' ? null : ch.doc.data(), ch.doc.metadata));
        }, onErr);
        db.collection('links').limit(1000).onSnapshot((qs) => {
          qs.docChanges().forEach((ch) => Store.applyRemote('links/' + ch.doc.id, ch.type === 'removed' ? null : ch.doc.data(), ch.doc.metadata));
        }, onErr);
      } catch (e) {
        console.warn('Live updates unavailable', e);
      }
    },
    applyRemote(path, data, meta) {
      if (meta && meta.hasPendingWrites) return;
      if (Store.dirty.has(path) || Store.inflight.has(path)) return;
      const mine = JSON.stringify(path === 'fields' ? state.f : Store.bodyOf(path));
      let next;
      if (path === 'fields') {
        next = (data && data.f) || {};
        if (JSON.stringify(next) === mine) return;
        state.f = U.clone(next);
      } else {
        const [kind, key] = path.split('/');
        if (kind === 'tables') {
          const rows = data && Array.isArray(data.rows) ? data.rows : null;
          if (JSON.stringify({ rows }) === mine) return;
          if (rows) state.t[key] = U.clone(rows);
          else delete state.t[key];
        } else {
          const map = (data && data.map) || {};
          if (JSON.stringify({ map }) === mine) return;
          state.x[key] = U.clone(map);
        }
      }
      ver += 1;
      Store.lsWrite();
      App.rerenderSoon();
    },
  };

  function updatePill() {
    const el = document.getElementById('savePill');
    if (!el) return;
    let text;
    let tone;
    if (viewExample) {
      text = 'Example: nothing is saved';
      tone = 'info';
    } else if (Store.mode === 'connecting') {
      text = 'Opening your file…';
      tone = 'busy';
    } else if (Store.mode === 'local') {
      text = 'Saved in this browser';
      tone = 'local';
    } else if (Store.readOnlyDb) {
      text = 'Saved in this browser only';
      tone = 'warn';
    } else if (Store.error) {
      text = Store.dirty.size + ' change' + (Store.dirty.size === 1 ? '' : 's') + ' waiting to save';
      tone = 'warn';
    } else if (Store.flushing || Store.dirty.size) {
      text = 'Saving…';
      tone = 'busy';
    } else {
      text = 'All changes saved';
      tone = 'ok';
    }
    el.textContent = text;
    el.dataset.tone = tone;
  }

  // =====================================================================================
  // Rendering helpers
  // =====================================================================================
  const esc = U.esc;
  function idOf() {
    return Array.prototype.join.call(arguments, '-').replace(/[^A-Za-z0-9_-]/g, '_');
  }
  function currentPal() {
    const root = document.documentElement;
    const t = root.getAttribute('data-theme');
    if (t === 'dark') return PM.pal.dark;
    if (t === 'light') return PM.pal.light;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? PM.pal.dark : PM.pal.light;
    } catch (e) {
      return PM.pal.light;
    }
  }

  function placeholderOf(col, row) {
    if (row && row._ph && row._ph[col.key]) return row._ph[col.key];
    if (typeof col.placeholder === 'function') {
      try {
        return col.placeholder(row) || '';
      } catch (e) {
        return '';
      }
    }
    return col.placeholder || '';
  }

  /** HTML for one editable control. ctx: {data (attribute string), id, ph, q, row, ro} */
  function controlHtml(col, value, ctx) {
    const kind = col.kind || 'text';
    const dis = ctx.ro ? ' disabled' : '';
    const ph = ctx.ph ? ' placeholder="' + esc(ctx.ph) + '"' : '';
    const id = ' id="' + ctx.id + '"';
    const aria = ctx.aria ? ' aria-label="' + esc(ctx.aria) + '"' : '';
    const fam = col.family === 'mono' ? ' mono' : '';
    const d = ctx.data;
    switch (kind) {
      case 'textarea':
        return '<textarea class="in ta' + fam + '" rows="1"' + id + d + ph + aria + dis + '>' + esc(value == null ? '' : value) + '</textarea>';
      case 'number':
      case 'money':
      case 'percent':
        return '<input class="in num" type="text" inputmode="decimal" autocomplete="off"' + id + d + ph + aria + dis + ' value="' + esc(value == null ? '' : value) + '">';
      case 'date':
        return '<input class="in date' + (value ? '' : ' empty') + '" type="date"' + id + d + aria + dis + ' value="' + esc(value || '') + '">';
      case 'month':
        return '<input class="in date' + (value ? '' : ' empty') + '" type="month"' + id + d + aria + dis + ' value="' + esc(value || '') + '">';
      case 'check':
        return '<input class="chk" type="checkbox"' + id + d + aria + dis + (value ? ' checked' : '') + '>';
      case 'select':
      case 'person':
      case 'wbs': {
        let opts;
        if (kind === 'person') opts = ctx.q.people().map((p) => ({ value: p._id, label: p.name || p.initials || '(no name yet)' }));
        else if (kind === 'wbs') opts = ctx.q.wbs().map((r) => ({ value: r._id, label: r.code + ' ' + (ctx.q.label(r, 'name') || '') }));
        else opts = optionList(col, ctx.q, ctx.row);
        const v = value == null ? '' : String(value);
        let html = '<select class="in sel"' + id + d + aria + dis + '><option value="">' + esc(ctx.ph || '—') + '</option>';
        let found = !v;
        for (const o of opts) {
          if (o.value === v) found = true;
          html += '<option value="' + esc(o.value) + '"' + (o.value === v ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        }
        if (!found) html += '<option value="' + esc(v) + '" selected>' + esc(kind === 'select' ? v : '(removed)') + '</option>';
        return html + '</select>';
      }
      case 'multi':
      case 'people': {
        const vals = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
        const opts = kind === 'people' ? ctx.q.people().map((p) => ({ value: p._id, label: p.name || p.initials || '(no name yet)' })) : optionList(col, ctx.q, ctx.row);
        const labelOf = (v) => (opts.find((o) => o.value === v) || { label: kind === 'people' ? '(removed)' : v }).label;
        let html = '<div class="chips"' + id + d + '>';
        for (const v of vals) html += '<span class="chip">' + esc(labelOf(v)) + (ctx.ro ? '' : '<button type="button" class="chip-x" data-chip-remove="' + esc(v) + '" aria-label="Remove ' + esc(labelOf(v)) + '">×</button>') + '</span>';
        if (!ctx.ro) {
          const rest = opts.filter((o) => !vals.includes(o.value));
          if (rest.length) {
            html += '<select class="chip-add" data-chip-add aria-label="Add ' + esc(col.label || '') + '"><option value="">+ Add</option>';
            for (const o of rest) html += '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
            html += '</select>';
          }
        }
        return html + '</div>';
      }
      case 'rating': {
        const opts = optionList(col, ctx.q, ctx.row);
        const v = Number(value) || 0;
        let html = '<div class="seg" role="radiogroup"' + id + d + aria + '>';
        opts.forEach((o, i) => {
          const on = v === i + 1;
          html += '<button type="button" class="seg-b' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-seg="' + (i + 1) + '"' + dis + ' title="' + esc(o.label) + '">' + esc(o.label) + '</button>';
        });
        return html + '</div>';
      }
      default:
        return '<input class="in' + fam + '" type="text" autocomplete="off"' + id + d + ph + aria + dis + ' value="' + esc(value == null ? '' : value) + '">';
    }
  }

  function readValue(el, kind) {
    if (kind === 'check') return el.checked || undefined;
    const v = el.value;
    if (kind === 'number' || kind === 'money' || kind === 'percent') {
      if (v.trim() === '') return null;
      const n = U.num(v);
      if (Number.isNaN(n)) return NaN;
      return n;
    }
    return v;
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  }

  /** Helpers for custom blocks: build controls that the core saves automatically. */
  PM.ui = {
    control: controlHtml,
    /** data attributes binding a control to a table cell (own, derived or fixed table). */
    cell(key, rowId, colKey, kind) {
      return ' data-k="' + esc(key) + '" data-r="' + esc(rowId) + '" data-c="' + esc(colKey) + '" data-kind="' + esc(kind || 'text') + '"';
    },
    /** data attributes binding a control to a single field. */
    field(key, kind) {
      return ' data-f="' + esc(key) + '" data-kind="' + esc(kind || 'text') + '"';
    },
    id: idOf,
    autosize,
    esc,
    fmt: (col, v, q, row) => fmtValue(col, v, q, row),
  };

  // =====================================================================================
  // Blocks
  // =====================================================================================
  const BLOCKS = {};
  PM.blocks = BLOCKS;

  BLOCKS.h = {
    render(inst) {
      const b = inst.b;
      inst.el.innerHTML = '<h2 class="blk-h">' + esc(b.text) + '</h2>' + (b.sub ? '<p class="blk-sub">' + esc(b.sub) + '</p>' : '');
    },
  };

  BLOCKS.note = {
    render(inst) {
      inst.el.innerHTML = '<p class="note">' + (inst.b.html || esc(inst.b.text)) + '</p>';
    },
  };

  BLOCKS.callout = {
    render(inst) {
      const b = inst.b;
      inst.el.innerHTML = '<div class="callout" data-kind="' + esc(b.kind || 'tip') + '">' + (b.title ? '<strong>' + esc(b.title) + '</strong> ' : '') + (b.html || esc(b.text)) + '</div>';
    },
  };

  BLOCKS.guide = {
    render(inst) {
      const b = inst.b;
      const tag = b.ordered ? 'ol' : 'ul';
      let html = '<details class="guide"' + (b.collapsed ? '' : ' open') + '><summary><span class="guide-tag">Method</span> ' + esc(b.title || 'How to do it') + '</summary>';
      if (b.text) html += '<p>' + esc(b.text) + '</p>';
      if (b.items && b.items.length) html += '<' + tag + '>' + b.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</' + tag + '>';
      if (b.source) html += '<p class="guide-src">' + esc(b.source) + '</p>';
      inst.el.innerHTML = html + '</details>';
    },
  };

  BLOCKS.fields = {
    render(inst, q) {
      const b = inst.b;
      let html = b.title ? '<h3 class="blk-t">' + esc(b.title) + '</h3>' : '';
      if (b.hint) html += '<p class="hint">' + esc(b.hint) + '</p>';
      html += '<div class="fields cols-' + (b.cols || 2) + '">';
      for (const fb of b.fields) {
        const spec = Object.assign({}, fieldSpec(fb.key), fb);
        const id = idOf('f', fb.key);
        const wide = spec.wide || spec.kind === 'textarea' ? ' wide' : '';
        html += '<div class="fld' + wide + '"><label class="fld-l" for="' + id + '">' + esc(spec.label || fb.key) + (spec.unit ? ' <span class="unit">(' + esc(spec.unit) + ')</span>' : '') + '</label>';
        if (spec.compute) {
          html += '<output class="fld-out" id="' + id + '" data-out="' + esc(fb.key) + '">' + esc(fmtValue(spec, q.f(fb.key), q)) + '</output>';
        } else {
          let val = q.state.f[fb.key];
          if (val === undefined && spec.default !== undefined) val = spec.default;
          html += controlHtml(spec, val, { id, data: ' data-f="' + esc(fb.key) + '" data-kind="' + esc(spec.kind || 'text') + '"', ph: typeof spec.placeholder === 'function' ? spec.placeholder(q) : spec.placeholder, q, ro: q.readOnly });
        }
        if (spec.hint) html += '<small class="fld-h">' + esc(spec.hint) + '</small>';
        html += '</div>';
      }
      inst.el.innerHTML = html + '</div>';
      inst.el.querySelectorAll('textarea').forEach(autosize);
      inst.sig = fieldsSig(b, q);
    },
    update(inst, q) {
      if (fieldsSig(inst.b, q) !== inst.sig) return keepFocus(inst.el, () => BLOCKS.fields.render(inst, q));
      inst.el.querySelectorAll('[data-out]').forEach((o) => {
        const spec = fieldSpec(o.dataset.out);
        o.textContent = fmtValue(spec, q.f(o.dataset.out), q);
      });
    },
  };
  function fieldsSig(b, q) {
    // fields whose options depend on other data (people, wbs) re-render when that data changes
    let s = '';
    for (const fb of b.fields) {
      const k = fieldSpec(fb.key).kind;
      if (k === 'person' || k === 'people') s += q.people().map((p) => p._id + p.name).join();
      if (k === 'wbs') s += q.wbs().map((r) => r._id + r.code + r.name).join();
      if (typeof fieldSpec(fb.key).options === 'function') s += JSON.stringify(optionList(fieldSpec(fb.key), q));
    }
    return s;
  }

  function keepFocus(el, fn) {
    const a = document.activeElement;
    let sel = null;
    if (a && el.contains(a) && a.id) sel = { id: a.id, s: a.selectionStart, e: a.selectionEnd };
    fn();
    if (sel) {
      const n = document.getElementById(sel.id);
      if (n) {
        n.focus({ preventScroll: true });
        try {
          if (sel.s != null) n.setSelectionRange(sel.s, sel.e);
        } catch (e) {
          /* not a text control */
        }
      }
    }
  }

  BLOCKS.table = {
    spec(inst) {
      const base = tableSpec(inst.b.key);
      return Object.assign({}, base, inst.b.columns ? {} : inst.b, { columns: base.columns, key: inst.b.key });
    },
    render(inst, q) {
      const spec = BLOCKS.table.spec(inst);
      const key = spec.key;
      const cols = resolveCols(spec, q).filter((c) => !c.hidden);
      const rows = q.rows(key);
      const derived = isDerived(key);
      const ro = q.readOnly;
      const title = inst.b.title || spec.title;
      const hint = inst.b.hint !== undefined ? inst.b.hint : spec.hint;
      let html = '<div class="tbl-head">';
      if (title) html += '<h3 class="blk-t">' + esc(title) + '</h3>';
      if (!derived && spec.sort && !ro) html += '<button type="button" class="btn-ghost sm" data-sort="' + esc(key) + '" data-sort-col="' + esc(spec.sort) + '">Sort by ' + (spec.sort === 'code' ? 'WBS code' : esc(spec.sort)) + '</button>';
      html += '</div>';
      if (hint) html += '<p class="hint">' + esc(hint) + '</p>';
      html += '<div class="tbl-scroll"><table class="grid' + (inst.b.compact ? ' compact' : '') + '"><thead><tr>';
      if (spec.numbered) html += '<th class="c-no" scope="col">No.</th>';
      for (const c of cols) {
        const unit = c.kind === 'money' ? ' (' + q.cur() + ')' : c.kind === 'percent' ? ' (%)' : '';
        html += '<th scope="col" class="k-' + (c.kind || 'text') + (c.compute ? ' computed' : '') + '"' + (c.w ? ' style="min-width:' + c.w + 'ch"' : '') + (c.hint ? ' title="' + esc(c.hint) + '"' : '') + '>' + esc(c.label) + esc(unit) + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</th>';
      }
      if (!derived && !ro) html += '<th class="c-act" scope="col"><span class="sr">Row actions</span></th>';
      html += '</tr></thead><tbody>';
      if (!rows.length) {
        html += '<tr class="empty"><td colspan="' + (cols.length + 2) + '">' + esc(inst.b.emptyText || spec.emptyText || (derived ? 'Rows appear here once the ' + (spec.from || 'source') + ' table has lines.' : 'No rows yet.')) + '</td></tr>';
      }
      rows.forEach((r, i) => {
        html += '<tr data-row="' + esc(r._id) + '"' + (r.level ? ' data-level="' + r.level + '"' : '') + '>';
        if (spec.numbered) html += '<td class="c-no">' + (i + 1) + '</td>';
        for (const c of cols) {
          if (c.from && c.editSource && spec.from && !ro) {
            const id = idOf('c', spec.from, r._id, c.key);
            html += '<td class="k-' + (c.kind || 'text') + '">' + controlHtml(c, r[c.key], {
              id, q, row: r, ro,
              data: ' data-k="' + esc(spec.from) + '" data-r="' + esc(r._id) + '" data-c="' + esc(c.key) + '" data-kind="' + esc(c.kind || 'text') + '"',
              ph: (r._ph && r._ph[c.key]) || placeholderOf(c, r),
              aria: c.label + (r.code ? ' ' + r.code : ' row ' + (i + 1)),
            }) + '</td>';
            continue;
          }
          if (c.compute || c.from || c.readOnly) {
            const v = r[c.key];
            const ph = U.isEmpty(v) ? q.label(r, c.key) : '';
            html += '<td class="ro k-' + (c.kind || 'text') + (c.family === 'mono' ? ' mono' : '') + (ph ? ' ph' : '') + '" data-ro="' + esc(c.key) + '">' + esc(ph || fmtValue(c, v, q, r)) + '</td>';
          } else {
            const id = idOf('c', key, r._id, c.key);
            html += '<td class="k-' + (c.kind || 'text') + '">' + controlHtml(c, r[c.key], {
              id, q, row: r, ro,
              data: ' data-k="' + esc(key) + '" data-r="' + esc(r._id) + '" data-c="' + esc(c.key) + '" data-kind="' + esc(c.kind || 'text') + '"',
              ph: placeholderOf(c, r),
              aria: c.label + (r.code ? ' ' + r.code : ' row ' + (i + 1)),
            }) + '</td>';
          }
        }
        if (!derived && !ro) html += '<td class="c-act"><button type="button" class="row-menu" data-menu="' + esc(key) + '" data-menu-row="' + esc(r._id) + '" aria-label="Row actions">⋯</button></td>';
        html += '</tr>';
      });
      html += '</tbody>';
      const totals = cols.some((c) => c.total);
      if (totals && rows.length) {
        html += '<tfoot><tr>' + (spec.numbered ? '<td></td>' : '');
        cols.forEach((c, i) => {
          if (c.total) html += '<td class="tot k-' + (c.kind || 'number') + '" data-tot="' + esc(c.key) + '">' + esc(totalText(c, rows, q)) + '</td>';
          else html += '<td' + (i === 0 ? ' class="tot-l"' : '') + '>' + (i === 0 ? 'Total' : '') + '</td>';
        });
        html += (!derived && !ro ? '<td></td>' : '') + '</tr></tfoot>';
      }
      html += '</table></div>';
      if (!derived && !ro) html += '<div class="tbl-foot"><button type="button" class="btn-add" data-add="' + esc(key) + '">+ ' + esc(inst.b.addLabel || spec.addLabel || 'Add row') + '</button></div>';
      inst.el.innerHTML = html;
      inst.el.querySelectorAll('textarea').forEach(autosize);
      inst.sig = BLOCKS.table.sig(inst, q);
    },
    sig(inst, q) {
      const spec = BLOCKS.table.spec(inst);
      const cols = resolveCols(spec, q).filter((c) => !c.hidden);
      let s = q.rows(spec.key).map((r) => r._id).join() + '|' + cols.map((c) => c.key + ':' + c.label).join() + '|' + q.cur() + '|' + q.readOnly;
      if (cols.some((c) => c.kind === 'person' || c.kind === 'people')) s += '|' + q.people().map((p) => p._id + p.name).join();
      if (cols.some((c) => c.kind === 'wbs')) s += '|' + q.wbs().map((r) => r._id + r.code + r.name).join();
      if (cols.some((c) => typeof c.options === 'function' || typeof c.placeholder === 'function')) s += '|' + cols.map((c) => (typeof c.options === 'function' ? JSON.stringify(q.rows(spec.key).map((r) => optionList(c, q, r))) : '')).join();
      return s;
    },
    update(inst, q) {
      if (BLOCKS.table.sig(inst, q) !== inst.sig) return keepFocus(inst.el, () => BLOCKS.table.render(inst, q));
      const spec = BLOCKS.table.spec(inst);
      const cols = resolveCols(spec, q);
      const rows = q.rows(spec.key);
      const byId = new Map(rows.map((r) => [r._id, r]));
      inst.el.querySelectorAll('tbody tr[data-row]').forEach((tr) => {
        const r = byId.get(tr.dataset.row);
        if (!r) return;
        tr.querySelectorAll('td[data-ro]').forEach((td) => {
          const c = cols.find((x) => x.key === td.dataset.ro);
          if (!c) return;
          const v = r[c.key];
          const ph = U.isEmpty(v) ? q.label(r, c.key) : '';
          td.textContent = ph || fmtValue(c, v, q, r);
          td.classList.toggle('ph', !!ph);
        });
      });
      inst.el.querySelectorAll('td[data-tot]').forEach((td) => {
        const c = cols.find((x) => x.key === td.dataset.tot);
        if (c) td.textContent = totalText(c, rows, q);
      });
    },
  };
  function totalText(c, rows, q) {
    if (typeof c.total === 'function') return c.total(rows, q);
    const t = U.sum(rows, (r) => r[c.key]);
    return fmtValue(Object.assign({}, c, { kind: c.kind || 'number' }), t, q);
  }

  BLOCKS.graphic = {
    render(inst, q) {
      const b = inst.b;
      inst.el.innerHTML =
        '<figure class="fig">' +
        '<div class="fig-head"><h3 class="blk-t">' + esc(b.title || 'Graphic') + '</h3>' +
        '<div class="fig-tools"><button type="button" class="btn-ghost sm" data-fig="png">Save PNG</button><button type="button" class="btn-ghost sm" data-fig="svg">Save SVG</button></div></div>' +
        '<div class="fig-body"></div>' +
        (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') +
        '</figure>';
      BLOCKS.graphic.draw(inst, q);
    },
    update(inst, q) {
      clearTimeout(inst.t);
      inst.t = setTimeout(() => BLOCKS.graphic.draw(inst, Q()), 180);
    },
    draw(inst, q) {
      const body = inst.el.querySelector('.fig-body');
      if (!body) return;
      body.innerHTML = graphicSvg(inst.b, q, currentPal());
    },
  };
  function graphicSvg(b, q, pal) {
    try {
      const msg = b.empty ? b.empty(q) : null;
      if (msg) return S.placeholder(b.emptyW || 720, b.emptyH || 160, msg, pal);
      const out = b.render(q, pal);
      return typeof out === 'string' ? out : out && out.svg ? out.svg : '';
    } catch (e) {
      console.error('Graphic failed:', b.title, e);
      return '<div class="render-error">This graphic could not be drawn: ' + esc(e && e.message) + '</div>';
    }
  }
  PM.graphicSvg = (b, pal) => graphicSvg(b, Q(), pal || PM.pal.light);

  BLOCKS.checks = {
    render(inst, q) {
      const b = inst.b;
      let items = [];
      try {
        items = b.run(q) || [];
      } catch (e) {
        console.error('Checks failed', b.title, e);
        items = [{ ok: false, text: 'Checks could not run: ' + e.message }];
      }
      let html = '<div class="checks-box"><h3 class="blk-t">' + esc(b.title || 'Checks') + '</h3>';
      if (b.hint) html += '<p class="hint">' + esc(b.hint) + '</p>';
      html += '<ul class="checks">';
      for (const it of items) {
        const cls = it.ok === true ? 'ok' : it.ok === false ? 'bad' : 'info';
        const icon = it.ok === true ? '✓' : it.ok === false ? '!' : 'i';
        html += '<li class="' + cls + '"><span class="ck-i" aria-hidden="true">' + icon + '</span><span><span class="sr">' + (it.ok === true ? 'OK: ' : it.ok === false ? 'Check: ' : 'Note: ') + '</span>' + esc(it.text) + '</span></li>';
      }
      if (!items.length) html += '<li class="info"><span class="ck-i" aria-hidden="true">i</span><span>Nothing to check yet.</span></li>';
      inst.el.innerHTML = html + '</ul></div>';
    },
    update(inst, q) {
      BLOCKS.checks.render(inst, q);
    },
  };

  BLOCKS.checklist = {
    render(inst, q) {
      const b = inst.b;
      const val = q.state.f[b.key] || [];
      let html = '<div class="checklist"><h3 class="blk-t">' + esc(b.title || 'Checklist') + '</h3>';
      if (b.hint) html += '<p class="hint">' + esc(b.hint) + '</p>';
      html += '<ul>';
      for (const it of b.items) {
        const id = idOf('cl', b.key, it.id);
        html += '<li><input type="checkbox" class="chk" id="' + id + '" data-cl="' + esc(b.key) + '" data-cl-item="' + esc(it.id) + '"' + (val.includes(it.id) ? ' checked' : '') + (q.readOnly ? ' disabled' : '') + '><label for="' + id + '">' + esc(it.text) + '</label></li>';
      }
      inst.el.innerHTML = html + '</ul></div>';
    },
  };

  BLOCKS.step = {
    render(inst, q) {
      const st = PM.step(inst.b.step);
      if (!st) {
        inst.el.innerHTML = '';
        return;
      }
      const row = q.row('steps', st.id) || {};
      const cols = q.cols('steps');
      const col = (k) => cols.find((c) => c.key === k);
      const ctrl = (k) =>
        controlHtml(col(k), row[k], {
          id: idOf('c', 'steps', st.id, k), q, row, ro: q.readOnly,
          data: ' data-k="steps" data-r="' + st.id + '" data-c="' + k + '" data-kind="' + (col(k).kind || 'text') + '"',
          ph: placeholderOf(col(k), row),
        });
      let html = '<div class="step-card"><div class="step-top"><span class="step-id">' + st.id + '</span><div><h3 class="blk-t">Step record: ' + esc(st.title) + '</h3>' +
        '<p class="hint">' + (st.process === 'initiation' ? 'Initiation process' : 'Project start process') + ', step ' + st.id.slice(1) + ' of 5. What did this step look like in your project?</p></div></div>';
      html += '<dl class="step-ref"><div><dt>Activities</dt><dd>' + st.activities.map(esc).join('<br>') + '</dd></div><div><dt>Roles</dt><dd>' + esc(st.roles) + '</dd></div><div><dt>Format</dt><dd>' + esc(st.format) + '</dd></div><div><dt>Result</dt><dd>' + esc(st.result) + '</dd></div></dl>';
      html += '<div class="fields cols-3">' +
        '<div class="fld"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'status') + '">Status</label>' + ctrl('status') + '</div>' +
        '<div class="fld"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'when') + '">When</label>' + ctrl('when') + '</div>' +
        '<div class="fld"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'format') + '">Format used</label>' + ctrl('format') + '</div>' +
        '<div class="fld wide"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'who') + '">Who took part</label>' + ctrl('who') + '</div>' +
        '<div class="fld wide"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'did') + '">What we did</label>' + ctrl('did') + '</div>' +
        '<div class="fld wide"><label class="fld-l" for="' + idOf('c', 'steps', st.id, 'result') + '">Result</label>' + ctrl('result') + '</div>' +
        '</div></div>';
      inst.el.innerHTML = html;
      inst.el.querySelectorAll('textarea').forEach(autosize);
    },
  };

  BLOCKS.group = {
    render(inst, q) {
      const b = inst.b;
      inst.el.innerHTML = '<div class="group' + (b.cols ? ' gcols-' + b.cols : '') + '"></div>';
      const host = inst.el.firstChild;
      inst.children = (b.blocks || []).map((cb) => {
        const el = document.createElement('div');
        el.className = 'blk blk-' + cb.type;
        host.appendChild(el);
        const ci = { b: cb, el };
        renderBlock(ci, q);
        return ci;
      });
    },
    update(inst, q) {
      (inst.children || []).forEach((ci) => updateBlock(ci, q));
    },
  };

  BLOCKS.custom = {
    render(inst, q) {
      try {
        inst.b.render(inst.el, q, api);
      } catch (e) {
        console.error('Custom block failed', e);
        inst.el.innerHTML = '<div class="render-error">This part could not be shown: ' + esc(e.message) + '</div>';
      }
    },
    update(inst, q) {
      if (inst.b.update) {
        try {
          inst.b.update(inst.el, q, api);
        } catch (e) {
          console.error('Custom block update failed', e);
        }
      }
    },
  };

  function renderBlock(inst, q) {
    const impl = BLOCKS[inst.b.type];
    if (!impl) {
      inst.el.innerHTML = '<div class="render-error">Unknown block type: ' + esc(inst.b.type) + '</div>';
      return;
    }
    impl.render(inst, q);
  }
  function updateBlock(inst, q) {
    const impl = BLOCKS[inst.b.type];
    if (impl && impl.update) impl.update(inst, q);
  }

  // =====================================================================================
  // Completion (shown in the navigation)
  // =====================================================================================
  function completion(sec, st) {
    let total = 0;
    let done = 0;
    walkBlocks(sec, (b) => {
      if (b.type === 'fields') {
        (b.fields || []).forEach((f) => {
          if (fieldSpec(f.key).compute) return;
          total += 1;
          if (!U.isEmpty(st.f[f.key])) done += 1;
        });
      } else if (b.type === 'table') {
        total += 1;
        if (isDerived(b.key)) {
          if (st.x[b.key] && Object.keys(st.x[b.key]).length) done += 1;
        } else if (st.t[b.key] && st.t[b.key].some((r) => Object.keys(r).some((k) => k[0] !== '_' && !U.isEmpty(r[k])))) done += 1;
      } else if (b.type === 'checklist') {
        total += 1;
        if (!U.isEmpty(st.f[b.key])) done += 1;
      } else if (b.type === 'step') {
        total += 1;
        if (st.x.steps && st.x.steps[b.step] && st.x.steps[b.step].status) done += 1;
      } else if (b.type === 'custom' && b.keys) {
        b.keys.forEach((k) => {
          total += 1;
          const [kind, key] = [k.slice(0, 1), k.slice(2)];
          if ((kind === 'f' && !U.isEmpty(st.f[key])) || (kind === 't' && st.t[key] && st.t[key].length) || (kind === 'x' && st.x[key] && Object.keys(st.x[key]).length)) done += 1;
        });
      }
    });
    return { done, total };
  }
  PM.completion = (sec) => completion(sec, view());

  // =====================================================================================
  // App shell
  // =====================================================================================
  const App = (PM.app = {
    current: null,
    mounted: [],
    pendingRerender: false,

    sectionById(id) {
      return PM.sections.find((s) => s.id === id) || null;
    },
    go(id) {
      if (location.hash !== '#' + id) location.hash = id;
      else App.show(id);
    },
    show(id) {
      const sec = App.sectionById(id) || PM.sections[0];
      if (!sec) return;
      const changedSection = !App.current || App.current.id !== sec.id;
      App.current = sec;
      App.renderSection(sec);
      App.renderNav();
      App.renderTop();
      if (changedSection) {
        const main = document.getElementById('main');
        window.scrollTo(0, 0);
        if (main) main.scrollTop = 0;
        document.title = (sec.num ? sec.num + ' ' : '') + sec.title + ' · PM Steps Workbook';
      }
      document.body.classList.remove('nav-open');
      const t = document.getElementById('navToggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    },
    rerender() {
      App.pendingRerender = false;
      if (!App.current) return;
      const y = window.scrollY;
      App.renderSection(App.current);
      App.renderNav();
      App.renderTop();
      window.scrollTo(0, y);
    },
    rerenderSoon() {
      const main = document.getElementById('main');
      const a = document.activeElement;
      if (main && a && main.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) {
        App.pendingRerender = true;
        return;
      }
      App.rerender();
    },
    renderTop() {
      const q = Q();
      const name = document.getElementById('projName');
      if (name) name.textContent = q.f('meta.name') || 'Untitled project';
      const banner = document.getElementById('exampleBanner');
      if (banner) banner.hidden = !viewExample;
      const tog = document.getElementById('exampleToggle');
      if (tog) tog.checked = viewExample;
      document.body.classList.toggle('is-example', viewExample);
      updatePill();
    },
    renderNav() {
      const nav = document.getElementById('sidebar');
      if (!nav) return;
      const st = view();
      let html = '';
      for (const part of PM.PARTS) {
        const secs = PM.sections.filter((s) => s.part === part.id);
        if (!secs.length) continue;
        html += '<div class="nav-part"><p class="nav-part-l">' + (part.num ? '<span class="mono">' + part.num + '</span> ' : '') + esc(part.label) + '</p><ul>';
        for (const s of secs) {
          const c = completion(s, st);
          const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
          const cur = App.current && App.current.id === s.id;
          html += '<li><a href="#' + esc(s.id) + '"' + (cur ? ' aria-current="page"' : '') + '>' +
            '<span class="nav-num mono">' + esc(s.num || '') + '</span><span class="nav-t">' + esc(s.navTitle || s.title) + '</span>' +
            (c.total ? '<span class="nav-meter" title="' + c.done + ' of ' + c.total + ' parts filled in" style="--p:' + pct + '%"><span class="sr">' + c.done + ' of ' + c.total + ' filled in</span></span>' : '') +
            '</a></li>';
        }
        html += '</ul></div>';
      }
      nav.innerHTML = html;
    },
    renderSection(sec) {
      const main = document.getElementById('main');
      if (!main) return;
      const q = Q();
      const part = PM.PARTS.find((p) => p.id === sec.part);
      const step = sec.step ? PM.step(sec.step) : null;
      const c = completion(sec, view());
      let head = '<header class="sec-head"><p class="eyebrow">' + esc(part ? part.label : '') +
        (step ? '<span class="sep">/</span><a class="step-chip" href="#' + esc(step.section) + '">Step ' + step.id + ' · ' + esc(step.title) + '</a>' : '') + '</p>' +
        '<h1>' + (sec.num ? '<span class="sec-num mono">' + esc(sec.num) + '</span>' : '') + '<span>' + esc(sec.title) + '</span></h1>' +
        (sec.intro ? '<p class="lede">' + esc(sec.intro) + '</p>' : '') +
        '<p class="sec-meta">' + (sec.slides ? '<span>Deck slides ' + esc(sec.slides) + '</span>' : '') + (c.total ? '<span>' + c.done + ' of ' + c.total + ' parts filled in</span>' : '') + '</p></header>';
      main.innerHTML = head + '<div class="blocks"></div>' + App.footerHtml(sec);
      const host = main.querySelector('.blocks');
      App.mounted = [];
      for (const b of sec.blocks || []) {
        const el = document.createElement('section');
        el.className = 'blk blk-' + b.type + (b.wide ? ' wide' : '');
        host.appendChild(el);
        const inst = { b, el };
        renderBlock(inst, q);
        App.mounted.push(inst);
      }
    },
    footerHtml(sec) {
      const i = PM.sections.indexOf(sec);
      const prev = PM.sections[i - 1];
      const next = PM.sections[i + 1];
      return '<footer class="sec-foot">' +
        '<div class="pager">' + (prev ? '<a class="pg prev" href="#' + esc(prev.id) + '"><small>Previous</small>' + esc((prev.num ? prev.num + ' ' : '') + prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="pg next" href="#' + esc(next.id) + '"><small>Next</small>' + esc((next.num ? next.num + ' ' : '') + next.title) + '</a>' : '<span></span>') + '</div>' +
        (viewExample ? '' : '<div class="danger"><button type="button" class="btn-ghost sm" data-clear="1">Clear this section…</button></div>') +
        '</footer>';
    },
    refresh() {
      const q = Q();
      App.mounted.forEach((inst) => updateBlock(inst, q));
      App.renderTop();
      navSoon();
    },
  });
  const navSoon = U.debounce(() => App.renderNav(), 600);
  const refreshSoon = U.debounce(() => App.refresh(), 120);
  listeners.push(() => refreshSoon());

  // =====================================================================================
  // Events
  // =====================================================================================
  function onInput(e) {
    const el = e.target;
    if (el.tagName === 'TEXTAREA') autosize(el);
    if (el.classList && el.classList.contains('date')) el.classList.toggle('empty', !el.value);
    handleEdit(el, e.type);
  }
  function handleEdit(el, type) {
    if (el.dataset.f) {
      const kind = el.dataset.kind || fieldSpec(el.dataset.f).kind || 'text';
      if (type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox')) return;
      const v = readValue(el, kind);
      el.classList.toggle('invalid', Number.isNaN(v));
      if (Number.isNaN(v)) return;
      api.setField(el.dataset.f, v);
    } else if (el.dataset.k && el.dataset.r && el.dataset.c) {
      const kind = el.dataset.kind || 'text';
      if (type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox')) return;
      const v = readValue(el, kind);
      el.classList.toggle('invalid', Number.isNaN(v));
      if (Number.isNaN(v)) return;
      api.setCell(el.dataset.k, el.dataset.r, el.dataset.c, v);
    } else if (el.dataset.cl) {
      const key = el.dataset.cl;
      const cur = (Q().state.f[key] || []).slice();
      const item = el.dataset.clItem;
      const i = cur.indexOf(item);
      if (el.checked && i < 0) cur.push(item);
      if (!el.checked && i >= 0) cur.splice(i, 1);
      api.setField(key, cur);
    } else if (el.hasAttribute('data-chip-add')) {
      const host = el.closest('.chips');
      const v = el.value;
      if (!v) return;
      setMulti(host, (vals) => vals.concat([v]));
    }
  }
  function setMulti(host, fn) {
    const cur = host.dataset.f ? Q().state.f[host.dataset.f] : (Q().row(host.dataset.k, host.dataset.r) || {})[host.dataset.c];
    const vals = fn(Array.isArray(cur) ? cur.slice() : cur ? [cur] : []);
    if (host.dataset.f) api.setField(host.dataset.f, vals);
    else api.setCell(host.dataset.k, host.dataset.r, host.dataset.c, vals);
    const inst = App.mounted.find((m) => m.el.contains(host));
    if (inst) keepFocus(inst.el, () => renderBlock(inst, Q()));
  }

  let menuEl = null;
  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }
  function openRowMenu(btn) {
    closeMenu();
    const key = btn.dataset.menu;
    const id = btn.dataset.menuRow;
    menuEl = document.createElement('div');
    menuEl.className = 'menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.innerHTML =
      '<button type="button" role="menuitem" data-act="below">Insert row below</button>' +
      '<button type="button" role="menuitem" data-act="up">Move up</button>' +
      '<button type="button" role="menuitem" data-act="down">Move down</button>' +
      '<button type="button" role="menuitem" data-act="delete" class="danger-t">Delete row</button>';
    document.body.appendChild(menuEl);
    const r = btn.getBoundingClientRect();
    const mw = menuEl.offsetWidth;
    menuEl.style.top = window.scrollY + r.bottom + 4 + 'px';
    menuEl.style.left = Math.max(8, Math.min(window.scrollX + r.right - mw, window.scrollX + document.documentElement.clientWidth - mw - 8)) + 'px';
    menuEl.querySelector('button').focus();
    menuEl.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      closeMenu();
      if (act === 'below') {
        const nid = api.addRow(key, id);
        focusRowSoon(nid);
      } else if (act === 'up') api.moveRow(key, id, -1);
      else if (act === 'down') api.moveRow(key, id, 1);
      else if (act === 'delete') api.deleteRow(key, id);
    });
    menuEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
        btn.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...menuEl.querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
        e.preventDefault();
      }
    });
  }
  function focusRowSoon(rowId) {
    setTimeout(() => {
      App.refresh();
      const el = document.querySelector('tr[data-row="' + CSS.escape(rowId) + '"] .in, tr[data-row="' + CSS.escape(rowId) + '"] select');
      if (el) el.focus();
    }, 160);
  }

  function onClick(e) {
    const t = e.target;
    if (menuEl && !menuEl.contains(t) && !t.closest('[data-menu]')) closeMenu();
    const add = t.closest('[data-add]');
    if (add) {
      const id = api.addRow(add.dataset.add);
      if (id) focusRowSoon(id);
      return;
    }
    const menu = t.closest('[data-menu]');
    if (menu) {
      if (menuEl) closeMenu();
      else openRowMenu(menu);
      return;
    }
    const rm = t.closest('[data-chip-remove]');
    if (rm) {
      const host = rm.closest('.chips');
      const v = rm.dataset.chipRemove;
      setMulti(host, (vals) => vals.filter((x) => String(x) !== v));
      return;
    }
    const seg = t.closest('[data-seg]');
    if (seg && !seg.disabled) {
      const host = seg.closest('.seg');
      const v = Number(seg.dataset.seg);
      const cur = host.dataset.f ? Q().state.f[host.dataset.f] : (Q().row(host.dataset.k, host.dataset.r) || {})[host.dataset.c];
      const next = Number(cur) === v ? null : v;
      if (host.dataset.f) api.setField(host.dataset.f, next);
      else api.setCell(host.dataset.k, host.dataset.r, host.dataset.c, next);
      host.querySelectorAll('.seg-b').forEach((b) => {
        const on = Number(b.dataset.seg) === next;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', String(on));
      });
      return;
    }
    const sort = t.closest('[data-sort]');
    if (sort) {
      api.sortRows(sort.dataset.sort, sort.dataset.sortCol);
      App.refresh();
      return;
    }
    const fig = t.closest('[data-fig]');
    if (fig) {
      const inst = App.mounted.find((m) => m.el.contains(fig)) || findNested(fig);
      if (inst) Export.figure(inst.b, fig.dataset.fig);
      return;
    }
    const clr = t.closest('[data-clear]');
    if (clr) {
      if (clr.dataset.armed) {
        api.clearSection(App.current);
      } else {
        clr.dataset.armed = '1';
        clr.textContent = 'Click again to clear every entry in this section';
        clr.classList.add('armed');
        setTimeout(() => {
          if (clr.isConnected) {
            delete clr.dataset.armed;
            clr.textContent = 'Clear this section…';
            clr.classList.remove('armed');
          }
        }, 5000);
      }
    }
  }
  function findNested(el) {
    for (const m of App.mounted) {
      if (m.children) for (const c of m.children) if (c.el.contains(el)) return c;
    }
    return null;
  }

  // =====================================================================================
  // Toasts and dialog
  // =====================================================================================
  function toast(msg, opts) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + esc(msg) + '</span>';
    if (opts && opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-btn';
      b.textContent = opts.action;
      b.addEventListener('click', () => {
        opts.onAction();
        el.remove();
      });
      el.appendChild(b);
    }
    host.appendChild(el);
    setTimeout(() => el.remove(), (opts && opts.ms) || 6000);
  }
  function toastUndo(msg) {
    const snap = history[history.length - 1];
    toast(msg, {
      action: 'Undo',
      ms: 9000,
      onAction: () => {
        if (snap && history[history.length - 1] === snap) history.pop();
        if (snap) restoreSnapshot(snap);
      },
    });
  }
  PM.toast = toast;

  // =====================================================================================
  // Export: Word, Excel, JSON backup, single figures
  // =====================================================================================
  async function svgToPng(svgStr, scale) {
    scale = scale || 2;
    const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svgStr);
    const w = m ? +m[1] : 800;
    const h = m ? +m[2] : 400;
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.decoding = 'sync';
      const loaded = new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('image load failed'));
      });
      img.src = url;
      await loaded;
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function saveFile(filename, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    let dl = null;
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        dl = await window.claude.use('downloads');
      } catch (e) {
        dl = null;
      }
    }
    if (dl) {
      try {
        await dl.save({ filename, data: blob });
        toast('Saved ' + filename + '.');
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') toast('Another save is still waiting for your answer. Try again in a moment.');
        else toast('The file could not be saved here (' + (code || 'error') + ').');
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  PM.saveFile = saveFile;

  function fileBase(q) {
    const name = (q.f('meta.name') || 'PM file').replace(/[^\p{L}\p{N} ._-]+/gu, '').trim().replace(/\s+/g, ' ');
    return (q.example ? 'Example - ' : '') + (name || 'PM file');
  }

  const Export = (PM.export = {
    /** Build the neutral document model that docx.js turns into Word. */
    async model(opts) {
      opts = Object.assign({ empty: true, notes: true, graphics: true }, opts || {});
      const q = Q();
      const out = [];
      const cover = [
        ['Project', q.f('meta.name')],
        ['Kind of project', q.f('meta.kind')],
        ['Organisation', q.f('meta.org')],
        ['Project status', q.f('meta.status')],
        ['PM plan version', q.f('meta.version')],
        ['Prepared by', q.f('meta.author')],
        ['Last updated', U.fmtDate(q.f('meta.updated'))],
      ];
      out.push({ type: 'title', text: q.f('meta.name') || 'Project management file' });
      out.push({ type: 'subtitle', text: 'Project management file: initiation and project start' });
      out.push({ type: 'table', kv: true, columns: [{ label: 'Item', width: 1 }, { label: 'Value', width: 2.4 }], rows: cover.filter((r) => opts.empty || r[1]).map((r) => [r[0], r[1] || '']) });
      if (q.f('meta.summary')) out.push({ type: 'p', text: q.f('meta.summary') });
      out.push({ type: 'toc' });
      for (const sec of PM.sections) {
        if (sec.exportSkip && sec.exportSkip(q)) continue;
        out.push({ type: 'pagebreak' });
        if (sec.landscape) out.push({ type: 'orientation', value: 'landscape' });
        out.push({ type: 'h1', text: (sec.num ? sec.num + ' ' : '') + sec.title });
        if (opts.notes && sec.intro) out.push({ type: 'p', text: sec.intro, style: 'note' });
        for (const b of sec.blocks || []) await Export.block(b, q, opts, out);
        if (sec.landscape) out.push({ type: 'orientation', value: 'portrait' });
      }
      return out;
    },
    async block(b, q, opts, out) {
      switch (b.type) {
        case 'h':
          out.push({ type: 'h2', text: b.text });
          if (opts.notes && b.sub) out.push({ type: 'p', text: b.sub, style: 'note' });
          break;
        case 'note':
        case 'callout':
          if (opts.notes) out.push({ type: 'p', text: b.text || stripHtml(b.html), style: 'note' });
          break;
        case 'guide':
          if (opts.notes) {
            out.push({ type: 'p', runs: [{ text: 'Method: ', bold: true }, { text: b.title || '' }], style: 'note' });
            if (b.text) out.push({ type: 'p', text: b.text, style: 'note' });
            if (b.items && b.items.length) out.push({ type: 'bullets', items: b.items, ordered: !!b.ordered, style: 'note' });
          }
          break;
        case 'fields': {
          const rows = [];
          for (const fb of b.fields) {
            const spec = Object.assign({}, fieldSpec(fb.key), fb);
            const v = spec.compute ? q.f(fb.key) : q.state.f[fb.key];
            const txt = fmtValue(spec, v === undefined && spec.default !== undefined ? spec.default : v, q);
            if (!opts.empty && !txt) continue;
            rows.push([spec.label || fb.key, txt]);
          }
          if (b.title) out.push({ type: 'h3', text: b.title });
          if (rows.length) out.push({ type: 'table', kv: true, columns: [{ label: 'Item', width: 1 }, { label: 'Value', width: 2.4 }], rows });
          break;
        }
        case 'table': {
          const t = Export.tableModel(b, q, opts);
          if (!t) break;
          const title = b.title || tableSpec(b.key).title;
          if (title) out.push({ type: 'h3', text: title });
          out.push(t);
          break;
        }
        case 'graphic': {
          if (!opts.graphics) break;
          if (b.empty && b.empty(q)) break;
          const svg = graphicSvg(b, q, PM.pal.light);
          if (!svg.startsWith('<svg')) break;
          try {
            const png = await svgToPng(svg, 2);
            out.push({ type: 'h3', text: b.title || 'Graphic' });
            out.push({ type: 'image', png: png.bytes, width: png.width, height: png.height, caption: b.caption || '', alt: b.title || '' });
          } catch (e) {
            console.error('Graphic export failed', b.title, e);
          }
          break;
        }
        case 'checks': {
          if (!opts.notes) break;
          let items = [];
          try {
            items = b.run(q) || [];
          } catch (e) {
            items = [];
          }
          if (!items.length) break;
          out.push({ type: 'h3', text: b.title || 'Checks' });
          out.push({ type: 'bullets', items: items.map((i) => (i.ok === true ? '✓ ' : i.ok === false ? '✗ ' : '• ') + i.text) });
          break;
        }
        case 'checklist': {
          const val = q.state.f[b.key] || [];
          out.push({ type: 'h3', text: b.title || 'Checklist' });
          out.push({ type: 'bullets', items: b.items.map((i) => (val.includes(i.id) ? '☑ ' : '☐ ') + i.text), plain: true });
          break;
        }
        case 'step': {
          const st = PM.step(b.step);
          const r = q.row('steps', b.step) || {};
          out.push({ type: 'h3', text: 'Step record ' + st.id + ': ' + st.title });
          const rows = [
            ['Status', r.status || ''],
            ['When', r.when || ''],
            ['Format used', r.format || ''],
            ['Who took part', r.who || ''],
            ['What we did', r.did || ''],
            ['Result', r.result || ''],
          ].filter((x) => opts.empty || x[1]);
          if (rows.length) out.push({ type: 'table', kv: true, columns: [{ label: 'Item', width: 1 }, { label: 'Value', width: 2.4 }], rows });
          break;
        }
        case 'group':
          for (const cb of b.blocks || []) await Export.block(cb, q, opts, out);
          break;
        case 'custom':
          if (b.exportBlocks) {
            try {
              const extra = await b.exportBlocks(q, opts, { svgToPng });
              (extra || []).forEach((x) => out.push(x));
            } catch (e) {
              console.error('Custom export failed', e);
            }
          }
          break;
        default:
          break;
      }
    },
    tableModel(b, q, opts) {
      const spec = Object.assign({}, tableSpec(b.key), b.columns ? {} : b, { columns: tableSpec(b.key).columns });
      const cols = resolveCols(spec, q).filter((c) => !c.hidden && !c.exportSkip);
      let rows = q.rows(b.key);
      const derived = isDerived(b.key);
      const cellText = (c, r) => {
        const v = r[c.key];
        if (U.isEmpty(v) && v !== 0) return c.from && q.label(r, c.key) ? q.label(r, c.key) : '';
        return fmtValue(c, v, q, r);
      };
      let body = rows.map((r) => cols.map((c) => cellText(c, r)));
      if (!opts.empty && !derived) body = body.filter((cells, i) => cols.some((c, j) => !c.compute && cells[j]));
      if (!opts.empty && derived) {
        const editable = cols.map((c) => !(c.from || c.compute || c.readOnly));
        if (editable.some(Boolean)) body = body.filter((cells) => cells.some((x, j) => editable[j] && x));
      }
      if (!body.length && !opts.empty) return null;
      if (spec.numbered) body = body.map((cells, i) => [String(i + 1)].concat(cells));
      const columns = (spec.numbered ? [{ label: 'No.', width: 0.4, align: 'right' }] : []).concat(
        cols.map((c) => ({
          label: c.label + (c.kind === 'money' ? ' (' + q.cur() + ')' : c.kind === 'percent' ? ' (%)' : ''),
          // never narrower than the longest word of the header, so headers do not break mid-word
          width: Math.max(0.5, (c.w || defaultWidth(c)) / 10, Math.max.apply(null, (c.label + (c.kind === 'percent' ? ' (%)' : '')).split(/\s+/).map((w) => w.length)) / 8),
          align: ['number', 'money', 'percent'].includes(c.kind) ? 'right' : 'left',
          kind: c.kind || 'text',
        }))
      );
      let footer = null;
      if (cols.some((c) => c.total) && rows.length) {
        footer = (spec.numbered ? [''] : []).concat(cols.map((c, i) => (c.total ? totalText(c, rows, q) : i === 0 ? 'Total' : '')));
      }
      return { type: 'table', columns, rows: body, footer, emptyRows: opts.empty && !derived ? 2 : 0, fontSize: columns.length > 8 ? 8 : 9 };
    },
    /** All tables as sheets for Excel. */
    sheets() {
      const q = Q();
      const sheets = [];
      const fieldRows = [];
      for (const sec of PM.sections) {
        walkBlocks(sec, (b) => {
          if (b.type === 'fields') {
            for (const fb of b.fields) {
              const spec = Object.assign({}, fieldSpec(fb.key), fb);
              const v = spec.compute ? q.f(fb.key) : q.state.f[fb.key];
              fieldRows.push([(sec.num ? sec.num + ' ' : '') + sec.title, spec.label || fb.key, fmtValue(spec, v, q)]);
            }
          }
        });
      }
      sheets.push({ name: 'Project', title: q.f('meta.name') || 'Project', columns: [{ label: 'Section', width: 30 }, { label: 'Field', width: 30 }, { label: 'Value', width: 60 }], rows: fieldRows });
      const seen = new Set();
      for (const sec of PM.sections) {
        walkBlocks(sec, (b) => {
          if (b.type !== 'table' || seen.has(b.key)) return;
          seen.add(b.key);
          const spec = tableSpec(b.key);
          const cols = resolveCols(spec, q).filter((c) => !c.hidden && !c.exportSkip);
          const rows = q.rows(b.key);
          sheets.push({
            name: (sec.num ? sec.num + ' ' : '') + (b.title || spec.title || b.key),
            title: (sec.num ? sec.num + ' ' : '') + sec.title + ': ' + (b.title || spec.title || b.key),
            columns: cols.map((c) => ({ label: c.label + (c.kind === 'money' ? ' (' + q.cur() + ')' : ''), width: Math.max(8, Math.min(60, (c.w || defaultWidth(c)) + 4)), kind: xlsKind(c) })),
            rows: rows.map((r) => cols.map((c) => xlsValue(c, r, q))),
            totals: cols.some((c) => c.total) ? cols.map((c, i) => (c.total ? U.sum(rows, (r) => r[c.key]) : i === 0 ? 'Total' : '')) : null,
          });
        });
      }
      return sheets;
    },
    async docx(opts) {
      if (!window.PMDocx) throw new Error('Word export is not available');
      const blocks = await Export.model(opts);
      const q = Q();
      return window.PMDocx.build(blocks, { title: q.f('meta.name') || 'Project management file', author: q.f('meta.author') || '' });
    },
    xlsx() {
      if (!window.PMXlsx) throw new Error('Excel export is not available');
      return window.PMXlsx.build(Export.sheets(), { title: Q().f('meta.name') || 'Project management file' });
    },
    backup() {
      return JSON.stringify({ app: 'pm-steps-workbook', v: 1, exportedAt: new Date().toISOString(), state: view() }, null, 1);
    },
    async figure(b, fmt) {
      const q = Q();
      const svg = graphicSvg(b, q, PM.pal.light);
      if (!svg.startsWith('<svg')) {
        toast('This graphic has nothing to save yet.');
        return;
      }
      const name = fileBase(q) + ' - ' + (b.title || 'graphic').replace(/[^\p{L}\p{N} ._-]+/gu, '');
      if (fmt === 'svg') return saveFile(name + '.svg', svg, 'image/svg+xml');
      const png = await svgToPng(svg, 2);
      return saveFile(name + '.png', png.bytes, 'image/png');
    },
  });
  function defaultWidth(c) {
    return { textarea: 24, date: 11, money: 10, number: 7, percent: 6, person: 14, people: 18, wbs: 18, multi: 16, check: 5, select: 12, rating: 16 }[c.kind] || 14;
  }
  function xlsKind(c) {
    if (c.kind === 'money') return 'money';
    if (c.kind === 'number') return 'number';
    if (c.kind === 'percent') return 'percent';
    if (c.kind === 'date') return 'date';
    return 'text';
  }
  function xlsValue(c, r, q) {
    const v = r[c.key];
    if (U.isEmpty(v) && v !== 0) return c.from ? q.label(r, c.key) || '' : '';
    if (['money', 'number'].includes(c.kind) && typeof v === 'number') return v;
    if (c.kind === 'percent' && typeof v === 'number') return v / 100;
    if (c.kind === 'date') return v;
    return fmtValue(c, v, q, r);
  }
  function stripHtml(h) {
    const d = document.createElement('div');
    d.innerHTML = h || '';
    return d.textContent || '';
  }

  // ---------- export dialog ----------
  function openExport() {
    const m = document.getElementById('modal');
    if (!m) return;
    m.hidden = false;
    m.innerHTML =
      '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="exTitle">' +
      '<div class="modal-head"><h2 id="exTitle">Export and backup</h2><button type="button" class="btn-ghost sm" data-close>Close</button></div>' +
      '<p class="hint">' + (viewExample ? 'You are looking at the example project, so the files will contain the example.' : 'The files contain your project file as it is now.') + '</p>' +
      '<fieldset class="ex-opts"><legend>Word document</legend>' +
      '<label><input type="checkbox" id="exEmpty" checked> Include empty fields and blank lines to fill in by hand</label>' +
      '<label><input type="checkbox" id="exNotes" checked> Include the method notes</label>' +
      '<label><input type="checkbox" id="exGraphics" checked> Include the graphics</label>' +
      '</fieldset>' +
      '<div class="ex-actions">' +
      '<button type="button" class="btn" data-ex="docx">Word (.docx)</button>' +
      '<button type="button" class="btn" data-ex="xlsx">Excel (.xlsx)</button>' +
      '<button type="button" class="btn-ghost" data-ex="json">Backup (.json)</button>' +
      '</div>' +
      '<div class="ex-restore"><h3>Restore from a backup</h3><p class="hint">Replaces everything in your file with the backup. You can undo it right after.</p>' +
      '<input type="file" id="exFile" accept=".json,application/json"></div>' +
      '<p class="ex-status" id="exStatus" role="status"></p>' +
      '</div>';
    const card = m.querySelector('.modal-card');
    card.querySelector('[data-ex]').focus();
    m.onclick = async (e) => {
      if (e.target === m || e.target.closest('[data-close]')) {
        m.hidden = true;
        m.innerHTML = '';
        return;
      }
      const b = e.target.closest('[data-ex]');
      if (!b) return;
      const status = document.getElementById('exStatus');
      const q = Q();
      const base = fileBase(q);
      b.disabled = true;
      try {
        if (b.dataset.ex === 'docx') {
          status.textContent = 'Building the Word document…';
          const bytes = await Export.docx({ empty: document.getElementById('exEmpty').checked, notes: document.getElementById('exNotes').checked, graphics: document.getElementById('exGraphics').checked });
          await saveFile(base + '.docx', bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } else if (b.dataset.ex === 'xlsx') {
          status.textContent = 'Building the workbook…';
          await saveFile(base + '.xlsx', Export.xlsx(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else {
          await saveFile(base + ' backup.json', Export.backup(), 'application/json');
        }
        status.textContent = '';
      } catch (err) {
        console.error(err);
        status.textContent = 'Export failed: ' + (err && err.message);
      } finally {
        b.disabled = false;
      }
    };
    const file = document.getElementById('exFile');
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const status = document.getElementById('exStatus');
      try {
        const data = JSON.parse(await f.text());
        if (!data || data.app !== 'pm-steps-workbook' || !data.state) throw new Error('This is not a PM Steps Workbook backup.');
        if (viewExample) setExample(false);
        snapshot('Restore');
        const before = state;
        state = normalize(data.state);
        ver += 1;
        Store.allPaths(before, state).forEach((p) => Store.markDirty(p));
        m.hidden = true;
        m.innerHTML = '';
        App.rerender();
        toastUndo('Backup restored.');
      } catch (err) {
        status.textContent = 'Could not restore: ' + err.message;
      }
    });
    m.onkeydown = (e) => {
      if (e.key === 'Escape') {
        m.hidden = true;
        m.innerHTML = '';
        document.getElementById('exportBtn').focus();
      }
    };
  }

  function setExample(on) {
    viewExample = !!on;
    if (viewExample && !exampleState) exampleState = buildExample();
    ver += 1;
    App.rerender();
  }

  // =====================================================================================
  // Boot
  // =====================================================================================
  function boot() {
    const main = document.getElementById('main');
    main.addEventListener('input', onInput);
    main.addEventListener('change', onInput);
    main.addEventListener('focusout', () => {
      if (App.pendingRerender) setTimeout(() => {
        const a = document.activeElement;
        if (!(a && main.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) App.rerender();
      }, 50);
    });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('hashchange', () => App.show(location.hash.slice(1)));
    document.getElementById('exampleToggle').addEventListener('change', (e) => setExample(e.target.checked));
    document.getElementById('exportBtn').addEventListener('click', openExport);
    const tog = document.getElementById('navToggle');
    tog.addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      tog.setAttribute('aria-expanded', String(open));
    });
    const reTheme = () => App.mounted.forEach((m) => {
      if (m.b.type === 'graphic') BLOCKS.graphic.draw(m, Q());
      if (m.children) m.children.forEach((c) => c.b.type === 'graphic' && BLOCKS.graphic.draw(c, Q()));
    });
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
    } catch (e) {
      /* old browsers */
    }
    new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    App.current = App.sectionById(location.hash.slice(1)) || PM.sections[0] || null;
    if (App.current) App.show(App.current.id);
    else App.renderTop();
    Store.init();
  }

  // Test hooks (used by tools/check.mjs; harmless in the page)
  window.PMApp = {
    setExample,
    go: (id) => App.show(id),
    q: Q,
    state: () => view(),
    exportDocx: (opts) => Export.docx(opts),
    exportXlsx: () => Export.xlsx(),
    exportModel: (opts) => Export.model(opts),
    sheets: () => Export.sheets(),
    svgToPng,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})();
