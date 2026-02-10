// ========================================
// Grok Voice Tool Restrictions UI v3.0
// プロンプトに「使わないで」と伝えるだけ方式
// ========================================

(function() {
    'use strict';

    const RESTRICTION_DEFS = [
        { id: 'movement',             label: '🚶 移動行動',          desc: 'control_behavior' },
        { id: 'boneDeform',           label: '🦴 ボーン変形',        desc: 'change_body_shape, apply_body_preset' },
        { id: 'clothingTransparency', label: '👗 服の透明変形',      desc: 'change_clothing' },
        { id: 'objectSpawn',          label: '📦 3Dオブジェクト生成', desc: 'spawn_object, spawn_ai_object' },
        { id: 'imageGeneration',      label: '🎨 AI画像生成',        desc: 'generate_and_show_image' },
        { id: 'tripo3d',              label: '🧊 Tripo 3Dモデル生成', desc: 'generate_3d_model' }
    ];

    class GrokToolRestrictions {
        constructor() {
            this.settings = {};
            this.panel = null;
            this.loadSettings();
            this.createPanel();
            console.log('🔒 Grok Tool Restrictions v3.0 初期化完了');
        }

        // ---- 設定 ----
        loadSettings() {
            try {
                const saved = localStorage.getItem('grok_tool_restrictions_v1');
                if (saved) this.settings = JSON.parse(saved);
            } catch (e) {}
            for (const d of RESTRICTION_DEFS) {
                if (this.settings[d.id] === undefined) this.settings[d.id] = true;
            }
        }
        saveSettings() {
            localStorage.setItem('grok_tool_restrictions_v1', JSON.stringify(this.settings));
        }

        // ---- 制限プロンプト文を生成（sendSessionConfigに追加される） ----
        getRestrictionPrompt() {
            const offItems = RESTRICTION_DEFS.filter(d => !this.settings[d.id]);
            if (offItems.length === 0) return '';
            const list = offItems.map(d => `・${d.label}（${d.desc}）`).join('\n');
            return `\n\n【⚠️ 機能制限 - 絶対に守ること】\n以下の機能はユーザーにより無効化されています。これらのツールは絶対に使わないでください！\n${list}\nこれらの機能を使おうとしたり求められたりしても「ごめんね、今その機能は制限されてるみたい！」と伝えてください。\n他の制限されていない機能は自由に使ってOKです。`;
        }

        // ---- 設定変更時にGrokセッションを再送信 ----
        applyToGrok() {
            const client = window.grokRealtimeClient;
            if (client && client.isConnected && client.ws) {
                client.sendSessionConfig();
                console.log('🔒 Grokセッション再送信（制限反映）');
            }
        }

        // ---- UI ----
        createPanel() {
            if (!document.getElementById('grok-restriction-styles')) {
                const style = document.createElement('style');
                style.id = 'grok-restriction-styles';
                style.textContent = `
                    .grok-restr-toggle { position:relative; display:inline-block; width:44px; height:24px; cursor:pointer; }
                    .grok-restr-toggle input { opacity:0; width:0; height:0; }
                    .grok-restr-toggle .slider { position:absolute; top:0; left:0; right:0; bottom:0; background:#555; border-radius:24px; transition:background 0.25s; }
                    .grok-restr-toggle .slider::before { content:""; position:absolute; width:18px; height:18px; left:3px; bottom:3px; background:white; border-radius:50%; transition:transform 0.25s; }
                    .grok-restr-toggle input:checked + .slider { background:#4caf50; }
                    .grok-restr-toggle input:checked + .slider::before { transform:translateX(20px); }
                `;
                document.head.appendChild(style);
            }

            const panel = document.createElement('div');
            panel.id = 'grok-restriction-panel';
            panel.style.cssText = `
                position:fixed; top:80px; right:20px; width:270px;
                background:rgba(20,15,35,0.95); border-radius:14px;
                border:1px solid rgba(255,255,255,0.12);
                box-shadow:0 8px 32px rgba(0,0,0,0.5);
                font-family:'Segoe UI','Yu Gothic UI',sans-serif;
                z-index:9800; display:none; overflow:hidden;
                backdrop-filter:blur(12px);
            `;

            const header = document.createElement('div');
            header.style.cssText = `background:linear-gradient(135deg,#e53935,#ff6f00); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:move; user-select:none;`;
            header.innerHTML = `
                <span style="color:white;font-weight:bold;font-size:13px;">🔒 Grok 機能制限</span>
                <div style="display:flex;gap:6px;">
                    <button id="grok-restr-min" style="background:rgba(255,255,255,0.2);border:none;color:white;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px;">−</button>
                    <button id="grok-restr-close" style="background:rgba(255,255,255,0.2);border:none;color:white;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px;">×</button>
                </div>
            `;
            panel.appendChild(header);

            const content = document.createElement('div');
            content.id = 'grok-restriction-content';
            content.style.cssText = 'padding:8px 10px 10px;';

            const bulk = document.createElement('div');
            bulk.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
            bulk.innerHTML = `
                <button id="grok-restr-all-on" style="flex:1;padding:5px;border:none;border-radius:6px;background:#4caf50;color:white;cursor:pointer;font-size:11px;font-weight:bold;">✅ 全てON</button>
                <button id="grok-restr-all-off" style="flex:1;padding:5px;border:none;border-radius:6px;background:#e53935;color:white;cursor:pointer;font-size:11px;font-weight:bold;">🚫 全てOFF</button>
            `;
            content.appendChild(bulk);

            for (const d of RESTRICTION_DEFS) {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 8px;margin-bottom:3px;border-radius:8px;background:rgba(255,255,255,0.04);';
                row.innerHTML = `
                    <div style="color:#eee;font-size:12.5px;font-weight:600;">${d.label}</div>
                    <label class="grok-restr-toggle">
                        <input type="checkbox" data-id="${d.id}" ${this.settings[d.id] ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                const cb = row.querySelector('input');
                cb.addEventListener('change', () => {
                    this.settings[d.id] = cb.checked;
                    this.saveSettings();
                    this.updateStatus();
                    this.applyToGrok();
                });
                content.appendChild(row);
            }

            const status = document.createElement('div');
            status.id = 'grok-restriction-status';
            status.style.cssText = 'margin-top:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.06);text-align:center;font-size:11px;color:#aaa;';
            content.appendChild(status);

            panel.appendChild(content);
            document.body.appendChild(panel);
            this.panel = panel;

            document.getElementById('grok-restr-close').addEventListener('click', () => this.hide());
            document.getElementById('grok-restr-min').addEventListener('click', () => {
                const c = document.getElementById('grok-restriction-content');
                const hidden = c.style.display === 'none';
                c.style.display = hidden ? '' : 'none';
                document.getElementById('grok-restr-min').textContent = hidden ? '−' : '+';
            });
            document.getElementById('grok-restr-all-on').addEventListener('click', () => this.setAll(true));
            document.getElementById('grok-restr-all-off').addEventListener('click', () => this.setAll(false));

            // ドラッグ
            let dragging = false, sx, sy, sl, st;
            header.addEventListener('mousedown', e => {
                if (e.target.tagName === 'BUTTON') return;
                dragging = true; sx = e.clientX; sy = e.clientY;
                sl = panel.offsetLeft; st = panel.offsetTop; e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                panel.style.left = Math.max(0, sl + e.clientX - sx) + 'px';
                panel.style.top = Math.max(0, st + e.clientY - sy) + 'px';
                panel.style.right = 'auto';
            });
            document.addEventListener('mouseup', () => { dragging = false; });

            this.updateStatus();
        }

        updateStatus() {
            const el = document.getElementById('grok-restriction-status');
            if (!el) return;
            const on = RESTRICTION_DEFS.filter(d => this.settings[d.id]).length;
            const total = RESTRICTION_DEFS.length;
            if (on === total) { el.textContent = '✅ 全機能有効'; el.style.color = '#4caf50'; }
            else if (on === 0) { el.textContent = '🚫 全機能制限中'; el.style.color = '#e53935'; }
            else { el.textContent = `${on}/${total} 有効 ・ ${total - on}個制限中`; el.style.color = '#ff9800'; }
        }

        setAll(enabled) {
            for (const d of RESTRICTION_DEFS) this.settings[d.id] = enabled;
            this.saveSettings();
            this.panel.querySelectorAll('input[data-id]').forEach(cb => { cb.checked = enabled; });
            this.updateStatus();
            this.applyToGrok();
        }

        show()   { if (this.panel) this.panel.style.display = 'block'; }
        hide()   { if (this.panel) this.panel.style.display = 'none'; }
        toggle() { if (this.panel) this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none'; }
    }

    function init() {
        if (window.grokToolRestrictions) return;
        window.grokToolRestrictions = new GrokToolRestrictions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 2500));
    } else {
        setTimeout(init, 2500);
    }
})();
