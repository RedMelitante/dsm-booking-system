// Converts design-canvas boards (.dc.html) into React class components.
// Usage: node convert.mjs <canvas-source-dir> <out-dir>
// Needs: npm i --no-save htmlparser2@9 prettier@3
import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'htmlparser2';
import prettier from 'prettier';

const [srcDir, outDir] = process.argv.slice(2);

const BOARDS = {
  Main: 'BookingPage',
  Home: 'HomePage',
  Dashboard: 'DashboardPage',
  Onboarding: 'SetupPage',
  Signup: 'AuthPage',
  Embed: 'EmbedDemoPage',
  Tokens: 'StyleguidePage',
};

const ROUTES = {
  Home: '/',
  Signup: '/signup',
  Login: '/login',
  Onboarding: '/setup',
  Dashboard: '/dashboard',
  Main: '/lumen-skin-studio',
  Embed: '/embed-demo',
};

const ATTR_MAP = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly',
  maxlength: 'maxLength', minlength: 'minLength', autocomplete: 'autoComplete', colspan: 'colSpan',
  rowspan: 'rowSpan', allowfullscreen: 'allowFullScreen', frameborder: 'frameBorder',
  spellcheck: 'spellCheck', inputmode: 'inputMode', autofocus: 'autoFocus', novalidate: 'noValidate',
  srcdoc: 'srcDoc', crossorigin: 'crossOrigin', enterkeyhint: 'enterKeyHint', autocapitalize: 'autoCapitalize',
};
const BOOL_ATTRS = new Set(['readonly', 'disabled', 'checked', 'selected', 'required', 'async', 'defer', 'hidden', 'multiple', 'autofocus', 'allowfullscreen', 'novalidate', 'open']);

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function expr(pathStr, loopVars) {
  const p = pathStr.trim();
  if (p === 'true' || p === 'false' || p === 'null' || p === 'undefined') return p;
  if (/^-?\d+(\.\d+)?$/.test(p)) return p;
  if (!/^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(p)) throw new Error('Unsupported binding: ' + p);
  const parts = p.split('.');
  const head = loopVars.has(parts[0]) ? parts[0] : 'v.' + parts[0];
  return [head, ...parts.slice(1)].join('?.');
}

const BIND_RE = /\{\{([^}]*)\}\}/g;
const isFullBinding = (s) => /^\s*\{\{[^}]*\}\}\s*$/.test(s);

