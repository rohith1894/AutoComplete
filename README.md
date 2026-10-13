# Trie Autocomplete

**Live demo: [autocomplete-trie-beta.vercel.app](https://autocomplete-trie-beta.vercel.app)**

An autocomplete engine built on a **Trie (prefix tree)** written from scratch in plain JavaScript. It indexes **370,000+ English words** and shows an animated visualization of how each search walks the tree.

## Features

- **Instant prefix search** over a 370K-word dictionary, typically in under a millisecond
- **Live trie visualization** that animates each search step by step:
  - the prefix walk from the root, one character per level
  - the depth-first search that collects every word below the prefix node
  - end-of-word nodes highlighted, with missing prefixes shown in red
- **Replay and speed controls**, plus a caption describing each step
- Match count and search time; prefixes highlighted in the results; click a result to search it
- Responsive dark UI that works on desktop and mobile

## How it works

Each node holds 26 child pointers (one per letter `a`–`z`) and a flag marking the end of a word.

```js
class TrieNode {
    constructor() {
        this.children = new Array(26).fill(null);
        this.isEnd = false;
    }
}
```

| Operation | What it does | Time |
|---|---|---|
| `insert(word)` | Walk down one letter at a time, creating missing nodes; mark the last node as a word end | O(L) |
| `findPrefix(prefix)` | Walk down the prefix; return the last node, or `null` if a letter is missing | O(L) |
| `collect(node, word, result)` | Recursive DFS that gathers every complete word below `node` | O(N) |
| `autocomplete(prefix)` | `findPrefix`, then `collect` from that node | O(L + N) |

*L = length of the prefix, N = number of nodes under the prefix node.*

Because children are visited in order `a`→`z`, results come out alphabetically without any sorting.

To keep the diagram readable, the visualization shows up to 3 levels below the prefix and 5 branches per node; the remaining branches appear as `+N` placeholders but are still searched.

## Tech stack

- **JavaScript**: trie logic and SVG rendering, no frameworks or libraries
- **HTML/CSS**: layout and styling
- **Vercel**: hosting

## Project structure

```
AutoComplete/
├── index.html   # Page layout
├── style.css    # Styles
├── search.js    # Trie implementation, search UI and visualization
└── words.txt    # Dictionary (370K+ English words)
```

## Run locally

No build step is needed. Serve the folder with any static server (the page fetches `words.txt`, so opening the file directly won't work):

```bash
git clone https://github.com/rohith1894/AutoComplete.git
cd AutoComplete/AutoComplete
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
