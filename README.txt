# Aji’s Crossword (static website)

This folder is a deployable static website (no backend required).

## Easiest way to run it on your PC (Windows/macOS/Linux)

### Option 1: Python (usually installed)
Open a terminal in this folder and run:

- Windows:
  python -m http.server 8000
- macOS/Linux:
  python3 -m http.server 8000

Then open:
http://localhost:8000

### Option 2: Node (if you have it)
npx serve .

## Easiest way to put it online (no home PC hosting)

- GitHub Pages (free): put these files in a repo and enable Pages.
- Netlify (free): drag-and-drop this folder into Netlify “Deploy”.

## Adding a new puzzle
1) Create a new file: `puzzles/101.json` (copy an existing puzzle as a template)
2) Add an entry to `puzzles/index.json`

That’s it.

---

## Puzzle JSON format (simple)
- `grid.rows`, `grid.cols`
- `grid.blocks`: list of blocked cells as `[row, col]` 0-indexed
- `solution`: array of strings, length = rows, each string length = cols
  - use '.' for blocked cells
  - letters are exactly what the user must type (Devanagari supported)
- `wordBank`: array of words used in the puzzle

You can expand this later to add Across/Down clues, timers, hints, etc.
