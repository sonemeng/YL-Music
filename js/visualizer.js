const visualizer = {
    audioContext: null,
    source: null,
    analyser: null,
    canvas: null,
    ctx: null,
    dataArray: null,
    bufferLength: null,
    isInitialized: false,
    // [新增] 用于平滑动画的值
    smoothedDataArray: null,

    init(audioElement, canvasElement) {
        if (this.isInitialized) return;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');

        const setupContext = () => {
            if (this.isInitialized) return;
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.source = this.audioContext.createMediaElementSource(audioElement);
                this.analyser = this.audioContext.createAnalyser();
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);

                this.analyser.fftSize = 256;
                this.bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(this.bufferLength);
                this.smoothedDataArray = new Array(this.bufferLength).fill(0); // 初始化平滑数组

                this.isInitialized = true;
                this.draw();
                document.removeEventListener('click', setupContext);
                document.removeEventListener('keydown', setupContext);
            } catch (e) {
                console.error("无法初始化音频可视化:", e);
            }
        };

        document.addEventListener('click', setupContext, { once: true });
        document.addEventListener('keydown', setupContext, { once: true });
    },

    // [重大修改] 重写draw函数以实现更炫酷的效果
    draw() {
        requestAnimationFrame(() => this.draw());
        if (!this.isInitialized || document.hidden) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // 为背景效果系统提供音频数据
        if (typeof backgroundEffects !== 'undefined') {
            backgroundEffects.updateWithAudioData(this.dataArray);
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const barWidth = 3;
        const spacing = 2;
        const totalBarWidth = barWidth + spacing;
        const numBars = Math.floor(this.canvas.width / totalBarWidth);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // [新增] 获取当前时间用于动态效果
        const time = Date.now() * 0.001;
        
        // [新增] 创建彩虹渐变色
        const createRainbowGradient = (ctx, x, y, height, barIndex) => {
            const gradient = ctx.createLinearGradient(x, y, x, y - height);
            const hueBase = (barIndex * 8 + time * 50) % 360;
            
            gradient.addColorStop(0, `hsl(${hueBase}, 70%, 60%)`);
            gradient.addColorStop(0.3, `hsl(${(hueBase + 60) % 360}, 80%, 65%)`);
            gradient.addColorStop(0.7, `hsl(${(hueBase + 120) % 360}, 75%, 70%)`);
            gradient.addColorStop(1, `hsl(${(hueBase + 180) % 360}, 85%, 75%)`);
            
            return gradient;
        };

        for (let i = 0; i < numBars; i++) {
            // 从频谱中心向外取样，以获得对称效果
            const index = Math.floor((i / numBars) * this.bufferLength);
            const value = this.dataArray[index];

            // [修改] 增强平滑处理和动态波动
            const smoothingFactor = 0.15;
            this.smoothedDataArray[i] += (value - this.smoothedDataArray[i]) * smoothingFactor;
            
            // [新增] 添加轻微的波动效果
            const waveEffect = Math.sin(time * 2 + i * 0.1) * 3;
            const barHeight = ((this.smoothedDataArray[i] + waveEffect) / 255) * centerY * 0.9;

            // [修改] 使用彩虹渐变
            const gradient1 = createRainbowGradient(this.ctx, centerX + i * totalBarWidth, centerY, barHeight, i);
            const gradient2 = createRainbowGradient(this.ctx, centerX - (i + 1) * totalBarWidth, centerY, barHeight, i);

            // 计算左右两边对称的柱子位置
            const x1 = centerX + i * totalBarWidth;
            const x2 = centerX - (i + 1) * totalBarWidth;

            // [修改] 绘制带圆角和发光效果的柱子
            this.ctx.fillStyle = gradient1;
            this.ctx.beginPath();
            this.ctx.roundRect(x1, centerY - barHeight, barWidth, barHeight, 50);
            this.ctx.fill();
            
            this.ctx.fillStyle = gradient2;
            this.ctx.beginPath();
            this.ctx.roundRect(x2, centerY - barHeight, barWidth, barHeight, 50);
            this.ctx.fill();

            // [新增] 添加发光效果
            if (barHeight > 5) {
                this.ctx.shadowColor = `hsl(${(i * 8 + time * 50) % 360}, 80%, 70%)`;
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetY = 0;
                
                // 重新绘制以应用发光效果
                this.ctx.fillStyle = gradient1;
                this.ctx.beginPath();
                this.ctx.roundRect(x1, centerY - barHeight, barWidth, barHeight, 50);
                this.ctx.fill();
                
                this.ctx.fillStyle = gradient2;
                this.ctx.beginPath();
                this.ctx.roundRect(x2, centerY - barHeight, barWidth, barHeight, 50);
                this.ctx.fill();
                
                // 清除阴影设置
                this.ctx.shadowBlur = 0;
            }

            // [修改] 增强倒影效果
            this.ctx.globalAlpha = 0.3;
            const reflectionGradient1 = this.ctx.createLinearGradient(x1, centerY, x1, centerY + barHeight * 0.6);
            const reflectionGradient2 = this.ctx.createLinearGradient(x2, centerY, x2, centerY + barHeight * 0.6);
            
            const hue = (i * 8 + time * 50) % 360;
            reflectionGradient1.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`);
            reflectionGradient1.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
            reflectionGradient2.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`);
            reflectionGradient2.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
            
            this.ctx.fillStyle = reflectionGradient1;
            this.ctx.beginPath();
            this.ctx.roundRect(x1, centerY, barWidth, barHeight * 0.6, 50);
            this.ctx.fill();
            
            this.ctx.fillStyle = reflectionGradient2;
            this.ctx.beginPath();
            this.ctx.roundRect(x2, centerY, barWidth, barHeight * 0.6, 50);
            this.ctx.fill();
            
            this.ctx.globalAlpha = 1.0;
        }
    }
};