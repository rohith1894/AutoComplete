const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

// Same shape as the classic C++ trie: 26 child pointers + an end-of-word flag.
class TrieNode {
    constructor() {
        this.children = new Array(26).fill(null);
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (const ch of word) {
            const i = ch.charCodeAt(0) - 97;
            if (i < 0 || i >= 26) continue;
            if (!node.children[i]) node.children[i] = new TrieNode();
            node = node.children[i];
        }
        node.isEnd = true;
    }

    // Walk down the prefix; return the last node, or null if the prefix is missing.
    findPrefix(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            const i = ch.charCodeAt(0) - 97;
            if (i < 0 || i >= 26 || !node.children[i]) return null;
            node = node.children[i];
        }
        return node;
    }

    // DFS from a node, collecting every complete word below it.
    collect(node, word, result) {
        if (node.isEnd) result.push(word);
        for (let i = 0; i < 26; i++)
            if (node.children[i]) this.collect(node.children[i], word + ALPHABET[i], result);
    }

    autocomplete(prefix) {
        const result = [];
        const node = this.findPrefix(prefix);
        if (node) this.collect(node, prefix, result);
        return result;
    }
}

const trie = new Trie();
const MAX_RENDERED = 200;

const $ = (id) => document.getElementById(id);
const input = $('search');
const results = $('results');
const stats = $('stats');

/* ---------- Visualization ---------- */

const SUBTREE_DEPTH = 3;   // levels shown below the prefix node
const MAX_CHILDREN = 5;    // children shown per node before collapsing into "+N"
const NODE_R = 15;
const GAP_X = 40;
const GAP_Y = 64;
const SVG_NS = 'http://www.w3.org/2000/svg';

let animTimer = null;
let currentSteps = [];
let matchCount = 0;

// Builds a small display tree: the prefix path, then a capped DFS subtree.
function buildDisplayTree(prefix) {
    const root = { label: '∅', kind: 'path', isEnd: false, children: [], word: '' };
    let node = trie.root;
    let disp = root;
    for (const ch of prefix) {
        const next = node.children[ch.charCodeAt(0) - 97];
        if (!next) {
            disp.children.push({ label: ch, kind: 'missing', children: [], word: '' });
            return { root, found: false };
        }
        const d = { label: ch, kind: 'path', isEnd: next.isEnd, children: [], word: disp.word + ch };
        disp.children.push(d);
        disp = d;
        node = next;
    }
    disp.kind = 'target';
    expand(node, disp, 0);
    return { root, found: true };
}

function expand(trieNode, disp, depth) {
    if (depth >= SUBTREE_DEPTH) {
        const n = trieNode.children.filter(Boolean).length;
        if (n) disp.children.push({ label: '+' + n, kind: 'more', children: [], word: '' });
        return;
    }
    let shown = 0, hidden = 0;
    for (let i = 0; i < 26; i++) {
        const c = trieNode.children[i];
        if (!c) continue;
        if (shown >= MAX_CHILDREN) { hidden++; continue; }
        const d = { label: ALPHABET[i], kind: 'dfs', isEnd: c.isEnd, children: [], word: disp.word + ALPHABET[i] };
        disp.children.push(d);
        expand(c, d, depth + 1);
        shown++;
    }
    if (hidden) disp.children.push({ label: '+' + hidden, kind: 'more', children: [], word: '' });
}

// Tidy-ish layout: leaves get consecutive x slots, parents center over children.
function layout(root) {
    let slot = 0, maxDepth = 0;
    (function place(n, depth) {
        n.depth = depth;
        maxDepth = Math.max(maxDepth, depth);
        if (!n.children.length) { n.x = slot++; return; }
        n.children.forEach((c) => place(c, depth + 1));
        n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
    })(root, 0);
    return { width: slot, height: maxDepth + 1 };
}

function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

