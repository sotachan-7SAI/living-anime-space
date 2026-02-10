/**
 * 📹 Camera Effects Extended
 * 追加プリセットと特殊効果
 * 
 * 新プリセット:
 * - 白黒、2階調、セピア、劇画タッチ、漫画調（白黒線画）
 * - 色数が少ないアニメ調、ファミコンドット調、スーファミドット調
 * 
 * 新特殊効果:
 * - グロー数種類、レンズフレア数種類、ハロー効果数種類
 * - トラップコード数種類、グラデーション数種類、モーションブラー
 */

class CameraEffectsExtended {
    constructor() {
        this.isInitialized = false;
        
        // 拡張設定
        this.extendedSettings = {
            // 新プリセット用
            posterizeLevels: 0,          // 0=OFF, 2-8 階調
            pixelateSize: 0,              // 0=OFF, ピクセルサイズ
            outlineEnabled: false,        // 線画
            outlineThickness: 1,
            outlineColor: '#000000',
            ditherEnabled: false,         // ディザリング
            ditherPattern: 'bayer4',      // bayer4, bayer8, noise
            colorPalette: 'full',         // full, nes, snes, gameboy, 8color
            
            // グロー効果
            glowEnabled: false,
            glowType: 'soft',             // soft, intense, pulse, rainbow
            glowIntensity: 0.5,
            glowColor: '#ffffff',
            glowRadius: 20,
            
            // レンズフレア
            lensFlareEnabled: false,
            lensFlareType: 'cinematic',   // cinematic, anamorphic, star, hexagon
            lensFlareIntensity: 0.5,
            lensFlarePosition: { x: 0.7, y: 0.3 },
            
            // ハロー効果
            haloEnabled: false,
            haloType: 'soft',             // soft, sharp, rainbow, divine
            haloIntensity: 0.5,
            haloSize: 100,
            
            // トラップコード風
            trapCodeEnabled: false,
            trapCodeType: 'shine',        // shine, starglow, lux, optical
            trapCodeIntensity: 0.5,
            
            // グラデーション
            gradientEnabled: false,
            gradientType: 'linear',       // linear, radial, angular, diamond
            gradientColors: ['#ff6b6b', '#4ecdc4'],
            gradientAngle: 45,
            gradientBlendMode: 'overlay', // overlay, multiply, screen, soft-light
            gradientOpacity: 0.3,
            
            // モーションブラー
            motionBlurEnabled: false,
            motionBlurIntensity: 0.5,
            motionBlurDirection: 0,       // 角度
            motionBlurSamples: 8
        };
        
        // 追加プリセット定義
        this.extendedPresets = {
            monochrome: {
                name: '⚫ 白黒',
                saturation: -100,
                contrast: 10,
                brightness: 5,
                gamma: 0.95,
                extSettings: {
                    posterizeLevels: 0,
                    outlineEnabled: false
                }
            },
            twoTone: {
                name: '◼️ 2階調',
                saturation: -100,
                contrast: 100,
                brightness: 0,
                gamma: 0.8,
                extSettings: {
                    posterizeLevels: 2,
                    ditherEnabled: true,
                    ditherPattern: 'bayer4'
                }
            },
            sepia: {
                name: '📜 セピア',
                saturation: -60,
                brightness: 5,
                hue: 30,
                contrast: 5,
                gamma: 1.0,
                vignetteEnabled: true,
                vignetteIntensity: 0.3,
                extSettings: {
                    posterizeLevels: 0
                }
            },
            gekiga: {
                name: '💥 劇画タッチ',
                saturation: -100,
                contrast: 60,
                brightness: -10,
                gamma: 0.75,
                grainEnabled: true,
                grainIntensity: 0.15,
                extSettings: {
                    posterizeLevels: 4,
                    outlineEnabled: true,
                    outlineThickness: 2,
                    outlineColor: '#000000'
                }
            },
            manga: {
                name: '📖 漫画調',
                saturation: -100,
                contrast: 80,
                brightness: 10,
                gamma: 0.9,
                extSettings: {
                    posterizeLevels: 3,
                    outlineEnabled: true,
                    outlineThickness: 1.5,
                    outlineColor: '#000000',
                    ditherEnabled: true,
                    ditherPattern: 'bayer8'
                }
            },
            limitedAnime: {
                name: '🎨 セル調アニメ',
                saturation: 20,
                contrast: 40,
                brightness: 10,
                gamma: 0.95,
                bloomEnabled: true,
                bloomIntensity: 0.3,
                extSettings: {
                    posterizeLevels: 6,
                    outlineEnabled: true,
                    outlineThickness: 1,
                    outlineColor: '#333333',
                    colorPalette: '8color'
                }
            },
            famicom: {
                name: '🕹️ ファミコン風',
                saturation: 0,
                contrast: 30,
                brightness: 0,
                gamma: 1.0,
                extSettings: {
                    posterizeLevels: 4,
                    pixelateSize: 4,
                    colorPalette: 'nes',
                    ditherEnabled: true,
                    ditherPattern: 'bayer4'
                }
            },
            snes: {
                name: '🎮 スーファミ風',
                saturation: 10,
                contrast: 20,
                brightness: 5,
                gamma: 1.0,
                extSettings: {
                    posterizeLevels: 8,
                    pixelateSize: 2,
                    colorPalette: 'snes',
                    ditherEnabled: false
                }
            },
            roughPixel: {
                name: '🔳 荒いドット',
                saturation: -10,
                contrast: 40,
                brightness: 0,
                gamma: 0.95,
                extSettings: {
                    posterizeLevels: 3,
                    pixelateSize: 8,
                    colorPalette: 'nes',
                    ditherEnabled: true,
                    ditherPattern: 'bayer4'
                }
            },
            ultraPixel: {
                name: '🧱 極荒ドット',
                saturation: -20,
                contrast: 50,
                brightness: 5,
                gamma: 0.9,
                extSettings: {
                    posterizeLevels: 2,
                    pixelateSize: 12,
                    colorPalette: 'gameboy',
                    ditherEnabled: true,
                    ditherPattern: 'bayer8'
                }
            },
            megaPixel: {
                name: '🟩 メガドット',
                saturation: 0,
                contrast: 60,
                brightness: 0,
                gamma: 0.85,
                extSettings: {
                    posterizeLevels: 4,
                    pixelateSize: 16,
                    colorPalette: '8color',
                    ditherEnabled: false
                }
            }
        };
        
        // グロー種類
        this.glowTypes = {
            soft: { name: '✨ ソフト', blur: 15, opacity: 0.4 },
            intense: { name: '💫 インテンス', blur: 25, opacity: 0.6 },
            pulse: { name: '💓 パルス', blur: 20, opacity: 0.5, animated: true },
            rainbow: { name: '🌈 レインボー', blur: 20, opacity: 0.5, rainbow: true },
            neon: { name: '💡 ネオン', blur: 10, opacity: 0.7 },
            dream: { name: '🌙 ドリーム', blur: 30, opacity: 0.3 }
        };
        
        // レンズフレア種類
        this.lensFlareTypes = {
            cinematic: { name: '🎬 シネマティック', elements: 6 },
            anamorphic: { name: '📽️ アナモルフィック', horizontal: true },
            star: { name: '⭐ スター', points: 6 },
            hexagon: { name: '⬡ 六角形', points: 6, shape: 'hex' },
            subtle: { name: '🔅 サトル', elements: 3, opacity: 0.3 },
            dramatic: { name: '🌟 ドラマティック', elements: 8, opacity: 0.7 }
        };
        
        // ハロー種類
        this.haloTypes = {
            soft: { name: '☁️ ソフト', blur: 40, opacity: 0.3 },
            sharp: { name: '💎 シャープ', blur: 10, opacity: 0.5 },
            rainbow: { name: '🌈 レインボー', blur: 30, rainbow: true },
            divine: { name: '👼 ディバイン', blur: 50, golden: true },
            aura: { name: '🔮 オーラ', blur: 35, pulsate: true },
            angelic: { name: '😇 エンジェリック', blur: 45, rays: true }
        };
        
        // トラップコード風種類
        this.trapCodeTypes = {
            shine: { name: '✨ シャイン', rays: true },
            starglow: { name: '🌟 スターグロー', star: true },
            lux: { name: '💡 ラックス', volumetric: true },
            optical: { name: '🔬 オプティカル', flares: true },
            godRays: { name: '☀️ ゴッドレイ', rays: true, directional: true },
            shimmer: { name: '💫 シマー', shimmer: true }
        };
        
        // グラデーション種類
        this.gradientTypes = {
            linear: { name: '➡️ リニア' },
            radial: { name: '⭕ ラジアル' },
            angular: { name: '🔄 アングル' },
            diamond: { name: '💎 ダイヤモンド' },
            conic: { name: '🎯 コニック' }
        };
        
        // グラデーションプリセット
        this.gradientPresets = {
            sunset: { name: '🌅 サンセット', colors: ['#ff6b6b', '#feca57', '#ff9ff3'] },
            ocean: { name: '🌊 オーシャン', colors: ['#0abde3', '#10ac84', '#1dd1a1'] },
            night: { name: '🌙 ナイト', colors: ['#2c3e50', '#3498db', '#9b59b6'] },
            fire: { name: '🔥 ファイア', colors: ['#eb4d4b', '#f9ca24', '#f0932b'] },
            nature: { name: '🌿 ネイチャー', colors: ['#27ae60', '#2ecc71', '#1abc9c'] },
            candy: { name: '🍬 キャンディ', colors: ['#e056fd', '#686de0', '#30336b'] },
            cyberpunk: { name: '🤖 サイバーパンク', colors: ['#ff00ff', '#00ffff', '#ffff00'] },
            vintage: { name: '📷 ヴィンテージ', colors: ['#d4a574', '#c9a959', '#8b7355'] }
        };
        
        // カラーパレット定義
        this.colorPalettes = {
            full: null,
            nes: [
                '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a4e4fc', 
                '#3cbcfc', '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8',
                '#0000bc', '#d8b8f8', '#9878f8', '#6844fc', '#4428bc', '#f8b8f8',
                '#f878f8', '#d800cc', '#940084', '#f8a4c0', '#f85898', '#e40058',
                '#a80020', '#f0d0b0', '#f87858', '#f83800', '#a81000', '#fce0a8',
                '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800', '#ac7c00',
                '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8',
                '#58d854', '#00a800', '#006800', '#b8f8d8', '#58f898', '#00a844',
                '#005800', '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8',
                '#787878'
            ],
            snes: [
                '#000000', '#ffffff', '#7f7f7f', '#ff0000', '#00ff00', '#0000ff',
                '#ffff00', '#ff00ff', '#00ffff', '#ff7f00', '#7f00ff', '#007fff',
                '#ff007f', '#7fff00', '#00ff7f', '#3f0000', '#003f00', '#00003f',
                '#3f3f00', '#3f003f', '#003f3f', '#7f0000', '#007f00', '#00007f',
                '#7f7f00', '#7f007f', '#007f7f', '#bf0000', '#00bf00', '#0000bf',
                '#bfbf00', '#bf00bf', '#00bfbf'
            ],
            gameboy: [
                '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
            ],
            '8color': [
                '#000000', '#ffffff', '#ff0000', '#00ff00', 
                '#0000ff', '#ffff00', '#ff00ff', '#00ffff'
            ]
        };
        
        this.overlays = {};
        this.animationFrameId = null;
    }
    
