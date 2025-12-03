# Patch: 2025-11-29 Fullscreen Lyrics

Date: 2025-11-29
Scope: Implement fullscreen lyrics overlay (screensaver-like), UI button in now-playing sidebar, sync with playback and lyrics; minor CSS; JS wiring. 

## Summary
- Add a fullscreen lyrics overlay with blurred cover background, center-aligned cover + title/artist + scrolling lyrics, and a bottom progress bar.
- Add a toolbar button at the top-right of the Now Playing sidebar to open the overlay; add a close button in the overlay topbar and support Esc.
- Sync overlay lyrics with existing lyrics data (including word-by-word highlighting) and playback time.
- Auto-hide mouse cursor in fullscreen after 2s inactivity.

## Files Changed
- index.html
  - Add toolbar button in now-playing sidebar: `#openFsLyricsBtn`.
  - Add fullscreen overlay DOM: `#fs-lyrics-overlay` with child elements (bg, topbar, center, content, bottom progress).
- css/style.css
  - Styles for `.np-toolbar`, `.fs-lyrics-overlay`, background blur, typography, bottom progress, and cursor-hide.
- js/player.js
  - Add helpers: `renderFsLyricsFromState(dom, state)` and `syncFsLyrics(dom, state)`.
  - Call `renderFsLyricsFromState` when new lyrics are displayed and when song changes while overlay is open.
  - Fix brace issues after edits.
- js/main.js
  - DOM refs for fullscreen overlay elements.
  - Functions: `openFsLyrics()`, `closeFsLyrics()`, `updateFsProgress()` and wiring.
  - Hook into `timeupdate` & `loadedmetadata` to update overlay lyrics and progress.
  - Esc key to exit overlay and toggle fullscreen API when available.

## How to Test
1) Open the app, play a song with lyrics.
2) Click the top-right expand icon on the right sidebar.
   - Overlay should fade in, title/artist/cover visible, blurred background present.
   - Lyrics scroll with the song; current line becomes larger/brighter; word-by-word highlight if available.
   - Bottom progress updates, showing current/total time.
   - After 2s without mouse movement, cursor hides; moving the mouse re-shows it.
3) Press Esc or click the top-right compress icon to exit the overlay.
4) Switch songs while overlay is open; cover/background/title/artist and lyrics update accordingly.

## Rollback
- Revert files:
  - `index.html` (remove toolbar button and overlay block)
  - `css/style.css` (remove `.np-toolbar` and `.fs-lyrics-*` styles)
  - `js/player.js` (remove `renderFsLyricsFromState`/`syncFsLyrics` helpers and related calls)
  - `js/main.js` (remove fs-lyrics wiring)
- Or revert the commit containing this patch.

## Notes / Risks
- Overlay relies on existing `state.lyricsData`; for songs without lyrics, overlay shows a friendly placeholder.
- Requires `player.js` to load before `main.js` (current order OK) so that `formatTime` is available.
- Cursor auto-hide uses simple timeout; adjust duration if needed.
