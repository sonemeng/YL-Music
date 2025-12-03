function getPlaylistByContext(context, state) {
    switch (context) {
        case 'discover': return state.discoverPlaylist;
        case 'favourites': return state.favourites;
        case 'history': return state.history;
        case 'local': return state.localPlaylist;
        case 'playlist': return state.currentPlaylistView || [];
        default: return [];
    }
}

function renderFsLyricsFromState(dom, state) {
    try {
        const container = dom && dom.fsLyricsContent ? dom.fsLyricsContent : document.getElementById('fs-lyrics-content');
        if (!container) return;
        const data = Array.isArray(state.lyricsData) ? state.lyricsData : [];
        if (data.length === 0) {
            container.innerHTML = '<p>正在享受音乐...</p>';
            return;
        }
        container.innerHTML = data.map((line, idx) => {
            if (line.isWordByWord && Array.isArray(line.line)) {
                const wordsHtml = line.line.map(w => `<span>${(w && w.text) ? w.text : ''}</span>`).join('');
                return `<p id="fs-lyric-line-${idx}" class="word-by-word">${wordsHtml}</p>`;
            } else {
                const text = (line && typeof line.text === 'string') ? line.text : '';
                return `<p id="fs-lyric-line-${idx}">${text || '...'}</p>`;
            }
        }).join('');
    } catch (_) {}
}

function syncFsLyrics(dom, state) {
    try {
        const overlay = document.getElementById('fs-lyrics-overlay');
        if (!overlay || overlay.style.display === 'none') return;
        const data = Array.isArray(state.lyricsData) ? state.lyricsData : [];
        if (data.length === 0 || dom.audioPlayer.paused) return;
        const currentTime = dom.audioPlayer.currentTime;
        let newIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (currentTime >= data[i].time) newIndex = i; else break;
        }
        // determine window center
        const total = data.length;
        const windowCenter = (newIndex !== -1) ? newIndex : 0;
        const start = Math.max(0, windowCenter - 2);
        const end = Math.min(total - 1, windowCenter + 2);

        // toggle visibility to keep only 5 lines
        const lines = document.querySelectorAll('#fs-lyrics-content p');
        lines.forEach((p, idx) => {
            if (total <= 5) {
                p.classList.remove('hidden');
            } else {
                p.classList.toggle('hidden', idx < start || idx > end);
            }
            if (idx !== newIndex) p.classList.remove('current');
        });

        if (newIndex !== -1 && newIndex !== state.fsCurrentLyricLine) {
            const lineEl = document.getElementById(`fs-lyric-line-${newIndex}`);
            if (lineEl) {
                lineEl.classList.add('current');
                const container = document.getElementById('fs-lyrics-content');
                const h = container.clientHeight;
                const top = lineEl.offsetTop;
                const lh = lineEl.offsetHeight;
                container.scrollTop = Math.max(0, top - h / 2 + lh / 2);
            }
            state.fsCurrentLyricLine = newIndex;
        }
        if (newIndex !== -1 && data[newIndex].isWordByWord) {
            const words = data[newIndex].line;
            const lineEl = document.getElementById(`fs-lyric-line-${newIndex}`);
            if (lineEl) {
                const spans = lineEl.querySelectorAll('span');
                let currentWordIndex = -1;
                for (let i = 0; i < words.length; i++) {
                    const w = words[i];
                    if (w && w.time && currentTime >= w.time) currentWordIndex = i; else break;
                }
                spans.forEach((sp, idx) => {
                    sp.classList.toggle('sung', idx <= currentWordIndex);
                });
            }
        }
    } catch (_) {}
}

