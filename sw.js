// 音乐播放器 Service Worker
const CACHE_NAME = 'music-player-v1.0.0';
const STATIC_CACHE = 'music-player-static-v1.0.0';
const DYNAMIC_CACHE = 'music-player-dynamic-v1.0.0';

// 需要缓存的静态资源（仅本地资源）
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/player.js',
  '/js/ui.js',
  '/js/db.js',
  '/js/visualizer.js',
  '/js/backgroundEffects.js',
  '/manifest.json'
];

// 外部资源（网络优先策略）
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
];

// 不需要缓存的资源模式
const EXCLUDE_PATTERNS = [
  /\/api\//,
  /music-api\.gdstudio\.xyz/,
  /localhost:8000\/proxy\.php/,
  /picsum\.photos/,
  /source\.unsplash\.com/
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 安装中...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 缓存静态资源...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ 静态资源缓存完成');
        return self.skipWaiting(); // 立即激活新的 SW
      })
      .catch(error => {
        console.error('❌ 静态资源缓存失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker 激活完成');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 严格过滤：只处理同源的HTTP/HTTPS请求
  if (url.origin !== self.location.origin || !['http:', 'https:'].includes(url.protocol)) {
    // 完全跳过外部资源和非HTTP协议，让浏览器直接处理
    return;
  }
  
  // 跳过不需要缓存的请求模式
  if (request.method !== 'GET') {
    return; // 只处理GET请求
  }
  
  // 跳过特定的请求类型
  if (request.destination === 'document' && request.mode === 'navigate') {
    // 处理页面导航请求
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // 处理静态资源（CSS, JS等）
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
  
  // 其他同源请求使用网络优先策略
  event.respondWith(handleDynamicRequest(request));
});

// 检查是否为静态资源（仅限本地文件）
function isStaticAsset(url) {
  const localUrl = new URL(url);
  // 只处理本地的静态文件
  return localUrl.origin === self.location.origin && (
    STATIC_ASSETS.some(asset => url.endsWith(asset) || url.includes(asset)) ||
    url.includes('.css') ||
    url.includes('.js') ||
    url.includes('.html')
  );
}

// 处理导航请求（页面请求）
async function handleNavigationRequest(request) {
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);
    
    // 如果网络请求成功，缓存并返回
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // 网络失败时从缓存获取
    console.log('🌐 网络请求失败，尝试从缓存获取:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 如果缓存中也没有，返回离线页面
    return caches.match('/') || new Response('离线模式 - 请检查网络连接', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// 处理静态资源请求
async function handleStaticAssetRequest(request) {
  // 缓存优先策略（仅限同源资源）
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // 缓存成功的响应
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('📦 静态资源获取失败:', request.url);
    return new Response('资源不可用', { status: 404 });
  }
}

// 处理动态请求
async function handleDynamicRequest(request) {
  try {
    // 网络优先策略
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 只缓存成功的响应
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败时尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 从缓存返回:', request.url);
      return cachedResponse;
    }
    
    // 如果是图片请求失败，返回占位图
    if (request.destination === 'image') {
      return new Response(
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">图片加载失败</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// 监听消息事件（用于与主线程通信）
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'CACHE_SONG':
      if (data.url && data.songInfo) {
        cacheSong(data.url, data.songInfo);
      }
      break;
  }
});

// 获取缓存大小
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// 清理缓存
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName !== STATIC_CACHE) {
        return caches.delete(cacheName);
      }
    })
  );
}

// 缓存歌曲（用于离线播放）
async function cacheSong(url, songInfo) {
  try {
    const cache = await caches.open('music-songs-cache');
    const response = await fetch(url);
    
    if (response.ok) {
      // 添加歌曲信息到响应头
      const headers = new Headers(response.headers);
      headers.set('X-Song-Info', JSON.stringify(songInfo));
      
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      await cache.put(url, modifiedResponse);
      console.log('🎵 歌曲已缓存:', songInfo.name);
    }
  } catch (error) {
    console.error('❌ 歌曲缓存失败:', error);
  }
}

// 后台同步（如果支持）
if ('sync' in self.registration) {
  self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}

async function doBackgroundSync() {
  // 在这里可以执行后台同步任务
  // 比如同步播放历史、收藏等数据
  console.log('🔄 执行后台同步...');
}

// 推送通知（如果需要）
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/manifest-icon-192.png',
      badge: '/manifest-icon-96.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'play',
          title: '播放',
          icon: '/icons/play.png'
        },
        {
          action: 'close',
          title: '关闭',
          icon: '/icons/close.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'play') {
    // 处理播放操作
    event.waitUntil(
      clients.openWindow('/?action=play')
    );
  } else if (event.action === 'close') {
    // 关闭通知
    return;
  } else {
    // 默认操作：打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🎵 音乐播放器 Service Worker 已加载');