# Patch: 2025-11-29 Shortcuts & Menus

Date: 2025-11-29
Scope: Keyboard seek shortcuts (J/L family), Discover grid context menu, "More" button for Frequent/Recent/Continue cards, minor UI glue.

## Summary
- Implement seek shortcuts while preserving existing lyrics toggle on `L`.
- Add right-click context menu for Discover category cards (grid).
- Add three-dots "More" button to Frequent Artists, Recently Added, and Continue Listening cards with consistent actions.
- Sync favourite icons in lists when toggled from the player bar.
- Keep the new volume slider visual update flow (no UI gap, filled track ends at thumb) via JS-driven gradient.

## Files Changed
- index.html
  - Global keydown: `J` seek backward (-5s; with Shift: -10s).
  - Global keydown: `Shift+L` seek forward (+10s). Keep `L` for lyrics panel toggle.
  - Global keydown: `M` mute/unmute.

- js/main.js
  - Add `updateVolumeSliderVisual(val)` and bind to slider input + audio `volumechange`.
  - Add `updateListFavouriteIcons()`; called after `toggleFavourite()` to sync list hearts.
  - Context menu: `recent-card`/`continue-card` (play, enqueue, add to playlist, download, copy link).
  - Context menu: `grid-card` (Discover categories): Play Top 20, Shuffle Play, Open Results, Create Smart Playlist.
  - "More" button click on `frequent-card` shows artist menu (Play Top 20, Create Smart Playlist, Shuffle Play).

- js/ui.js
  - Inject three-dots `more-overlay` button into:
    - Frequent Artists (`.frequent-card .frequent-cover`).
    - Continue Listening (`.continue-card .thumb`).
    - Recently Added (`.recent-card .cover`).

- css/style.css
  - Add `.more-overlay` hover styles for frequent/continue/recent covers.
  - Volume slider background is JS-driven to ensure the filled track aligns with the thumb at all times.

## User-Facing Behaviour
- Shortcuts
  - `Space`: Play/Pause (existing)
  - `Ctrl+Left/Right`: Previous/Next (existing)
  - `ArrowUp/Down`: Volume up/down (existing)
  - `D`: Favourite toggle (existing)
  - `L`: Toggle lyrics panel (existing)
  - `M`: Mute/unmute (new)
  - `J`: Seek backward 5s; with Shift: 10s (new)
  - `Shift+L`: Seek forward 10s (new, chosen to avoid conflict with `L` for lyrics)

- Cards
  - Discover grid (category) right-click: Play Top 20 / Shuffle / Open Results / Create Smart Playlist.
  - "Continue" & "Recently Added": Right-click and 3-dot menu with play/enqueue/add-to-playlist/download/copy-link.
  - Frequent artists: 3-dot menu with artist actions.

## Testing Checklist
1) Shortcuts
- Press `J` (and `Shift+J`) during playback and confirm -5s/-10s.
- Press `Shift+L` during playback and confirm +10s.
- Press `L` toggles lyrics panel as before (no conflict).
- Press `M` toggles mute state.

2) Discover Grid
- Right-click a category tile → menu pops up.
- "播放该分类 Top 20" plays a list and starts from the first track.
- "随机播放" shuffles and plays.
- "打开搜索结果" navigates to results list.
- "创建智能歌单" creates and populates a local playlist, visible under sidebar playlists.

3) Cards
- On "最近添加/继续听"：hover shows 3-dot; left-click the dot shows the menu with actions that work.
- Frequent artists：3-dot shows artist menu; actions run correctly.

4) Favourites Sync
- Click the heart in the playback bar; the list row heart mirrors the state immediately.

5) Volume Slider Visual
- Drag and use ArrowUp/Down; verify the filled track terminates at the thumb with no gap at max.

## Notes on Shortcut Mapping
- Requirement conflicts: `L` for lyrics vs `L` for forward seek (+5/+10s).
- Chosen compromise: keep `L` for lyrics; use `Shift+L` for +10s and reserve `J` for backward.
- If you prefer `L` (+5s) and `Shift+L` (+10s), we can remap lyrics toggle to another key (e.g. `;` or `Alt+L`).

## Rollback
- Using Git:
  - Inspect changes: `git status` / `git diff`
  - Revert specific file: `git checkout -- index.html js/main.js js/ui.js css/style.css`
  - Or revert commit: `git revert <commit>` (if already committed)

## Related Risks
- Keybinding expectations: users used to `L` for lyrics; altering to seek could confuse. Current mapping avoids that.
- Context menus rely on dynamic DOM; ensure menus close on outside click (handled by `showQuickMenu`).

## Migration/Config
- No schema changes. No new localStorage keys.
- `patches/` folder added for traceability.
