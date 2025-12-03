function getLetterCover(name) {
    const ch = (name || 'M').trim().charAt(0).toUpperCase();
    const colors = ['#6B7280','#EF4444','#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#22C55E'];
    const code = ch.charCodeAt(0) || 77;
    const bg = colors[code % colors.length];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
<rect width='100%' height='100%' fill='${bg}'/>
<text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-size='200' font-family='Arial, Noto Sans SC' fill='white'>${ch}</text>
</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function renderFrequentWall(state) {
    const grid = document.getElementById('frequent-grid');
    if (!grid) return;
    const now = Date.now();
    const window14d = 14 * 24 * 60 * 60 * 1000;
    const recent = (state.history || []).filter(s => s.playedAt && (now - new Date(s.playedAt).getTime()) <= window14d);
    const byArtist = {};
    for (const s of recent) {
        const artists = Array.isArray(s.artists) ? s.artists.map(a=>a.name) : [];
        artists.forEach(name => {
            if (!byArtist[name]) byArtist[name] = { name, count: 0, last: 0, cover: s.pic };
            byArtist[name].count += 1;
            const t = new Date(s.playedAt).getTime();
            if (t > byArtist[name].last) { byArtist[name].last = t; byArtist[name].cover = s.pic; }
        });
    }
    const top = Object.values(byArtist).sort((a,b)=> b.count - a.count || b.last - a.last).slice(0,3);
    if (top.length === 0) {
        grid.innerHTML = `<p style="padding:12px;color:var(--text-color-secondary);">近期暂无常听数据</p>`;
        return;
    }
    grid.innerHTML = top.map(a => `
        <div class="frequent-card" data-artist="${a.name}">
            <div class="frequent-cover">
                <img src="${a.cover || (window.getLetterCover ? window.getLetterCover(a.name) : '')}" alt="${a.name}" onerror="this.onerror=null;this.src=window.getLetterCover(this.alt||'A')">
                <button class="more-overlay" title="更多"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="frequent-info">
                <div class="frequent-name" title="${a.name}">${a.name}</div>
                <div class="frequent-sub">近两周播放 ${a.count} 次</div>
            </div>
        </div>
    `).join('');
}

window.getLetterCover = getLetterCover;

function updateBackground(imageUrl, dom) {
    const overlay = dom.backgroundOverlay;
    overlay.classList.remove('visible');
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
        setTimeout(() => {
            overlay.style.backgroundImage = `url(${imageUrl})`;
            overlay.classList.add('visible');
        }, 300);
    };
    img.onerror = () => {
        overlay.classList.remove('visible');
    }
}

// 暴露到全局作用域供其他模块使用
window.updateBackground = updateBackground;

function renderDiscoverGrid(keywords, dom) {
    dom.discoverGrid.innerHTML = keywords.map(item => `
        <div class="grid-card" data-keyword="${item.name}" style="background: ${item.color};">
            <i class="fas ${item.icon} card-icon"></i>
            <span class="card-title">${item.name}</span>
        </div>
    `).join('');
}

