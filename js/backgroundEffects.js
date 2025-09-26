// 背景动态效果管理器
const backgroundEffects = {
    isInitialized: false,
    isPlaying: false,
    audioAnalyzer: null,
    particles: [],
    maxParticles: 30,
    beatThreshold: 0.7,
    lastBeatTime: 0,
    
    // DOM 元素引用
    elements: {
        dynamicBackground: null,
        gradientAnimation: null,
        breathingLight: null,
        floatingParticles: null,
        beatPulse: null
    },
    
    // 初始化背景效果系统
    init() {
        if (this.isInitialized) return;
        
        // 获取 DOM 元素
        this.elements.dynamicBackground = document.getElementById('dynamic-background');
        this.elements.gradientAnimation = document.getElementById('gradient-animation');
        this.elements.breathingLight = document.getElementById('breathing-light');
        this.elements.floatingParticles = document.getElementById('floating-particles');
        this.elements.beatPulse = document.getElementById('beat-pulse');
        
        if (!this.elements.dynamicBackground) {
            console.warn('动态背景元素未找到');
            return;
        }
        
        this.initFloatingParticles();
        this.startGradientAnimation();
        this.isInitialized = true;
        
        console.log('背景动态效果系统已初始化');
    },
    
    // 启动播放状态效果
    startPlayingEffects() {
        if (!this.isInitialized) return;
        
        this.isPlaying = true;
        
        // 启动呼吸光效
        if (this.elements.breathingLight) {
            this.elements.breathingLight.classList.add('active');
        }
        
        // 增加粒子密度
        this.maxParticles = 50;
        this.addFloatingParticles(20);
        
        console.log('播放状态背景效果已启动');
    },
    
    // 停止播放状态效果
    stopPlayingEffects() {
        if (!this.isInitialized) return;
        
        this.isPlaying = false;
        
        // 停止呼吸光效
        if (this.elements.breathingLight) {
            this.elements.breathingLight.classList.remove('active');
        }
        
        // 减少粒子密度
        this.maxParticles = 30;
        
        console.log('播放状态背景效果已停止');
    },
    
    // 初始化浮动粒子
    initFloatingParticles() {
        if (!this.elements.floatingParticles) return;
        
        this.addFloatingParticles(this.maxParticles);
        
        // 定期添加新粒子
        setInterval(() => {
            if (this.particles.length < this.maxParticles) {
                this.addFloatingParticles(1);
            }
        }, 2000);
    },
    
    // 添加浮动粒子
    addFloatingParticles(count) {
        if (!this.elements.floatingParticles) return;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机位置和大小
            const size = Math.random() * 3 + 2;
            const startX = Math.random() * window.innerWidth;
            const delay = Math.random() * 20;
            const duration = 15 + Math.random() * 10;
            
            particle.style.cssText = `
                left: ${startX}px;
                width: ${size}px;
                height: ${size}px;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
            `;
            
            this.elements.floatingParticles.appendChild(particle);
            this.particles.push(particle);
            
            // 动画结束后移除粒子
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                    const index = this.particles.indexOf(particle);
                    if (index > -1) {
                        this.particles.splice(index, 1);
                    }
                }
            }, (duration + delay) * 1000);
        }
    },
    
    // 启动渐变动画
    startGradientAnimation() {
        if (!this.elements.gradientAnimation) return;
        
        // 渐变动画已通过 CSS 自动启动
        console.log('渐变背景动画已启动');
    },
    
    // 音乐节拍脉冲效果
    triggerBeatPulse() {
        if (!this.isInitialized || !this.isPlaying) return;
        
        const now = Date.now();
        if (now - this.lastBeatTime < 300) return; // 防止过于频繁触发
        
        this.lastBeatTime = now;
        
        if (this.elements.beatPulse) {
            this.elements.beatPulse.classList.remove('active');
            
            // 强制重排触发动画
            void this.elements.beatPulse.offsetWidth;
            
            this.elements.beatPulse.classList.add('active');
            
            // 1秒后移除激活状态
            setTimeout(() => {
                this.elements.beatPulse.classList.remove('active');
            }, 600);
        }
    },
    
    // 根据音频数据更新效果
    updateWithAudioData(audioData) {
        if (!this.isInitialized || !this.isPlaying || !audioData) return;
        
        // 计算音频强度
        let totalEnergy = 0;
        for (let i = 0; i < audioData.length; i++) {
            totalEnergy += audioData[i];
        }
        const normalizedEnergy = totalEnergy / (audioData.length * 255);
        
        // 如果音频强度超过阈值，触发节拍脉冲
        if (normalizedEnergy > this.beatThreshold) {
            this.triggerBeatPulse();
        }
        
        // 根据音频强度调整呼吸光效透明度
        if (this.elements.breathingLight) {
            const opacity = 0.3 + normalizedEnergy * 0.4;
            this.elements.breathingLight.style.opacity = Math.min(opacity, 0.7);
        }
    },
    
    // 根据主色调更新主题
    updateThemeColor(dominantColor) {
        if (!this.isInitialized) return;
        
        const rgb = this.hexToRgb(dominantColor);
        if (!rgb) return;
        
        // 更新 CSS 自定义属性
        document.documentElement.style.setProperty('--dynamic-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        
        // 更新粒子颜色
        const particles = this.elements.floatingParticles?.querySelectorAll('.particle');
        if (particles) {
            particles.forEach(particle => {
                particle.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            });
        }
        
        console.log(`主题色已更新为: ${dominantColor}`);
    },
    
    // 从专辑封面提取主色调
    extractDominantColor(imageUrl) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let r = 0, g = 0, b = 0;
            let count = 0;
            
            // 采样像素计算平均颜色
            for (let i = 0; i < data.length; i += 16) { // 每4个像素采样一次
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            const dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            this.updateThemeColor(dominantColor);
        };
        
        img.onerror = () => {
            console.warn('无法加载图片以提取主色调');
        };
        
        img.src = imageUrl;
    },
    
    // 十六进制颜色转 RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    // 清理资源
    cleanup() {
        this.isPlaying = false;
        this.particles.forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
        this.particles = [];
        
        if (this.elements.breathingLight) {
            this.elements.breathingLight.classList.remove('active');
        }
        
        if (this.elements.beatPulse) {
            this.elements.beatPulse.classList.remove('active');
        }
    }
};

// 导出到全局作用域
window.backgroundEffects = backgroundEffects;