function render(prefix) {
    const svg = $('viz');
    const scroll = $('viz-scroll');
    svg.innerHTML = '';
    clearTimeout(animTimer);
    $('log').textContent = '';

    if (!prefix) {
        $('viz-empty').hidden = false;
        $('replay').disabled = true;
        svg.removeAttribute('width');
        return;
    }
    $('viz-empty').hidden = true;
    $('replay').disabled = false;

    const { root, found } = buildDisplayTree(prefix);
    const size = layout(root);
    const pad = 28;
    const w = Math.max(size.width * GAP_X + pad * 2, scroll.clientWidth - 2);
    const h = (size.height - 1) * GAP_Y + pad * 2;
    const offsetX = (w - size.width * GAP_X) / 2 + GAP_X / 2;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const edges = svgEl('g', { class: 'edges' });
    const nodes = svgEl('g', { class: 'nodes' });
    svg.append(edges, nodes);

    const steps = [];
    (function draw(n, parent) {
        n.cx = offsetX + n.x * GAP_X;
        n.cy = pad + n.depth * GAP_Y;
        if (parent) {
            n.edge = svgEl('line', { x1: parent.cx, y1: parent.cy, x2: n.cx, y2: n.cy, class: 'edge ' + n.kind });
            edges.append(n.edge);
        }
        const g = svgEl('g', { class: `node ${n.kind}${n.isEnd ? ' end' : ''}`, transform: `translate(${n.cx},${n.cy})` });
        if (n.isEnd) g.append(svgEl('circle', { r: NODE_R + 4, class: 'ring' }));
        g.append(svgEl('circle', { r: NODE_R }));
        const t = svgEl('text', { 'text-anchor': 'middle', dy: '0.35em' });
        t.textContent = n.label;
        g.append(t);
        if (n.word) {
            const title = svgEl('title', {});
            title.textContent = n.word + (n.isEnd ? ' (word)' : '');
            g.append(title);
        }
        nodes.append(g);
        n.el = g;
        steps.push(n);
        n.children.forEach((c) => draw(c, n));
    })(root, null);

    // Preorder draw order already matches the search: prefix path first, then DFS.
    currentSteps = steps;
    animate(found, prefix);
}

function animate(found, prefix) {
    clearTimeout(animTimer);
    const log = $('log');
    log.textContent = '';
    currentSteps.forEach((n) => {
        n.el.classList.remove('visited', 'current');
        if (n.edge) n.edge.classList.remove('visited');
    });

    const delay = [420, 260, 160, 90, 40][$('speed').value - 1];
    let i = 0;
    let prev = null;
    const tick = () => {
        if (prev) prev.el.classList.remove('current');
        if (i >= currentSteps.length) {
            log.innerHTML = found
                ? `Done: matched <b>"${prefix}"</b> in ${prefix.length} steps (O(L)), then the DFS collected <b>${matchCount.toLocaleString()}</b> words.`
                : `<b>"${prefix}"</b> isn't in the trie, so the search stops at the first missing character.`;
            return;
        }
        const n = currentSteps[i++];
        n.el.classList.add('visited', 'current');
        if (n.edge) n.edge.classList.add('visited');
        log.innerHTML = describe(n);
        prev = n;
        animTimer = setTimeout(tick, delay);
    };
    tick();
}

function describe(n) {
    switch (n.kind) {
        case 'path':    return n.word ? `Follow edge <b>'${n.label}'</b> → prefix "${n.word}"` : 'Start at the root';
        case 'target':  return `Reached the prefix node <b>"${n.word}"</b>. Starting DFS of its subtree.`;
        case 'missing': return `No child <b>'${n.label}'</b>, so no words have this prefix.`;
        case 'more':    return `${n.label} more branch(es) not drawn (still searched)`;
        default:        return n.isEnd ? `DFS visits "${n.word}": end of word ✓ collect it` : `DFS visits "${n.word}"`;
    }
}

/* ---------- Search UI ---------- */

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function update() {
    const word = input.value.trim().toLowerCase();
    if (!word) {
        results.innerHTML = '';
        stats.textContent = '';
        render('');
        return;
    }
    const t0 = performance.now();
    const arr = trie.autocomplete(word);
    const ms = performance.now() - t0;
    matchCount = arr.length;

    stats.innerHTML = arr.length
        ? `<b>${arr.length.toLocaleString()}</b> match${arr.length === 1 ? '' : 'es'} in ${ms.toFixed(1)} ms`
          + (arr.length > MAX_RENDERED ? ` · showing first ${MAX_RENDERED}` : '')
        : `No words start with "${escapeHtml(word)}"`;

    const n = word.length;
    results.innerHTML = arr.slice(0, MAX_RENDERED)
        .map((w) => `<div class="words"><mark>${escapeHtml(w.slice(0, n))}</mark>${escapeHtml(w.slice(n))}</div>`)
        .join('');
    render(word);
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('words.txt')
        .then((response) => response.text())
        .then((data) => {
            const words = data.split(/\r?\n/).filter(Boolean);
            const t0 = performance.now();
            for (const w of words) trie.insert(w);
            const ms = performance.now() - t0;
            $('word-count').textContent = words.length.toLocaleString();
            $('status').textContent = `Trie built in ${Math.round(ms)} ms`;
            input.disabled = false;
            input.focus();
            if (input.value) update();
        })
        .catch((error) => {
            $('status').textContent = 'Failed to load dictionary';
            console.error('Error fetching data:', error);
        });

    input.addEventListener('input', update);
    $('replay').addEventListener('click', () => {
        const word = input.value.trim().toLowerCase();
        if (word) render(word);
    });
    $('results').addEventListener('click', (e) => {
        const item = e.target.closest('.words');
        if (!item) return;
        input.value = item.textContent;
        update();
    });
});