async function renderFeaturedPlaylist(state, dom) {
    const continueGrid = document.getElementById('continue-grid');
    const recentGrid = document.getElementById('recent-grid');
    if (!continueGrid || !recentGrid) return;

    // 继续听：近48小时播放过的去重Top4；若不足则用最近播放去重Top4补齐
    const now = Date.now();
    const window48h = 2 * 24 * 60 * 60 * 1000;
    const byRecent = [...(state.history || [])]
        .filter(s => s.playedAt)
        .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
    const uniq = [];
    const seen = new Set();
    for (const s of byRecent) { if (!seen.has(s.id)) { seen.add(s.id); uniq.push(s); } }
    const in48h = uniq.filter(s => (now - new Date(s.playedAt).getTime()) <= window48h).slice(0, 4);
    const continueList = (in48h.length > 0 ? in48h : uniq.slice(0, 4));
    if (continueList.length === 0) {
        continueGrid.innerHTML = `<p style="padding:12px;color:var(--text-color-secondary);">还没有播放记录哦</p>`;
    } else {
        continueGrid.innerHTML = continueList.map(song => `
            <div class="continue-card" data-song-id="${song.id}">
                <div class="thumb">
                    <img src="${song.pic || (window.getLetterCover ? window.getLetterCover(song.name) : '')}" alt="${song.name}" onerror="this.onerror=null;this.src=window.getLetterCover(this.alt||'M')">
                    <button class="more-overlay" title="更多"><i class="fas fa-ellipsis-h"></i></button>
                </div>
                <div class="meta">
                    <div class="title" title="${song.name}">${song.name}</div>
                    <div class="artist" title="${song.artists.map(a=>a.name).join(' / ')}">${song.artists.map(a=>a.name).join(' / ')}</div>
                </div>
            </div>
        `).join('');
    }

    // 最近添加：取 playlist_songs 最近6条
    try {
        const entries = await getRecentPlaylistEntries(6);
        const songs = entries.map(e => e.song).filter(Boolean);
        if (songs.length === 0) {
            recentGrid.innerHTML = `<p style="padding:12px;color:var(--text-color-secondary);">最近没有新增到歌单的歌曲</p>`;
        } else {
            const histMap = {};
            (state.history || []).forEach(ev => { if (ev && ev.id && ev.pic) histMap[ev.id] = ev.pic; });
            const histKeyMap = new Map();
            const histNameMap = new Map();
            for (const ev of (state.history || [])) {
                if (!ev || !ev.pic) continue;
                if (/^data:image\/svg/i.test(ev.pic)) continue;
                const key = `${(ev.name||'').toLowerCase().trim()}|${(Array.isArray(ev.artists)? ev.artists.map(a=>a.name).join(' / ') : '').toLowerCase().trim()}`;
                if (!histKeyMap.has(key)) histKeyMap.set(key, ev.pic);
                const nameKey = (ev.name||'').toLowerCase().trim();
                if (nameKey && !histNameMap.has(nameKey)) histNameMap.set(nameKey, ev.pic);
            }
            const resolved = await Promise.all(songs.map(async (song) => {
                const key = `${(song.name||'').toLowerCase().trim()}|${song.artists.map(a=>a.name).join(' / ').toLowerCase().trim()}`;
                const nameKey = (song.name||'').toLowerCase().trim();
                let cand = histMap[song.id] || histKeyMap.get(key) || histNameMap.get(nameKey) || song.pic;
                if (!cand || /^data:image\/svg/i.test(cand)) {
                    if (song.pic_id) {
                        const api = `https://music-api.gdstudio.xyz/api.php?types=pic&source=${song.source}&id=${song.pic_id}&size=500`;
                        try {
                            const r = await fetch(api);
                            if (r.ok) {
                               const j = await r.json();
                               if (j && j.url) cand = j.url;
                            }
                        } catch (_) {}
                        if ((!cand || /^data:image\/svg/i.test(cand)) && song.pic_id) {
                            try {
                                const prox = `/proxy.php?url=${encodeURIComponent(api)}`;
                                const r2 = await fetch(prox);
                                if (r2.ok) {
                                    const j2 = await r2.json();
                                    if (j2 && j2.url) cand = j2.url;
                                }
                            } catch (_) {}
                        }
                    }
                }
                if ((!cand || /^data:image\/svg/i.test(cand)) && window.API && typeof window.API.enhanceMetadata === 'function') {
                    try {
                        const enh = await window.API.enhanceMetadata(song);
                        if (enh && enh.cover && enh.cover.url) {
                            cand = enh.cover.url;
                            if (typeof updatePlaylistSongsCoverBySongId === 'function') {
                                updatePlaylistSongsCoverBySongId(song.id, cand).catch(()=>{});
                            } else if (typeof updatePlaylistSongsCoverByNameArtist === 'function') {
                                const artistStr = Array.isArray(song.artists) ? song.artists.map(a=>a.name).join(' / ') : '';
                                updatePlaylistSongsCoverByNameArtist(song.name, artistStr, cand).catch(()=>{});
                            }
                        }
                    } catch (_) {}
                }
                const cover = (cand && !/^data:image\/svg/i.test(cand)) ? cand : (window.getLetterCover ? window.getLetterCover(song.name) : '');
                return { song, cover };
            }));
            recentGrid.innerHTML = resolved.map(({song, cover}) => `
                <div class="recent-card" data-song-id="${song.id}">
                    <div class="cover">
                        <img src="${cover}" alt="${song.name}" onerror="this.onerror=null;this.src=window.getLetterCover(this.alt||'M')">
                        <button class="play-overlay" title="播放"><i class="fas fa-play"></i></button>
                        <button class="more-overlay" title="更多"><i class="fas fa-ellipsis-h"></i></button>
                    </div>
                    <div class="info">
                        <div class="name" title="${song.name}">${song.name}</div>
                        <div class="artist" title="${song.artists.map(a=>a.name).join(' / ')}">${song.artists.map(a=>a.name).join(' / ')}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('加载最近添加失败', e);
        recentGrid.innerHTML = `<p style="padding:12px;color:var(--danger-color);">加载最近添加失败</p>`;
    }
}

function toggleDiscoverContent(showPortal, dom, loadingText = '正在加载...') {
    if (showPortal) {
        dom.discoverPortal.style.display = 'block';
        dom.songListContainer.style.display = 'none';
        dom.backToGridBtn.style.display = 'none';
        dom.paginationDiscover.innerHTML = '';
    } else {
        dom.discoverPortal.style.display = 'none';
        dom.songListContainer.style.display = 'block';
        dom.songListContainer.innerHTML = `<p style="padding: 15px;">${loadingText}</p>`;
        dom.backToGridBtn.style.display = 'inline-flex';
    }
}

function getPaginationContainer(context) {
    switch (context) {
        case 'discover': return document.getElementById('pagination-discover');
        case 'favourites': return document.getElementById('pagination-favourites');
        case 'history': return document.getElementById('pagination-history');
        case 'local': return document.getElementById('pagination-local');
        case 'playlist': return document.getElementById('pagination-playlist');
        default: return null;
    }
}

function renderPagination(totalPages, currentPage, context) {
    const container = getPaginationContainer(context);
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
    let html = `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    let startPage = Math.max(1, currentPage - 2), endPage = Math.min(totalPages, currentPage + 2);
    if (startPage > 1) html += `<button class="page-btn" data-page="1">1</button>${startPage > 2 ? '<span>...</span>' : ''}`;
    for (let i = startPage; i <= endPage; i++) html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    if (endPage < totalPages) html += `${endPage < totalPages - 1 ? '<span>...</span>' : ''}<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    container.innerHTML = html;
    container.dataset.context = context;
}

function updatePlaylistHighlight(state) {
    document.querySelectorAll('.song-item').forEach(item => {
        const context = item.dataset.context;
        const listForContext = getPlaylistByContext(context, state);
        const index = parseInt(item.dataset.index, 10);
        const isCurrent = state.currentPlaylist === listForContext && index === state.currentTrackIndex;
        item.classList.toggle('current', isCurrent);
    });
}

function renderPlaylist(fullPlaylist, container, context, state) {
    const currentPage = state.pagination[context] || 1;
    const totalItems = fullPlaylist.length;
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = `<p style="padding: 15px;">列表为空。</p>`;
        getPaginationContainer(context).innerHTML = '';
        return;
    }
    // 歌单详情页不分页，便于拖拽排序与批量操作
    const noPaging = (context === 'playlist');
    const totalPages = noPaging ? 1 : Math.ceil(totalItems / state.itemsPerPage);
    const startIndex = noPaging ? 0 : (currentPage - 1) * state.itemsPerPage;
    const endIndex = noPaging ? totalItems : (startIndex + state.itemsPerPage);
    const paginatedItems = fullPlaylist.slice(startIndex, endIndex);

    let header = `<div class="song-list-header"><span>#</span><span>歌曲</span><span>歌手</span><span>专辑</span><span>源</span><span></span><span></span><span></span></div>`;
    // 歌单详情视图的表头不一样，只有2个操作按钮
    if (context === 'playlist') {
        header = `<div class="song-list-header"><span>#</span><span>歌曲</span><span>歌手</span><span>专辑</span><span>源</span><span></span><span></span></div>`;
    }

    container.innerHTML = header + paginatedItems.map((song, index) => {
        const originalIndex = startIndex + index;
        const isLocal = context === 'local';

        let actionIcons = `
            <i class="action-btn fav-btn ${state.favourites.some(f => f.id === song.id) ? 'fas fa-heart favourited' : 'far fa-heart'}" data-song-id="${song.id}"></i>
            <i class="action-btn add-to-playlist-btn fas fa-plus" data-song-id="${song.id}" title="添加到歌单"></i>
        `;

        if (isLocal) {
            actionIcons += `<i class="action-btn delete-btn fas fa-trash" data-song-id="${song.id}" title="从本地库删除"></i>`;
        } else {
            actionIcons += `<i class="action-btn download-btn fas fa-download" data-song-id="${song.id}" title="下载到本地库"></i>`;
        }

        if (context === 'playlist') {
            console.log('Rendering playlist song:', song.name, 'playlistSongId:', song.playlistSongId);
            actionIcons = `
                <i class="action-btn fav-btn ${state.favourites.some(f => f.id === song.id) ? 'fas fa-heart favourited' : 'far fa-heart'}" data-song-id="${song.id}"></i>
                <i class="action-btn remove-from-playlist-btn fas fa-times" data-playlist-song-id="${song.playlistSongId}" title="从歌单移除"></i>
            `;
        }
        
        // 添加音乐源标识
        const sourceBadge = song.source ? `<span class="music-source-badge ${song.source}">${song.sourceDisplayName || song.source}</span>` : '<span class="music-source-badge">本地</span>';

        const playlistAttrs = context === 'playlist' ? ` data-playlist-song-id="${song.playlistSongId || ''}" draggable="true"` : '';
        const checkboxHtml = context === 'playlist' ? `<input type="checkbox" class="pl-select" data-playlist-song-id="${song.playlistSongId || ''}">` : '';
        return `
            <div class="song-item" data-index="${originalIndex}" data-context="${context}"${playlistAttrs}>
                <span class="song-index">${checkboxHtml}${originalIndex + 1}</span>
                <div class="song-title"><span>${song.name}</span><span class="error-msg" id="error-${context}-${song.id}"></span></div>
                <span>${song.artists.map(a => a.name).join(' / ')}</span>
                <span>${song.album}</span>
                ${sourceBadge}
                ${actionIcons}
            </div>`;
    }).join('');
    renderPagination(totalPages, currentPage, context);
    updatePlaylistHighlight(state);
}

function updatePlayerUI(song, dom) {
    if (!song) {
        dom.barSongTitle.textContent = '--'; dom.barSongArtist.textContent = '--';
        dom.barAlbumArt.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        dom.barFavBtn.dataset.songId = '';
        updateBackground('https://source.unsplash.com/random/1600x900/?music,concert', dom);
        return;
    }
    dom.barSongTitle.textContent = song.name;
    dom.barSongArtist.textContent = song.artists.map(a => a.name).join(' / ');
    dom.barAlbumArt.src = song.pic;
    dom.barAlbumArt.onerror = function() { this.onerror=null; this.src = getLetterCover(song.name); };
    dom.barFavBtn.dataset.songId = song.id;
    updateBackground(song.pic, dom);
    
    // 更新媒体会话信息（PWA功能）
    if (window.updateMediaSession) {
        window.updateMediaSession(song);
    }
    
    // 提取专辑封面主色调更新背景效果
    if (typeof backgroundEffects !== 'undefined' && song.pic) {
        backgroundEffects.extractDominantColor(song.pic);
    }
}

function updateFavouriteIcon(songId, isFavourited, dom) {
    if (!songId) { dom.barFavBtn.className = 'action-btn fav-btn far fa-heart'; return; }
    dom.barFavBtn.className = `action-btn fav-btn ${isFavourited ? 'fas fa-heart favourited' : 'far fa-heart'}`;
}

function updatePlayPauseIcon(isPlaying, dom) {
    dom.playPauseBtn.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'}"></i>`;
    
    // 控制专辑封面旋转效果
    const albumArtContainer = dom.barAlbumArt.parentElement;
    if (isPlaying) {
        albumArtContainer.classList.add('playing');
        albumArtContainer.classList.remove('paused');
        dom.playPauseBtn.classList.add('playing');
    } else {
        albumArtContainer.classList.remove('playing');
        albumArtContainer.classList.add('paused');
        dom.playPauseBtn.classList.remove('playing');
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');
    
    // 如果切换到统计页面，延迟重新渲染图表
    if (viewId === 'stats-view') {
        setTimeout(() => {
            console.log('切换到统计页面，重新渲染图表');
            if (typeof updateAndRenderStats === 'function') {
                // 获取全局state和dom对象
                const state = window.state || { history: [], favourites: [] };
                const dom = window.dom || {};
                updateAndRenderStats(state, dom);
            }
        }, 200);
    }
}

async function renderUserPlaylists() {
    const playlists = await getAllPlaylists();
    const playlistNav = document.querySelector('.sidebar nav ul');
    document.querySelectorAll('.user-playlist-item').forEach(item => item.remove());
    const oldTitle = document.getElementById('user-playlists-title');
    if (oldTitle) {
        oldTitle.remove();
    }
    if (playlists.length > 0) {
        const titleLi = document.createElement('li');
        titleLi.id = 'user-playlists-title';
        titleLi.style.padding = '12px';
        titleLi.style.paddingTop = '20px';
        titleLi.style.color = 'var(--text-color-secondary)';
        titleLi.style.fontSize = '0.9em';
        titleLi.style.fontWeight = '500';
        titleLi.textContent = '我的歌单';
        playlistNav.appendChild(titleLi);

        playlists.forEach(playlist => {
            const li = document.createElement('li');
            li.className = 'user-playlist-item';
            li.dataset.playlistId = playlist.id;

            const wrapper = document.createElement('div');
            wrapper.className = 'playlist-item-wrapper';

            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-link';
            a.dataset.view = `playlist-${playlist.id}`;
            a.title = playlist.name; // 为收起状态提供悬浮提示
            a.innerHTML = `<i class="fas fa-music"></i> <span class="sidebar-text">${playlist.name}</span>`;

            const optionsBtn = document.createElement('button');
            optionsBtn.className = 'playlist-options-btn';
            optionsBtn.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
            optionsBtn.title = '更多操作';

            const menu = document.createElement('div');
            menu.className = 'playlist-options-menu';
            menu.innerHTML = `
                <button class="rename-playlist-btn"><i class="fas fa-edit"></i> 重命名</button>
                <button class="delete-playlist-btn delete"><i class="fas fa-trash"></i> 删除歌单</button>
            `;

            wrapper.appendChild(a);
            wrapper.appendChild(optionsBtn);
            wrapper.appendChild(menu);
            li.appendChild(wrapper);
            playlistNav.appendChild(li);
        });
    }
}

async function renderPlaylistView(playlistId, playlistName, state, dom) {
    const container = document.getElementById('playlist-view-list-container');
    document.getElementById('playlist-view-title').innerHTML = `<i class="fas fa-music"></i> ${playlistName}`;
    container.innerHTML = `<p style="padding: 15px;">正在加载歌单内容...</p>`;
    showView('playlist-view');
    const pv = document.getElementById('playlist-view');
    if (pv) { pv.dataset.playlistId = String(playlistId); }

    const songsWithPlaylistSongId = await getSongsInPlaylist(playlistId);
    state.currentPlaylistView = songsWithPlaylistSongId.map(item => ({ ...item.song, playlistSongId: item.id }));

    renderPlaylist(state.currentPlaylistView, container, 'playlist', state);
    // 为歌单容器添加特殊样式类（在渲染后添加）
    container.classList.add('playlist-container');
    if (typeof enablePlaylistDnDAndBatch === 'function') {
        enablePlaylistDnDAndBatch(playlistId, state);
    } else {
        window.__enableDnDWait = { playlistId, state };
    }
}

// 启用歌单拖拽排序与批量操作
function enablePlaylistDnDAndBatch(playlistId, state) {
    const container = document.getElementById('playlist-view-list-container');
    const batchBar = document.getElementById('playlist-batch-bar');
    const selectAll = document.getElementById('pl-select-all');
    const selectedCountEl = document.getElementById('pl-selected-count');
    const removeBtn = document.getElementById('playlist-remove-selected');
    const addBtn = document.getElementById('playlist-add-selected');
    if (!container) return;

    const selected = new Set();
    const renumber = () => {
        container.querySelectorAll('.song-item').forEach((item, i) => {
            const idx = item.querySelector('.song-index');
            if (idx) idx.lastChild && (idx.lastChild.nodeType === 3 ? idx.lastChild.nodeValue = String(i+1) : idx.appendChild(document.createTextNode(String(i+1))));
        });
    };
    const refreshBatchBar = () => {
        const count = selected.size;
        if (selectedCountEl) selectedCountEl.textContent = `已选 ${count} 首`;
        if (batchBar) batchBar.style.display = count > 0 ? 'flex' : 'none';
    };
    const persistOrder = async () => {
        const ids = Array.from(container.querySelectorAll('.song-item[data-playlist-song-id]')).map(el => parseInt(el.dataset.playlistSongId, 10)).filter(n=>!isNaN(n));
        if (typeof setPlaylistOrder === 'function') {
            await setPlaylistOrder(playlistId, ids);
        }
        renumber();
    };

    let dragging = null;
    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.song-item[data-context="playlist"]');
        if (!item) return;
        dragging = item;
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
    });
    container.addEventListener('dragover', (e) => {
        if (!dragging) return;
        const target = e.target.closest('.song-item[data-context="playlist"]');
        if (!target || target === dragging) return;
        e.preventDefault();
        const rect = target.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        if (after) {
            target.after(dragging);
        } else {
            target.before(dragging);
        }
    });
    const endDrag = async () => {
        if (!dragging) return;
        dragging.classList.remove('dragging');
        dragging = null;
        await persistOrder();
    };
    container.addEventListener('drop', (e) => { e.preventDefault(); endDrag(); });
    container.addEventListener('dragend', () => endDrag());

    // 批量勾选
    container.addEventListener('change', (e) => {
        const cb = e.target.closest('input.pl-select');
        if (!cb) return;
        const id = parseInt(cb.dataset.playlistSongId, 10);
        if (cb.checked) selected.add(id); else selected.delete(id);
        refreshBatchBar();
    });
    if (selectAll) selectAll.addEventListener('change', (e) => {
        const checked = selectAll.checked;
        container.querySelectorAll('input.pl-select').forEach(cb => {
            cb.checked = checked;
            const id = parseInt(cb.dataset.playlistSongId, 10);
            if (checked) selected.add(id); else selected.delete(id);
        });
        refreshBatchBar();
    });
    if (removeBtn) removeBtn.addEventListener('click', async () => {
        const ids = Array.from(selected);
        for (const psId of ids) { try { await removeSongFromPlaylist(psId); } catch(_) {} }
        // 从DOM移除
        ids.forEach(id => container.querySelector(`.song-item[data-playlist-song-id="${id}"]`)?.remove());
        selected.clear(); if (selectAll) selectAll.checked = false; refreshBatchBar(); renumber();
        window.__appShowToast && window.__appShowToast('已移除选中歌曲', 'success');
    });
    if (addBtn) addBtn.addEventListener('click', async () => {
        try {
            const targetId = await showAddToPlaylistModal();
            const ids = Array.from(selected);
            const list = state.currentPlaylistView || [];
            for (const psId of ids) {
                const song = list.find(s => s.playlistSongId === psId);
                if (song) { await addSongToPlaylist(targetId, song); }
            }
            window.__appShowToast && window.__appShowToast('已添加到目标歌单', 'success');
        } catch (e) {}
    });
}

function showCustomPrompt({ title, text, placeholder }) {
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalInput = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    return new Promise((resolve, reject) => {
        modalTitle.textContent = title;
        modalText.textContent = text;
        modalInput.placeholder = placeholder || '';
        modalInput.value = '';

        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
        modalInput.focus();

        const cleanup = () => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                modalOverlay.removeEventListener('click', onOverlayClick);
                modalInput.removeEventListener('keydown', onKeydown);
            }, 300);
        };

        const onConfirm = () => {
            const value = modalInput.value;
            cleanup();
            resolve(value);
        };

        const onCancel = () => {
            cleanup();
            reject(new Error('User cancelled the prompt.'));
        };

        const onOverlayClick = (event) => {
            if (event.target === modalOverlay) {
                onCancel();
            }
        };

        const onKeydown = (event) => {
            if (event.key === 'Enter') {
                onConfirm();
            } else if (event.key === 'Escape') {
                onCancel();
            }
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        modalOverlay.addEventListener('click', onOverlayClick);
        modalInput.addEventListener('keydown', onKeydown);
    });
}

