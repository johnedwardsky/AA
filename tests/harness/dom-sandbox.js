'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { FIXTURES } = require('./test-fixtures');

/**
 * Lightweight DOMTokenList with replace support
 */
class DOMTokenList {
  constructor(element) {
    this._element = element;
    this._tokens = new Set();
    this._syncFromClassName();
  }

  _syncFromClassName() {
    this._tokens.clear();
    const cls = this._element._className || '';
    cls.split(/\s+/).filter(Boolean).forEach(t => this._tokens.add(t));
  }

  _syncToClassName() {
    this._element._className = Array.from(this._tokens).join(' ');
  }

  add(...tokens) {
    tokens.forEach(t => {
      if (t) this._tokens.add(String(t));
    });
    this._syncToClassName();
  }

  remove(...tokens) {
    tokens.forEach(t => {
      if (t) this._tokens.delete(String(t));
    });
    this._syncToClassName();
  }

  contains(token) {
    return this._tokens.has(String(token));
  }

  toggle(token, force) {
    token = String(token);
    if (force !== undefined) {
      if (force) this.add(token);
      else this.remove(token);
      return force;
    }
    if (this.contains(token)) {
      this.remove(token);
      return false;
    } else {
      this.add(token);
      return true;
    }
  }

  replace(oldToken, newToken) {
    if (!this.contains(oldToken)) return false;
    this.remove(oldToken);
    this.add(newToken);
    return true;
  }

  toString() {
    return Array.from(this._tokens).join(' ');
  }
}

/**
 * High-Fidelity DOMElement supporting full modern multi-page operations
 */
class DOMElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.id = '';
    this._className = '';
    this.classList = new DOMTokenList(this);
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.childNodes = this.children;
    this.parentNode = null;
    this.parentElement = null;
    this._styleProps = {};
    this._value = '';
    this._checked = false;
    this._textContent = '';
    this._eventListeners = new Map();
    this.options = [];
    this.selectedIndex = 0;
    this.width = 300;
    this.height = 150;
    this._ownerDocument = null;
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = String(val || '');
    this.classList._syncFromClassName();
  }

  get value() {
    if (this.tagName === 'SELECT') {
      if (this.options.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
        return this.options[this.selectedIndex].value;
      }
      return this._value || '';
    }
    return this._value;
  }

  set value(val) {
    this._value = String(val ?? '');
    if (this.tagName === 'SELECT') {
      const idx = this.options.findIndex(opt => opt.value === this._value);
      if (idx !== -1) {
        this.selectedIndex = idx;
      }
    }
  }

  get checked() {
    return this._checked;
  }

  set checked(val) {
    this._checked = Boolean(val);
  }

  get style() {
    const self = this;
    const styleProxy = new Proxy(this._styleProps, {
      get(target, prop) {
        if (prop === 'setProperty') {
          return (key, val) => {
            const camel = key.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            target[camel] = String(val);
          };
        }
        if (prop === 'getPropertyValue') {
          return (key) => {
            const camel = key.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            return target[camel] || '';
          };
        }
        if (prop === 'removeProperty') {
          return (key) => {
            const camel = key.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            const old = target[camel] || '';
            delete target[camel];
            return old;
          };
        }
        return target[prop] || '';
      },
      set(target, prop, val) {
        target[prop] = String(val);
        return true;
      }
    });
    return styleProxy;
  }

  set style(val) {
    if (typeof val === 'string') {
      this._styleProps = {};
      val.split(';').forEach(rule => {
        const [k, v] = rule.split(':').map(s => s && s.trim());
        if (k && v) {
          const camel = k.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          this._styleProps[camel] = v;
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      this._styleProps = { ...val };
    }
  }

  get textContent() {
    if (this.children.length === 0) {
      return this._textContent;
    }
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(val) {
    this.children = [];
    this.childNodes = [];
    this._textContent = String(val ?? '');
  }

  get innerHTML() {
    return this._renderHTML();
  }

  set innerHTML(htmlString) {
    this.children = [];
    this.childNodes = [];
    this.options = [];
    this._textContent = '';
    parseHTML(htmlString, this);
  }

  get nextElementSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.children;
    const idx = siblings.indexOf(this);
    if (idx >= 0 && idx < siblings.length - 1) {
      return siblings[idx + 1];
    }
    return null;
  }

  get previousElementSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.children;
    const idx = siblings.indexOf(this);
    if (idx > 0) {
      return siblings[idx - 1];
    }
    return null;
  }

  get firstElementChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }

  get lastElementChild() {
    return this.children.length > 0 ? this.children[this.children.length - 1] : null;
  }

  appendChild(child) {
    if (!child) return null;
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    child.parentElement = this;
    child._ownerDocument = this._ownerDocument;
    this.children.push(child);
    if (this.tagName === 'SELECT' && child.tagName === 'OPTION') {
      this.options.push(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
      child.parentElement = null;
      if (this.tagName === 'SELECT' && child.tagName === 'OPTION') {
        const optIdx = this.options.indexOf(child);
        if (optIdx !== -1) this.options.splice(optIdx, 1);
      }
      return child;
    }
    return null;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
    newChild._ownerDocument = this._ownerDocument;
    this.children.splice(idx, 0, newChild);
    if (this.tagName === 'SELECT' && newChild.tagName === 'OPTION') {
      this.options.push(newChild);
    }
    return newChild;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      oldChild.parentNode = null;
      oldChild.parentElement = null;
      newChild.parentNode = this;
      newChild.parentElement = this;
      newChild._ownerDocument = this._ownerDocument;
      this.children.splice(idx, 1, newChild);
      return oldChild;
    }
    return null;
  }

  cloneNode(deep = false) {
    const clone = new DOMElement(this.tagName.toLowerCase());
    clone.id = this.id;
    clone.className = this.className;
    this.attributes.forEach((v, k) => clone.setAttribute(k, v));
    if (this.tagName === 'INPUT' || this.tagName === 'TEXTAREA' || this.tagName === 'SELECT') {
      clone.value = this.value;
      clone.checked = this.checked;
    }
    if (deep) {
      clone._textContent = this._textContent;
      this.children.forEach(c => clone.appendChild(c.cloneNode(true)));
    }
    return clone;
  }

  remove(index) {
    if (this.tagName === 'SELECT' && typeof index === 'number') {
      if (index >= 0 && index < this.options.length) {
        const opt = this.options[index];
        this.removeChild(opt);
      }
      return;
    }
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  setAttribute(name, value) {
    const strVal = String(value);
    this.attributes.set(name.toLowerCase(), strVal);
    if (name.toLowerCase() === 'id') this.id = strVal;
    if (name.toLowerCase() === 'class') this.className = strVal;
    if (name.toLowerCase().startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      this.dataset[key] = strVal;
    }
    if (name.toLowerCase() === 'value') this.value = strVal;
    if (name.toLowerCase() === 'checked') this.checked = true;
    if (name.toLowerCase() === 'style') this.style = strVal;
  }

  getAttribute(name) {
    const lower = name.toLowerCase();
    if (lower === 'id') return this.id || null;
    if (lower === 'class') return this.className || null;
    if (this.attributes.has(lower)) return this.attributes.get(lower);
    return null;
  }

  removeAttribute(name) {
    const lower = name.toLowerCase();
    this.attributes.delete(lower);
    if (lower === 'id') this.id = '';
    if (lower === 'class') this.className = '';
    if (lower.startsWith('data-')) {
      const key = lower.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      delete this.dataset[key];
    }
  }

  hasAttribute(name) {
    return this.attributes.has(name.toLowerCase());
  }

  addEventListener(type, listener) {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, []);
    }
    this._eventListeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (this._eventListeners.has(type)) {
      const list = this._eventListeners.get(type);
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;
    const listeners = this._eventListeners.get(event.type) || [];
    for (const l of listeners) {
      if (typeof l === 'function') l.call(this, event);
      else if (l && typeof l.handleEvent === 'function') l.handleEvent(event);
    }
    const inlineAttr = 'on' + event.type;
    if (this.hasAttribute(inlineAttr)) {
      const code = this.getAttribute(inlineAttr);
      try {
        const win = (this._ownerDocument && this._ownerDocument._window) || globalThis;
        const doc = this._ownerDocument || (win && win.document);
        const fn = new Function('window', 'document', 'event', `with(window) { ${code} }`);
        fn.call(this, win, doc, event);
      } catch (e) {
        if (this._ownerDocument && this._ownerDocument._window) {
          this._ownerDocument._window.console.error('Inline event error:', e);
        }
      }
    }
    return !event.defaultPrevented;
  }

  click() {
    const event = {
      type: 'click',
      target: this,
      currentTarget: this,
      preventDefault: () => { event.defaultPrevented = true; },
      stopPropagation: () => {},
      defaultPrevented: false
    };
    this.dispatchEvent(event);
  }

  focus() {
    this.dispatchEvent({ type: 'focus', target: this });
  }

  blur() {
    this.dispatchEvent({ type: 'blur', target: this });
  }

  closest(selector) {
    let el = this;
    while (el && el.nodeType === 1) {
      if (matchesSelector(el, selector)) return el;
      el = el.parentElement || el.parentNode;
    }
    return null;
  }

  contains(node) {
    let curr = node;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode || curr.parentElement;
    }
    return false;
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      bottom: this.height || 150,
      right: this.width || 300,
      width: this.width || 300,
      height: this.height || 150,
      x: 0,
      y: 0,
      toJSON: () => {}
    };
  }

  getContext(contextType) {
    if (this.tagName !== 'CANVAS') return null;
    if (!this._canvasContext) {
      this._canvasContext = createMockCanvas2DContext(this);
    }
    return this._canvasContext;
  }

  querySelector(selector) {
    return querySelector(this, selector);
  }

  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }

  getElementById(id) {
    return findElementById(this, id);
  }

  getElementsByTagName(tag) {
    const res = [];
    const lower = tag.toLowerCase();
    function traverse(node) {
      for (const child of node.children) {
        if (lower === '*' || child.tagName.toLowerCase() === lower) {
          res.push(child);
        }
        traverse(child);
      }
    }
    traverse(this);
    return res;
  }

  getElementsByClassName(cls) {
    const res = [];
    const targetClasses = cls.split(/\s+/).filter(Boolean);
    function traverse(node) {
      for (const child of node.children) {
        if (targetClasses.every(c => child.classList.contains(c))) {
          res.push(child);
        }
        traverse(child);
      }
    }
    traverse(this);
    return res;
  }

  _renderHTML() {
    if (this.children.length === 0) {
      return this._textContent;
    }
    return this.children.map(c => {
      const tag = c.tagName.toLowerCase();
      let attrs = '';
      if (c.id) attrs += ` id="${c.id}"`;
      if (c.className) attrs += ` class="${c.className}"`;
      c.attributes.forEach((v, k) => {
        if (k !== 'id' && k !== 'class') attrs += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`;
      });
      const voidTags = ['input', 'img', 'br', 'hr', 'meta', 'link'];
      if (voidTags.includes(tag)) {
        return `<${tag}${attrs} />`;
      }
      return `<${tag}${attrs}>${c._renderHTML()}</${tag}>`;
    }).join('');
  }
}

/**
 * Mock 2D Canvas Context
 */
function createMockCanvas2DContext(canvas) {
  const operations = [];
  return {
    canvas,
    operations,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    beginPath: () => operations.push({ op: 'beginPath' }),
    closePath: () => operations.push({ op: 'closePath' }),
    moveTo: (x, y) => operations.push({ op: 'moveTo', x, y }),
    lineTo: (x, y) => operations.push({ op: 'lineTo', x, y }),
    arc: (x, y, r, sa, ea) => operations.push({ op: 'arc', x, y, r, sa, ea }),
    fill: () => operations.push({ op: 'fill' }),
    stroke: () => operations.push({ op: 'stroke' }),
    clearRect: (x, y, w, h) => operations.push({ op: 'clearRect', x, y, w, h }),
    fillRect: (x, y, w, h) => operations.push({ op: 'fillRect', x, y, w, h }),
    strokeRect: (x, y, w, h) => operations.push({ op: 'strokeRect', x, y, w, h }),
    fillText: (text, x, y) => operations.push({ op: 'fillText', text, x, y }),
    measureText: (text) => ({ width: String(text).length * 8 }),
    save: () => operations.push({ op: 'save' }),
    restore: () => operations.push({ op: 'restore' }),
    translate: (x, y) => operations.push({ op: 'translate', x, y }),
    rotate: (angle) => operations.push({ op: 'rotate', angle }),
    scale: (sx, sy) => operations.push({ op: 'scale', sx, sy }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setLineDash: (arr) => operations.push({ op: 'setLineDash', arr }),
    getLineDash: () => []
  };
}

/**
 * Selector Engine
 */
function matchesSelector(element, selector) {
  if (!element || element.nodeType !== 1) return false;
  selector = selector.trim();
  if (!selector || selector === '*') return true;

  if (selector.startsWith('#') && !selector.includes('.') && !selector.includes('[') && !selector.includes(':')) {
    return element.id === selector.slice(1);
  }

  if (selector.startsWith('.') && !selector.includes('#') && !selector.includes('[') && !selector.includes(':')) {
    return element.classList.contains(selector.slice(1));
  }

  if (selector.startsWith('[') && selector.endsWith(']') && !selector.includes('.') && !selector.includes('#')) {
    const inside = selector.slice(1, -1);
    const eqIdx = inside.indexOf('=');
    if (eqIdx === -1) {
      return element.hasAttribute(inside);
    }
    const name = inside.slice(0, eqIdx).trim();
    let val = inside.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return element.getAttribute(name) === val;
  }

  if (/^[a-zA-Z0-9_-]+$/.test(selector)) {
    return element.tagName.toLowerCase() === selector.toLowerCase();
  }

  const tagMatch = selector.match(/^[a-zA-Z0-9_-]+/);
  const classMatches = Array.from(selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  const attrMatches = Array.from(selector.matchAll(/\[([a-zA-Z0-9_-]+)(?:=([`'"]?)(.*?)\2)?\]/g));

  if (tagMatch && element.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
  if (idMatch && element.id !== idMatch[1]) return false;
  for (const cls of classMatches) {
    if (!element.classList.contains(cls)) return false;
  }
  for (const m of attrMatches) {
    const attrName = m[1];
    const attrVal = m[3];
    if (!element.hasAttribute(attrName)) return false;
    if (attrVal !== undefined && element.getAttribute(attrName) !== attrVal) return false;
  }

  return true;
}

function findElementById(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findElementById(child, id);
    if (found) return found;
  }
  return null;
}

function querySelectorAll(root, selector) {
  const results = [];
  const parts = selector.split(',').map(s => s.trim());

  function matchesDescendant(node, selectorPart) {
    const segments = selectorPart.trim().split(/\s+/).filter(Boolean);
    if (segments.length === 0) return false;
    if (!matchesSelector(node, segments[segments.length - 1])) return false;
    if (segments.length === 1) return true;

    let segIdx = segments.length - 2;
    let curr = node.parentNode;
    while (curr && segIdx >= 0) {
      if (matchesSelector(curr, segments[segIdx])) {
        segIdx--;
      }
      curr = curr.parentNode;
    }
    return segIdx < 0;
  }

  function collect(node) {
    for (const child of node.children) {
      for (const part of parts) {
        if (matchesDescendant(child, part)) {
          if (!results.includes(child)) results.push(child);
          break;
        }
      }
      collect(child);
    }
  }

  collect(root);
  return results;
}

function querySelector(root, selector) {
  const all = querySelectorAll(root, selector);
  return all.length > 0 ? all[0] : null;
}

/**
 * Fast, reliable HTML parser for template structures
 */
function parseHTML(html, parentElement) {
  if (!html) return;
  const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);
  const stack = [parentElement];

  let i = 0;
  const len = html.length;

  while (i < len) {
    // Comment handling
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? len : end + 3;
      continue;
    }

    if (html[i] === '<') {
      const closeIdx = html.indexOf('>', i);
      if (closeIdx === -1) break;

      const fullTag = html.substring(i + 1, closeIdx).trim();
      i = closeIdx + 1;

      if (fullTag.startsWith('/')) {
        // Closing tag
        const closingTag = fullTag.slice(1).trim().toLowerCase();
        for (let s = stack.length - 1; s >= 1; s--) {
          if (stack[s].tagName.toLowerCase() === closingTag) {
            stack.splice(s);
            break;
          }
        }
      } else {
        // Opening tag
        const spaceIdx = fullTag.search(/[\s\/>]/);
        const tagName = (spaceIdx === -1 ? fullTag : fullTag.slice(0, spaceIdx)).trim();
        if (!tagName) continue;

        const isSelfClosing = fullTag.endsWith('/') || voidTags.has(tagName.toLowerCase());
        const el = new DOMElement(tagName);
        el._ownerDocument = parentElement._ownerDocument;

        if (spaceIdx !== -1) {
          parseAttributesString(fullTag.slice(spaceIdx), el);
        }

        const currentParent = stack[stack.length - 1];
        if (currentParent) currentParent.appendChild(el);

        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    } else {
      const nextTag = html.indexOf('<', i);
      const textEnd = nextTag === -1 ? len : nextTag;
      const text = html.substring(i, textEnd);
      i = textEnd;

      if (text) {
        const currentParent = stack[stack.length - 1];
        if (currentParent) {
          currentParent._textContent = (currentParent._textContent || '') + text;
        }
      }
    }
  }
}

function parseAttributesString(attrStr, element) {
  let i = 0;
  const len = attrStr.length;

  while (i < len) {
    while (i < len && /\s/.test(attrStr[i])) i++;
    if (i >= len || attrStr[i] === '/' || attrStr[i] === '>') break;

    const nameStart = i;
    while (i < len && !/[\s=>/]/.test(attrStr[i])) i++;
    const name = attrStr.substring(nameStart, i);
    if (!name) {
      i++;
      continue;
    }

    while (i < len && /\s/.test(attrStr[i])) i++;

    let val = '';
    if (i < len && attrStr[i] === '=') {
      i++;
      while (i < len && /\s/.test(attrStr[i])) i++;
      if (i < len && (attrStr[i] === '"' || attrStr[i] === "'")) {
        const quote = attrStr[i++];
        const valStart = i;
        while (i < len && attrStr[i] !== quote) i++;
        val = attrStr.substring(valStart, i);
        if (i < len) i++;
      } else {
        const valStart = i;
        while (i < len && !/[\s>]/.test(attrStr[i])) i++;
        val = attrStr.substring(valStart, i);
      }
    }

    element.setAttribute(name, val);
  }
}

/**
 * Sandboxed LocalStorage
 */
class MockLocalStorage {
  constructor() {
    this._store = new Map();
  }

  getItem(key) {
    return this._store.has(String(key)) ? this._store.get(String(key)) : null;
  }

  setItem(key, value) {
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }

  key(index) {
    const keys = Array.from(this._store.keys());
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  get length() {
    return this._store.size;
  }
}

/**
 * Mock Event & CustomEvent
 */
class MockEvent {
  constructor(type, eventInitDict = {}) {
    this.type = type;
    this.bubbles = Boolean(eventInitDict.bubbles);
    this.cancelable = Boolean(eventInitDict.cancelable);
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() {}
  stopImmediatePropagation() {}
}

class MockCustomEvent extends MockEvent {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.detail = eventInitDict.detail ?? null;
  }
}

/**
 * Mock IntersectionObserver for analytics impressions
 */
class MockIntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
  }
  observe(el) {
    this.elements.add(el);
    if (typeof this.callback === 'function') {
      setTimeout(() => {
        if (this.elements.has(el)) {
          this.callback([{
            target: el,
            isIntersecting: true,
            intersectionRatio: 1.0,
            boundingClientRect: el.getBoundingClientRect(),
            intersectionRect: el.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now()
          }], this);
        }
      }, 0);
    }
  }
  unobserve(el) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }
}

/**
 * Mock FileReader & Blob
 */
class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }
  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = typeof blob === 'string' ? blob : 'data:image/jpeg;base64,mockBase64ImageData';
      if (typeof this.onload === 'function') this.onload({ target: this });
    }, 0);
  }
  readAsText(blob) {
    setTimeout(() => {
      this.result = String(blob || '');
      if (typeof this.onload === 'function') this.onload({ target: this });
    }, 0);
  }
}

