// YanLing Music Player - 简化版 Service Worker
// 专注于本地资源缓存，避免外部资源错误

const CACHE_NAME = 'yanling-music-v2.0.0';

// 仅缓存本地核心文件
const LOCAL_ASSETS = [
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

// 安装事件 - 预缓存核心资源
self.addEventListener('install', event => {
  console.log('🎵 YanLing Music Player Service Worker 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 预缓存核心资源');
        return cache.addAll(LOCAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker 安装完成');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('🔄 YanLing Music Player Service Worker 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker 激活完成');
        return self.clients.claim();
      })
  );
});

// 网络请求拦截 - 仅处理本地资源
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 严格限制：只处理同源的GET请求
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    return; // 让浏览器直接处理外部资源和非GET请求
  }
  
  // 处理本地资源请求
  event.respondWith(handleLocalRequest(request));
});

// 处理本地资源请求
async function handleLocalRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 对于HTML页面，使用网络优先策略
    if (request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')) {
      return await networkFirst(request);
    }
    
    // 对于静态资源，使用缓存优先策略
    if (isLocalStaticAsset(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // 其他请求直接从网络获取
    return await fetch(request);
    
  } catch (error) {
    console.log('📦 请求处理失败:', request.url, error.message);
    
    // 如果是页面请求失败，返回缓存的首页
    if (request.destination === 'document') {
      const cachedPage = await caches.match('/');
      if (cachedPage) {
        return cachedPage;
      }
    }
    
    // 返回简单的错误响应
    return new Response('资源暂时不可用', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // 缓存成功的响应
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    // 网络失败时从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 缓存优先策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 缓存中没有时从网络获取
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// 检查是否为本地静态资源
function isLocalStaticAsset(pathname) {
  return pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.json') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.ico');
}

// 错误处理
self.addEventListener('error', event => {
  console.error('❌ Service Worker 错误:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker 未处理的Promise拒绝:', event.reason);
});

console.log('🎵 YanLing Music Player Service Worker v2.0 已加载');