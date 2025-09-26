// 音乐播放器 - 设置侧栏功能
// 版本: v2.0

// ===== 侧栏控制 =====

// 切换设置侧栏
function toggleSettingsSidebar() {
    const sidebar = document.getElementById('settings-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// 初始化设置
function initializeSettings() {
    // 从localStorage加载设置
    const savedPhpPath = localStorage.getItem('phpPath');
    const savedPort = localStorage.getItem('serverPort');
    
    const phpPathInput = document.getElementById('php-path');
    const portInput = document.getElementById('server-port');
    
    if (savedPhpPath && phpPathInput) {
        phpPathInput.value = savedPhpPath;
    }
    if (savedPort && portInput) {
        portInput.value = savedPort;
    }
    
    // 检查服务器状态
    setTimeout(checkServerStatus, 1000);
}

// ===== PHP服务器管理 =====

// 选择PHP路径
function selectPhpPath() {
    const currentPath = document.getElementById('php-path')?.value || 'C:\\php\\php.exe';
    
    const commonPaths = [
        'C:\\php\\php.exe',
        'C:\\xampp\\php\\php.exe',
        'C:\\wamp64\\bin\\php\\php8.0.0\\php.exe',
        'C:\\laragon\\bin\\php\\php8.1.0\\php.exe'
    ];
    
    const pathsText = commonPaths.map((path, index) => `${index + 1}. ${path}`).join('\n');
    
    const newPath = prompt(
        `请输入PHP可执行文件的完整路径：\n\n常见路径：\n${pathsText}\n\n当前路径：${currentPath}`,
        currentPath
    );
    
    if (newPath && newPath.trim()) {
        const phpPathInput = document.getElementById('php-path');
        if (phpPathInput) {
            phpPathInput.value = newPath.trim();
            localStorage.setItem('phpPath', newPath.trim());
            showToast('PHP路径已保存', 'success');
        }
    }
}

// 启动本地服务器
function startLocalServer() {
    const phpPathInput = document.getElementById('php-path');
    const portInput = document.getElementById('server-port');
    
    if (!phpPathInput || !portInput) {
        showToast('页面元素未找到', 'error');
        return;
    }
    
    const phpPath = phpPathInput.value.trim();
    const port = portInput.value.trim();
    
    if (!phpPath) {
        showToast('请先设置PHP路径', 'error');
        return;
    }
    
    // 保存设置
    localStorage.setItem('phpPath', phpPath);
    localStorage.setItem('serverPort', port);
    
    // 生成启动命令
    const command = `"${phpPath}" -S localhost:${port}`;
    
    // 显示命令给用户
    const commandInfo = `请在项目目录中执行以下命令启动服务器：\n\n${command}\n\n或者：\n1. 修改 start_server.bat 文件\n2. 将PHP路径改为：${phpPath}\n3. 双击运行 start_server.bat`;
    
    if (confirm(commandInfo + '\n\n是否复制命令到剪贴板？')) {
        copyToClipboard(command);
    }
    
    updateServerStatus('启动中...', 'warning');
    
    // 3秒后检查服务器状态
    setTimeout(checkServerStatus, 3000);
}

// 停止本地服务器
function stopLocalServer() {
    showToast('请关闭命令行窗口或按 Ctrl+C 停止服务器', 'info');
    updateServerStatus('已请求停止', 'secondary');
    
    // 5秒后检查服务器状态
    setTimeout(checkServerStatus, 5000);
}

// 检查服务器状态
async function checkServerStatus() {
    const portInput = document.getElementById('server-port');
    const port = portInput ? portInput.value : '8000';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`http://localhost:${port}/`, { 
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            updateServerStatus(`运行中 (端口 ${port})`, 'success');
        } else {
            updateServerStatus('响应异常', 'error');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            updateServerStatus('连接超时', 'error');
        } else {
            updateServerStatus('未运行', 'error');
        }
    }
}

// 更新服务器状态显示
function updateServerStatus(status, type) {
    const statusElement = document.getElementById('server-status');
    if (!statusElement) return;
    
    statusElement.innerHTML = `<i class="fas fa-circle"></i> 服务器状态：${status}`;
    
    // 重置样式
    statusElement.style.background = '';
    statusElement.style.color = '';
    statusElement.style.border = '';
    
    // 设置对应的状态样式
    switch (type) {
        case 'success':
            statusElement.style.background = '#d4edda';
            statusElement.style.color = '#155724';
            statusElement.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            statusElement.style.background = '#f8d7da';
            statusElement.style.color = '#721c24';
            statusElement.style.border = '1px solid #f5c6cb';
            break;
        case 'warning':
            statusElement.style.background = '#fff3cd';
            statusElement.style.color = '#856404';
            statusElement.style.border = '1px solid #ffeaa7';
            break;
        default:
            statusElement.style.background = 'var(--card-bg)';
            statusElement.style.color = 'var(--text-color-secondary)';
            statusElement.style.border = '1px solid var(--border-color)';
    }
}

// ===== 缓存管理 =====

// 清除应用缓存
async function clearAppCache() {
    try {
        let clearedItems = [];
        
        // 清除Service Worker缓存
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
            if (registrations.length > 0) {
                clearedItems.push('Service Worker');
            }
        }
        
        // 清除缓存存储
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            if (cacheNames.length > 0) {
                clearedItems.push('缓存存储');
            }
        }
        
        const message = clearedItems.length > 0 
            ? `已清除：${clearedItems.join('、')}。页面将在3秒后刷新`
            : '没有找到需要清除的缓存';
            
        showCacheStatus(message);
        
        if (clearedItems.length > 0) {
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
        
    } catch (error) {
        console.error('清除缓存失败:', error);
        showCacheStatus('清除缓存失败：' + error.message);
    }
}