class MockBlob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.size = parts.reduce((acc, p) => acc + (p ? (p.length || 0) : 0), 0);
  }
}

/**
 * Creates an isolated Sandboxed Browser Environment for admin.html
 */
function createAdminSandbox({
  htmlPath = path.resolve(__dirname, '../../admin.html'),
  initialLocalStorage = {},
  viewportWidth = 1440,
  viewportHeight = 900,
  initialAmberData = FIXTURES
} = {}) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarns = [];

  const localStorage = new MockLocalStorage();
  const sessionStorage = new MockLocalStorage();
  Object.entries(initialLocalStorage).forEach(([k, v]) => {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  });

  const documentElement = new DOMElement('html');
  const head = new DOMElement('head');
  const body = new DOMElement('body');
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const document = {
    documentElement,
    head,
    body,
    title: 'Панель администратора — Amber Avenue',
    readyState: 'complete',
    createElement: (tag) => {
      const el = new DOMElement(tag);
      el._ownerDocument = document;
      return el;
    },
    getElementById: (id) => findElementById(body, id) || findElementById(head, id),
    querySelector: (sel) => querySelector(body, sel) || querySelector(head, sel),
    querySelectorAll: (sel) => querySelectorAll(body, sel),
    getElementsByTagName: (tag) => body.getElementsByTagName(tag),
    getElementsByClassName: (cls) => body.getElementsByClassName(cls),
    addEventListener: (type, listener) => {
      if (!document._eventListeners) document._eventListeners = new Map();
      if (!document._eventListeners.has(type)) document._eventListeners.set(type, []);
      document._eventListeners.get(type).push(listener);
    },
    removeEventListener: (type, listener) => {
      if (document._eventListeners && document._eventListeners.has(type)) {
        const list = document._eventListeners.get(type);
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (event) => {
      const listeners = (document._eventListeners && document._eventListeners.get(event.type)) || [];
      listeners.forEach(l => l(event));
    }
  };
  documentElement._ownerDocument = document;
  head._ownerDocument = document;
  body._ownerDocument = document;

  // Extract body markup cleanly
  const bStart = htmlContent.indexOf('<body');
  const bTagClose = bStart !== -1 ? htmlContent.indexOf('>', bStart) : -1;
  const bEnd = htmlContent.lastIndexOf('</body>');
  const bodyMarkup = (bTagClose !== -1 && bEnd !== -1) ? htmlContent.substring(bTagClose + 1, bEnd) : htmlContent;

  // Strip script tags from DOM markup
  let markupClean = '';
  let cur = 0;
  while (cur < bodyMarkup.length) {
    const sStart = bodyMarkup.indexOf('<script', cur);
    if (sStart === -1) {
      markupClean += bodyMarkup.slice(cur);
      break;
    }
    markupClean += bodyMarkup.slice(cur, sStart);
    const sEnd = bodyMarkup.indexOf('</script>', sStart);
    if (sEnd === -1) break;
    cur = sEnd + 9;
  }

  parseHTML(markupClean, body);

  let clipboardContent = '';
  let lastAlert = null;
  let confirmResponse = true;

  const window = {
    document,
    localStorage,
    sessionStorage,
    innerWidth: viewportWidth,
    innerHeight: viewportHeight,
    location: {
      href: 'http://localhost/admin.html',
      pathname: '/admin.html',
      search: '',
      hash: '',
      origin: 'http://localhost',
      reload: () => {}
    },
    AMBER_DATA: JSON.parse(JSON.stringify(initialAmberData)),
    PROPERTIES: JSON.parse(JSON.stringify(initialAmberData.properties || [])),
    DEFAULT_DEV_SUBMISSIONS: JSON.parse(JSON.stringify(initialAmberData.developers || [])),
    crypto: {
      subtle: {
        digest: async (algo, data) => {
          if (algo === 'SHA-256' || (algo && algo.name === 'SHA-256')) {
            const buf = Buffer.from(data);
            const hash = crypto.createHash('sha256').update(buf).digest();
            return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
          }
          throw new Error('Unsupported algo ' + JSON.stringify(algo));
        }
      }
    },
    TextEncoder,
    TextDecoder,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} unobserve() {} disconnect() {} },
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: {
      createObjectURL: () => 'blob:http://localhost/' + Math.random().toString(36).slice(2),
      revokeObjectURL: () => {}
    },
    requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: (el) => el ? (el.style || {}) : {},
    navigator: {
      clipboard: {
        writeText: async (text) => {
          clipboardContent = text;
        }
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AmberTest/1.0'
    },
    matchMedia: (query) => {
      const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
      const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/);
      let matches = true;
      if (minMatch && window.innerWidth < parseInt(minMatch[1], 10)) matches = false;
      if (maxMatch && window.innerWidth > parseInt(maxMatch[1], 10)) matches = false;
      return {
        matches,
        media: query,
        addListener: () => {},
        removeListener: () => {}
      };
    },
    console: {
      log: (...args) => consoleLogs.push(args.map(a => String(a)).join(' ')),
      error: (...args) => consoleErrors.push(args.map(a => String(a)).join(' ')),
      warn: (...args) => consoleWarns.push(args.map(a => String(a)).join(' ')),
      info: (...args) => consoleLogs.push(args.map(a => String(a)).join(' '))
    },
    fetch: async (url, options) => {
      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]'
      };
    },
    alert: (msg) => { lastAlert = msg; },
    confirm: (msg) => confirmResponse,
    prompt: () => '',
    setTimeout: (fn, delay = 0) => setTimeout(fn, delay),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, delay = 0) => setInterval(fn, delay),
    clearInterval: (id) => clearInterval(id),
    HTMLCanvasElement: DOMElement,
    dispatchEvent: (ev) => document.dispatchEvent(ev)
  };

  document._window = window;

  // Extract inline script contents
  const scriptBlocks = [];
  let sPos = 0;
  while (sPos < htmlContent.length) {
    const sStart = htmlContent.indexOf('<script', sPos);
    if (sStart === -1) break;
    const tagClose = htmlContent.indexOf('>', sStart);
    if (tagClose === -1) break;
    const tagHeader = htmlContent.substring(sStart, tagClose);
    const sEnd = htmlContent.indexOf('</script>', tagClose);
    if (sEnd === -1) break;
    if (!tagHeader.includes('src=')) {
      const code = htmlContent.substring(tagClose + 1, sEnd);
      if (code.trim()) scriptBlocks.push(code);
    }
    sPos = sEnd + 9;
  }

  const sandboxContext = vm.createContext({
    ...window,
    window,
    document,
    localStorage,
    sessionStorage,
    crypto: window.crypto,
    TextEncoder,
    TextDecoder,
    btoa: window.btoa,
    atob: window.atob,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    ResizeObserver: window.ResizeObserver,
    MutationObserver: window.MutationObserver,
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: window.URL,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    getComputedStyle: window.getComputedStyle,
    navigator: window.navigator,
    console: window.console,
    alert: window.alert,
    confirm: window.confirm,
    prompt: window.prompt,
    fetch: window.fetch,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    HTMLCanvasElement: DOMElement,
    AMBER_DATA: window.AMBER_DATA,
    PROPERTIES: window.PROPERTIES,
    DEFAULT_DEV_SUBMISSIONS: window.DEFAULT_DEV_SUBMISSIONS
  });

  sandboxContext.globalThis = sandboxContext;
  sandboxContext.self = sandboxContext;

  for (const code of scriptBlocks) {
    try {
      vm.runInContext(code, sandboxContext);
    } catch (err) {
      consoleErrors.push('Script execution error: ' + err.message);
    }
  }

  document.dispatchEvent({ type: 'DOMContentLoaded' });

  return {
    window: sandboxContext,
    document,
    localStorage,
    sessionStorage,
    getConsoleErrors: () => [...consoleErrors],
    getConsoleWarns: () => [...consoleWarns],
    getConsoleLogs: () => [...consoleLogs],
    getClipboardContent: () => clipboardContent,
    getLastAlert: () => lastAlert,
    setConfirmResponse: (val) => { confirmResponse = val; },
    setViewportWidth: (w) => {
      sandboxContext.innerWidth = w;
    },
    click: (selectorOrEl) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) throw new Error('Element not found: ' + selectorOrEl);
      el.click();
    },
    type: (selectorOrEl, text) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) throw new Error('Element not found: ' + selectorOrEl);
      el.value = text;
      el.dispatchEvent({ type: 'input', target: el });
      el.dispatchEvent({ type: 'change', target: el });
    },
    select: (selectorOrEl, val) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) throw new Error('Element not found: ' + selectorOrEl);
      el.value = val;
      el.dispatchEvent({ type: 'change', target: el });
    }
  };
}