function parseLrc(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const result = [];
    const lineTimeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;
    const wordTimeRegex = /<(\d{2}):(\d{2})[.:](\d{2,3})>/g;

    for (const line of lines) {
        const lineMatch = line.match(lineTimeRegex);
        if (lineMatch) {
            const minutes = parseInt(lineMatch[1], 10);
            const seconds = parseInt(lineMatch[2], 10);
            const milliseconds = parseInt(lineMatch[3].padEnd(3, '0'), 10);
            const startTime = minutes * 60 + seconds + milliseconds / 1000;

            const rawText = line.replace(lineTimeRegex, '').trim();
            const words = [];
            let lastIndex = 0;
            let wordMatch;

            if (rawText.match(wordTimeRegex)) {
                while ((wordMatch = wordTimeRegex.exec(rawText)) !== null) {
                    const wordText = rawText.substring(lastIndex, wordMatch.index);
                    if (wordText) words.push({ text: wordText });

                    const wMin = parseInt(wordMatch[1], 10);
                    const wSec = parseInt(wordMatch[2], 10);
                    const wMs = parseInt(wordMatch[3].padEnd(3, '0'), 10);
                    const wordTime = wMin * 60 + wSec + wMs / 1000;

                    const lastWord = words[words.length - 1];
                    if (lastWord) lastWord.time = wordTime;

                    lastIndex = wordTimeRegex.lastIndex;
                }
                const lastWordText = rawText.substring(lastIndex);
                if (lastWordText) words.push({ text: lastWordText });

                result.push({ time: startTime, line: words, isWordByWord: true });
            } else {
                result.push({ time: startTime, text: rawText });
            }
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

function displayLyrics(lrcText, dom, state) {
    state.lyricsData = parseLrc(lrcText);
    const container = dom.lyricsContent;
    if (state.lyricsData.length > 0) {
        container.innerHTML = state.lyricsData.map((line, index) => {
            if (line.isWordByWord) {
                const wordsHtml = line.line.map(word => `<span>${word.text}</span>`).join('');
                return `<p id="lyric-line-${index}" class="word-by-word">${wordsHtml}</p>`;
            } else {
                return `<p id="lyric-line-${index}">${line.text || "..."}</p>`;
            }
        }).join('');
    } else {
        // 简洁的无歌词显示
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                opacity: 0.5;
                ">
                <p style="
                    font-size: 1em;
                    color: var(--text-color-secondary);
                    ">正在享受音乐...</p>
            </div>
        `;
    }
    state.currentLyricLine = -1;
    state.fsCurrentLyricLine = -1;
    try {
        const fs = document.getElementById('fs-lyrics-overlay');
        if (fs && fs.style.display !== 'none') {
            if (typeof renderFsLyricsFromState === 'function') renderFsLyricsFromState(dom, state);
        }
    } catch(_) {}
}

function syncLyrics(dom, state) {
    if (state.lyricsData.length === 0 || dom.audioPlayer.paused) return;
    const currentTime = dom.audioPlayer.currentTime;

    let newIndex = -1;
    for (let i = 0; i < state.lyricsData.length; i++) {
        if (currentTime >= state.lyricsData[i].time) {
            newIndex = i;
        } else {
            break;
        }
    }

    if (newIndex !== -1 && newIndex !== state.currentLyricLine) {
        // 移除所有歌词的状态类
        document.querySelectorAll('#lyrics-content p').forEach(p => {
            p.classList.remove('current');
        });

        // 设置当前歌词
        const currentLineEl = document.getElementById(`lyric-line-${newIndex}`);
        if (currentLineEl) {
            currentLineEl.classList.add('current');

            // 平滑滚动到当前歌词
            const container = dom.lyricsContent;
            const containerHeight = container.clientHeight;
            const lineTop = currentLineEl.offsetTop;
            const lineHeight = currentLineEl.offsetHeight;
            container.scrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
        }
        state.currentLyricLine = newIndex;
    }

    // 逐字高亮效果
    if (newIndex !== -1 && state.lyricsData[newIndex].isWordByWord) {
        const currentLineData = state.lyricsData[newIndex];
        const lineEl = document.getElementById(`lyric-line-${newIndex}`);
        if (!lineEl) return;

        const wordSpans = lineEl.querySelectorAll('span');
        let currentWordIndex = -1;

        // 找到当前正在唱的字
        for (let i = 0; i < currentLineData.line.length; i++) {
            const word = currentLineData.line[i];
            if (word.time && currentTime >= word.time) {
                currentWordIndex = i;
            } else {
                break;
            }
        }

        // 更新每个字的状态
        wordSpans.forEach((span, index) => {
            span.classList.remove('sung');
            
            if (index <= currentWordIndex) {
                // 已唱过的字（包括正在唱的字）
                span.classList.add('sung');
            }
            // 未唱到的字保持默认正常文字颜色样式
        });
    }
}

async function playSong(index, state, dom, API) {
    if (index < 0 || index >= state.currentPlaylist.length) return;
    
    state.currentTrackIndex = index;
    const song = state.currentPlaylist[index];

    updatePlayerUI(song, dom);
    try {
        const fs = document.getElementById('fs-lyrics-overlay');
        if (fs && fs.style.display !== 'none') {
            const fsTitle = document.getElementById('fs-title');
            const fsArtist = document.getElementById('fs-artist');
            const fsCover = document.getElementById('fs-cover');
            const fsBg = document.getElementById('fs-lyrics-bg');
            if (fsTitle) fsTitle.textContent = song.name || '--';
            if (fsArtist) fsArtist.textContent = Array.isArray(song.artists)? song.artists.map(a=>a.name).join(' / '): '';
            const cover = song.pic || (window.getLetterCover ? window.getLetterCover(song.name) : '');
            if (fsCover) fsCover.src = cover;
            if (fsBg) fsBg.style.backgroundImage = `url(${cover})`;
            if (typeof renderFsLyricsFromState === 'function') renderFsLyricsFromState(dom, state);
        }
    } catch(_) {}
    updateFavouriteIcon(song.id, state.favourites.some(f => f.id === song.id), dom);
    updatePlaylistHighlight(state);
    updatePlayPauseIcon(true, dom);

    dom.lyricsContent.innerHTML = '<p>正在加载歌词...</p>';
    state.lyricsData = [];

    try {
        if (song.blob && song.blob instanceof Blob) {
            if (state.currentBlobUrl) URL.revokeObjectURL(state.currentBlobUrl);
            state.currentBlobUrl = URL.createObjectURL(song.blob);
            dom.audioPlayer.src = state.currentBlobUrl;
            dom.lyricsContent.innerHTML = '<p>本地歌曲，暂不支持歌词。</p>';
        } else {
            // 酷我音乐使用完全代理模式
            if (song.source === 'kuwo') {
                console.log('酷我音乐使用完全代理模式');
                try {
                    // 首先获取音频URL
                    const urlEndpoint = `https://music-api.gdstudio.xyz/api.php?types=url&id=${song.id.split('_')[1]}&source=${song.source}&br=320000`;
                    const urlResponse = await fetch(urlEndpoint);
                    if (!urlResponse.ok) throw new Error('获取酷我音频URL失败');
                    
                    const urlData = await urlResponse.json();
                    let audioUrl = urlData.url?.replace(/^http:/, 'https');
                    if (audioUrl && audioUrl.includes('https//')) {
                        audioUrl = audioUrl.replace('https//', 'https://');
                    }
                    
                    if (!audioUrl) throw new Error('无法获取酷我音频URL');
                    
                    // 使用代理来获取音频文件
                    const proxyUrl = `http://localhost:8000/proxy.php?url=${encodeURIComponent(audioUrl)}`;
                    console.log('酷我代理音频URL:', proxyUrl);
                    dom.audioPlayer.src = proxyUrl;
                } catch (kuwoError) {
                    console.error('酷我音乐播放失败:', kuwoError);
                    throw new Error('酷我音乐暂时无法播放，请尝试其他歌曲');
                }
            } else {
                if (song.audioUrl) {
                    console.log('使用直链播放:', song.audioUrl);
                    dom.audioPlayer.src = song.audioUrl;
                } else {
                    let requestSong = song;
                    if (song.source === 'tencent') {
                        try {
                            const q = `${song.name} ${song.artists[0]?.name || ''}`.trim();
                            const candidates = await API.getList(q);
                            const nameL = song.name.toLowerCase();
                            const artistL = (song.artists[0]?.name || '').toLowerCase();
                            let best = null;
                            let bestScore = -1;
                            for (const c of candidates) {
                                const cName = (c.name || '').toLowerCase();
                                const cArtist = (Array.isArray(c.artists) ? c.artists.map(a=>a.name).join(' / ') : '').toLowerCase();
                                let score = 0;
                                if (cName === nameL) score += 100; else if (cName && nameL && (cName.includes(nameL) || nameL.includes(cName))) score += 50;
                                if (artistL && cArtist) { if (cArtist.includes(artistL) || artistL.includes(cArtist)) score += 30; }
                                if (c.pic_id) score += 5;
                                if (score > bestScore) { bestScore = score; best = c; }
                            }
                            if (best) {
                                requestSong = best;
                                console.log('已使用稳定源替代:', best.source, best.id);
                            } else {
                                throw new Error('未找到稳定源替代');
                            }
                        } catch (e) {
                            throw new Error('QQ源不可播放且未找到稳定源替代');
                        }
                    }
                    const urlEndpoint = API.getSongUrl(requestSong);
                    console.log('获取歌曲URL:', urlEndpoint);
                    const urlResponse = await fetch(urlEndpoint);
                    console.log('URL响应状态:', urlResponse.status, urlResponse.statusText);
                    if (!urlResponse.ok) throw new Error('获取歌曲URL失败');
                    const urlData = await urlResponse.json();
                    console.log('URL数据:', urlData);
                    let audioUrl = urlData.url?.replace(/^http:/, 'https');
                    if (audioUrl && audioUrl.includes('https//')) { audioUrl = audioUrl.replace('https//', 'https://'); }
                    console.log('最终音频URL:', audioUrl);
                    if (!audioUrl) throw new Error('无法从API获取有效播放链接');
                    dom.audioPlayer.src = audioUrl;
                }
            }

            // 🎵 使用元数据增强功能获取最佳封面和歌词
            API.enhanceMetadata(song).then(enhancement => {
                // 更新封面
                if (enhancement.cover) {
                    console.log('🖼️ 使用增强封面:', enhancement.cover.source);
                    dom.barAlbumArt.src = enhancement.cover.url;
                    // 同时更新背景
                    if (window.updateBackground) {
                        window.updateBackground(enhancement.cover.url, dom);
                    }
                    try {
                        song.pic = enhancement.cover.url;
                        if (state.currentPlaylist && state.currentPlaylist[state.currentTrackIndex]) {
                            state.currentPlaylist[state.currentTrackIndex].pic = enhancement.cover.url;
                        }
                        if (Array.isArray(state.history)) {
                            state.history = state.history.map(ev => ev.id === song.id ? { ...ev, pic: enhancement.cover.url } : ev);
                        }
                        if (Array.isArray(state.favourites)) {
                            state.favourites = state.favourites.map(ev => ev.id === song.id ? { ...ev, pic: enhancement.cover.url } : ev);
                        }
                        if (typeof updatePlaylistSongsCoverBySongId === 'function') {
                            updatePlaylistSongsCoverBySongId(song.id, enhancement.cover.url).catch(()=>{});
                        }
                        if (typeof saveStateToLocalStorage === 'function') {
                            saveStateToLocalStorage(state);
                        }
                        if (typeof renderFeaturedPlaylist === 'function') {
                            renderFeaturedPlaylist(state, dom);
                        }
                    } catch (e) { console.warn('封面写回失败', e); }
                } else {
                    console.log('🖼️ 使用默认封面');
                    const defaultCover = (window.getLetterCover ? window.getLetterCover(song.name) : '');
                    dom.barAlbumArt.src = defaultCover;
                    if (window.updateBackground) {
                        window.updateBackground(defaultCover, dom);
                    }
                }
                
                // 更新歌词
                if (enhancement.lyrics) {
                    console.log('📝 使用增强歌词:', enhancement.lyrics.source, enhancement.lyrics.hasTimestamp ? '(带时间戳)' : '(纯文本)');
                    displayLyrics(enhancement.lyrics.content, dom, state);
                } else {
                    console.log('📝 尝试原始歌词源');
                    // 回退到原始歌词获取方式
                    fetch(API.getLyricUrl(song))
                        .then(res => res.json())
                        .then(lyricData => {
                            if (lyricData && lyricData.lyric) {
                                displayLyrics(lyricData.lyric, dom, state);
                            } else {
                                displayLyrics('', dom, state); // 显示"正在享受音乐..."
                            }
                        }).catch(err => {
                            console.error("原始歌词加载失败:", err);
                            displayLyrics('', dom, state);
                        });
                }
            }).catch(error => {
                console.error('🚨 元数据增强失败，使用原始方式:', error);
                // 回退到原始方式
                fetch(API.getLyricUrl(song))
                    .then(res => res.json())
                    .then(lyricData => {
                        if (lyricData && lyricData.lyric) {
                            displayLyrics(lyricData.lyric, dom, state);
                        } else {
                            displayLyrics('', dom, state);
                        }
                    }).catch(err => {
                        console.error("歌词加载失败:", err);
                        displayLyrics('', dom, state);
                    });
            });
        }

        await dom.audioPlayer.play();
        addPlayHistory(song, state);
        renderPlaylist(state.history, dom.historyListContainer, 'history', state);
        saveStateToLocalStorage(state);
    } catch (error) {
        console.error("播放失败:", error.message, song);
        const context = ['discover', 'favourites', 'history', 'local', 'playlist'].find(c => getPlaylistByContext(c, state) === state.currentPlaylist) || 'discover';
        const errorSpan = document.getElementById(`error-${context}-${song.id}`);
        if (errorSpan) errorSpan.textContent = "无法播放";
        updatePlayPauseIcon(false, dom);
        setTimeout(() => playNext(state, dom, API), 2000);
    }
}