    init(cameraEffectsPanel) {
        this.panel = cameraEffectsPanel;
        this.addExtendedUI();
        this.setupExtendedEvents();
        this.isInitialized = true;
        console.log('📹 Camera Effects Extended initialized');
    }
    
    addExtendedUI() {
        const content = document.querySelector('#camera-effects-panel .cep-content');
        if (!content) {
            console.warn('Camera Effects Panel not found');
            return;
        }
        
        // プリセットセクションを探して追加プリセットを追加
        const presetSection = content.querySelector('.cep-presets');
        if (presetSection) {
            // 既存プリセットの後に新プリセットを追加
            Object.entries(this.extendedPresets).forEach(([key, preset]) => {
                const presetDiv = document.createElement('div');
                presetDiv.className = 'cep-preset';
                presetDiv.dataset.preset = key;
                presetDiv.dataset.extended = 'true';
                presetDiv.innerHTML = `
                    <span class="cep-preset-icon">${preset.name.split(' ')[0]}</span>
                    <span>${preset.name.split(' ')[1]}</span>
                `;
                presetSection.appendChild(presetDiv);
            });
        }
        
        // 特殊効果セクションの後に新しいセクションを追加
        const specialEffectsSection = Array.from(content.querySelectorAll('.cep-section')).find(
            s => s.querySelector('.cep-section-title')?.textContent.includes('特殊効果')
        );
        
        if (specialEffectsSection) {
            // 新しい特殊効果セクションを作成
            const extendedEffectsHTML = this.createExtendedEffectsUI();
            specialEffectsSection.insertAdjacentHTML('afterend', extendedEffectsHTML);
        }
    }
    