function templateLiteral(str, loopVars) {
  let out = '`';
  let last = 0;
  str.replace(BIND_RE, (m, inner, idx) => {
    out += str.slice(last, idx).replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${');
    out += '${' + expr(inner, loopVars) + '}';
    last = idx + m.length;
  });
  out += str.slice(last).replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${') + '`';
  return out;
}

function valueExpr(str, loopVars) {
  if (isFullBinding(str)) return expr(str.trim().slice(2, -2), loopVars);
  if (str.includes('{{')) return templateLiteral(str, loopVars);
  return JSON.stringify(str);
}

function splitDecls(style) {
  const out = [];
  let depth = 0, quote = null, buf = '';
  for (let i = 0; i < style.length; i++) {
    const c = style[i];
    if (quote) { if (c === quote) quote = null; buf += c; continue; }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === '{' && style[i + 1] === '{') { const end = style.indexOf('}}', i); buf += style.slice(i, end + 2); i = end + 1; continue; }
    if (c === ';' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += c;
  }
  out.push(buf);
  return out.map((d) => d.trim()).filter(Boolean);
}

function styleObject(style, loopVars) {
  const props = splitDecls(style).map((d) => {
    const i = d.indexOf(':');
    const prop = d.slice(0, i).trim();
    const val = d.slice(i + 1).trim();
    let key;
    if (prop.startsWith('--')) key = JSON.stringify(prop);
    else if (prop.startsWith('-')) { key = camel(prop.slice(1)); key = key.charAt(0).toUpperCase() + key.slice(1); }
    else key = camel(prop);
    return key + ': ' + valueExpr(val, loopVars);
  });
  return '{{ ' + props.join(', ') + ' }}';
}

function staticDisplay(el) {
  const st = el.attribs && el.attribs.style;
  if (!st) return '';
  const m = /(?:^|;)\s*display\s*:\s*([a-z-]+)/.exec(st);
  return m ? m[1] : '';
}

function isPre(el) {
  const st = (el.attribs && el.attribs.style) || '';
  return /white-space\s*:\s*pre/.test(st) || el.name === 'pre' || el.name === 'textarea';
}

const textNeedsExpr = (t) => /[{}<>&]/.test(t);

function genChildren(nodes, ctx) {
  const out = [];
  nodes.forEach((n, i) => {
    const first = i === 0, last = i === nodes.length - 1;
    const s = gen(n, ctx, first, last);
    if (s !== null && s !== '') out.push(s);
  });
  return out;
}

function genText(raw, ctx, first, last) {
  const parts = [];
  let lastIdx = 0;
  raw.replace(BIND_RE, (m, inner, idx) => {
    parts.push({ t: 'lit', s: raw.slice(lastIdx, idx) });
    parts.push({ t: 'bind', s: inner });
    lastIdx = idx + m.length;
  });
  parts.push({ t: 'lit', s: raw.slice(lastIdx) });

  if (!ctx.pre) {
    const allWs = parts.every((p) => p.t === 'lit' && /^\s*$/.test(p.s));
    if (allWs) {
      if (ctx.dropWs || first || last) return null;
      return '{" "}';
    }
    parts.forEach((p) => { if (p.t === 'lit') p.s = p.s.replace(/\s+/g, ' '); });
    if (first && parts[0].t === 'lit') parts[0].s = parts[0].s.replace(/^ /, '');
    const lp = parts[parts.length - 1];
    if (last && lp.t === 'lit') lp.s = lp.s.replace(/ $/, '');
  }
  return parts.map((p) => {
    if (p.t === 'bind') return '{' + expr(p.s, ctx.loopVars) + '}';
    if (!p.s) return '';
    if (ctx.pre || textNeedsExpr(p.s) || /^ | $/.test(p.s)) return '{' + JSON.stringify(p.s) + '}';
    return p.s;
  }).join('');
}

function gen(node, ctx, first, last) {
  if (node.type === 'text') return genText(node.data, ctx, first, last);
  if (node.type === 'comment') return null;
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return null;
  const name = node.name;
  const a = node.attribs || {};

  if (name === 'sc-if') {
    const cond = expr(a.value.trim().replace(/^\{\{|\}\}$/g, ''), ctx.loopVars);
    const kids = genChildren(node.children, ctx);
    return '{' + cond + ' ? (<>' + kids.join('\n') + '</>) : null}';
  }
  if (name === 'sc-for') {
    const list = expr(a.list.trim().replace(/^\{\{|\}\}$/g, ''), ctx.loopVars);
    const as = a.as;
    const loopVars = new Set(ctx.loopVars); loopVars.add(as);
    const idx = as + '_i';
    const kids = genChildren(node.children, { ...ctx, loopVars });
    return '{(' + list + ' || []).map((' + as + ', ' + idx + ') => (<React.Fragment key={' + idx + '}>' + kids.join('\n') + '</React.Fragment>))}';
  }
  if (name === 'dc-import') {
    const comp = BOARDS[a.name];
    if (!comp) throw new Error('Unknown import ' + a.name);
    ctx.imports.add(comp);
    const props = Object.entries(a).filter(([k]) => k !== 'name' && !k.startsWith('hint-')).map(([k, val]) => {
      const ve = valueExpr(val, ctx.loopVars);
      return k + '={' + ve + '}';
    });
    return '<' + comp + ' ' + props.join(' ') + ' />';
  }

  const inSvg = ctx.svg || name === 'svg';
  const hasOnChange = 'onChange' in a;
  const isReadOnly = 'readonly' in a;
  const attrs = [];
  for (const [k0, val] of Object.entries(a)) {
    if (k0.startsWith('hint-')) continue;
    let k = ATTR_MAP[k0] || k0;
    if (inSvg && k.includes('-') && !k.startsWith('aria-') && !k.startsWith('data-')) k = camel(k);
    if (['input', 'textarea', 'select'].includes(name) && !hasOnChange && !isReadOnly) {
      if (k === 'value') k = 'defaultValue';
      if (k === 'checked') k = 'defaultChecked';
    }
    if (k === 'style') { attrs.push('style=' + styleObject(val, ctx.loopVars)); continue; }
    if (val === '' && BOOL_ATTRS.has(k0)) { attrs.push(k); continue; }
    if (isFullBinding(val) || val.includes('{{')) attrs.push(k + '={' + valueExpr(val, ctx.loopVars) + '}');
    else if (val.includes('"') || val.includes('\n')) attrs.push(k + '={' + JSON.stringify(val) + '}');
    else attrs.push(k + '="' + val + '"');
  }

  const display = staticDisplay(node);
  const childCtx = {
    ...ctx,
    svg: inSvg,
    pre: ctx.pre || isPre(node),
    dropWs: inSvg || ['select', 'table', 'tbody', 'thead', 'tr', 'ul', 'ol'].includes(name) || /flex|grid/.test(display),
  };
  const kids = genChildren(node.children || [], childCtx);
  const open = '<' + name + (attrs.length ? ' ' + attrs.join(' ') : '');
  if (!kids.length) return open + ' />';
  return open + '>' + kids.join(ctx.pre || childCtx.pre ? '' : '\n') + '</' + name + '>';
}

function routeify(s) {
  return s.replace(/\b([A-Z][A-Za-z]+)\.dc\.html\b/g, (m, b) => {
    if (!(b in ROUTES)) throw new Error('No route for ' + m);
    return ROUTES[b];
  });
}

async function convert(board, comp) {
  const html = fs.readFileSync(path.join(srcDir, board + '.dc.html'), 'utf8');
  const doc = parseDocument(html, { lowerCaseAttributeNames: false, lowerCaseTags: true, recognizeSelfClosing: true, decodeEntities: true });
  const find = (nodes, pred) => {
    for (const n of nodes) {
      if (pred(n)) return n;
      if (n.children) { const r = find(n.children, pred); if (r) return r; }
    }
    return null;
  };
  const xdc = find(doc.children, (n) => n.name === 'x-dc');
  const script = find(doc.children, (n) => n.name === 'script' && n.attribs && 'data-dc-script' in n.attribs);
  const logic = script.children.map((c) => c.data).join('').trim();

  const ctx = { loopVars: new Set(), imports: new Set(), svg: false, pre: false, dropWs: true };
  const roots = xdc.children.filter((n) => n.name !== 'helmet');
  const body = genChildren(roots, ctx);
  const jsx = body.length === 1 ? body[0] : '<>' + body.join('\n') + '</>';

  const logicCode = logic.replace(/class Component extends DCLogic/, 'class ' + comp + 'Logic extends DCLogic');
  const imports = [...ctx.imports].map((c) => "import " + c + " from './" + c + ".jsx';").join('\n');
  let code = `// Ported from the design handoff board canvas-source/${board}__DC__.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';
${imports}

${logicCode}

export default class ${comp} extends ${comp}Logic {
  render() {
    const v = this.renderVals();
    return (
      ${jsx}
    );
  }
}
`;
  code = routeify(code).replace('__DC__', '.dc.html');
  code = await prettier.format(code, { parser: 'babel', singleQuote: true, printWidth: 120 });
  fs.writeFileSync(path.join(outDir, comp + '.jsx'), code);
  console.log('wrote', comp, code.length);
}

fs.mkdirSync(outDir, { recursive: true });
for (const [b, c] of Object.entries(BOARDS)) await convert(b, c);