function togglePlayPause(state, dom) {
    if (state.currentTrackIndex === -1 || !dom.audioPlayer.src) return;
    if (dom.audioPlayer.paused) { dom.audioPlayer.play(); } else { dom.audioPlayer.pause(); }
}

function playNext(state, dom, API) {
    let i = state.currentTrackIndex + 1;
    if (i >= state.currentPlaylist.length) {
        if (state.repeatMode === 'all') i = 0; else return;
    }
    playSong(i, state, dom, API);
}

function playPrevious(state, dom, API) {
    if (dom.audioPlayer.currentTime > 3) {
        dom.audioPlayer.currentTime = 0;
    } else {
        let i = state.currentTrackIndex - 1;
        if (i < 0) i = state.currentPlaylist.length - 1;
        playSong(i, state, dom, API);
    }
}

function handleSongEnd(state, dom, API) {
    if (state.repeatMode === 'one') { playSong(state.currentTrackIndex, state, dom, API); } else { playNext(state, dom, API); }
}

function updateProgress(dom) {
    const { currentTime, duration } = dom.audioPlayer;
    if (duration) {
        dom.progress.style.width = `${(currentTime / duration) * 100}%`;
        dom.currentTime.textContent = formatTime(currentTime);
    }
}

function seek(e, dom) {
    const duration = dom.audioPlayer.duration;
    if (duration) { dom.audioPlayer.currentTime = (e.offsetX / dom.progressBar.clientWidth) * duration; }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}