    createExtendedEffectsUI() {
        return `
            <!-- 拡張特殊効果 -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>🌟</span>
                        <span>グロー効果</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">グロー有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-glow-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">種類</label>
                        <select id="cep-glow-type" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            ${Object.entries(this.glowTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">強度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-glow-intensity" min="0" max="1" step="0.01" value="0.5">
                            <input type="text" class="cep-value" id="cep-glow-intensity-val" value="50%">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">色</label>
                        <input type="color" id="cep-glow-color" value="#ffffff" style="width:40px; height:24px; border:none; border-radius:4px; cursor:pointer;">
                        <div class="cep-slider-container" style="flex:1;">
                            <input type="range" class="cep-slider" id="cep-glow-radius" min="5" max="50" value="20">
                            <span style="font-size:9px; color:#888;">R:${this.extendedSettings.glowRadius}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- レンズフレア -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>🌞</span>
                        <span>レンズフレア</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">フレア有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-flare-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">種類</label>
                        <select id="cep-flare-type" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            ${Object.entries(this.lensFlareTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">強度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-flare-intensity" min="0" max="1" step="0.01" value="0.5">
                            <input type="text" class="cep-value" id="cep-flare-intensity-val" value="50%">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">位置</label>
                        <div style="display:flex; gap:4px; flex:1;">
                            <div style="flex:1;">
                                <input type="range" class="cep-slider" id="cep-flare-pos-x" min="0" max="1" step="0.01" value="0.7">
                                <span style="font-size:8px; color:#888;">X</span>
                            </div>
                            <div style="flex:1;">
                                <input type="range" class="cep-slider" id="cep-flare-pos-y" min="0" max="1" step="0.01" value="0.3">
                                <span style="font-size:8px; color:#888;">Y</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ハロー効果 -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>👼</span>
                        <span>ハロー効果</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">ハロー有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-halo-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">種類</label>
                        <select id="cep-halo-type" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            ${Object.entries(this.haloTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">強度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-halo-intensity" min="0" max="1" step="0.01" value="0.5">
                            <input type="text" class="cep-value" id="cep-halo-intensity-val" value="50%">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">サイズ</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-halo-size" min="50" max="300" value="100">
                            <input type="text" class="cep-value" id="cep-halo-size-val" value="100px">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- トラップコード風 -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>💫</span>
                        <span>トラップコード風</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">効果有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-trapcode-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">種類</label>
                        <select id="cep-trapcode-type" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            ${Object.entries(this.trapCodeTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">強度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-trapcode-intensity" min="0" max="1" step="0.01" value="0.5">
                            <input type="text" class="cep-value" id="cep-trapcode-intensity-val" value="50%">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- グラデーション -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>🌈</span>
                        <span>グラデーション</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">グラデ有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-gradient-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    
                    <!-- グラデーションプリセット -->
                    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:8px;">
                        ${Object.entries(this.gradientPresets).map(([key, preset]) => `
                            <div class="cep-gradient-preset" data-preset="${key}" 
                                 style="padding:4px; text-align:center; background:linear-gradient(135deg, ${preset.colors.join(', ')}); 
                                        border-radius:4px; cursor:pointer; font-size:8px; color:white; text-shadow:0 1px 2px rgba(0,0,0,0.5);">
                                ${preset.name.split(' ')[0]}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="cep-row">
                        <label class="cep-label">種類</label>
                        <select id="cep-gradient-type" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            ${Object.entries(this.gradientTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">角度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-gradient-angle" min="0" max="360" value="45">
                            <input type="text" class="cep-value" id="cep-gradient-angle-val" value="45°">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">ブレンド</label>
                        <select id="cep-gradient-blend" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:4px; border-radius:4px; font-size:10px;">
                            <option value="overlay">オーバーレイ</option>
                            <option value="multiply">乗算</option>
                            <option value="screen">スクリーン</option>
                            <option value="soft-light">ソフトライト</option>
                            <option value="hard-light">ハードライト</option>
                            <option value="color-dodge">覆い焼き</option>
                            <option value="color-burn">焼き込み</option>
                        </select>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">不透明度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-gradient-opacity" min="0" max="1" step="0.01" value="0.3">
                            <input type="text" class="cep-value" id="cep-gradient-opacity-val" value="30%">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- モーションブラー -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>💨</span>
                        <span>モーションブラー</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">ブラー有効</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-motion-blur-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">強度</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-motion-blur-intensity" min="0" max="1" step="0.01" value="0.5">
                            <input type="text" class="cep-value" id="cep-motion-blur-intensity-val" value="50%">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">方向</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-motion-blur-direction" min="0" max="360" value="0">
                            <input type="text" class="cep-value" id="cep-motion-blur-direction-val" value="0°">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- スタイライズ -->
            <div class="cep-section">
                <div class="cep-section-header">
                    <div class="cep-section-title">
                        <span>🎭</span>
                        <span>スタイライズ</span>
                    </div>
                    <span class="cep-section-toggle">▼</span>
                </div>
                <div class="cep-section-body">
                    <div class="cep-row">
                        <label class="cep-label">階調</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-posterize" min="0" max="8" value="0">
                            <input type="text" class="cep-value" id="cep-posterize-val" value="OFF">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">ピクセル化</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-pixelate" min="0" max="16" value="0">
                            <input type="text" class="cep-value" id="cep-pixelate-val" value="OFF">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">アウトライン</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-outline-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">線の太さ</label>
                        <div class="cep-slider-container">
                            <input type="range" class="cep-slider" id="cep-outline-thickness" min="0.5" max="4" step="0.5" value="1">
                            <input type="text" class="cep-value" id="cep-outline-thickness-val" value="1px">
                        </div>
                    </div>
                    <div class="cep-row">
                        <label class="cep-label">ディザ</label>
                        <label class="cep-toggle">
                            <input type="checkbox" id="cep-dither-enabled">
                            <span class="cep-toggle-slider"></span>
                        </label>
                        <select id="cep-dither-pattern" style="width:80px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#4ecdc4; padding:2px; border-radius:4px; font-size:9px;">
                            <option value="bayer4">Bayer 4x4</option>
                            <option value="bayer8">Bayer 8x8</option>
                            <option value="noise">ノイズ</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupExtendedEvents() {
        // 拡張プリセット選択
        document.querySelectorAll('.cep-preset[data-extended="true"]').forEach(preset => {
            preset.addEventListener('click', () => {
                const presetKey = preset.dataset.preset;
                this.applyExtendedPreset(presetKey);
                document.querySelectorAll('.cep-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });
        
        // セクション折りたたみ
        document.querySelectorAll('.cep-section-header').forEach(header => {
            if (!header.hasAttribute('data-listener-added')) {
                header.setAttribute('data-listener-added', 'true');
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('collapsed');
                });
            }
        });
        
        // グロー効果
        this.setupToggle('glow-enabled', 'glowEnabled', () => this.applyGlow());
        this.setupSelect('glow-type', 'glowType', () => this.applyGlow());
        this.setupSlider('glow-intensity', 'glowIntensity', v => `${Math.round(v * 100)}%`, () => this.applyGlow());
        document.getElementById('cep-glow-color')?.addEventListener('input', (e) => {
            this.extendedSettings.glowColor = e.target.value;
            this.applyGlow();
        });
        document.getElementById('cep-glow-radius')?.addEventListener('input', (e) => {
            this.extendedSettings.glowRadius = parseInt(e.target.value);
            this.applyGlow();
        });
        
        // レンズフレア
        this.setupToggle('flare-enabled', 'lensFlareEnabled', () => this.applyLensFlare());
        this.setupSelect('flare-type', 'lensFlareType', () => this.applyLensFlare());
        this.setupSlider('flare-intensity', 'lensFlareIntensity', v => `${Math.round(v * 100)}%`, () => this.applyLensFlare());
        document.getElementById('cep-flare-pos-x')?.addEventListener('input', (e) => {
            this.extendedSettings.lensFlarePosition.x = parseFloat(e.target.value);
            this.applyLensFlare();
        });
        document.getElementById('cep-flare-pos-y')?.addEventListener('input', (e) => {
            this.extendedSettings.lensFlarePosition.y = parseFloat(e.target.value);
            this.applyLensFlare();
        });
        
        // ハロー効果
        this.setupToggle('halo-enabled', 'haloEnabled', () => this.applyHalo());
        this.setupSelect('halo-type', 'haloType', () => this.applyHalo());
        this.setupSlider('halo-intensity', 'haloIntensity', v => `${Math.round(v * 100)}%`, () => this.applyHalo());
        this.setupSlider('halo-size', 'haloSize', v => `${v}px`, () => this.applyHalo());
        
        // トラップコード風
        this.setupToggle('trapcode-enabled', 'trapCodeEnabled', () => this.applyTrapCode());
        this.setupSelect('trapcode-type', 'trapCodeType', () => this.applyTrapCode());
        this.setupSlider('trapcode-intensity', 'trapCodeIntensity', v => `${Math.round(v * 100)}%`, () => this.applyTrapCode());
        
        // グラデーション
        this.setupToggle('gradient-enabled', 'gradientEnabled', () => this.applyGradient());
        this.setupSelect('gradient-type', 'gradientType', () => this.applyGradient());
        this.setupSlider('gradient-angle', 'gradientAngle', v => `${v}°`, () => this.applyGradient());
        this.setupSelect('gradient-blend', 'gradientBlendMode', () => this.applyGradient());
        this.setupSlider('gradient-opacity', 'gradientOpacity', v => `${Math.round(v * 100)}%`, () => this.applyGradient());
        
        // グラデーションプリセット
        document.querySelectorAll('.cep-gradient-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const key = preset.dataset.preset;
                const gradPreset = this.gradientPresets[key];
                if (gradPreset) {
                    this.extendedSettings.gradientColors = [...gradPreset.colors];
                    this.applyGradient();
                }
            });
        });
        
        // モーションブラー
        this.setupToggle('motion-blur-enabled', 'motionBlurEnabled', () => this.applyMotionBlur());
        this.setupSlider('motion-blur-intensity', 'motionBlurIntensity', v => `${Math.round(v * 100)}%`, () => this.applyMotionBlur());
        this.setupSlider('motion-blur-direction', 'motionBlurDirection', v => `${v}°`, () => this.applyMotionBlur());
        
        // スタイライズ
        this.setupSlider('posterize', 'posterizeLevels', v => v === 0 ? 'OFF' : `${v}段階`, () => this.applyStylize());
        this.setupSlider('pixelate', 'pixelateSize', v => v === 0 ? 'OFF' : `${v}px`, () => this.applyStylize());
        this.setupToggle('outline-enabled', 'outlineEnabled', () => this.applyStylize());
        this.setupSlider('outline-thickness', 'outlineThickness', v => `${v}px`, () => this.applyStylize());
        this.setupToggle('dither-enabled', 'ditherEnabled', () => this.applyStylize());
        this.setupSelect('dither-pattern', 'ditherPattern', () => this.applyStylize());
    }
    
    setupSlider(id, settingKey, formatFn, callback) {
        const slider = document.getElementById(`cep-${id}`);
        const valueInput = document.getElementById(`cep-${id}-val`);
        
        if (!slider) return;
        
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            this.extendedSettings[settingKey] = value;
            if (valueInput) valueInput.value = formatFn(value);
            if (callback) callback();
        });
        
        if (valueInput) {
            valueInput.addEventListener('change', () => {
                let value = parseFloat(valueInput.value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(value)) {
                    value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), value));
                    this.extendedSettings[settingKey] = value;
                    slider.value = value;
                    valueInput.value = formatFn(value);
                    if (callback) callback();
                }
            });
        }
    }
    
    setupToggle(id, settingKey, callback) {
        const toggle = document.getElementById(`cep-${id}`);
        if (!toggle) return;
        
        toggle.addEventListener('change', () => {
            this.extendedSettings[settingKey] = toggle.checked;
            if (callback) callback();
        });
    }
    
    setupSelect(id, settingKey, callback) {
        const select = document.getElementById(`cep-${id}`);
        if (!select) return;
        
        select.addEventListener('change', () => {
            this.extendedSettings[settingKey] = select.value;
            if (callback) callback();
        });
    }
    
    applyExtendedPreset(presetKey) {
        const preset = this.extendedPresets[presetKey];
        if (!preset) return;
        
        // 基本設定をカメラエフェクトパネルに適用
        if (this.panel && this.panel.settings) {
            Object.keys(preset).forEach(key => {
                if (key !== 'name' && key !== 'extSettings' && this.panel.settings.hasOwnProperty(key)) {
                    this.panel.settings[key] = preset[key];
                }
            });
            this.panel.updateUIFromSettings();
            this.panel.applyEffects();
        }
        
        // 拡張設定を適用
        if (preset.extSettings) {
            Object.assign(this.extendedSettings, preset.extSettings);
            this.updateExtendedUI();
            this.applyAllExtendedEffects();
        }
        
        console.log(`🎨 Extended preset applied: ${preset.name}`);
    }
    
    updateExtendedUI() {
        // 各UI要素を更新
        const updates = [
            ['posterize', this.extendedSettings.posterizeLevels],
            ['pixelate', this.extendedSettings.pixelateSize],
            ['outline-thickness', this.extendedSettings.outlineThickness]
        ];
        
        updates.forEach(([id, value]) => {
            const slider = document.getElementById(`cep-${id}`);
            if (slider) slider.value = value;
        });
        
        const toggles = [
            ['outline-enabled', this.extendedSettings.outlineEnabled],
            ['dither-enabled', this.extendedSettings.ditherEnabled]
        ];
        
        toggles.forEach(([id, value]) => {
            const toggle = document.getElementById(`cep-${id}`);
            if (toggle) toggle.checked = value;
        });
    }
    
    applyAllExtendedEffects() {
        this.applyGlow();
        this.applyLensFlare();
        this.applyHalo();
        this.applyTrapCode();
        this.applyGradient();
        this.applyMotionBlur();
        this.applyStylize();
    }
    
    // グロー効果
    applyGlow() {
        let overlay = this.getOrCreateOverlay('glow');
        
        if (this.extendedSettings.glowEnabled) {
            const type = this.glowTypes[this.extendedSettings.glowType];
            const intensity = this.extendedSettings.glowIntensity;
            const color = this.extendedSettings.glowColor;
            const radius = this.extendedSettings.glowRadius;
            
            overlay.style.display = 'block';
            overlay.style.background = `radial-gradient(ellipse at center, ${color}${Math.round(intensity * 60).toString(16).padStart(2, '0')} 0%, transparent 70%)`;
            overlay.style.filter = `blur(${radius}px)`;
            overlay.style.mixBlendMode = 'screen';
            overlay.style.opacity = intensity;
            
            // アニメーション
            if (type.animated) {
                overlay.style.animation = 'glowPulse 2s ease-in-out infinite';
            } else {
                overlay.style.animation = 'none';
            }
            
            // レインボー
            if (type.rainbow) {
                overlay.style.animation = 'glowRainbow 5s linear infinite';
            }
        } else {
            overlay.style.display = 'none';
        }
    }
    
    // レンズフレア
    applyLensFlare() {
        let overlay = this.getOrCreateOverlay('lensflare');
        
        if (this.extendedSettings.lensFlareEnabled) {
            const type = this.lensFlareTypes[this.extendedSettings.lensFlareType];
            const intensity = this.extendedSettings.lensFlareIntensity;
            const pos = this.extendedSettings.lensFlarePosition;
            
            overlay.style.display = 'block';
            overlay.innerHTML = '';
            
            // フレア要素を生成
            const numElements = type.elements || 5;
            for (let i = 0; i < numElements; i++) {
                const flare = document.createElement('div');
                const progress = i / (numElements - 1);
                const x = pos.x + (0.5 - pos.x) * progress * 2;
                const y = pos.y + (0.5 - pos.y) * progress * 2;
                const size = 20 + Math.random() * 60;
                const opacity = (1 - Math.abs(progress - 0.5) * 2) * intensity;
                
                flare.style.cssText = `
                    position: absolute;
                    left: ${x * 100}%;
                    top: ${y * 100}%;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle, rgba(255,255,255,${opacity}) 0%, transparent 70%);
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    pointer-events: none;
                `;
                
                overlay.appendChild(flare);
            }
            
            // アナモルフィック（水平方向のストリーク）
            if (type.horizontal) {
                const streak = document.createElement('div');
                streak.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: ${pos.y * 100}%;
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(90deg, transparent, rgba(135,206,250,${intensity}), rgba(255,255,255,${intensity}), rgba(135,206,250,${intensity}), transparent);
                    transform: translateY(-50%);
                    filter: blur(2px);
                `;
                overlay.appendChild(streak);
            }
        } else {
            overlay.style.display = 'none';
        }
    }
    
    // ハロー効果
    applyHalo() {
        let overlay = this.getOrCreateOverlay('halo');
        
        if (this.extendedSettings.haloEnabled) {
            const type = this.haloTypes[this.extendedSettings.haloType];
            const intensity = this.extendedSettings.haloIntensity;
            const size = this.extendedSettings.haloSize;
            
            overlay.style.display = 'block';
            
            let color = 'rgba(255, 255, 255, ' + intensity + ')';
            if (type.golden) {
                color = `rgba(255, 215, 0, ${intensity})`;
            }
            
            overlay.style.background = `radial-gradient(circle at 50% 30%, ${color} 0%, transparent ${size}px)`;
            overlay.style.filter = `blur(${type.blur}px)`;
            overlay.style.mixBlendMode = 'screen';
            
            if (type.rainbow) {
                overlay.style.background = `
                    radial-gradient(circle at 50% 30%, 
                        rgba(255,0,0,${intensity * 0.3}) 0%, 
                        rgba(255,165,0,${intensity * 0.3}) 20%, 
                        rgba(255,255,0,${intensity * 0.3}) 40%, 
                        rgba(0,255,0,${intensity * 0.3}) 60%, 
                        rgba(0,0,255,${intensity * 0.3}) 80%, 
                        transparent ${size}px
                    )`;
            }
            
            if (type.pulsate) {
                overlay.style.animation = 'haloPulse 3s ease-in-out infinite';
            } else {
                overlay.style.animation = 'none';
            }
        } else {
            overlay.style.display = 'none';
        }
    }
    
    // トラップコード風効果
    applyTrapCode() {
        let overlay = this.getOrCreateOverlay('trapcode');
        
        if (this.extendedSettings.trapCodeEnabled) {
            const type = this.trapCodeTypes[this.extendedSettings.trapCodeType];
            const intensity = this.extendedSettings.trapCodeIntensity;
            
            overlay.style.display = 'block';
            overlay.innerHTML = '';
            
            // 光線効果
            if (type.rays || type.directional) {
                const rays = document.createElement('div');
                rays.style.cssText = `
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: conic-gradient(from 0deg at 50% 30%, 
                        transparent 0deg, 
                        rgba(255,255,255,${intensity * 0.2}) 10deg, 
                        transparent 20deg,
                        transparent 40deg,
                        rgba(255,255,255,${intensity * 0.15}) 50deg,
                        transparent 60deg,
                        transparent 80deg,
                        rgba(255,255,255,${intensity * 0.1}) 90deg,
                        transparent 100deg
                    );
                    filter: blur(10px);
                    mix-blend-mode: screen;
                `;
                if (type.directional) {
                    rays.style.transform = 'rotate(30deg)';
                }
                overlay.appendChild(rays);
            }
            
            // スター効果
            if (type.star) {
                const star = document.createElement('div');
                star.style.cssText = `
                    position: absolute;
                    top: 30%; left: 50%;
                    width: 100px; height: 100px;
                    transform: translate(-50%, -50%);
                    background: radial-gradient(circle, rgba(255,255,255,${intensity}) 0%, transparent 50%);
                    filter: blur(5px);
                `;
                overlay.appendChild(star);
                
                // スター光線
                for (let i = 0; i < 6; i++) {
                    const ray = document.createElement('div');
                    const angle = (i / 6) * 360;
                    ray.style.cssText = `
                        position: absolute;
                        top: 30%; left: 50%;
                        width: 200px; height: 2px;
                        background: linear-gradient(90deg, rgba(255,255,255,${intensity}) 0%, transparent 100%);
                        transform-origin: left center;
                        transform: rotate(${angle}deg);
                        filter: blur(1px);
                    `;
                    overlay.appendChild(ray);
                }
            }
            
            // シマー効果
            if (type.shimmer) {
                overlay.style.animation = 'shimmer 2s ease-in-out infinite';
            }
        } else {
            overlay.style.display = 'none';
        }
    }
    
    // グラデーション効果
    applyGradient() {
        let overlay = this.getOrCreateOverlay('gradient');
        
        if (this.extendedSettings.gradientEnabled) {
            const type = this.extendedSettings.gradientType;
            const colors = this.extendedSettings.gradientColors;
            const angle = this.extendedSettings.gradientAngle;
            const blendMode = this.extendedSettings.gradientBlendMode;
            const opacity = this.extendedSettings.gradientOpacity;
            
            overlay.style.display = 'block';
            
            let gradient;
            switch (type) {
                case 'linear':
                    gradient = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
                    break;
                case 'radial':
                    gradient = `radial-gradient(circle at center, ${colors.join(', ')})`;
                    break;
                case 'angular':
                    gradient = `conic-gradient(from ${angle}deg at center, ${colors.join(', ')}, ${colors[0]})`;
                    break;
                case 'diamond':
                    gradient = `conic-gradient(from ${angle}deg at center, ${colors.join(', ')}, ${colors[0]})`;
                    overlay.style.transform = 'rotate(45deg) scale(1.5)';
                    break;
                default:
                    gradient = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
            }
            
            overlay.style.background = gradient;
            overlay.style.mixBlendMode = blendMode;
            overlay.style.opacity = opacity;
        } else {
            overlay.style.display = 'none';
        }
    }
    
    // モーションブラー
    applyMotionBlur() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;
        
        if (this.extendedSettings.motionBlurEnabled) {
            const intensity = this.extendedSettings.motionBlurIntensity;
            const direction = this.extendedSettings.motionBlurDirection;
            const blurAmount = intensity * 10;
            
            // 方向に基づいたブラー
            const radians = direction * Math.PI / 180;
            const x = Math.cos(radians) * blurAmount;
            const y = Math.sin(radians) * blurAmount;
            
            // SVGフィルターで方向性ブラーを作成
            let svgFilter = document.getElementById('cep-motion-blur-svg');
            if (!svgFilter) {
                svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgFilter.id = 'cep-motion-blur-svg';
                svgFilter.style.cssText = 'position: absolute; width: 0; height: 0;';
                document.body.appendChild(svgFilter);
            }
            
            svgFilter.innerHTML = `
                <defs>
                    <filter id="cep-motion-blur-filter">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="${Math.abs(x)},${Math.abs(y)}"/>
                    </filter>
                </defs>
            `;
            
            const currentFilter = canvas.style.filter || '';
            if (!currentFilter.includes('url(#cep-motion-blur-filter)')) {
                canvas.style.filter = `${currentFilter} url(#cep-motion-blur-filter)`;
            }
        } else {
            const canvas = document.querySelector('#canvas-container canvas');
            if (canvas) {
                canvas.style.filter = canvas.style.filter.replace(/url\(#cep-motion-blur-filter\)\s*/g, '');
            }
        }
    }
    
    // スタイライズ効果（階調、ピクセル化、アウトライン、ディザ）
    applyStylize() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;
        
        // SVGフィルターを構築
        let svgFilter = document.getElementById('cep-stylize-svg');
        if (!svgFilter) {
            svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgFilter.id = 'cep-stylize-svg';
            svgFilter.style.cssText = 'position: absolute; width: 0; height: 0;';
            document.body.appendChild(svgFilter);
        }
        
        let filterContent = '';
        
        // 階調化（ポスタリゼーション）
        if (this.extendedSettings.posterizeLevels > 0) {
            const levels = this.extendedSettings.posterizeLevels;
            const step = 1 / levels;
            let tableValues = '';
            for (let i = 0; i <= levels; i++) {
                tableValues += (Math.round(i / levels * levels) / levels) + ' ';
            }
            filterContent += `
                <feComponentTransfer>
                    <feFuncR type="discrete" tableValues="${tableValues}"/>
                    <feFuncG type="discrete" tableValues="${tableValues}"/>
                    <feFuncB type="discrete" tableValues="${tableValues}"/>
                </feComponentTransfer>
            `;
        }
        
        // アウトライン（エッジ検出）
        if (this.extendedSettings.outlineEnabled) {
            const thickness = this.extendedSettings.outlineThickness;
            filterContent += `
                <feConvolveMatrix 
                    order="3" 
                    kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
                    result="edges"/>
                <feComposite in="SourceGraphic" in2="edges" operator="over"/>
            `;
        }
        
        if (filterContent) {
            svgFilter.innerHTML = `
                <defs>
                    <filter id="cep-stylize-filter">
                        ${filterContent}
                    </filter>
                </defs>
            `;
            
            const currentFilter = canvas.style.filter || '';
            if (!currentFilter.includes('url(#cep-stylize-filter)')) {
                canvas.style.filter = `${currentFilter} url(#cep-stylize-filter)`;
            }
        } else {
            canvas.style.filter = canvas.style.filter.replace(/url\(#cep-stylize-filter\)\s*/g, '');
        }
        
        // ピクセル化（CSS image-renderingで対応）
        if (this.extendedSettings.pixelateSize > 0) {
            const size = this.extendedSettings.pixelateSize;
            canvas.style.imageRendering = 'pixelated';
            canvas.style.transform = `scale(${size})`;
            canvas.style.transformOrigin = 'center';
        } else {
            canvas.style.imageRendering = 'auto';
            canvas.style.transform = '';
        }
    }
    
    getOrCreateOverlay(name) {
        if (!this.overlays[name]) {
            const overlay = document.createElement('div');
            overlay.id = `cep-${name}-overlay`;
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 102;
                display: none;
            `;
            document.body.appendChild(overlay);
            this.overlays[name] = overlay;
        }
        return this.overlays[name];
    }
    
    // CSSアニメーション追加
    addAnimationStyles() {
        if (document.getElementById('cep-extended-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'cep-extended-animations';
        style.textContent = `
            @keyframes glowPulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.7; }
            }
            
            @keyframes glowRainbow {
                0% { filter: hue-rotate(0deg) blur(20px); }
                100% { filter: hue-rotate(360deg) blur(20px); }
            }
            
            @keyframes haloPulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            @keyframes shimmer {
                0% { filter: brightness(1) blur(10px); }
                50% { filter: brightness(1.3) blur(15px); }
                100% { filter: brightness(1) blur(10px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    getSettings() {
        return { ...this.extendedSettings };
    }
    
    setSettings(newSettings) {
        Object.assign(this.extendedSettings, newSettings);
        this.updateExtendedUI();
        this.applyAllExtendedEffects();
    }
    
    resetToDefault() {
        // 拡張設定をデフォルトに戻す
        this.extendedSettings = {
            posterizeLevels: 0,
            pixelateSize: 0,
            outlineEnabled: false,
            outlineThickness: 1,
            outlineColor: '#000000',
            ditherEnabled: false,
            ditherPattern: 'bayer4',
            colorPalette: 'full',
            glowEnabled: false,
            glowType: 'soft',
            glowIntensity: 0.5,
            glowColor: '#ffffff',
            glowRadius: 20,
            lensFlareEnabled: false,
            lensFlareType: 'cinematic',
            lensFlareIntensity: 0.5,
            lensFlarePosition: { x: 0.7, y: 0.3 },
            haloEnabled: false,
            haloType: 'soft',
            haloIntensity: 0.5,
            haloSize: 100,
            trapCodeEnabled: false,
            trapCodeType: 'shine',
            trapCodeIntensity: 0.5,
            gradientEnabled: false,
            gradientType: 'linear',
            gradientColors: ['#ff6b6b', '#4ecdc4'],
            gradientAngle: 45,
            gradientBlendMode: 'overlay',
            gradientOpacity: 0.3,
            motionBlurEnabled: false,
            motionBlurIntensity: 0.5,
            motionBlurDirection: 0,
            motionBlurSamples: 8
        };
        
        // UIを更新
        this.updateExtendedUI();
        
        // トグルを全てOFFに
        const toggleIds = [
            'cep-glow-enabled', 'cep-flare-enabled', 'cep-halo-enabled',
            'cep-trapcode-enabled', 'cep-gradient-enabled', 'cep-motion-blur-enabled',
            'cep-outline-enabled', 'cep-dither-enabled'
        ];
        toggleIds.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) toggle.checked = false;
        });
        
        // スライダーをデフォルト値に
        const sliderDefaults = {
            'cep-glow-intensity': 0.5,
            'cep-flare-intensity': 0.5,
            'cep-halo-intensity': 0.5,
            'cep-halo-size': 100,
            'cep-trapcode-intensity': 0.5,
            'cep-gradient-angle': 45,
            'cep-gradient-opacity': 0.3,
            'cep-motion-blur-intensity': 0.5,
            'cep-motion-blur-direction': 0,
            'cep-posterize': 0,
            'cep-pixelate': 0,
            'cep-outline-thickness': 1
        };
        Object.entries(sliderDefaults).forEach(([id, value]) => {
            const slider = document.getElementById(id);
            if (slider) slider.value = value;
        });
        
        // 値表示もリセット
        const valueDefaults = {
            'cep-glow-intensity-val': '50%',
            'cep-flare-intensity-val': '50%',
            'cep-halo-intensity-val': '50%',
            'cep-halo-size-val': '100px',
            'cep-trapcode-intensity-val': '50%',
            'cep-gradient-angle-val': '45°',
            'cep-gradient-opacity-val': '30%',
            'cep-motion-blur-intensity-val': '50%',
            'cep-motion-blur-direction-val': '0°',
            'cep-posterize-val': 'OFF',
            'cep-pixelate-val': 'OFF',
            'cep-outline-thickness-val': '1px'
        };
        Object.entries(valueDefaults).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
        // オーバーレイを非表示
        Object.values(this.overlays).forEach(overlay => {
            if (overlay) overlay.style.display = 'none';
        });
        
        console.log('🔄 Extended effects reset to default');
    }
    
    /**
     * 全ての拡張エフェクトをクリア（プリセット切り替え時に使用）
     * UIはリセットせず、エフェクトのみをクリアする
     */
    clearAllEffects() {
        // 全てのエフェクトを無効化
        this.extendedSettings.glowEnabled = false;
        this.extendedSettings.lensFlareEnabled = false;
        this.extendedSettings.haloEnabled = false;
        this.extendedSettings.trapCodeEnabled = false;
        this.extendedSettings.gradientEnabled = false;
        this.extendedSettings.motionBlurEnabled = false;
        this.extendedSettings.outlineEnabled = false;
        this.extendedSettings.ditherEnabled = false;
        this.extendedSettings.posterizeLevels = 0;
        this.extendedSettings.pixelateSize = 0;
        
        // オーバーレイを非表示にし、内容をクリア
        Object.values(this.overlays).forEach(overlay => {
            if (overlay) {
                overlay.style.display = 'none';
                overlay.innerHTML = '';
                overlay.style.background = '';
                overlay.style.filter = '';
                overlay.style.animation = '';
                overlay.style.opacity = '';
            }
        });
        
        // SVGフィルターを除去
        const motionBlurSvg = document.getElementById('cep-motion-blur-svg');
        if (motionBlurSvg) motionBlurSvg.remove();
        
        const stylizeSvg = document.getElementById('cep-stylize-svg');
        if (stylizeSvg) stylizeSvg.remove();
        
        // キャンバスのフィルターからモーションブラーとスタイライズを除去
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.style.filter = canvas.style.filter
                .replace(/url\(#cep-motion-blur-filter\)\s*/g, '')
                .replace(/url\(#cep-stylize-filter\)\s*/g, '');
            canvas.style.imageRendering = 'auto';
            canvas.style.transform = '';
        }
        
        // UIのトグルをOFFに
        const toggleIds = [
            'cep-glow-enabled', 'cep-flare-enabled', 'cep-halo-enabled',
            'cep-trapcode-enabled', 'cep-gradient-enabled', 'cep-motion-blur-enabled',
            'cep-outline-enabled', 'cep-dither-enabled'
        ];
        toggleIds.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) toggle.checked = false;
        });
        
        // スタイライズのスライダーをリセット
        const posterizeSlider = document.getElementById('cep-posterize');
        const posterizeVal = document.getElementById('cep-posterize-val');
        if (posterizeSlider) posterizeSlider.value = 0;
        if (posterizeVal) posterizeVal.value = 'OFF';
        
        const pixelateSlider = document.getElementById('cep-pixelate');
        const pixelateVal = document.getElementById('cep-pixelate-val');
        if (pixelateSlider) pixelateSlider.value = 0;
        if (pixelateVal) pixelateVal.value = 'OFF';
        
        console.log('🧹 All extended effects cleared');
    }
}

// グローバルインスタンス
window.cameraEffectsExtended = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.cameraEffectsPanel) {
            window.cameraEffectsExtended = new CameraEffectsExtended();
            window.cameraEffectsExtended.addAnimationStyles();
            window.cameraEffectsExtended.init(window.cameraEffectsPanel);
            console.log('✅ Camera Effects Extended initialized');
        } else {
            console.warn('⚠️ Camera Effects Panel not found, Extended module delayed');
            // リトライ
            setTimeout(() => {
                if (window.cameraEffectsPanel) {
                    window.cameraEffectsExtended = new CameraEffectsExtended();
                    window.cameraEffectsExtended.addAnimationStyles();
                    window.cameraEffectsExtended.init(window.cameraEffectsPanel);
                    console.log('✅ Camera Effects Extended initialized (retry)');
                }
            }, 1000);
        }
    }, 600);
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraEffectsExtended;
}
