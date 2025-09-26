document.addEventListener('DOMContentLoaded', () => {
    const state = {
        discoverPlaylist: [], localPlaylist: [], currentPlaylist: [], currentTrackIndex: -1,
        isPlaying: false, isShuffle: false, repeatMode: 'none',
        history: [], favourites: [], itemsPerPage: 20,
        pagination: { discover: 1, favourites: 1, history: 1, local: 1, playlist: 1 },
        // 搜索历史相关状态
        searchHistory: [], // 搜索历史记录
        searchSuggestions: [], // 搜索建议
        isSearchFocused: false, // 搜索框焦点状态
        keywords: [
            { name: '新歌榜', icon: 'fa-star', color: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
            { name: '热歌榜', icon: 'fa-fire', color: 'linear-gradient(135deg, #ff416c, #ff4b2b)' },
            { name: '飙升榜', icon: 'fa-chart-line', color: 'linear-gradient(135deg, #f7971e, #ffd200)' },
            { name: 'ACG榜', icon: 'fa-gamepad', color: 'linear-gradient(135deg, #ff00cc, #333399)' },
            { name: '摇滚', icon: 'fa-guitar', color: 'linear-gradient(135deg, #1e130c, #9a8478)' },
            { name: '民谣', icon: 'fa-leaf', color: 'linear-gradient(135deg, #5a3f37, #2c7744)' },
            { name: '电音', icon: 'fa-bolt', color: 'linear-gradient(135deg, #12c2e9, #c471ed, #f64f59)' },
            { name: '欧美', icon: 'fa-globe-americas', color: 'linear-gradient(135deg, #0052d4, #4364f7, #6fb1fc)' },
            { name: '日语', icon: 'fa-sun', color: 'linear-gradient(135deg, #d31027, #ea384d)' },
            { name: '韩语', icon: 'fa-star-and-crescent', color: 'linear-gradient(135deg, #17ead9, #6078ea)' },
        ],
        lastKeyword: null, currentBlobUrl: null,
        lyricsData: [], currentLyricLine: -1,
    };

    const dom = {
        audioPlayer: document.getElementById('audioPlayer'),
        backgroundOverlay: document.getElementById('background-overlay'),
        themeToggle: document.getElementById('themeToggle'),
        mainContent: document.querySelector('.main-content'),
        songListContainer: document.getElementById('song-list-container'),
        favouritesListContainer: document.getElementById('favourites-list-container'),
        historyListContainer: document.getElementById('history-list-container'),
        localListContainer: document.getElementById('local-list-container'),
        paginationDiscover: document.getElementById('pagination-discover'),
        paginationFavourites: document.getElementById('pagination-favourites'),
        paginationHistory: document.getElementById('pagination-history'),
        paginationLocal: document.getElementById('pagination-local'),
        searchInput: document.getElementById('searchInput'),
        // 新增搜索相关元素
        searchSuggestions: document.getElementById('search-suggestions'),
        addLocalFilesBtn: document.getElementById('addLocalFilesBtn'),
        localFileInput: document.getElementById('localFileInput'),
        barAlbumArt: document.getElementById('bar-album-art'),
        barSongTitle: document.getElementById('bar-song-title'),
        barSongArtist: document.getElementById('bar-song-artist'),
        barFavBtn: document.getElementById('bar-fav-btn'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        shuffleBtn: document.getElementById('shuffleBtn'),
        repeatBtn: document.getElementById('repeatBtn'),
        currentTime: document.getElementById('currentTime'),
        totalDuration: document.getElementById('totalDuration'),
        progressBar: document.getElementById('progressBar'),
        progress: document.getElementById('progress'),
        volumeSlider: document.getElementById('volumeSlider'),
        visualizerCanvas: document.getElementById('audioVisualizer'),
        statsTotalPlays: document.getElementById('stats-total-plays'),
        statsUniqueTracks: document.getElementById('stats-unique-tracks'),
        statsTopTracks: document.getElementById('stats-top-tracks'),
        statsTopArtists: document.getElementById('stats-top-artists'),
        // 新增的统计元素
        statsTotalDuration: document.getElementById('stats-total-duration'),
        statsFavouriteCount: document.getElementById('stats-favourite-count'),
        statsActivePeriod: document.getElementById('stats-active-period'),
        statsWeekPlays: document.getElementById('stats-week-plays'),
        playTrendChart: null, // 已移除
        timeChart: document.getElementById('time-chart'),
        lyricsContent: document.getElementById('lyrics-content'),
        themeSelector: document.getElementById('theme-selector'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        sidebar: document.getElementById('sidebar'),
        appContainer: document.querySelector('.app-container'),
        discoverGrid: document.getElementById('discover-grid'),
        backToGridBtn: document.getElementById('backToGridBtn'),
        discoverGreeting: document.getElementById('discover-greeting'),
        featuredList: document.getElementById('featured-list'),
        discoverPortal: document.getElementById('discover-portal'),
    };

    const API = {
        // 分别从三个稳定源搜索，然后合并结果
        getList: async (keyword) => {
            console.log('开始多源搜索:', keyword);
            
            // 分别调用三个稳定源的API
            const neteaseUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(keyword)}&count=100`;
            const jooxUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=joox&name=${encodeURIComponent(keyword)}&count=100`;
            const kuwoUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=kuwo&name=${encodeURIComponent(keyword)}&count=100`;
            
            try {
                // 并行请求三个源
                const [neteaseResponse, jooxResponse, kuwoResponse] = await Promise.allSettled([
                    fetch(neteaseUrl),
                    fetch(jooxUrl),
                    fetch(kuwoUrl)
                ]);
                
                let allSongs = [];
                
                // 处理网易云结果
                if (neteaseResponse.status === 'fulfilled' && neteaseResponse.value.ok) {
                    try {
                        const neteaseData = await neteaseResponse.value.json();
                        if (Array.isArray(neteaseData)) {
                            console.log(`网易云返回 ${neteaseData.length} 首歌曲`);
                            allSongs.push(...neteaseData);
                        }
                    } catch (error) {
                        console.error('网易云数据解析失败:', error);
                    }
                } else {
                    console.error('网易云API请求失败:', neteaseResponse.reason || '未知错误');
                }
                
                // 处理joox结果
                if (jooxResponse.status === 'fulfilled' && jooxResponse.value.ok) {
                    try {
                        const jooxData = await jooxResponse.value.json();
                        if (Array.isArray(jooxData)) {
                            console.log(`joox返回 ${jooxData.length} 首歌曲`);
                            allSongs.push(...jooxData);
                        }
                    } catch (error) {
                        console.error('joox数据解析失败:', error);
                    }
                } else {
                    console.error('joox API请求失败:', jooxResponse.reason || '未知错误');
                }
                
                // 处理酷我结果
                if (kuwoResponse.status === 'fulfilled' && kuwoResponse.value.ok) {
                    try {
                        const kuwoData = await kuwoResponse.value.json();
                        if (Array.isArray(kuwoData)) {
                            console.log(`酷我返回 ${kuwoData.length} 首歌曲`);
                            allSongs.push(...kuwoData);
                        }
                    } catch (error) {
                        console.error('酷我数据解析失败:', error);
                    }
                } else {
                    console.error('酷我API请求失败:', kuwoResponse.reason || '未知错误');
                }
                

                
                if (allSongs.length === 0) {
                    throw new Error('所有音乐源都无法获取数据');
                }
                
                // 去重处理（基于歌曲名和艺术家）
                const uniqueSongs = [];
                const seen = new Set();
                
                allSongs.forEach(song => {
                    // 处理艺术家数据
                    let artistName = '';
                    if (Array.isArray(song.artist)) {
                        artistName = song.artist.join(' / ');
                    } else if (typeof song.artist === 'string') {
                        artistName = song.artist;
                    } else {
                        artistName = '未知艺术家';
                    }
                    
                    // 创建去重键
                    const key = `${song.name?.toLowerCase().trim()}-${artistName.toLowerCase().trim()}`;
                    
                    if (!seen.has(key)) {
                        seen.add(key);
                        
                        // 构建专辑封面URL
                        let picUrl;
                        if (song.pic_id) {
                            picUrl = `https://music-api.gdstudio.xyz/api.php?types=pic&source=${song.source}&id=${song.pic_id}&size=400`;
                        } else {
                            picUrl = `https://picsum.photos/400/400?random=${encodeURIComponent(song.name || 'music')}`;
                        }
                        
                        uniqueSongs.push({
                            id: `${song.source}_${song.id}`, 
                            name: song.name || '未知歌曲',
                            artists: [{ name: artistName }], 
                            album: song.album || '未知专辑',
                            source: song.source, 
                            lyric_id: song.lyric_id,
                            pic: picUrl,
                            pic_id: song.pic_id,
                            sourceDisplayName: song.source === 'netease' ? '网易云' : song.source === 'joox' ? 'joox' : song.source === 'kuwo' ? '酷我' : song.source
                        });
                    }
                });
                
                console.log(`多源搜索完成，原始结果 ${allSongs.length} 首，去重后 ${uniqueSongs.length} 首歌曲`);
                return uniqueSongs;
                
            } catch (error) {
                console.error('多源搜索失败:', error);
                throw error;
            }
        },
        
        getSongUrl: (song) => {
            // 所有音乐源都直接调用API获取URL
            return `https://music-api.gdstudio.xyz/api.php?types=url&id=${song.id.split('_')[1]}&source=${song.source}&br=320000`;
        },
        
        getLyricUrl: (song) => `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${song.lyric_id || song.id.split('_')[1]}&source=${song.source}`,
        
        // 🎵 元数据增强功能 - 混合策略实现
        enhanceMetadata: async (song) => {
            console.log('🎵 开始元数据增强:', song.name, 'by', song.artists[0]?.name);
            
            // 定义元数据增强源（包括播放源和纯元数据源）
            const metadataSources = [
                // 主要播放源（也可提供元数据）
                { name: 'netease', priority: 2, displayName: '网易云' },
                { name: 'joox', priority: 2, displayName: 'JOOX' },
                { name: 'kuwo', priority: 2, displayName: '酷我' },
                // 元数据增强源（主要用于封面和歌词）
                { name: 'tencent', priority: 4, displayName: '腾讯音乐' },
                { name: 'migu', priority: 3, displayName: '咪咕音乐' },
                { name: 'ytmusic', priority: 1, displayName: 'YouTube Music' }
            ];
            
            const searchKeyword = `${song.name} ${song.artists[0]?.name || ''}`.trim();
            console.log('🔍 搜索关键词:', searchKeyword);
            
            // 并行搜索所有源
            const searchPromises = metadataSources.map(async (sourceInfo) => {
                try {
                    const searchUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=${sourceInfo.name}&name=${encodeURIComponent(searchKeyword)}&count=3`;
                    
                    // 设置超时和错误处理
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
                    
                    const response = await fetch(searchUrl, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const data = await response.json();
                    const songs = Array.isArray(data) ? data : [];
                    
                    if (songs.length > 0) {
                        console.log(`✅ ${sourceInfo.displayName}: 找到 ${songs.length} 首歌曲`);
                    }
                    
                    return { 
                        source: sourceInfo.name, 
                        priority: sourceInfo.priority,
                        displayName: sourceInfo.displayName,
                        data: songs 
                    };
                } catch (error) {
                    // 静默处理常见错误
                    if (error.name === 'AbortError') {
                        console.log(`⏱️ ${sourceInfo.displayName}: 请求超时`);
                    } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                        console.log(`🚫 ${sourceInfo.displayName}: 网络限制`);
                    } else {
                        console.log(`❌ ${sourceInfo.displayName}: ${error.message}`);
                    }
                    return { 
                        source: sourceInfo.name, 
                        priority: sourceInfo.priority,
                        displayName: sourceInfo.displayName,
                        data: [] 
                    };
                }
            });
            
            const searchResults = await Promise.allSettled(searchPromises);
            
            // 收集所有匹配的歌曲
            const matchedSongs = [];
            searchResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.data.length > 0) {
                    const { source, priority, displayName, data } = result.value;
                    
                    // 智能匹配最佳歌曲
                    const songNameLower = song.name.toLowerCase();
                    const artistNameLower = (song.artists[0]?.name || '').toLowerCase();
                    
                    let bestMatch = null;
                    let bestScore = 0;
                    
                    data.forEach(candidate => {
                        if (!candidate.name) return;
                        
                        const candidateNameLower = candidate.name.toLowerCase();
                        const candidateArtistLower = (
                            Array.isArray(candidate.artist) ? candidate.artist.join(' ') : 
                            (candidate.artist || '')
                        ).toLowerCase();
                        
                        // 计算匹配分数
                        let score = 0;
                        
                        // 歌曲名匹配
                        if (candidateNameLower === songNameLower) {
                            score += 100; // 完全匹配
                        } else if (candidateNameLower.includes(songNameLower) || songNameLower.includes(candidateNameLower)) {
                            score += 50; // 部分匹配
                        }
                        
                        // 艺术家匹配
                        if (artistNameLower && candidateArtistLower) {
                            if (candidateArtistLower.includes(artistNameLower) || artistNameLower.includes(candidateArtistLower)) {
                                score += 30;
                            }
                        }
                        
                        // 如果有封面ID，加分
                        if (candidate.pic_id) {
                            score += 10;
                        }
                        
                        // 如果有歌词ID，加分
                        if (candidate.lyric_id || candidate.id) {
                            score += 10;
                        }
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = candidate;
                        }
                    });
                    
                    if (bestMatch && bestScore > 20) { // 最低匹配阈值
                        matchedSongs.push({
                            source,
                            priority,
                            displayName,
                            song: bestMatch,
                            matchScore: bestScore
                        });
                    }
                }
            });
            
            console.log(`🎯 找到 ${matchedSongs.length} 个匹配源:`, matchedSongs.map(m => `${m.displayName}(${m.matchScore}分)`).join(', '));
            
            // 并行获取封面和歌词
            const metadataPromises = matchedSongs.map(async ({ source, priority, displayName, song: matchedSong, matchScore }) => {
                const results = { source, priority, displayName, matchScore, cover: null, lyrics: null };
                
                // 获取封面
                if (matchedSong.pic_id) {
                    try {
                        const picUrl = `https://music-api.gdstudio.xyz/api.php?types=pic&source=${source}&id=${matchedSong.pic_id}&size=500`;
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        
                        const picResponse = await fetch(picUrl, {
                            signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId);
                        
                        if (picResponse.ok) {
                            const picData = await picResponse.json();
                            if (picData.url && picData.url !== '') {
                                // 检测图片质量
                                let quality = 300; // 默认质量
                                if (picData.url.includes('500x500') || picData.url.includes('T002R500x500')) {
                                    quality = 500;
                                } else if (picData.url.includes('400x400') || picData.url.includes('T002R400x400')) {
                                    quality = 400;
                                } else if (picData.url.includes('300x300') || picData.url.includes('T002R300x300')) {
                                    quality = 300;
                                }
                                
                                results.cover = {
                                    url: picData.url,
                                    source: source,
                                    displayName: displayName,
                                    quality: quality,
                                    priority: priority
                                };
                                console.log(`🖼️ ${displayName}: 获得 ${quality}px 封面`);
                            }
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.log(`🖼️ ${displayName}: 封面获取失败`);
                        }
                    }
                }
                
                // 获取歌词
                const lyricId = matchedSong.lyric_id || matchedSong.id;
                if (lyricId) {
                    try {
                        const lyricUrl = `https://music-api.gdstudio.xyz/api.php?types=lyric&source=${source}&id=${lyricId}`;
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        
                        const lyricResponse = await fetch(lyricUrl, {
                            signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId);
                        
                        if (lyricResponse.ok) {
                            const lyricData = await lyricResponse.json();
                            if (lyricData.lyric && lyricData.lyric.trim() && lyricData.lyric.length > 10) {
                                const hasTimestamp = /\[\d{2}:\d{2}[.:]\d{2,3}\]/.test(lyricData.lyric);
                                const isValidLyric = !lyricData.lyric.includes('纯音乐，请欣赏') && 
                                                   !lyricData.lyric.includes('该歌曲为没有填词的纯音乐');
                                
                                if (isValidLyric) {
                                    results.lyrics = {
                                        content: lyricData.lyric,
                                        source: source,
                                        displayName: displayName,
                                        hasTimestamp: hasTimestamp,
                                        length: lyricData.lyric.length,
                                        priority: priority
                                    };
                                    console.log(`📝 ${displayName}: 获得歌词 (${hasTimestamp ? '带时间戳' : '纯文本'}, ${lyricData.lyric.length}字符)`);
                                }
                            }
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.log(`📝 ${displayName}: 歌词获取失败`);
                        }
                    }
                }
                
                return results;
            });
            
            const metadataResults = await Promise.allSettled(metadataPromises);
            
            // 选择最佳封面（综合考虑质量、来源优先级和匹配度）
            let bestCover = null;
            let bestCoverScore = 0;
            
            metadataResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.cover) {
                    const { cover, priority, matchScore } = result.value;
                    // 综合评分：图片质量(0-500) + 来源优先级(0-40) + 匹配度(0-100)
                    const score = cover.quality + (priority * 10) + (matchScore * 0.5);
                    if (score > bestCoverScore) {
                        bestCoverScore = score;
                        bestCover = cover;
                    }
                }
            });
            
            // 选择最佳歌词（优先级：有时间戳 > 来源优先级 > 长度 > 匹配度）
            let bestLyrics = null;
            let bestLyricsScore = 0;
            
            metadataResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.lyrics) {
                    const { lyrics, priority, matchScore } = result.value;
                    // 综合评分
                    const score = (lyrics.hasTimestamp ? 2000 : 0) + // 时间戳最重要
                                 (priority * 100) + // 来源优先级
                                 Math.min(lyrics.length / 10, 200) + // 长度（最多200分）
                                 (matchScore * 2); // 匹配度
                    if (score > bestLyricsScore) {
                        bestLyricsScore = score;
                        bestLyrics = lyrics;
                    }
                }
            });
            
            const enhancement = {
                cover: bestCover,
                lyrics: bestLyrics,
                sourcesChecked: metadataSources.length,
                sourcesFound: matchedSongs.length,
                coversFound: metadataResults.filter(r => r.status === 'fulfilled' && r.value.cover).length,
                lyricsFound: metadataResults.filter(r => r.status === 'fulfilled' && r.value.lyrics).length
            };
            
            // 输出增强结果摘要
            const summary = [];
            if (bestCover) {
                summary.push(`封面: ${bestCover.displayName} (${bestCover.quality}px)`);
            }
            if (bestLyrics) {
                summary.push(`歌词: ${bestLyrics.displayName} (${bestLyrics.hasTimestamp ? '时间轴' : '纯文本'})`);
            }
            
            if (summary.length > 0) {
                console.log('🎵 元数据增强完成:', summary.join(', '));
            } else {
                console.log('🎵 元数据增强完成: 使用默认资源');
            }
            
            return enhancement;
        }
    };

    // 将state、dom和API对象暴露到全局作用域，供其他模块使用
    window.state = state;
    window.dom = dom;
    window.updateAndRenderStats = updateAndRenderStats;
    window.API = API; // 暴露API对象供其他模块使用

    window.addPlayHistory = (song, state) => {
        state.history = state.history.filter(s => s.id !== song.id);
        state.history.unshift({ ...song, playedAt: new Date().toISOString() });
        if (state.history.length > 500) state.history.pop();
        renderFeaturedPlaylist(state, dom);
    };

    window.saveStateToLocalStorage = (state) => {
        localStorage.setItem('musicDashboardData', JSON.stringify({ favourites: state.favourites, history: state.history }));
    };

    async function init() {
        try {
            loadStateFromLocalStorage();
            loadTheme();
            setGreeting(dom);
            setupEventListeners();
            await loadLocalSongs();
            renderAllViews();
            // 移除 renderUserPlaylists 调用，因为歌单现在在专用页面中显示
            showView('discover-view');
            updateBackground('https://source.unsplash.com/random/1600x900/?music,concert', dom);
            visualizer.init(dom.audioPlayer, dom.visualizerCanvas);
            
            // 初始化背景动态效果
            if (typeof backgroundEffects !== 'undefined') {
                backgroundEffects.init();
            }
            

            
            setInterval(() => setGreeting(dom), 60000);
            // 确保发现音乐板块显示
            console.log('Discover grid element:', dom.discoverGrid);
            console.log('Keywords:', state.keywords);
        } catch (error) {
            console.error("初始化失败:", error);
            alert(`应用初始化失败，功能可能不完整。\n\n错误详情: ${error}`);
        }
    }

    function setupEventListeners() {
        // 侧栏收起/展开功能
        if (dom.sidebarToggle && dom.sidebar && dom.appContainer) {
            dom.sidebarToggle.addEventListener('click', () => {
                const isCollapsed = dom.sidebar.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // 展开侧栏
                    dom.sidebar.classList.remove('collapsed');
                    dom.appContainer.classList.remove('sidebar-collapsed');
                    localStorage.setItem('sidebarCollapsed', 'false');
                } else {
                    // 收起侧栏
                    dom.sidebar.classList.add('collapsed');
                    dom.appContainer.classList.add('sidebar-collapsed');
                    localStorage.setItem('sidebarCollapsed', 'true');
                }
            });
            
            // 恢复侧栏状态
            const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (sidebarCollapsed) {
                dom.sidebar.classList.add('collapsed');
                dom.appContainer.classList.add('sidebar-collapsed');
            }
        }
        
        dom.themeToggle.addEventListener('click', () => {
            const isDark = !document.body.classList.contains('light-mode');
            applyTheme(isDark ? 'light-mode' : 'dark-mode');
        });
        dom.themeSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-dot')) {
                applyTheme(e.target.dataset.theme);
            }
        });

        const sidebarNav = document.querySelector('.sidebar nav');
        sidebarNav.addEventListener('click', async e => {
            const link = e.target.closest('a.nav-link');
            const optionsBtn = e.target.closest('.playlist-options-btn');

            if (optionsBtn) {
                e.preventDefault();
                e.stopPropagation();
                const menu = optionsBtn.nextElementSibling;
                document.querySelectorAll('.playlist-options-menu.visible').forEach(m => {
                    if (m !== menu) m.classList.remove('visible');
                });
                menu.classList.toggle('visible');
                return;
            }

            const renameBtn = e.target.closest('.rename-playlist-btn');
            if (renameBtn) {
                e.preventDefault();
                const playlistItem = renameBtn.closest('.user-playlist-item');
                const playlistId = parseInt(playlistItem.dataset.playlistId, 10);
                const currentName = playlistItem.querySelector('a.nav-link span').textContent;

                try {
                    const newName = await showCustomPrompt({
                        title: '重命名歌单',
                        text: `为 "${currentName}" 输入新名称:`,
                        placeholder: '新歌单名称'
                    });
                    if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
                        await renamePlaylist(playlistId, newName.trim());
                        await renderUserPlaylists();
                    }
                } catch (error) { console.log('用户取消重命名'); }
                return;
            }

            const deleteBtn = e.target.closest('.delete-playlist-btn');
            if (deleteBtn) {
                e.preventDefault();
                const playlistItem = deleteBtn.closest('.user-playlist-item');
                const playlistId = parseInt(playlistItem.dataset.playlistId, 10);
                const playlistName = playlistItem.querySelector('a.nav-link span').textContent;

                try {
                    await showCustomConfirm({
                        title: '删除歌单',
                        text: `确定要永久删除歌单 “<strong>${playlistName}</strong>” 吗？<br>此操作不可撤销。`,
                        danger: true
                    });
                    await deletePlaylist(playlistId);
                    await renderUserPlaylists();
                } catch (error) {
                    console.log('用户取消了删除歌单。');
                }
                return;
            }

            if (link && link.id === 'createPlaylistBtn') {
                return;
            }

            if (link && link.classList.contains('nav-link')) {
                e.preventDefault();
                document.querySelectorAll('.playlist-options-menu.visible').forEach(m => m.classList.remove('visible'));
                const view = link.dataset.view;
                if (view.startsWith('playlist-')) {
                    const playlistId = parseInt(link.closest('.user-playlist-item').dataset.playlistId, 10);
                    const playlistName = link.querySelector('span').textContent;
                    await renderPlaylistView(playlistId, playlistName, state, dom);
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                } else if (view === 'playlists-view') {
                    // 当用户点击“我的歌单”时，渲染歌单页面
                    await renderPlaylistsPage();
                    showView(view);
                } else {
                    showView(view);
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-item-wrapper')) {
                document.querySelectorAll('.playlist-options-menu.visible').forEach(m => m.classList.remove('visible'));
            }
        });

        // 使用统一函数添加侧栏项目
        addSidebarItems();
        
        // 添加我的歌单页面的创建歌单按钮事件
        const createPlaylistBtn = document.getElementById('create-playlist-btn');
        if (createPlaylistBtn) {
            createPlaylistBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const playlistName = await showCustomPrompt({
                        title: '创建新歌单',
                        text: '请输入新歌单的名称：',
                        placeholder: '例如：我的最爱'
                    });
                    if (playlistName && playlistName.trim() !== '') {
                        await addPlaylist(playlistName.trim());
                        await renderPlaylistsPage(); // 重新渲染歌单页面
                        showToast(`歌单 "${playlistName.trim()}" 创建成功`, 'success');
                    }
                } catch (error) {
                    console.log('用户取消了创建歌单。');
                }
            });
        }

        dom.searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const query = e.target.value.trim();
                addToSearchHistory(query);
                fetchAndDisplaySearchResults(query);
                hideSuggestions();
            }
        });
        
        // 搜索框焦点事件
        dom.searchInput.addEventListener('focus', () => {
            state.isSearchFocused = true;
            showSearchSuggestions();
        });
        
        dom.searchInput.addEventListener('blur', (e) => {
            // 延迟隐藏，以便用户点击建议项
            setTimeout(() => {
                state.isSearchFocused = false;
                hideSuggestions();
            }, 200);
        });
        
        // 搜索输入事件
        dom.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                generateSearchSuggestions(query);
            } else {
                showSearchSuggestions();
            }
        });
        
        // 键盘导航支持
        dom.searchInput.addEventListener('keydown', handleSearchKeyDown);
        dom.addLocalFilesBtn.addEventListener('click', () => dom.localFileInput.click());
        dom.localFileInput.addEventListener('change', processLocalFiles);
        dom.playPauseBtn.addEventListener('click', () => togglePlayPause(state, dom));
        dom.barFavBtn.addEventListener('click', () => { if (dom.barFavBtn.dataset.songId) toggleFavourite(dom.barFavBtn.dataset.songId); });
        dom.nextBtn.addEventListener('click', () => playNext(state, dom, API));
        dom.prevBtn.addEventListener('click', () => playPrevious(state, dom, API));
        dom.shuffleBtn.addEventListener('click', () => showToast('随机播放功能待实现', 'error'));
        dom.repeatBtn.addEventListener('click', toggleRepeat);
        dom.volumeSlider.addEventListener('input', e => dom.audioPlayer.volume = e.target.value);
        dom.progressBar.addEventListener('click', (e) => seek(e, dom));
        dom.audioPlayer.addEventListener('timeupdate', () => {
            updateProgress(dom);
            syncLyrics(dom, state);
        });
        dom.audioPlayer.addEventListener('loadedmetadata', () => dom.totalDuration.textContent = formatTime(dom.audioPlayer.duration));
        dom.audioPlayer.addEventListener('ended', () => handleSongEnd(state, dom, API));
        dom.audioPlayer.addEventListener('play', () => { 
            state.isPlaying = true; 
            updatePlayPauseIcon(true, dom);
            // 启动背景动态效果
            if (typeof backgroundEffects !== 'undefined') {
                backgroundEffects.startPlayingEffects();
            }
        });
        dom.audioPlayer.addEventListener('pause', () => { 
            state.isPlaying = false; 
            updatePlayPauseIcon(false, dom);
            // 停止背景动态效果
            if (typeof backgroundEffects !== 'undefined') {
                backgroundEffects.stopPlayingEffects();
            }
        });
        dom.mainContent.addEventListener('click', handleMainContentClick);
        dom.backToGridBtn.addEventListener('click', () => {
            toggleDiscoverContent(true, dom);
        });
    }

    function handleMainContentClick(e) {
        const gridCard = e.target.closest('.grid-card');
        if (gridCard) {
            const keyword = gridCard.dataset.keyword;
            fetchAndDisplaySearchResults(keyword);
            return;
        }

        const featuredCard = e.target.closest('.featured-card');
        if (featuredCard) {
            const songId = featuredCard.dataset.songId;
            const song = state.history.find(s => s.id === songId);
            if (song) {
                state.currentPlaylist = [song, ...state.history.filter(s => s.id !== songId)];
                playSong(0, state, dom, API);
            }
            return;
        }

        const songItem = e.target.closest('.song-item');
        const pageBtn = e.target.closest('.page-btn');
        const actionBtn = e.target.closest('.action-btn');

        if (actionBtn) {
            console.log('Action button clicked:', actionBtn.className, actionBtn.dataset);
            
            // 对于从歌单移除按钮，直接处理，不需要查找歌曲对象
            if (actionBtn.classList.contains('remove-from-playlist-btn')) { 
                console.log('点击了从歌单移除按钮');
                handleRemoveFromPlaylist(actionBtn.dataset.playlistSongId); 
                return; 
            }
            
            // 其他按钮需要歌曲对象
            const songId = actionBtn.dataset.songId;
            const allSongs = [...state.discoverPlaylist, ...state.localPlaylist, ...state.history, ...state.favourites];
            const uniqueSongs = Array.from(new Map(allSongs.map(item => [item.id, item])).values());
            const song = uniqueSongs.find(s => s.id.toString() === songId.toString());

            if (actionBtn.classList.contains('fav-btn')) { toggleFavourite(songId, song); return; }
            if (actionBtn.classList.contains('download-btn')) { downloadSong(song, actionBtn); return; }
            if (actionBtn.classList.contains('delete-btn')) { deleteLocalSongAndRender(songId, song); return; }
            if (actionBtn.classList.contains('add-to-playlist-btn')) { handleAddToPlaylist(song); return; }
        }

        if (songItem) {
            const context = songItem.dataset.context;
            const index = parseInt(songItem.dataset.index, 10);
            const playlist = getPlaylistByContext(context, state);
            
            if (playlist.length === 0) {
                showToast('播放列表为空，无法播放', 'error');
                return;
            }
            
            state.currentPlaylist = playlist;
            playSong(index, state, dom, API);
            return;
        }
        if (pageBtn && !pageBtn.disabled) {
            const context = pageBtn.parentElement.dataset.context;
            state.pagination[context] = parseInt(pageBtn.dataset.page, 10);
            renderViewByContext(context);
        }
    }

    function renderViewByContext(context) {
        const playlist = getPlaylistByContext(context, state);
        const container = getListContainerByContext(context);
        renderPlaylist(playlist, container, context, state);
    }

    function getListContainerByContext(context) {
        switch (context) {
            case 'discover': return dom.songListContainer;
            case 'favourites': return dom.favouritesListContainer;
            case 'history': return dom.historyListContainer;
            case 'local': return dom.localListContainer;
            case 'playlist': return document.getElementById('playlist-view-list-container'); // 添加歌单详情页面的支持
            default: return null;
        }
    }

    function renderAllViews() {
        renderDiscoverGrid(state.keywords, dom);
        renderFeaturedPlaylist(state, dom);
        renderPlaylist(state.localPlaylist, dom.localListContainer, 'local', state);
        renderPlaylist(state.favourites, dom.favouritesListContainer, 'favourites', state);
        renderPlaylist(state.history, dom.historyListContainer, 'history', state);
        updateAndRenderStats(state, dom);
    }

    async function loadLocalSongs() {
        state.localPlaylist = await getAllLocalSongs();
        renderPlaylist(state.localPlaylist, dom.localListContainer, 'local', state);
    }

    async function processLocalFiles(event) {
        const files = event.target.files;
        if (!files.length) return;
        for (const file of files) {
            const song = {
                id: `local_${Date.now()}_${file.name}`, name: file.name.replace(/\.[^/.]+$/, ""),
                artists: [{ name: "本地文件" }], album: "本地文件",
                blob: file, pic: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
            };
            await addLocalSong(song);
        }
        await loadLocalSongs();
        showToast(`${files.length}个文件已成功添加到本地库`, 'success');
        dom.localFileInput.value = '';
    }

    async function deleteLocalSongAndRender(songId, song) {
        try {
            await showCustomConfirm({
                title: '删除本地歌曲',
                text: `确定要删除歌曲 “<strong>${song.name}</strong>” 吗？`,
                danger: true
            });
            await deleteLocalSong(songId);
            await loadLocalSongs();
        } catch (error) {
            console.log('用户取消删除本地歌曲。');
        }
    }

    async function fetchAndDisplaySearchResults(keyword, shuffle = false) {
        toggleDiscoverContent(false, dom, `正在从网易云、joox、酷我和B站搜索《${keyword}》...`);
        
        try {
            const songs = await API.getList(keyword);
            if (shuffle) songs.sort(() => Math.random() - 0.5);
            state.discoverPlaylist = songs;
            state.pagination.discover = 1;
            renderPlaylist(songs, dom.songListContainer, 'discover', state);
            
        } catch (error) {
            console.error("加载在线歌曲错误:", error);
            dom.songListContainer.innerHTML = `<p style='padding: 15px;'>加载失败: ${error.message}</p>`;
        }
    }

    async function downloadSong(song, buttonElement) {
        buttonElement.className = 'action-btn download-btn fas fa-spinner fa-spin';
        try {
            const urlEndpoint = API.getSongUrl(song);
            const response = await fetch(urlEndpoint);
            if (!response.ok) throw new Error('网络请求失败');
            const data = await response.json();
            const audioUrl = data.url?.replace(/^http:/, 'https');
            if (!audioUrl) throw new Error('无法获取下载链接');
            const audioResponse = await fetch(audioUrl);
            if (!audioResponse.ok) throw new Error(`下载资源失败: ${audioResponse.statusText}`);
            const blob = await audioResponse.blob();
            const songToStore = { ...song, blob: blob };
            await addLocalSong(songToStore);
            await loadLocalSongs();
            showToast(`《${song.name}》 已下载到本地库`, 'success');
        } catch (error) {
            console.error("下载到本地库失败:", error);
            showToast(`下载《${song.name}》失败: ${error.message}`, 'error');
        } finally {
            buttonElement.className = 'action-btn download-btn fas fa-download';
        }
    }

    function toggleFavourite(songId, song) {
        if (!song) {
            const allSongs = [...state.discoverPlaylist, ...state.localPlaylist, ...state.history, ...state.favourites];
            const uniqueSongs = Array.from(new Map(allSongs.map(item => [item.id, item])).values());
            song = uniqueSongs.find(s => s.id.toString() === songId.toString());
            if (!song) return;
        }
        const favIndex = state.favourites.findIndex(fav => fav.id === songId);
        if (favIndex > -1) { state.favourites.splice(favIndex, 1); } else { state.favourites.unshift(song); }
        renderAllViews();
        updateFavouriteIcon(songId, favIndex === -1, dom);
        saveStateToLocalStorage(state);
    }

    function toggleRepeat() {
        const m = ['none', 'all', 'one'];
        state.repeatMode = m[(m.indexOf(state.repeatMode) + 1) % m.length];
        dom.repeatBtn.classList.toggle('active', state.repeatMode !== 'none');
        dom.audioPlayer.loop = state.repeatMode === 'one';
        dom.repeatBtn.innerHTML = state.repeatMode === 'one' ? '<i class="fas fa-redo-alt"></i><sup style="font-size: 0.5em;">1</sup>' : '<i class="fas fa-redo"></i>';
    }

    function applyTheme(themeName) {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('theme', themeName);
        dom.themeSelector.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === themeName);
        });
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark-mode';
        applyTheme(savedTheme);
    }

    function loadStateFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem('musicDashboardData') || '{}');
        state.history = data.history || [];
        state.favourites = data.favourites || [];
        // 加载搜索历史
        state.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }

    // 增强的统计功能
    function updateAndRenderStats(state, dom) {
        if (state.history.length === 0) {
            dom.statsTotalPlays.textContent = '0';
            dom.statsUniqueTracks.textContent = '0';
            dom.statsTotalDuration.textContent = '0h 0m';
            dom.statsFavouriteCount.textContent = state.favourites.length;
            dom.statsActivePeriod.textContent = '-';
            dom.statsWeekPlays.textContent = '0';
            dom.statsTopTracks.innerHTML = '<p style="padding: 15px;">暂无数据</p>';
            dom.statsTopArtists.innerHTML = '<p style="padding: 15px;">暂无数据</p>';
            renderEmptyCharts(dom);
            return;
        }

        // 基础统计
        const trackCounts = state.history.reduce((acc, song) => {
            acc[song.id] = (acc[song.id] || { ...song, count: 0 });
            acc[song.id].count++;
            return acc;
        }, {});
        
        const artistCounts = state.history.flatMap(s => s.artists).reduce((acc, artist) => {
            acc[artist.name] = (acc[artist.name] || { name: artist.name, count: 0 });
            acc[artist.name].count++;
            return acc;
        }, {});

        // 时间统计
        const totalDuration = calculateTotalDuration(state.history);
        const activePeriod = getMostActivePeriod(state.history);
        const weekPlays = getWeekPlays(state.history);

        // 更新统计卡片
        dom.statsTotalPlays.textContent = state.history.length;
        dom.statsUniqueTracks.textContent = new Set(state.history.map(s => s.id)).size;
        dom.statsTotalDuration.textContent = formatDuration(totalDuration);
        dom.statsFavouriteCount.textContent = state.favourites.length;
        dom.statsActivePeriod.textContent = activePeriod;
        dom.statsWeekPlays.textContent = weekPlays;

        // 更新排行榜
        dom.statsTopTracks.innerHTML = renderTopTracks(trackCounts);
        dom.statsTopArtists.innerHTML = renderTopArtists(artistCounts);

        // 延迟渲染图表，确保 DOM 元素已经渲染
        setTimeout(() => {
            console.log('开始渲染图表...');
            // renderPlayTrendChart(state.history, dom.playTrendChart); // 已移除
            renderTimeChart(state.history, dom.timeChart);
        }, 100);
    }

    // 计算总播放时长（估算为每首歌3.5分钟）
    function calculateTotalDuration(history) {
        return history.length * 3.5; // 分钟
    }

    // 格式化时长
    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours}h ${mins}m`;
    }

    // 获取最活跃时段
    function getMostActivePeriod(history) {
        const periods = { '早上': 0, '上午': 0, '下午': 0, '晚上': 0, '深夜': 0 };
        
        history.forEach(song => {
            if (song.playedAt) {
                const hour = new Date(song.playedAt).getHours();
                if (hour < 6) periods['深夜']++;
                else if (hour < 12) periods['早上']++;
                else if (hour < 14) periods['上午']++;
                else if (hour < 18) periods['下午']++;
                else periods['晚上']++;
            }
        });
        
        return Object.entries(periods).sort((a, b) => b[1] - a[1])[0][0];
    }

    // 获取本周播放数
    function getWeekPlays(history) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return history.filter(song => {
            if (song.playedAt) {
                return new Date(song.playedAt) > oneWeekAgo;
            }
            return false;
        }).length;
    }

    // 渲染最佳歌曲排行
    function renderTopTracks(trackCounts) {
        const topTracks = Object.values(trackCounts).sort((a, b) => b.count - a.count).slice(0, 10);
        
        return `<div class="song-list-header"><span>#</span><span>歌曲</span><span>歌手</span><span>播放次数</span><span></span></div>${topTracks.map((s, i) => {
            const percentage = (s.count / topTracks[0].count * 100).toFixed(1);
            return `<div class="song-item stats-item">
                <span class="rank-number">${i + 1}</span>
                <span class="song-title">${s.name}</span>
                <span>${s.artists.map(a => a.name).join(' / ')}</span>
                <span class="play-count">
                    <span class="count-number">${s.count} 次</span>
                    <div class="play-bar">
                        <div class="play-progress" style="width: ${percentage}%"></div>
                    </div>
                </span>
                <span></span>
            </div>`;
        }).join('')}`;
    }

    // 渲染最佳歌手排行
    function renderTopArtists(artistCounts) {
        const topArtists = Object.values(artistCounts).sort((a, b) => b.count - a.count).slice(0, 10);
        
        return `<div class="song-list-header"><span>#</span><span>歌手</span><span></span><span>播放次数</span><span></span></div>${topArtists.map((a, i) => {
            const percentage = (a.count / topArtists[0].count * 100).toFixed(1);
            return `<div class="song-item stats-item">
                <span class="rank-number">${i + 1}</span>
                <span class="song-title">${a.name}</span>
                <span></span>
                <span class="play-count">
                    <span class="count-number">${a.count} 次</span>
                    <div class="play-bar">
                        <div class="play-progress" style="width: ${percentage}%"></div>
                    </div>
                </span>
                <span></span>
            </div>`;
        }).join('')}`;
    }

    // 渲染时段分析图表
    function renderTimeChart(history, container) {
        if (!container) return;
        
        const hourlyData = getHourlyData(history);
        const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
        
        const html = hourlyData.map(hour => {
            const percentage = (hour.count / maxCount * 100).toFixed(1);
            const height = Math.max(percentage, 2); // 最小高度2%
            
            return `
                <div class="time-bar-item" title="${hour.label}: ${hour.count}次">
                    <div class="time-bar" style="height: ${height}%"></div>
                    <span class="time-label">${hour.label}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    // 获取每小时数据
    function getHourlyData(history) {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
        
        history.forEach(song => {
            if (song.playedAt) {
                const hour = new Date(song.playedAt).getHours();
                hours[hour].count++;
            }
        });
        
        return hours.map(h => ({
            ...h,
            label: h.hour < 10 ? `0${h.hour}` : h.hour.toString()
        }));
    }

    // 渲染空状态图表
    function renderEmptyCharts(dom) {
        // 移除了播放趋势图表，只处理时段分析
        if (dom.timeChart) {
            dom.timeChart.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary); padding: 40px;">暂无数据</p>';
        }
    }

    function setGreeting(dom) {
        const hour = new Date().getHours();
        const greetings = {
            dawn: ["天还没亮，听首安静的歌吧。", "夜深了，音乐是你的朋友。", "凌晨好，愿音乐伴你入眠。"],
            morning: ["早上好！新的一天从音乐开始。", "一日之计在于晨，来点活力音乐？", "早安，世界。"],
            noon: ["中午好，休息一下，听听音乐。", "午后时光，让旋律放松你的神经。", "吃完午饭，宜听歌。"],
            afternoon: ["下午好，来杯咖啡听首歌吧。", "灵感枯竭？让音乐帮你找回来。", "午后小憩，有音乐更惬意。"],
            evening: ["晚上好，静下心来享受音乐。", "夜幕降临，世界属于你和你的歌单。", "辛苦一天了，让音乐治愈你吧。"]
        };
        let period;
        if (hour < 6) { period = 'dawn'; }
        else if (hour < 12) { period = 'morning'; }
        else if (hour < 14) { period = 'noon'; }
        else if (hour < 18) { period = 'afternoon'; }
        else { period = 'evening'; }

        const randomGreeting = greetings[period][Math.floor(Math.random() * greetings[period].length)];

        dom.discoverGreeting.style.animation = 'none';
        requestAnimationFrame(() => {
            dom.discoverGreeting.textContent = randomGreeting;
            dom.discoverGreeting.style.animation = '';
        });
    }

    // 统一的侧栏项目添加函数，确保一致性
    function createSidebarNavItem(config) {
        /*
         * config 对象的结构：
         * {
         *   id: string,           // 元素ID（可选）
         *   icon: string,         // FontAwesome 图标类名，如 'fas fa-plus-circle'
         *   text: string,         // 显示文字
         *   title: string,        // 悬浮提示文字（默认与 text 相同）
         *   href: string,         // 链接（默认 '#'）
         *   dataView: string,     // data-view 属性（可选）
         *   className: string,    // 额外的CSS类名（可选）
         *   onClick: function     // 点击事件处理器（可选）
         * }
         */
        const {
            id = '',
            icon,
            text,
            title = text,
            href = '#',
            dataView = '',
            className = '',
            onClick = null
        } = config;
        
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        // 设置基本属性
        a.href = href;
        a.className = `nav-link${className ? ' ' + className : ''}`;
        a.title = title;
        
        // 设置可选属性
        if (id) a.id = id;
        if (dataView) a.dataset.view = dataView;
        
        // 设置内容，使用统一的结构
        a.innerHTML = `<i class="${icon}"></i><span class="sidebar-text">${text}</span>`;
        
        // 添加点击事件
        if (onClick && typeof onClick === 'function') {
            a.addEventListener('click', onClick);
        }
        
        li.appendChild(a);
        return li;
    }
    
    // 示例：使用新的统一函数添加侧栏项目
    function addSidebarItems() {
        const navList = document.querySelector('.sidebar nav ul');
        
        // 不再在侧栏中添加独立的“创建歌单”按钮
        // 创建歌单功能已集成到“我的歌单”页面中
        
        // 以后添加新功能时，可以这样做：
        /*
        const newFeatureItem = createSidebarNavItem({
            id: 'newFeatureBtn',
            icon: 'fas fa-star',
            text: '新功能',
            title: '这是一个新功能',
            dataView: 'new-feature-view',
            onClick: (e) => {
                e.preventDefault();
                // 处理点击事件
            }
        });
        navList.appendChild(newFeatureItem);
        */
    }

    init();
    
    // 渲染我的歌单页面
    async function renderPlaylistsPage() {
        const playlistsGrid = document.getElementById('playlists-grid');
        if (!playlistsGrid) return;
        
        const playlists = await getAllPlaylists();
        
        if (playlists.length === 0) {
            playlistsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>还没有歌单</h3>
                    <p>点击上方的“创建歌单”按钮来创建你的第一个歌单吧！</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        for (const playlist of playlists) {
            const songs = await getSongsInPlaylist(playlist.id);
            const coverImage = songs.length > 0 ? songs[0].song.pic : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            const hasImage = coverImage !== 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            
            html += `
                <div class="playlist-card" data-playlist-id="${playlist.id}">
                    <div class="playlist-cover">
                        ${hasImage ? `<img src="${coverImage}" alt="${playlist.name}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">` : ''}
                        <div class="playlist-overlay">
                            <button class="play-playlist-btn" title="播放歌单">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                    <div class="playlist-info">
                        <h3 class="playlist-name">${playlist.name}</h3>
                        <p class="playlist-count">${songs.length} 首歌曲</p>
                        <div class="playlist-actions">
                            <button class="playlist-action-btn edit-playlist-btn" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="playlist-action-btn delete-playlist-btn" title="删除">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        playlistsGrid.innerHTML = html;
        
        // 添加事件监听器
        playlistsGrid.addEventListener('click', handlePlaylistCardClick);
    }
    
    // 处理歌单卡片点击事件
    async function handlePlaylistCardClick(e) {
        const playlistCard = e.target.closest('.playlist-card');
        if (!playlistCard) return;
        
        const playlistId = parseInt(playlistCard.dataset.playlistId, 10);
        const playlistName = playlistCard.querySelector('.playlist-name').textContent;
        
        if (e.target.closest('.play-playlist-btn')) {
            // 播放歌单
            const songs = await getSongsInPlaylist(playlistId);
            if (songs.length > 0) {
                state.currentPlaylist = songs.map(item => item.song);
                playSong(0, state, dom, API);
                showToast(`开始播放歌单 "${playlistName}"`, 'success');
            } else {
                showToast('歌单为空，请先添加歌曲', 'error');
            }
        } else if (e.target.closest('.edit-playlist-btn')) {
            // 编辑歌单名称
            try {
                const newName = await showCustomPrompt({
                    title: '重命名歌单',
                    text: '请输入新的歌单名称：',
                    placeholder: playlistName
                });
                if (newName && newName.trim() !== '' && newName.trim() !== playlistName) {
                    await renamePlaylist(playlistId, newName.trim());
                    await renderPlaylistsPage();
                    showToast(`歌单已重命名为 "${newName.trim()}"`, 'success');
                }
            } catch (error) {
                console.log('用户取消重命名');
            }
        } else if (e.target.closest('.delete-playlist-btn')) {
            // 删除歌单
            try {
                await showCustomConfirm({
                    title: '删除歌单',
                    text: `确定要永久删除歌单 "<strong>${playlistName}</strong>" 吗？<br>此操作不可撤销。`,
                    danger: true
                });
                await deletePlaylist(playlistId);
                await renderPlaylistsPage();
                showToast(`歌单 "${playlistName}" 已删除`, 'success');
            } catch (error) {
                console.log('用户取消删除歌单');
            }
        } else {
            // 点击歌单卡片本身，进入歌单详情
            await renderPlaylistView(playlistId, playlistName, state, dom);
            showView('playlist-view');
        }
    }
    
    // 添加到歌单功能
    async function handleAddToPlaylist(song) {
        try {
            const playlistId = await showAddToPlaylistModal();
            await addSongToPlaylist(playlistId, song);
            showToast(`《${song.name}》 已添加到歌单`, 'success');
        } catch (error) {
            if (error.message !== 'User cancelled.' && error !== 'No playlists') {
                console.error('添加到歌单失败:', error);
                showToast(`添加失败: ${error.message}`, 'error');
            }
        }
    }
    
    // 从歌单移除功能
    async function handleRemoveFromPlaylist(playlistSongId) {
        console.log('尝试从歌单移除歌曲, playlistSongId:', playlistSongId);
        try {
            await removeSongFromPlaylist(parseInt(playlistSongId, 10));
            // 重新渲染当前歌单视图（如果正在查看歌单）
            if (state.currentPlaylistView) {
                const currentPlaylistId = getCurrentPlaylistId(); // 需要实现这个函数
                if (currentPlaylistId) {
                    const container = document.getElementById('playlist-view-list-container');
                    const songsWithPlaylistSongId = await getSongsInPlaylist(currentPlaylistId);
                    state.currentPlaylistView = songsWithPlaylistSongId.map(item => ({ ...item.song, playlistSongId: item.id }));
                    renderPlaylist(state.currentPlaylistView, container, 'playlist', state);
                    // 确保容器有正确的样式类
                    container.classList.add('playlist-container');
                }
            }
            showToast('歌曲已从歌单中移除', 'success');
        } catch (error) {
            console.error('从歌单移除失败:', error);
            showToast(`移除失败: ${error.message}`, 'error');
        }
    }
    
    // 搜索历史功能
    function addToSearchHistory(query) {
        if (!query || query.trim() === '') return;
        
        // 移除重复项
        state.searchHistory = state.searchHistory.filter(item => item.query !== query);
        
        // 添加到前面
        state.searchHistory.unshift({
            query: query,
            timestamp: new Date().toISOString(),
            count: (state.searchHistory.find(item => item.query === query)?.count || 0) + 1
        });
        
        // 限制数量
        if (state.searchHistory.length > 20) {
            state.searchHistory = state.searchHistory.slice(0, 20);
        }
        
        // 保存到localStorage
        localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
    }
    
    function clearSearchHistory() {
        state.searchHistory = [];
        localStorage.removeItem('searchHistory');
        showSearchSuggestions();
        showToast('搜索历史已清除', 'success');
    }
    
    function showSearchSuggestions() {
        if (!state.isSearchFocused) return;
        
        const query = dom.searchInput.value.trim();
        let suggestions = [];
        
        if (query.length === 0) {
            // 显示搜索历史和热门搜索
            suggestions = generateEmptySuggestions();
        } else {
            // 显示匹配的建议
            suggestions = generateSearchSuggestions(query);
        }
        
        renderSuggestions(suggestions);
    }
    
    function generateEmptySuggestions() {
        const suggestions = [];
        
        // 最近搜索
        if (state.searchHistory.length > 0) {
            suggestions.push({
                type: 'section',
                title: '最近搜索'
            });
            
            state.searchHistory.slice(0, 5).forEach(item => {
                suggestions.push({
                    type: 'history',
                    query: item.query,
                    meta: formatSearchTime(item.timestamp),
                    icon: 'fas fa-history'
                });
            });
            
            suggestions.push({
                type: 'clear',
                title: '清除搜索历史'
            });
        }
        
        // 热门搜索
        suggestions.push({
            type: 'section',
            title: '热门搜索'
        });
        
        const hotSearches = ['流行歌曲', '经典老歌', '网络歌曲', '电影原声带', '韩文歌曲'];
        hotSearches.forEach((search, index) => {
            suggestions.push({
                type: 'hot',
                query: search,
                meta: `热度 ${5 - index}`,
                icon: 'fas fa-fire'
            });
        });
        
        return suggestions;
    }
    
    function generateSearchSuggestions(query) {
        const suggestions = [];
        
        // 匹配的搜索历史
        const matchedHistory = state.searchHistory.filter(item => 
            item.query.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);
        
        if (matchedHistory.length > 0) {
            suggestions.push({
                type: 'section',
                title: '搜索历史'
            });
            
            matchedHistory.forEach(item => {
                suggestions.push({
                    type: 'history',
                    query: item.query,
                    meta: `搜索过 ${item.count} 次`,
                    icon: 'fas fa-history'
                });
            });
        }
        
        // 智能建议
        suggestions.push({
            type: 'section',
            title: '搜索建议'
        });
        
        // 添加当前查询
        suggestions.push({
            type: 'search',
            query: query,
            meta: '搜索这个',
            icon: 'fas fa-search'
        });
        
        // 添加相关建议
        const relatedSuggestions = generateRelatedSuggestions(query);
        suggestions.push(...relatedSuggestions);
        
        return suggestions;
    }
    
    function generateRelatedSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        // 根据查询内容生成相关建议
        if (lowerQuery.includes('流行') || lowerQuery.includes('pop')) {
            suggestions.push(
                { type: 'related', query: `${query} 2024`, meta: '最新流行', icon: 'fas fa-star' },
                { type: 'related', query: `${query} 排行榜`, meta: '热门排行', icon: 'fas fa-chart-line' }
            );
        } else if (lowerQuery.includes('经典') || lowerQuery.includes('classic')) {
            suggestions.push(
                { type: 'related', query: `${query} 怀旧`, meta: '怀旧金曲', icon: 'fas fa-heart' },
                { type: 'related', query: `${query} 老歌`, meta: '经典老歌', icon: 'fas fa-music' }
            );
        } else {
            suggestions.push(
                { type: 'related', query: `${query} 热门`, meta: '热门歌曲', icon: 'fas fa-fire' },
                { type: 'related', query: `${query} 合集`, meta: '歌手合集', icon: 'fas fa-compact-disc' }
            );
        }
        
        return suggestions;
    }
    
    function renderSuggestions(suggestions) {
        if (suggestions.length === 0) {
            hideSuggestions();
            return;
        }
        
        let html = '';
        let currentSection = '';
        
        suggestions.forEach((suggestion, index) => {
            if (suggestion.type === 'section') {
                if (currentSection !== '') {
                    html += '</div>';
                }
                html += `<div class="suggestions-section"><h4>${suggestion.title}</h4>`;
                currentSection = suggestion.title;
            } else if (suggestion.type === 'clear') {
                html += `<button class="clear-history-btn" onclick="clearSearchHistory()">
                    <i class="fas fa-trash"></i> ${suggestion.title}
                </button>`;
            } else {
                const iconClass = suggestion.icon || 'fas fa-search';
                html += `
                    <div class="suggestion-item" data-query="${suggestion.query}" data-index="${index}">
                        <i class="suggestion-icon ${iconClass}"></i>
                        <span class="suggestion-text">${suggestion.query}</span>
                        <span class="suggestion-meta">${suggestion.meta || ''}</span>
                    </div>
                `;
            }
        });
        
        if (currentSection !== '') {
            html += '</div>';
        }
        
        dom.searchSuggestions.innerHTML = html;
        dom.searchSuggestions.classList.add('show');
        
        // 添加点击事件
        dom.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                dom.searchInput.value = query;
                addToSearchHistory(query);
                fetchAndDisplaySearchResults(query);
                hideSuggestions();
            });
        });
        
        state.currentSuggestionIndex = -1;
    }
    
    function hideSuggestions() {
        dom.searchSuggestions.classList.remove('show');
        setTimeout(() => {
            if (!dom.searchSuggestions.classList.contains('show')) {
                dom.searchSuggestions.innerHTML = '';
            }
        }, 300);
    }
    
    function handleSearchKeyDown(e) {
        const suggestions = dom.searchSuggestions.querySelectorAll('.suggestion-item');
        if (suggestions.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.currentSuggestionIndex = Math.min(state.currentSuggestionIndex + 1, suggestions.length - 1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.currentSuggestionIndex = Math.max(state.currentSuggestionIndex - 1, -1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'Enter' && state.currentSuggestionIndex >= 0) {
            e.preventDefault();
            const selectedSuggestion = suggestions[state.currentSuggestionIndex];
            if (selectedSuggestion) {
                selectedSuggestion.click();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
            dom.searchInput.blur();
        }
    }
    
    function updateSuggestionHighlight(suggestions) {
        suggestions.forEach((item, index) => {
            item.classList.toggle('active', index === state.currentSuggestionIndex);
        });
    }
    
    function formatSearchTime(timestamp) {
        const now = new Date();
        const searchTime = new Date(timestamp);
        const diffMs = now - searchTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins} 分钟前`;
        if (diffHours < 24) return `${diffHours} 小时前`;
        if (diffDays < 7) return `${diffDays} 天前`;
        return searchTime.toLocaleDateString();
    }
    
    // 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以访问
    window.clearSearchHistory = clearSearchHistory;

    // 获取当前歌单ID（简单实现）
    function getCurrentPlaylistId() {
        const activeLink = document.querySelector('.nav-link.active');
        if (activeLink && activeLink.dataset.view && activeLink.dataset.view.startsWith('playlist-')) {
            return parseInt(activeLink.dataset.view.replace('playlist-', ''), 10);
        }
        return null;
    }
}
);