/**
 * Creates an isolated Sandboxed Browser Environment for cabinet.html
 */
function createCabinetSandbox({
  htmlPath = path.resolve(__dirname, '../../cabinet.html'),
  developerId = 1,
  developerName = 'ГК «Калининградский строительный концерн»',
  developerCode = 'KSK-2026',
  initialLocalStorage = {},
  viewportWidth = 1440,
  viewportHeight = 900,
  initialAmberData = FIXTURES
} = {}) {
  const defaultStorage = {
    auth_developer_id: String(developerId),
    auth_developer_name: developerName,
    auth_developer_code: developerCode,
    ...initialLocalStorage
  };

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarns = [];

  const localStorage = new MockLocalStorage();
  const sessionStorage = new MockLocalStorage();
  Object.entries(defaultStorage).forEach(([k, v]) => {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  });

  const documentElement = new DOMElement('html');
  const head = new DOMElement('head');
  const body = new DOMElement('body');
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const document = {
    documentElement,
    head,
    body,
    title: 'Личный кабинет застройщика — Янтарный проспект',
    readyState: 'complete',
    createElement: (tag) => {
      const el = new DOMElement(tag);
      el._ownerDocument = document;
      return el;
    },
    getElementById: (id) => findElementById(body, id) || findElementById(head, id),
    querySelector: (sel) => querySelector(body, sel) || querySelector(head, sel),
    querySelectorAll: (sel) => querySelectorAll(body, sel),
    getElementsByTagName: (tag) => body.getElementsByTagName(tag),
    getElementsByClassName: (cls) => body.getElementsByClassName(cls),
    addEventListener: (type, listener) => {
      if (!document._eventListeners) document._eventListeners = new Map();
      if (!document._eventListeners.has(type)) document._eventListeners.set(type, []);
      document._eventListeners.get(type).push(listener);
    },
    removeEventListener: (type, listener) => {
      if (document._eventListeners && document._eventListeners.has(type)) {
        const list = document._eventListeners.get(type);
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (event) => {
      const listeners = (document._eventListeners && document._eventListeners.get(event.type)) || [];
      listeners.forEach(l => l(event));
    }
  };
  documentElement._ownerDocument = document;
  head._ownerDocument = document;
  body._ownerDocument = document;

  const bStart = htmlContent.indexOf('<body');
  const bTagClose = bStart !== -1 ? htmlContent.indexOf('>', bStart) : -1;
  const bEnd = htmlContent.lastIndexOf('</body>');
  const bodyMarkup = (bTagClose !== -1 && bEnd !== -1) ? htmlContent.substring(bTagClose + 1, bEnd) : htmlContent;

  let markupClean = '';
  let cur = 0;
  while (cur < bodyMarkup.length) {
    const sStart = bodyMarkup.indexOf('<script', cur);
    if (sStart === -1) {
      markupClean += bodyMarkup.slice(cur);
      break;
    }
    markupClean += bodyMarkup.slice(cur, sStart);
    const sEnd = bodyMarkup.indexOf('</script>', sStart);
    if (sEnd === -1) break;
    cur = sEnd + 9;
  }

  parseHTML(markupClean, body);

  let clipboardContent = '';
  let lastAlert = null;
  let confirmResponse = true;

  const window = {
    document,
    localStorage,
    sessionStorage,
    innerWidth: viewportWidth,
    innerHeight: viewportHeight,
    location: {
      href: 'http://localhost/cabinet.html',
      pathname: '/cabinet.html',
      search: '',
      hash: '',
      origin: 'http://localhost',
      reload: () => {}
    },
    AMBER_DATA: JSON.parse(JSON.stringify(initialAmberData)),
    PROPERTIES: JSON.parse(JSON.stringify(initialAmberData.properties || [])),
    crypto: {
      subtle: {
        digest: async (algo, data) => {
          if (algo === 'SHA-256' || (algo && algo.name === 'SHA-256')) {
            const buf = Buffer.from(data);
            const hash = crypto.createHash('sha256').update(buf).digest();
            return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
          }
          throw new Error('Unsupported algo ' + JSON.stringify(algo));
        }
      }
    },
    TextEncoder,
    TextDecoder,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} unobserve() {} disconnect() {} },
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: {
      createObjectURL: () => 'blob:http://localhost/' + Math.random().toString(36).slice(2),
      revokeObjectURL: () => {}
    },
    requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: (el) => el ? (el.style || {}) : {},
    navigator: {
      clipboard: {
        writeText: async (text) => {
          clipboardContent = text;
        }
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AmberTest/1.0'
    },
    matchMedia: (query) => ({
      matches: true,
      media: query,
      addListener: () => {},
      removeListener: () => {}
    }),
    console: {
      log: (...args) => consoleLogs.push(args.map(a => String(a)).join(' ')),
      error: (...args) => consoleErrors.push(args.map(a => String(a)).join(' ')),
      warn: (...args) => consoleWarns.push(args.map(a => String(a)).join(' ')),
      info: (...args) => consoleLogs.push(args.map(a => String(a)).join(' '))
    },
    fetch: async () => ({ ok: true, status: 200, json: async () => [], text: async () => '[]' }),
    alert: (msg) => { lastAlert = msg; },
    confirm: (msg) => confirmResponse,
    prompt: () => '',
    setTimeout: (fn, delay = 0) => setTimeout(fn, delay),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, delay = 0) => setInterval(fn, delay),
    clearInterval: (id) => clearInterval(id),
    HTMLCanvasElement: DOMElement,
    dispatchEvent: (ev) => document.dispatchEvent(ev)
  };

  document._window = window;

  const scriptBlocks = [];
  let sPos = 0;
  while (sPos < htmlContent.length) {
    const sStart = htmlContent.indexOf('<script', sPos);
    if (sStart === -1) break;
    const tagClose = htmlContent.indexOf('>', sStart);
    if (tagClose === -1) break;
    const tagHeader = htmlContent.substring(sStart, tagClose);
    const sEnd = htmlContent.indexOf('</script>', tagClose);
    if (sEnd === -1) break;
    if (!tagHeader.includes('src=')) {
      const code = htmlContent.substring(tagClose + 1, sEnd);
      if (code.trim()) scriptBlocks.push(code);
    }
    sPos = sEnd + 9;
  }

  const sandboxContext = vm.createContext({
    ...window,
    window,
    document,
    localStorage,
    sessionStorage,
    crypto: window.crypto,
    TextEncoder,
    TextDecoder,
    btoa: window.btoa,
    atob: window.atob,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    ResizeObserver: window.ResizeObserver,
    MutationObserver: window.MutationObserver,
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: window.URL,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    getComputedStyle: window.getComputedStyle,
    navigator: window.navigator,
    console: window.console,
    alert: window.alert,
    confirm: window.confirm,
    prompt: window.prompt,
    fetch: window.fetch,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    HTMLCanvasElement: DOMElement,
    AMBER_DATA: window.AMBER_DATA,
    PROPERTIES: window.PROPERTIES
  });

  sandboxContext.globalThis = sandboxContext;
  sandboxContext.self = sandboxContext;

  for (const code of scriptBlocks) {
    try {
      vm.runInContext(code, sandboxContext);
    } catch (err) {
      consoleErrors.push('Cabinet script error: ' + err.message);
    }
  }

  document.dispatchEvent({ type: 'DOMContentLoaded' });

  return {
    window: sandboxContext,
    document,
    localStorage,
    sessionStorage,
    getConsoleErrors: () => [...consoleErrors],
    getConsoleWarns: () => [...consoleWarns],
    getConsoleLogs: () => [...consoleLogs],
    getClipboardContent: () => clipboardContent,
    getLastAlert: () => lastAlert,
    setConfirmResponse: (val) => { confirmResponse = val; },
    click: (selectorOrEl) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) throw new Error('Element not found: ' + selectorOrEl);
      el.click();
    },
    type: (selectorOrEl, text) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) throw new Error('Element not found: ' + selectorOrEl);
      el.value = text;
      el.dispatchEvent({ type: 'input', target: el });
      el.dispatchEvent({ type: 'change', target: el });
    }
  };
}

