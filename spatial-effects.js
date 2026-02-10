// ========================================
// Spatial Effects System v1.3
// 空間パーティクル＆エフェクトシステム
// テクスチャ付きパーティクル + 密度調整 + 雷改善
// ========================================

(function() {
    'use strict';

    class SpatialEffectsSystem {
        constructor() {
            this.scene = null;
            this.camera = null;
            this.THREE = null;
            
            this.effects = new Map();
            this.activeEffects = new Set();
            this.textures = {};
            
            this.effectTypes = {
                dust: { name: 'チリ', icon: '🌫️' },
                fog: { name: '霧', icon: '🌁' },
                sparkle: { name: 'キラキラ', icon: '✨' },
                ambient_glow: { name: '空間発光', icon: '💫' },
                ground_light: { name: '地面光', icon: '⬆️' },
                sky_light: { name: '天光', icon: '⬇️' },
                dark_fog: { name: '黒霧', icon: '🖤' },
                fire: { name: '炎', icon: '🔥' },
                lightning: { name: '雷', icon: '⚡' },
                random_fire: { name: 'ランダム炎', icon: '💥' }
            };
            
            this.animationId = null;
            this.clock = null;
            this._speedMultiplier = 1;
            this._densityMultiplier = 1;
            
            // 基本パーティクル数
            this.baseParticleCounts = {
                dust: 500,
                fog: 150,
                sparkle: 200,
                ground_light: 80,
                sky_light: 120,
                dark_fog: 200,
                fire: 300
            };
            
            this.init();
        }

        async init() {
            await this.waitForThree();
            this.createTextures();
            this.createUI();
            this.startAnimation();
            console.log('✨ SpatialEffectsSystem v1.3 初期化完了');
        }

        async waitForThree() {
            return new Promise(resolve => {
                const check = () => {
                    if (window.app && window.app.scene && window.app.camera && window.THREE) {
                        this.scene = window.app.scene;
                        this.camera = window.app.camera;
                        this.THREE = window.THREE;
                        this.clock = new this.THREE.Clock();
                        resolve();
                    } else {
                        setTimeout(check, 500);
                    }
                };
                check();
            });
        }

        // ========================================
        // テクスチャ生成（Canvas使用）
        // ========================================
        createTextures() {
            // 丸いグロー（チリ、霧用）
            this.textures.glow = this.createGlowTexture(64, '#ffffff');
            
            // キラキラ（星形）
            this.textures.sparkle = this.createSparkleTexture(64, '#ffffff');
            
            // ソフトな円（霧用）
            this.textures.softCircle = this.createSoftCircleTexture(128);
            
            // 炎用
            this.textures.fire = this.createFireTexture(64);
            
            // 光の粒
            this.textures.lightParticle = this.createLightParticleTexture(64);
            
            console.log('✅ パーティクルテクスチャ生成完了');
        }

        createGlowTexture(size, color) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(
                size/2, size/2, 0,
                size/2, size/2, size/2
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.3, color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createSparkleTexture(size, color) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const cx = size / 2;
            const cy = size / 2;
            
            // 十字のグロー
            const gradient1 = ctx.createLinearGradient(0, cy, size, cy);
            gradient1.addColorStop(0, 'transparent');
            gradient1.addColorStop(0.4, color);
            gradient1.addColorStop(0.5, color);
            gradient1.addColorStop(0.6, color);
            gradient1.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient1;
            ctx.fillRect(0, cy - 2, size, 4);
            
            const gradient2 = ctx.createLinearGradient(cx, 0, cx, size);
            gradient2.addColorStop(0, 'transparent');
            gradient2.addColorStop(0.4, color);
            gradient2.addColorStop(0.5, color);
            gradient2.addColorStop(0.6, color);
            gradient2.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient2;
            ctx.fillRect(cx - 2, 0, 4, size);
            
            // 中心のグロー
            const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size/4);
            centerGlow.addColorStop(0, color);
            centerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, size/4, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createSoftCircleTexture(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(
                size/2, size/2, 0,
                size/2, size/2, size/2
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.2, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createFireTexture(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(
                size/2, size/2, 0,
                size/2, size/2, size/2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
            gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.9)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
            gradient.addColorStop(0.8, 'rgba(200, 50, 0, 0.3)');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createLightParticleTexture(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(
                size/2, size/2, 0,
                size/2, size/2, size/2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.1, 'rgba(255, 255, 220, 0.9)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 180, 0.5)');
            gradient.addColorStop(0.6, 'rgba(255, 220, 100, 0.2)');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        createUI() {
            const panel = document.createElement('div');
            panel.id = 'spatial-effects-panel';
            panel.innerHTML = `
                <div class="sep-header">
                    <span>✨ 空間エフェクト</span>
                    <button class="sep-minimize">−</button>
                </div>
                <div class="sep-content">
                    <div class="sep-grid">
                        ${Object.entries(this.effectTypes).map(([key, val]) => `
                            <button class="sep-btn" data-effect="${key}" title="${val.name}">
                                <span class="sep-icon">${val.icon}</span>
                                <span class="sep-label">${val.name}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="sep-controls">
                        <div class="sep-slider-group">
                            <label>量</label>
                            <input type="range" id="sep-density" min="0.2" max="3" step="0.2" value="1">
                            <span id="sep-density-val">1.0x</span>
                        </div>
                        <div class="sep-slider-group">
                            <label>速度</label>
                            <input type="range" id="sep-speed" min="0.1" max="3" step="0.1" value="1">
                            <span id="sep-speed-val">1.0x</span>
                        </div>
                        <button class="sep-clear-all">🗑️ 全解除</button>
                    </div>
                </div>
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                #spatial-effects-panel {
                    position: fixed;
                    top: 120px;
                    left: 10px;
                    background: rgba(20, 20, 35, 0.95);
                    border-radius: 12px;
                    z-index: 1000;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 11px;
                    color: #e0e0e0;
                    min-width: 180px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .sep-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px 12px 0 0;
                    cursor: move;
                    font-weight: bold;
                    font-size: 11px;
                }
                .sep-minimize {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .sep-content { padding: 8px; }
                .sep-content.collapsed { display: none; }
                .sep-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 4px;
                    margin-bottom: 8px;
                }
                .sep-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: 6px 2px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    color: #ccc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .sep-btn:hover {
                    background: rgba(255,255,255,0.15);
                    transform: translateY(-1px);
                }
                .sep-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #667eea;
                    color: white;
                    box-shadow: 0 0 8px rgba(102, 126, 234, 0.5);
                }
                .sep-icon { font-size: 16px; }
                .sep-label { font-size: 8px; white-space: nowrap; }
                .sep-controls {
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 8px;
                }
                .sep-slider-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 6px;
                }
                .sep-slider-group label { width: 30px; font-size: 9px; color: #888; }
                .sep-slider-group input { flex: 1; height: 3px; accent-color: #667eea; }
                .sep-slider-group span { width: 30px; font-size: 9px; text-align: right; color: #aaa; }
                .sep-clear-all {
                    width: 100%;
                    padding: 6px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(panel);
            
            this.setupEventListeners(panel);
            this.makeDraggable(panel);
        }

        setupEventListeners(panel) {
            panel.querySelectorAll('.sep-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const effect = btn.dataset.effect;
                    this.toggleEffect(effect);
                    btn.classList.toggle('active');
                });
            });
            
            // 量（密度）スライダー
            panel.querySelector('#sep-density').addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                panel.querySelector('#sep-density-val').textContent = val.toFixed(1) + 'x';
                this._densityMultiplier = val;
                this.updateAllEffectDensity();
            });
            
            // 速度スライダー
            panel.querySelector('#sep-speed').addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                panel.querySelector('#sep-speed-val').textContent = val.toFixed(1) + 'x';
                this._speedMultiplier = val;
            });
            
            panel.querySelector('.sep-clear-all').addEventListener('click', () => {
                this.clearAllEffects();
                panel.querySelectorAll('.sep-btn').forEach(b => b.classList.remove('active'));
            });
            
            panel.querySelector('.sep-minimize').addEventListener('click', () => {
                const content = panel.querySelector('.sep-content');
                const btn = panel.querySelector('.sep-minimize');
                content.classList.toggle('collapsed');
                btn.textContent = content.classList.contains('collapsed') ? '+' : '−';
            });
        }

        makeDraggable(panel) {
            const header = panel.querySelector('.sep-header');
            let isDragging = false, offsetX, offsetY;
            
            header.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('sep-minimize')) return;
                isDragging = true;
                offsetX = e.clientX - panel.offsetLeft;
                offsetY = e.clientY - panel.offsetTop;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                panel.style.left = (e.clientX - offsetX) + 'px';
                panel.style.top = (e.clientY - offsetY) + 'px';
            });
            
            document.addEventListener('mouseup', () => { isDragging = false; });
        }

        toggleEffect(type) {
            if (this.activeEffects.has(type)) {
                this.removeEffect(type);
            } else {
                this.addEffect(type);
            }
        }

        addEffect(type) {
            if (this.activeEffects.has(type)) return;
            
            let effect = null;
            switch (type) {
                case 'dust': effect = this.createDustEffect(); break;
                case 'fog': effect = this.createFogEffect(); break;
                case 'sparkle': effect = this.createSparkleEffect(); break;
                case 'ambient_glow': effect = this.createAmbientGlowEffect(); break;
                case 'ground_light': effect = this.createGroundLightEffect(); break;
                case 'sky_light': effect = this.createSkyLightEffect(); break;
                case 'dark_fog': effect = this.createDarkFogEffect(); break;
                case 'fire': effect = this.createFireEffect(); break;
                case 'lightning': effect = this.createLightningEffect(); break;
                case 'random_fire': effect = this.createRandomFireEffect(); break;
            }
            
            if (effect) {
                this.effects.set(type, effect);
                this.activeEffects.add(type);
                console.log(`✨ エフェクト追加: ${this.effectTypes[type].name}`);
            }
        }

        removeEffect(type) {
            const effect = this.effects.get(type);
            if (effect) {
                if (effect.particles) {
                    this.scene.remove(effect.particles);
                    effect.particles.geometry?.dispose();
                    effect.particles.material?.dispose();
                }
                if (effect.lights) {
                    effect.lights.forEach(l => this.scene.remove(l));
                }
                if (effect.meshes) {
                    effect.meshes.forEach(m => {
                        this.scene.remove(m);
                        m.geometry?.dispose();
                        m.material?.dispose();
                    });
                }
                if (effect.interval) clearInterval(effect.interval);
                this.effects.delete(type);
                this.activeEffects.delete(type);
            }
        }

        clearAllEffects() {
            [...this.activeEffects].forEach(type => this.removeEffect(type));
        }

        // ========================================
        // 密度更新（エフェクト再生成）
        // ========================================
        updateAllEffectDensity() {
            // アクティブなエフェクトを再生成
            const activeTypes = [...this.activeEffects];
            activeTypes.forEach(type => {
                // ライトのみのエフェクトやインターバルエフェクトはスキップ
                if (type === 'ambient_glow' || type === 'lightning' || type === 'random_fire') return;
                
                this.removeEffect(type);
                this.addEffect(type);
            });
            console.log(`✨ 密度更新: ${this._densityMultiplier.toFixed(1)}x`);
        }

        // ========================================
        // エフェクト生成（テクスチャ付き）
        // ========================================

        createDustEffect() {
            const count = Math.floor(this.baseParticleCounts.dust * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*10;
                pos[i*3+1] = Math.random()*5;
                pos[i*3+2] = (Math.random()-0.5)*10;
                vel[i*3] = (Math.random()-0.5)*0.002;
                vel[i*3+1] = (Math.random()-0.5)*0.001;
                vel[i*3+2] = (Math.random()-0.5)*0.002;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xc0a080,
                size: 0.05,
                map: this.textures.glow,
                transparent: true,
                opacity: 0.5,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            this.scene.add(particles);
            return { particles, type: 'dust' };
        }

        createFogEffect() {
            const count = Math.floor(this.baseParticleCounts.fog * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*15;
                pos[i*3+1] = Math.random()*2+0.5;
                pos[i*3+2] = (Math.random()-0.5)*15;
                vel[i*3] = (Math.random()-0.5)*0.005;
                vel[i*3+1] = 0;
                vel[i*3+2] = (Math.random()-0.5)*0.005;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.8,
                map: this.textures.softCircle,
                transparent: true,
                opacity: 0.15,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            this.scene.add(particles);
            return { particles, type: 'fog' };
        }

        createSparkleEffect() {
            const count = Math.floor(this.baseParticleCounts.sparkle * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*8;
                pos[i*3+1] = Math.random()*4+0.5;
                pos[i*3+2] = (Math.random()-0.5)*8;
                vel[i*3] = (Math.random()-0.5)*0.003;
                vel[i*3+1] = (Math.random()-0.5)*0.002;
                vel[i*3+2] = (Math.random()-0.5)*0.003;
                sizes[i] = 0.1 + Math.random() * 0.15;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            geo.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffffaa,
                size: 0.15,
                map: this.textures.sparkle,
                transparent: true,
                opacity: 0.9,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            particles.userData.sparkle = true;
            this.scene.add(particles);
            return { particles, type: 'sparkle' };
        }

        createAmbientGlowEffect() {
            const lights = [];
            const colors = [0x4488ff, 0xff44aa, 0x44ffaa, 0xffaa44];
            
            for (let i = 0; i < 4; i++) {
                const light = new this.THREE.PointLight(colors[i], 0.5, 10);
                const angle = (i/4)*Math.PI*2;
                light.position.set(Math.cos(angle)*3, 2, Math.sin(angle)*3);
                light.userData.baseAngle = angle;
                this.scene.add(light);
                lights.push(light);
            }
            return { lights, type: 'ambient_glow' };
        }

        createGroundLightEffect() {
            const count = Math.floor(this.baseParticleCounts.ground_light * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*8;
                pos[i*3+1] = 0;
                pos[i*3+2] = (Math.random()-0.5)*8;
                vel[i*3] = 0;
                vel[i*3+1] = 0.01+Math.random()*0.02;
                vel[i*3+2] = 0;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffcc66,
                size: 0.2,
                map: this.textures.lightParticle,
                transparent: true,
                opacity: 0.8,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            particles.userData.groundLight = true;
            this.scene.add(particles);
            return { particles, type: 'ground_light' };
        }

        createSkyLightEffect() {
            const count = Math.floor(this.baseParticleCounts.sky_light * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*10;
                pos[i*3+1] = 8;
                pos[i*3+2] = (Math.random()-0.5)*10;
                vel[i*3] = (Math.random()-0.5)*0.002;
                vel[i*3+1] = -0.015-Math.random()*0.01;
                vel[i*3+2] = (Math.random()-0.5)*0.002;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffffee,
                size: 0.15,
                map: this.textures.lightParticle,
                transparent: true,
                opacity: 0.7,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            particles.userData.skyLight = true;
            this.scene.add(particles);
            return { particles, type: 'sky_light' };
        }

        createDarkFogEffect() {
            const count = Math.floor(this.baseParticleCounts.dark_fog * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = (Math.random()-0.5)*12;
                pos[i*3+1] = Math.random()*3;
                pos[i*3+2] = (Math.random()-0.5)*12;
                vel[i*3] = (Math.random()-0.5)*0.008;
                vel[i*3+1] = (Math.random()-0.5)*0.002;
                vel[i*3+2] = (Math.random()-0.5)*0.008;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            // 黒霧用の特別なテクスチャ
            const darkTex = this.createGlowTexture(64, '#333333');
            
            const mat = new this.THREE.PointsMaterial({
                color: 0x222222,
                size: 0.6,
                map: darkTex,
                transparent: true,
                opacity: 0.4,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            this.scene.add(particles);
            return { particles, type: 'dark_fog' };
        }

        createFireEffect() {
            const count = Math.floor(this.baseParticleCounts.fire * this._densityMultiplier);
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count * 3);
            
            for (let i = 0; i < count; i++) {
                const angle = Math.random()*Math.PI*2;
                const radius = Math.random()*3;
                pos[i*3] = Math.cos(angle)*radius;
                pos[i*3+1] = 0;
                pos[i*3+2] = Math.sin(angle)*radius;
                vel[i*3] = (Math.random()-0.5)*0.01;
                vel[i*3+1] = 0.02+Math.random()*0.03;
                vel[i*3+2] = (Math.random()-0.5)*0.01;
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.2,
                map: this.textures.fire,
                transparent: true,
                opacity: 0.9,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            particles.userData.velocities = vel;
            particles.userData.fire = true;
            this.scene.add(particles);
            
            const fireLight = new this.THREE.PointLight(0xff4400, 1.5, 8);
            fireLight.position.set(0, 1, 0);
            this.scene.add(fireLight);
            
            return { particles, lights: [fireLight], type: 'fire' };
        }

        createLightningEffect() {
            const meshes = [];
            const lights = [];
            const self = this;
            
            // 最初の雷をすぐに生成
            const x = (Math.random()-0.5)*6;
            const z = (Math.random()-0.5)*6;
            this.createLightningBolt(x, z, meshes, lights);
            
            // 定期的に雷を生成
            const interval = setInterval(() => {
                if (!self.activeEffects.has('lightning')) return;
                const nx = (Math.random()-0.5)*6;
                const nz = (Math.random()-0.5)*6;
                self.createLightningBolt(nx, nz, meshes, lights);
            }, 800 + Math.random()*1200);
            
            return { meshes, lights, interval, type: 'lightning' };
        }

        createLightningBolt(x, z, meshes, lights) {
            const points = [];
            let cy = 6, cx = x, cz = z;
            
            // 雷のパスを生成
            while (cy > 0) {
                points.push(new this.THREE.Vector3(cx, cy, cz));
                cy -= 0.2 + Math.random() * 0.4;
                cx += (Math.random() - 0.5) * 0.4;
                cz += (Math.random() - 0.5) * 0.4;
            }
            points.push(new this.THREE.Vector3(cx, 0, cz));
            
            // メインの雷（太いチューブ）
            const tubeGeo = new this.THREE.TubeGeometry(
                new this.THREE.CatmullRomCurve3(points),
                points.length * 2,
                0.03, // 半径
                6,    // radialSegments
                false
            );
            const tubeMat = new this.THREE.MeshBasicMaterial({
                color: 0xeeffff,
                transparent: true,
                opacity: 1,
                side: this.THREE.DoubleSide
            });
            const tube = new this.THREE.Mesh(tubeGeo, tubeMat);
            this.scene.add(tube);
            meshes.push(tube);
            
            // 周囲のグロー（太いチューブ）
            const glowGeo = new this.THREE.TubeGeometry(
                new this.THREE.CatmullRomCurve3(points),
                points.length * 2,
                0.08,
                6,
                false
            );
            const glowMat = new this.THREE.MeshBasicMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.4,
                side: this.THREE.DoubleSide
            });
            const glow = new this.THREE.Mesh(glowGeo, glowMat);
            this.scene.add(glow);
            meshes.push(glow);
            
            // 分岐を追加
            if (Math.random() > 0.4 && points.length > 5) {
                const branchIdx = Math.floor(points.length * 0.3);
                const branchPoints = [points[branchIdx].clone()];
                let bx = points[branchIdx].x;
                let by = points[branchIdx].y;
                let bz = points[branchIdx].z;
                
                for (let i = 0; i < 4; i++) {
                    by -= 0.3 + Math.random() * 0.3;
                    bx += (Math.random() - 0.5) * 0.6;
                    bz += (Math.random() - 0.5) * 0.6;
                    branchPoints.push(new this.THREE.Vector3(bx, by, bz));
                }
                
                const branchGeo = new this.THREE.TubeGeometry(
                    new this.THREE.CatmullRomCurve3(branchPoints),
                    branchPoints.length * 2,
                    0.02,
                    4,
                    false
                );
                const branchMat = new this.THREE.MeshBasicMaterial({
                    color: 0xaaddff,
                    transparent: true,
                    opacity: 0.8
                });
                const branch = new this.THREE.Mesh(branchGeo, branchMat);
                this.scene.add(branch);
                meshes.push(branch);
            }
            
            // フラッシュライト
            const flash = new this.THREE.PointLight(0xaaddff, 8, 20);
            flash.position.set(x, 3, z);
            this.scene.add(flash);
            lights.push(flash);
            
            // フェードアウト
            let opacity = 1;
            const self = this;
            const fadeOut = setInterval(() => {
                opacity -= 0.1;
                tubeMat.opacity = Math.max(0, opacity);
                glowMat.opacity = Math.max(0, opacity * 0.4);
                flash.intensity = Math.max(0, opacity * 8);
                
                if (opacity <= 0) {
                    clearInterval(fadeOut);
                    self.scene.remove(tube);
                    self.scene.remove(glow);
                    self.scene.remove(flash);
                    tubeGeo.dispose();
                    tubeMat.dispose();
                    glowGeo.dispose();
                    glowMat.dispose();
                    
                    // meshesとlightsから削除
                    [tube, glow].forEach(m => {
                        const idx = meshes.indexOf(m);
                        if (idx > -1) meshes.splice(idx, 1);
                    });
                    const lidx = lights.indexOf(flash);
                    if (lidx > -1) lights.splice(lidx, 1);
                }
            }, 30);
        }

        createRandomFireEffect() {
            const meshes = [];
            const lights = [];
            const self = this;
            
            const interval = setInterval(() => {
                if (!self.activeEffects.has('random_fire')) return;
                const x = (Math.random()-0.5)*8;
                const z = (Math.random()-0.5)*8;
                self.createFireBurst(x, z, meshes, lights);
            }, 600+Math.random()*1000);
            
            return { meshes, lights, interval, type: 'random_fire' };
        }

        createFireBurst(x, z, meshes, lights) {
            const count = 40;
            const geo = new this.THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const velocities = [];
            
            for (let i = 0; i < count; i++) {
                pos[i*3] = x + (Math.random()-0.5)*0.3;
                pos[i*3+1] = 0;
                pos[i*3+2] = z + (Math.random()-0.5)*0.3;
                velocities.push({
                    x: (Math.random()-0.5)*0.04,
                    y: 0.06+Math.random()*0.08,
                    z: (Math.random()-0.5)*0.04
                });
            }
            
            geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
            
            const mat = new this.THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.25,
                map: this.textures.fire,
                transparent: true,
                opacity: 1,
                blending: this.THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const particles = new this.THREE.Points(geo, mat);
            this.scene.add(particles);
            meshes.push(particles);
            
            const light = new this.THREE.PointLight(0xff6600, 3, 6);
            light.position.set(x, 1, z);
            this.scene.add(light);
            lights.push(light);
            
            let frame = 0;
            const maxFrames = 50;
            const self = this;
            
            const animate = () => {
                frame++;
                const posAttr = geo.getAttribute('position');
                
                for (let i = 0; i < count; i++) {
                    posAttr.array[i*3] += velocities[i].x;
                    posAttr.array[i*3+1] += velocities[i].y;
                    posAttr.array[i*3+2] += velocities[i].z;
                    velocities[i].y -= 0.003; // 重力
                    velocities[i].x *= 0.98; // 減衰
                    velocities[i].z *= 0.98;
                }
                posAttr.needsUpdate = true;
                
                const progress = frame / maxFrames;
                mat.opacity = 1 - progress;
                mat.size = 0.25 * (1 - progress * 0.5);
                light.intensity = 3 * (1 - progress);
                
                if (frame < maxFrames && self.activeEffects.has('random_fire')) {
                    requestAnimationFrame(animate);
                } else {
                    self.scene.remove(particles);
                    self.scene.remove(light);
                    geo.dispose();
                    mat.dispose();
                    const idx = meshes.indexOf(particles);
                    if (idx > -1) meshes.splice(idx, 1);
                    const lidx = lights.indexOf(light);
                    if (lidx > -1) lights.splice(lidx, 1);
                }
            };
            animate();
        }

        // ========================================
        // アニメーションループ
        // ========================================

        startAnimation() {
            const self = this;
            const animate = () => {
                self.animationId = requestAnimationFrame(animate);
                const delta = self.clock.getDelta();
                const time = self.clock.getElapsedTime();
                
                self.effects.forEach((effect, type) => {
                    self.updateEffect(effect, type, delta, time);
                });
            };
            animate();
        }

        updateEffect(effect, type, delta, time) {
            // 空間発光（ライトのみ）
            if (effect.lights && type === 'ambient_glow') {
                effect.lights.forEach((light, i) => {
                    const angle = light.userData.baseAngle + time * 0.3;
                    light.position.x = Math.cos(angle) * 3;
                    light.position.z = Math.sin(angle) * 3;
                    light.intensity = 0.3 + Math.sin(time*2+i) * 0.2;
                });
            }
            
            if (!effect.particles) return;
            
            const positions = effect.particles.geometry.getAttribute('position');
            const velocities = effect.particles.userData.velocities;
            const count = positions.count;
            
            for (let i = 0; i < count; i++) {
                let x = positions.array[i*3];
                let y = positions.array[i*3+1];
                let z = positions.array[i*3+2];
                
                x += velocities[i*3] * this._speedMultiplier;
                y += velocities[i*3+1] * this._speedMultiplier;
                z += velocities[i*3+2] * this._speedMultiplier;
                
                // タイプ別の境界処理
                if (type === 'ground_light') {
                    if (y > 5) { 
                        y = 0; 
                        x = (Math.random()-0.5)*8; 
                        z = (Math.random()-0.5)*8; 
                    }
                } else if (type === 'sky_light') {
                    if (y < 0) { 
                        y = 8; 
                        x = (Math.random()-0.5)*10; 
                        z = (Math.random()-0.5)*10; 
                    }
                } else if (type === 'fire') {
                    if (y > 3) {
                        const angle = Math.random()*Math.PI*2;
                        const radius = Math.random()*3;
                        x = Math.cos(angle)*radius; 
                        y = 0; 
                        z = Math.sin(angle)*radius;
                    }
                } else {
                    // 一般的な境界（ループ）
                    if (x > 8) x = -8;
                    if (x < -8) x = 8;
                    if (z > 8) z = -8;
                    if (z < -8) z = 8;
                    if (y < 0) y = 5;
                    if (y > 6) y = 0;
                }
                
                positions.array[i*3] = x;
                positions.array[i*3+1] = y;
                positions.array[i*3+2] = z;
            }
            positions.needsUpdate = true;
            
            // キラキラの点滅
            if (effect.particles.userData.sparkle) {
                effect.particles.material.opacity = 0.6 + Math.sin(time*4) * 0.3;
            }
            
            // 炎の光源フリッカー
            if (effect.lights && type === 'fire') {
                effect.lights.forEach(l => { 
                    l.intensity = 1.2 + Math.random()*0.6; 
                });
            }
        }
    }

    // グローバル登録
    window.SpatialEffectsSystem = SpatialEffectsSystem;

    // 自動初期化
    function init() {
        window.spatialEffects = new SpatialEffectsSystem();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 2000));
    } else {
        setTimeout(init, 2000);
    }

    console.log('📦 Spatial Effects System v1.3 ロード');
})();