async function showAddToPlaylistModal() {
    const modalOverlay = document.getElementById('add-to-playlist-modal-overlay');
    const modalList = document.getElementById('modal-playlist-list');
    const cancelBtn = document.getElementById('modal-cancel-btn-add');

    const playlists = await getAllPlaylists();
    if (playlists.length === 0) {
        showToast('请先创建一个歌单', 'error');
        return Promise.reject('No playlists');
    }

    modalList.innerHTML = playlists.map(p => `<div class="modal-playlist-item" data-playlist-id="${p.id}">${p.name}</div>`).join('');

    return new Promise((resolve, reject) => {
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('visible'), 10);

        const cleanup = () => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                cancelBtn.removeEventListener('click', onCancel);
                modalOverlay.removeEventListener('click', onOverlayClick);
                modalList.removeEventListener('click', onItemClick);
            }, 300);
        };

        const onCancel = () => {
            cleanup();
            reject(new Error('User cancelled.'));
        };

        const onOverlayClick = (e) => {
            if (e.target === modalOverlay) onCancel();
        };

        const onItemClick = (e) => {
            const item = e.target.closest('.modal-playlist-item');
            if (item) {
                const playlistId = parseInt(item.dataset.playlistId, 10);
                cleanup();
                resolve(playlistId);
            }
        };

        cancelBtn.addEventListener('click', onCancel);
        modalOverlay.addEventListener('click', onOverlayClick);
        modalList.addEventListener('click', onItemClick);
    });
}