/**
 * Creates an isolated Sandboxed Browser Environment for Public Catalog (app.js + analytics.js)
 */
function createCatalogSandbox({
  pageName = 'zhk-kaliningrad.html',
  initialLocalStorage = {},
  initialAmberData = FIXTURES
} = {}) {
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarns = [];

  const localStorage = new MockLocalStorage();
  const sessionStorage = new MockLocalStorage();
  Object.entries(initialLocalStorage).forEach(([k, v]) => {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  });

  const documentElement = new DOMElement('html');
  const head = new DOMElement('head');
  const body = new DOMElement('body');
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const document = {
    documentElement,
    head,
    body,
    title: 'Каталог новостроек — Янтарный проспект',
    readyState: 'complete',
    createElement: (tag) => {
      const el = new DOMElement(tag);
      el._ownerDocument = document;
      return el;
    },
    getElementById: (id) => findElementById(body, id) || findElementById(head, id),
    querySelector: (sel) => querySelector(body, sel) || querySelector(head, sel),
    querySelectorAll: (sel) => querySelectorAll(body, sel),
    getElementsByTagName: (tag) => body.getElementsByTagName(tag),
    getElementsByClassName: (cls) => body.getElementsByClassName(cls),
    addEventListener: (type, listener) => {
      if (!document._eventListeners) document._eventListeners = new Map();
      if (!document._eventListeners.has(type)) document._eventListeners.set(type, []);
      document._eventListeners.get(type).push(listener);
    },
    removeEventListener: (type, listener) => {
      if (document._eventListeners && document._eventListeners.has(type)) {
        const list = document._eventListeners.get(type);
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (event) => {
      const listeners = (document._eventListeners && document._eventListeners.get(event.type)) || [];
      listeners.forEach(l => l(event));
    }
  };
  documentElement._ownerDocument = document;
  head._ownerDocument = document;
  body._ownerDocument = document;

  // Provide initial catalog container
  const feedContainer = new DOMElement('div');
  feedContainer.id = 'properties-feed';
  feedContainer.className = 'properties-feed';
  body.appendChild(feedContainer);

  const window = {
    document,
    localStorage,
    sessionStorage,
    innerWidth: 1440,
    innerHeight: 900,
    location: {
      href: `http://localhost/${pageName}`,
      pathname: `/${pageName}`,
      search: '',
      hash: '',
      origin: 'http://localhost',
      reload: () => {}
    },
    AMBER_DATA: JSON.parse(JSON.stringify(initialAmberData)),
    PROPERTIES: JSON.parse(JSON.stringify(initialAmberData.properties || [])),
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} unobserve() {} disconnect() {} },
    FileReader: MockFileReader,
    Blob: MockBlob,
    requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: (el) => el ? (el.style || {}) : {},
    navigator: {
      clipboard: { writeText: async () => {} },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AmberTest/1.0'
    },
    console: {
      log: (...args) => consoleLogs.push(args.map(a => String(a)).join(' ')),
      error: (...args) => consoleErrors.push(args.map(a => String(a)).join(' ')),
      warn: (...args) => consoleWarns.push(args.map(a => String(a)).join(' ')),
      info: (...args) => consoleLogs.push(args.map(a => String(a)).join(' '))
    },
    setTimeout: (fn, delay = 0) => setTimeout(fn, delay),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, delay = 0) => setInterval(fn, delay),
    clearInterval: (id) => clearInterval(id),
    dispatchEvent: (ev) => document.dispatchEvent(ev)
  };

  document._window = window;

  const sandboxContext = vm.createContext({
    ...window,
    window,
    document,
    localStorage,
    sessionStorage,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    IntersectionObserver: MockIntersectionObserver,
    navigator: window.navigator,
    console: window.console,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    AMBER_DATA: window.AMBER_DATA,
    PROPERTIES: window.PROPERTIES
  });

  sandboxContext.globalThis = sandboxContext;
  sandboxContext.self = sandboxContext;

  // Load analytics.js
  const analyticsPath = path.resolve(__dirname, '../../analytics.js');
  if (fs.existsSync(analyticsPath)) {
    try {
      const code = fs.readFileSync(analyticsPath, 'utf8');
      vm.runInContext(code, sandboxContext);
    } catch (e) {
      consoleErrors.push('Analytics script error: ' + e.message);
    }
  }

  // Load app.js
  const appPath = path.resolve(__dirname, '../../app.js');
  if (fs.existsSync(appPath)) {
    try {
      const code = fs.readFileSync(appPath, 'utf8');
      vm.runInContext(code, sandboxContext);
    } catch (e) {
      consoleErrors.push('App script error: ' + e.message);
    }
  }

  document.dispatchEvent({ type: 'DOMContentLoaded' });

  return {
    window: sandboxContext,
    document,
    localStorage,
    sessionStorage,
    getConsoleErrors: () => [...consoleErrors],
    getConsoleWarns: () => [...consoleWarns],
    getConsoleLogs: () => [...consoleLogs]
  };
}

module.exports = {
  createAdminSandbox,
  createCabinetSandbox,
  createCatalogSandbox,
  DOMElement,
  DOMTokenList,
  MockLocalStorage,
  MockEvent,
  MockCustomEvent,
  MockIntersectionObserver
};
