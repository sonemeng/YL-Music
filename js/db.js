// js/db.js

// 全局数据库连接实例
let db;

/**
 * 初始化 IndexedDB 数据库。
 * 此函数会负责创建所有需要的 "表" (ObjectStores)。
 */
async function initDB() {
    db = await idb.openDB('music-player-db', 1, {
        upgrade(db) {
            console.log('数据库版本更新或首次创建...');

            // 1. 保留您原有的 'songs' 表，用于“我的本地音乐”
            if (!db.objectStoreNames.contains('songs')) {
                db.createObjectStore('songs', { keyPath: 'id' });
            }

            // 2. 新增 'playlists' 表，用于存储歌单信息
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }

            // 3. 新增 'playlist_songs' 表，用于存储歌单与歌曲的关系
            if (!db.objectStoreNames.contains('playlist_songs')) {
                const store = db.createObjectStore('playlist_songs', {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('by_playlist', 'playlistId');
            }
        },
    });
    console.log('数据库初始化完成!');
}

// ----------------------------------------------------
// --- 1. “我的本地音乐”功能 ---
// ----------------------------------------------------
async function addLocalSong(song) {
    if (!db) await initDB();
    return await db.put('songs', song);
}

async function getAllLocalSongs() {
    if (!db) await initDB();
    return await db.getAll('songs');
}

async function deleteLocalSong(id) {
    if (!db) await initDB();
    return await db.delete('songs', id);
}

// ----------------------------------------------------
// --- 2. “本地歌单”功能 ---
// ----------------------------------------------------
async function addPlaylist(name) {
    if (!db) await initDB();
    return await db.add('playlists', {
        name: name,
        createdAt: new Date()
    });
}

async function getAllPlaylists() {
    if (!db) await initDB();
    // 按创建时间倒序排列，新的歌单在前面
    const playlists = await db.getAll('playlists');
    return playlists.sort((a, b) => b.id - a.id);
}

/**
 * 重命名一个歌单
 * @param {number} playlistId - 歌单 ID
 * @param {string} newName - 新的名称
 */
async function renamePlaylist(playlistId, newName) {
    if (!db) await initDB();
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.store;
    const playlist = await store.get(playlistId);
    if (playlist) {
        playlist.name = newName;
        await store.put(playlist);
    }
    await tx.done;
}

/**
 * 删除一个歌单及其包含的所有歌曲记录
 * @param {number} playlistId - 歌单 ID
 */
async function deletePlaylist(playlistId) {
    if (!db) await initDB();
    // 开启一个事务，同时操作两个表
    const tx = db.transaction(['playlists', 'playlist_songs'], 'readwrite');
    const playlistsStore = tx.objectStore('playlists');
    const songsStore = tx.objectStore('playlist_songs');
    const songsIndex = songsStore.index('by_playlist');

    // 1. 删除歌单本身
    await playlistsStore.delete(playlistId);

    // 2. 找到并删除该歌单下的所有歌曲
    let cursor = await songsIndex.openCursor(IDBKeyRange.only(playlistId));
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
}

// ---- 歌单歌曲操作 ----
async function addSongToPlaylist(playlistId, songData) {
    if (!db) await initDB();
    return await db.add('playlist_songs', {
        playlistId: playlistId,
        song: songData,
        addedAt: new Date()
    });
}

async function getSongsInPlaylist(playlistId) {
    if (!db) await initDB();
    const index = db.transaction('playlist_songs').store.index('by_playlist');
    const songs = await index.getAll(IDBKeyRange.only(playlistId));
    // 按添加时间倒序，新添加的在最前面
    return songs.sort((a, b) => b.id - a.id);
}

/**
 * 从歌单中移除一首歌
 * @param {number} playlistSongId - 注意：这里是 playlist_songs 表中的主键 id
 */
async function removeSongFromPlaylist(playlistSongId) {
    if (!db) await initDB();
    return await db.delete('playlist_songs', playlistSongId);
}

// 启动时立即执行数据库初始化
initDB().catch(err => {
    console.error("数据库初始化失败:", err);
});