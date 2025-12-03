# Patch: 2025-11-29 FS Lyrics Tweaks (2)

Date: 2025-11-29
Scope: Reposition title/artist in fullscreen, idle-hide bottom timeline, warmer & brighter background, album art hover + double-click entry, lyric color theming.

## Summary
- Move title/artist to fixed top-left to avoid overlap with lyrics.
- Hide bottom progress/timeline when mouse idle (2s) in fullscreen; reappear on move.
- Make background brighter and warmer (blur 60, saturate 1.12, brightness 1.2, slight sepia & hue-rotate). Add a warm tint overlay layer.
- Fullscreen entry: hover-revealed button on album art + double-click album art to enter.
- Typography: add Nunito & Quicksand to font stack for rounder Latin glyphs.
- Lyric colors are now themeable with CSS vars: `--fs-lyrics-color`, `--fs-lyrics-current-color`.

## Files Changed
- css/style.css
  - `.fs-info` fixed to top-left; `.fs-bottom` hidden when `.fs-hide-cursor` present.
  - Stronger/brighter/warmer bg & warm tint `::after` overlay.
  - Album art hover fullscreen button styles; spacing tweaks.
  - Font stacks updated; color vars moved to `:root` for theme override.
- js/main.js
  - On open: initial idle timer + immediate `syncFsLyrics`.
  - Close: wait transition end before hiding.
  - Add `dblclick` on album art to open fullscreen.
- js/player.js
  - Maintain `fsCurrentLyricLine` and ensure FS scroll sync & word-by-word highlighting.

## How to Test
1) Play a track, hover album art to see the button or double-click the art to enter fullscreen.
2) Confirm title/artist fixed at top-left, lyrics center list no overlap.
3) Wait ~2s w/o moving mouse: bottom timeline hides; move to re-show.
4) Drag timeline / change tracks: FS lyrics auto-scroll and highlight current line/words.
5) Observe warmer, brighter BG; adjust per Notes if needed.

## Theme Overrides (optional)
```
/* Example: Light/Dark theme-specific lyric colors */
.theme-light { --fs-lyrics-color: rgba(0,0,0,.82); --fs-lyrics-current-color: #000; }
.theme-dark  { --fs-lyrics-color: rgba(255,255,255,.92); --fs-lyrics-current-color: #fff; }
```

## Rollback
Revert changes in `css/style.css`, `js/main.js`, `js/player.js` from this patch, or revert the commit.

## Notes
- FS idle timer shares cursor-hide class to also hide bottom bar; duration currently 2s (can be tuned).
- If SW caching interferes, clear cache in Settings → 缓存管理.