// 清除所有浏览器数据
function clearBrowserData() {
    const confirmMessage = `⚠️ 警告：这将清除所有本地数据！\n\n包括：\n• 用户设置\n• 收藏歌单\n• 播放历史\n• 缓存数据\n\n确定要继续吗？`;
    
    if (confirm(confirmMessage)) {
        try {
            let clearedItems = [];
            
            // 清除localStorage
            const localStorageKeys = Object.keys(localStorage);
            if (localStorageKeys.length > 0) {
                localStorage.clear();
                clearedItems.push(`本地存储(${localStorageKeys.length}项)`);
            }
            
            // 清除sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            if (sessionStorageKeys.length > 0) {
                sessionStorage.clear();
                clearedItems.push(`会话存储(${sessionStorageKeys.length}项)`);
            }
            
            const message = clearedItems.length > 0 
                ? `已清除：${clearedItems.join('、')}。页面将在3秒后刷新`
                : '没有找到需要清除的数据';
                
            showCacheStatus(message);
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('清除数据失败:', error);
            showCacheStatus('清除数据失败：' + error.message);
        }
    }
}

// 显示缓存状态
function showCacheStatus(message) {
    const statusElement = document.getElementById('cache-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 8000);
    }
}

// ===== 快捷操作 =====

// 打开调试控制台
function openDebugConsole() {
    console.group('🔧 YanLing Music Player 调试信息');
    console.log('版本:', 'v2.0');
    console.log('构建时间:', '2024-09-19');
    console.log('用户代理:', navigator.userAgent);
    console.log('屏幕分辨率:', `${screen.width}x${screen.height}`);
    console.log('视口大小:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('PWA支持:', 'serviceWorker' in navigator);
    console.log('缓存API支持:', 'caches' in window);
    console.log('媒体会话支持:', 'mediaSession' in navigator);
    console.log('通知支持:', 'Notification' in window);
    console.log('本地存储项目:', Object.keys(localStorage));
    console.log('当前URL:', window.location.href);
    console.log('在线状态:', navigator.onLine);
    console.groupEnd();
    
    showToast('调试信息已输出到控制台 (按F12查看)', 'info');
}

// 导出设置
function exportSettings() {
    const settings = {
        phpPath: localStorage.getItem('phpPath') || '',
        serverPort: localStorage.getItem('serverPort') || '8000',
        // 可以添加更多设置项
        theme: localStorage.getItem('theme') || 'auto',
        volume: localStorage.getItem('volume') || '1',
        exportTime: new Date().toISOString(),
        version: 'v2.0',
        userAgent: navigator.userAgent
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `yanling-music-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('设置已导出到下载文件夹', 'success');
}

// 导入设置
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                
                // 验证文件格式
                if (!settings.version) {
                    throw new Error('无效的设置文件格式');
                }
                
                let importedCount = 0;
                
                // 导入各项设置
                if (settings.phpPath) {
                    localStorage.setItem('phpPath', settings.phpPath);
                    const phpPathInput = document.getElementById('php-path');
                    if (phpPathInput) phpPathInput.value = settings.phpPath;
                    importedCount++;
                }
                
                if (settings.serverPort) {
                    localStorage.setItem('serverPort', settings.serverPort);
                    const portInput = document.getElementById('server-port');
                    if (portInput) portInput.value = settings.serverPort;
                    importedCount++;
                }
                
                if (settings.theme) {
                    localStorage.setItem('theme', settings.theme);
                    importedCount++;
                }
                
                if (settings.volume) {
                    localStorage.setItem('volume', settings.volume);
                    importedCount++;
                }
                
                showToast(`成功导入 ${importedCount} 项设置`, 'success');
                
            } catch (error) {
                console.error('导入设置失败:', error);
                showToast('导入失败：' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// 恢复默认设置
function resetToDefault() {
    const confirmMessage = `确定要恢复所有设置到默认值吗？\n\n这将重置：\n• PHP路径\n• 服务器端口\n• 其他用户设置`;
    
    if (confirm(confirmMessage)) {
        // 恢复默认值
        const defaults = {
            phpPath: 'C:\\php\\php.exe',
            serverPort: '8000'
        };
        
        // 更新界面
        const phpPathInput = document.getElementById('php-path');
        const portInput = document.getElementById('server-port');
        
        if (phpPathInput) phpPathInput.value = defaults.phpPath;
        if (portInput) portInput.value = defaults.serverPort;
        
        // 保存到localStorage
        Object.entries(defaults).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        
        showToast('已恢复默认设置', 'success');
    }
}

// ===== 工具函数 =====

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast('已复制到剪贴板', 'success');
        } else {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showToast('已复制到剪贴板', 'success');
            } catch (err) {
                showToast('复制失败，请手动复制', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败：' + err.message, 'error');
    }
}

// Toast通知函数
function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // 检查是否有现有的toast系统
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // 简单的通知实现
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--card-bg, #fff);
        color: var(--text-color, #333);
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        border-left: 4px solid ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ===== 初始化 =====

// 页面加载完成后初始化设置
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他脚本已加载
    setTimeout(initializeSettings, 500);
});

// 导出函数到全局作用域
window.toggleSettingsSidebar = toggleSettingsSidebar;
window.selectPhpPath = selectPhpPath;
window.startLocalServer = startLocalServer;
window.stopLocalServer = stopLocalServer;
window.clearAppCache = clearAppCache;
window.clearBrowserData = clearBrowserData;
window.openDebugConsole = openDebugConsole;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.resetToDefault = resetToDefault;