// 显示确认对话框
function showCustomConfirm({ title, text, danger = false }) {
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalInput = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    return new Promise((resolve, reject) => {
        modalTitle.textContent = title;
        modalText.innerHTML = text; // 使用innerHTML支持HTML标签
        modalInput.style.display = 'none'; // 隐藏输入框
        
        // 如果是危险操作，更改按钮样式
        if (danger) {
            confirmBtn.textContent = '删除';
            confirmBtn.style.backgroundColor = 'var(--danger-color)';
        } else {
            confirmBtn.textContent = '确定';
            confirmBtn.style.backgroundColor = 'var(--accent-color)';
        }

        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
        confirmBtn.focus();

        const cleanup = () => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                modalInput.style.display = 'block'; // 恢复输入框显示
                confirmBtn.textContent = '确定'; // 恢复按钮文本
                confirmBtn.style.backgroundColor = 'var(--accent-color)'; // 恢复按钮样式
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                modalOverlay.removeEventListener('click', onOverlayClick);
                document.removeEventListener('keydown', onKeydown);
            }, 300);
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            reject(new Error('User cancelled the confirmation.'));
        };

        const onOverlayClick = (event) => {
            if (event.target === modalOverlay) {
                onCancel();
            }
        };

        const onKeydown = (event) => {
            if (event.key === 'Enter') {
                onConfirm();
            } else if (event.key === 'Escape') {
                onCancel();
            }
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        modalOverlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeydown);
    });
}

// Toast 通知系统
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `
        <i class="fas ${icon} toast-icon"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // 触发显示动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// 供其他脚本调用统一的 UI Toast（避免递归）
window.__appShowToast = showToast;