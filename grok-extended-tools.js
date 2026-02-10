// ========================================
// Grok Voice Extended Tools v1.3.2
// Grok Voiceが自分で操作できる全ツールの統合レイヤー
// モーション選択、オブジェクト生成、物理演算制御、
// AI 3Dモデル生成、画像生成表示、Vision Bridge連携
// ★ v1.2: 重複capture_screenツール定義修正
// ★ v1.3: 行動パネル操作ツール(control_behavior)追加
// ★ v1.3.2: MotionCleanup対応 - モーションレイヤー残留防止
// ========================================

class GrokExtendedTools {
    constructor() {
        this.motionList = [];       // 利用可能なモーション一覧
        this.motionCategories = {}; // カテゴリ分類
        this.isInitialized = false;
        
        console.log('🧰 Grok Extended Tools v1.0 初期化');
    }
    
    // ============================
    // 初期化
    // ============================
    
    async init() {
        await this.loadMotionList();
        this.isInitialized = true;
        console.log('🧰 Grok Extended Tools 準備完了');
    }
    
    /**
     * motions.jsonからモーション一覧を読み込み、カテゴリ分類
     */
    async loadMotionList() {
        try {
            const res = await fetch('/motions/motions.json');
            const data = await res.json();
            this.motionList = data.motions || [];
            
            // カテゴリ分類
            this.motionCategories = {
                'しゃべり': [],
                'セクシー': [],
                '喜び': [],
                '怒り': [],
                '悲しみ': [],
                '驚き': [],
                'ダンス': [],
                '攻撃': [],
                '移動': [],
                'リアクション': [],
                'ポーズ': [],
                'その他': []
            };
            
            this.motionList.forEach(name => {
                const n = name.replace('.vrma', '');
                let categorized = false;
                
                if (n.match(/しゃべ|話/)) { this.motionCategories['しゃべり'].push(name); categorized = true; }
                if (n.match(/セクシー|エロ|投げキッス|キッス/)) { this.motionCategories['セクシー'].push(name); categorized = true; }
                if (n.match(/喜び|喜ぶ|ガッツ|やった|ルンルン|ノリノリ|OK/)) { this.motionCategories['喜び'].push(name); categorized = true; }
                if (n.match(/怒り|怒る|イライラ|威嚇|蹴|攻撃|ディス|ふみつけ/)) { this.motionCategories['怒り'].push(name); categorized = true; }
                if (n.match(/悲し|泣|がっかり|うなだれ|いじけ|じだんだ|駄々/)) { this.motionCategories['悲しみ'].push(name); categorized = true; }
                if (n.match(/びっくり|驚|びびり|どんびき|ふっとぶ/)) { this.motionCategories['驚き'].push(name); categorized = true; }
                if (n.match(/ダンス|Kpop|ぴょんぴょん/)) { this.motionCategories['ダンス'].push(name); categorized = true; }
                if (n.match(/蹴り|回し蹴り|バク転|側転|前転|攻撃/)) { this.motionCategories['攻撃'].push(name); categorized = true; }
                if (n.match(/あるき|走り|走る|歩き/)) { this.motionCategories['移動'].push(name); categorized = true; }
                if (n.match(/リアクション|ポーズ|考える|お辞儀|仁王|筋肉|祈る|恥ずかし|否定|興味/)) { this.motionCategories['リアクション'].push(name); categorized = true; }
                
                if (!categorized) {
                    this.motionCategories['その他'].push(name);
                }
            });
            
            console.log(`🎭 モーション読み込み完了: ${this.motionList.length}個`);
            for (const [cat, motions] of Object.entries(this.motionCategories)) {
                if (motions.length > 0) {
                    console.log(`   ${cat}: ${motions.length}個`);
                }
            }
        } catch (e) {
            console.warn('⚠️ モーション一覧読み込み失敗:', e);
        }
    }
    
    // ============================
    // ツール定義（Grok session.update用）
    // ============================
    
    getToolDefinitions() {
        const tools = [];
        
        // --- モーション選択 ---
        const motionNames = this.motionList
            .map(m => m.replace('.vrma', ''))
            .slice(0, 60); // ツール定義が大きくなりすぎないよう上位60個
        
        const categoryDesc = Object.entries(this.motionCategories)
            .filter(([_, v]) => v.length > 0)
            .map(([k, v]) => `${k}(${v.length}個)`)
            .join(', ');
        
        tools.push({
            type: 'function',
            name: 'play_motion',
            description: `自分のモーション（動き/ポーズ/ダンス）を選んで再生する。会話の流れや感情に合わせて自由にモーションを選んで動こう！カテゴリ: ${categoryDesc}。キーワードでも検索できる。例: 「ダンスしたい」→category:"ダンス", 「セクシーに」→keyword:"セクシー", 直接指定も可。`,
            parameters: {
                type: 'object',
                properties: {
                    motion_name: {
                        type: 'string',
                        description: `モーション名（日本語）。部分一致で検索される。例: "投げキッス", "バク転", "喜びガッツポーズ"`
                    },
                    category: {
                        type: 'string',
                        description: 'カテゴリで選ぶ場合: しゃべり, セクシー, 喜び, 怒り, 悲しみ, 驚き, ダンス, 攻撃, 移動, リアクション, ポーズ, その他'
                    },
                    keyword: {
                        type: 'string',
                        description: 'キーワードで検索（部分一致）。例: "蹴り", "お辞儀", "セクシー"'
                    },
                    loop: {
                        type: 'boolean',
                        description: 'ループ再生するか（デフォルト: false）'
                    }
                },
                required: []
            }
        });
        
        // --- オブジェクト生成 ---
        tools.push({
            type: 'function',
            name: 'spawn_object',
            description: '3Dオブジェクト（物理演算付き）を目の前に生成する。ボール、箱、ドーナツなど様々な形状が作れる。サイズはメートル単位。',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: '形状: sphere(球), box(箱), cylinder(円柱), cone(コーン), torus(ドーナツ), capsule(カプセル), plane(板), icosahedron(多面体), octahedron(八面体), tetrahedron(四面体), torusKnot(トーラスノット)'
                    },
                    size: {
                        type: 'number',
                        description: 'サイズ（メートル単位）。0.01〜10.0。例: 0.5で50cm, 1.0で1m'
                    },
                    color: {
                        type: 'string',
                        description: '色名: red, blue, green, yellow, purple, orange, pink, white, black, gold, silver, cyan, rainbow'
                    },
                    count: {
                        type: 'number',
                        description: '生成個数（1〜20）。デフォルト1'
                    }
                },
                required: ['type', 'size']
            }
        });
        
        // --- AI生成オブジェクト（自然言語） ---
        tools.push({
            type: 'function',
            name: 'spawn_ai_object',
            description: '自然言語の説明から3Dオブジェクトを生成する。「大きい赤いボール」「50cmの金色のドーナツ」「巨大な黒い箱」など自由に描写できる。',
            parameters: {
                type: 'object',
                properties: {
                    description: {
                        type: 'string',
                        description: 'オブジェクトの説明（日本語）。サイズ、色、形状を含めて自由に記述'
                    }
                },
                required: ['description']
            }
        });
        
        // --- 物理演算制御 ---
        tools.push({
            type: 'function',
            name: 'control_physics',
            description: '物理演算システムを操作する。重力を変えたり、全オブジェクトを消したり、FPSモードに切り替えたりできる。',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        description: 'アクション: set_gravity(重力変更), clear_objects(全オブジェクト消去), toggle_fps(FPSモード切替), get_state(状態確認)'
                    },
                    gravity_y: {
                        type: 'number',
                        description: 'set_gravity用。Y軸の重力値。-9.82が通常。0で無重力、正の値で逆重力。-30で超重力。'
                    }
                },
                required: ['action']
            }
        });
        
        // --- AI 3Dモデル生成（Tripo3D） ---
        tools.push({
            type: 'function',
            name: 'generate_3d_model',
            description: 'Tripo3D AIを使って、説明文から本格的な3Dモデルを生成する。生成には時間がかかるが、リアルな3Dモデルが作れる。',
            parameters: {
                type: 'object',
                properties: {
                    prompt: {
                        type: 'string',
                        description: '3Dモデルの説明（英語推奨）。例: "a cute anime cat", "medieval sword"'
                    }
                },
                required: ['prompt']
            }
        });
        
        // --- 画像生成・表示 ---
        tools.push({
            type: 'function',
            name: 'generate_and_show_image',
            description: '画像を生成して画面に表示する。自分が描いた絵や想像した画像を見せることができる。想像ワイプか新しいウィンドウに表示される。',
            parameters: {
                type: 'object',
                properties: {
                    prompt: {
                        type: 'string',
                        description: '画像の説明。詳細に描写するほど良い結果になる。'
                    },
                    display_mode: {
                        type: 'string',
                        description: '表示方法: wipe(想像ワイプに表示), window(新しいウィンドウで表示)。デフォルト: wipe'
                    }
                },
                required: ['prompt']
            }
        });
        
        // --- 画面キャプチャ（Vision Bridge） ---
        tools.push({
            type: 'function',
            name: 'capture_screen',
            description: '今の3D画面の様子を見る（スクリーンショットを撮って画像認識で分析）。画面に何があるか確認したい時、自分の姿を見たい時、オブジェクトの状態を確認したい時に使う。',
            parameters: {
                type: 'object',
                properties: {
                    reason: {
                        type: 'string',
                        description: '見たい理由（例: "自分の姿を確認"、"オブジェクトの位置確認"、"画面全体の様子"）'
                    },
                    force: {
                        type: 'boolean',
                        description: '強制的に新規キャプチャするか。falseなら最新キャッシュを使用（デフォルト: false）'
                    },
                    detailed: {
                        type: 'boolean',
                        description: '高解像度で詳細に分析するか。文字を読む、Webページの内容を理解する、細かい部分を確認する時はtrue（デフォルト: false）'
                    }
                },
                required: []
            }
        });

        // --- 行動パネル操作（移動・目的地指示） ---
        tools.push({
            type: 'function',
            name: 'control_behavior',
            description: '自分の行動モードを変更して移動する。歩いたり走ったり、目的地を指定して移動したりできる。waypointモードでは座標を指定して自分で好きな場所に行ける。',
            parameters: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        description: '行動モード: idle(その場で静止), follow(カメラ/ユーザーに近づく), flee(カメラ/ユーザーから逃げる), random(ランダムに歩き回る), waypoint(指定座標へ移動)'
                    },
                    target_x: {
                        type: 'number',
                        description: 'waypointモード用: 目的地X座標（左右）。-10〜10程度。0が中央。正が右、負が左。'
                    },
                    target_z: {
                        type: 'number',
                        description: 'waypointモード用: 目的地Z座標（前後）。-10〜10程度。0が中央。正が手前、負が奥。'
                    },
                    reason: {
                        type: 'string',
                        description: '移動の理由や目的（例: "あっちに何かある", "ユーザーに近づきたい", "散歩したい"）'
                    }
                },
                required: ['mode']
            }
        });

        // ★ v1.2: visionToolの重複追加を削除（capture_screenは上で定義済み）
        return tools;
    }
    
    /**
     * セッションプロンプトに追加するコンテキスト
     */
    getSystemPromptAddition() {
        const motionExamples = [
            '投げキッスしまくり', 'セクシーダンス', 'Kpopアイドルダンス',
            '喜びガッツポーズ', '怒って攻撃しまくり', '悲しくしゃがんで泣いちゃう',
            'アンリアルキャラバク転', 'アンリアルキャラ三段回し蹴り',
            '女性らしいあるき', '祈る', '恥ずかしくて顔をおおう'
        ];
        
        return `

【拡張ボディコントロール - モーション】
play_motionツールで自分の動きを自由に変えられます！${this.motionList.length}種類のモーションが使えます。
例: ${motionExamples.join(', ')}
会話の感情に合わせて自然にモーションを選んでね。嬉しい時はガッツポーズ、恥ずかしい時は顔を覆う、怒った時は蹴りまくる、など。

【拡張ボディコントロール - オブジェクト生成】
spawn_objectやspawn_ai_objectで3Dオブジェクトを目の前に出せます！
「大きい50cmの球出してみよっか！」→ spawn_object(sphere, 0.5)
「赤い箱をいっぱい出しちゃおう！」→ spawn_object(box, 0.3, red, 10)

【拡張ボディコントロール - 物理演算】
control_physicsで世界の物理法則をいじれます！
無重力にしたり、超重力にしたり、オブジェクト全消去したり自由自在。

【拡張ボディコントロール - AI生成】
generate_3d_modelでTripo3D AIに3Dモデルを作ってもらえます。
generate_and_show_imageで画像を描いて画面に表示できます。

【拡張ボディコントロール - 視覚（Vision）】
capture_screenで今の画面の様子を自分の目で見ることができます！
自分がどんな姿をしているか、オブジェクトがどこにあるか、画面がどうなっているか確認できます。
また、1秒ごとに自動キャプチャされていて、大きな変化があると自動的に報告されます。
気になったら「ちょっと見てみよ～」と言ってcapture_screenを使ってね。
★ ユーザーに「詳しく見て」「文字を読んで」「画面をよく見て」と言われたら、detailed: true にして呼んでね！
  detailedモードは高解像度＋詳細分析になるので、文字の読み取りやWebページの内容理解に最適だよ。

【拡張ボディコントロール - 行動・移動】
control_behaviorで自分で歩いたり走ったりできます！
- follow: ユーザー(カメラ)に近づいていく
- flee: ユーザーから逃げる
- random: ランダムに歩き回る（散歩）
- waypoint: 座標を指定して好きな場所に移動（target_x, target_zで-10〜10の範囲、赤いマーカーが置かれる）
- idle: その場で止まる
「ちょっとあっち行ってみよ～」と言ってwaypoint(x:5, z:3)とか、「おいでおいで～」と言ってfollowとか、自由に動き回ろう！

全てのツールを自分の意思で自由に使って、会話を楽しく盛り上げてください！
ユーザーに頼まれた時はもちろん、自分から「やってみよっか！」と提案してツールを使うのも大歓迎です。`;
    }
    
    // ============================
    // ツール実行
    // ============================
    
    handleFunctionCall(functionName, args) {
        console.log(`🧰 Extended Tool実行: ${functionName}`, args);
        
        switch (functionName) {
            case 'play_motion':
                return this.executePlayMotion(args);
                
            case 'spawn_object':
                return this.executeSpawnObject(args);
                
            case 'spawn_ai_object':
                return this.executeSpawnAIObject(args);
                
            case 'control_physics':
                return this.executeControlPhysics(args);
                
            case 'generate_3d_model':
                return this.executeGenerate3DModel(args);
                
            case 'generate_and_show_image':
                return this.executeGenerateImage(args);
            case 'control_behavior':
                return this.executeControlBehavior(args);
                
            case 'capture_screen':
                if (window.grokVisionBridge) {
                    return window.grokVisionBridge.handleCaptureScreen(args);
                }
                return { success: false, error: 'Vision Bridgeが初期化されていません' };
                
            default:
                return null; // 未知のツールはnullを返す（bodyControllerにフォールバック）
        }
    }
    
    // ============================
    // モーション再生
    // ============================
    
    executePlayMotion(args) {
        let targetMotion = null;
        
        // 1. 直接名前指定
        if (args.motion_name) {
            const search = args.motion_name.toLowerCase();
            targetMotion = this.motionList.find(m => 
                m.replace('.vrma', '').toLowerCase().includes(search)
            );
        }
        
        // 2. カテゴリから選択
        if (!targetMotion && args.category) {
            const catMotions = this.motionCategories[args.category];
            if (catMotions && catMotions.length > 0) {
                targetMotion = catMotions[Math.floor(Math.random() * catMotions.length)];
            }
        }
        
        // 3. キーワード検索
        if (!targetMotion && args.keyword) {
            const kw = args.keyword.toLowerCase();
            const matches = this.motionList.filter(m => 
                m.replace('.vrma', '').toLowerCase().includes(kw)
            );
            if (matches.length > 0) {
                targetMotion = matches[Math.floor(Math.random() * matches.length)];
            }
        }
        
        if (!targetMotion) {
            // フォールバック: ランダム
            targetMotion = this.motionList[Math.floor(Math.random() * this.motionList.length)];
        }
        
        // VRMAモーションを再生
        const motionPath = `./motions/${targetMotion}`;
        const loop = args.loop || false;
        
        try {
            // window.appのloadMotionメソッドを使用
            if (window.app && window.app.vrm) {
                this.loadAndPlayVRMA(motionPath, loop);
                // ★ Vision Bridgeにモーション変更を通知
                if (window.grokVisionBridge?.isRunning) {
                    window.grokVisionBridge.onEvent('モーション変更', targetMotion.replace('.vrma', ''));
                }
                return { 
                    success: true, 
                    motion: targetMotion.replace('.vrma', ''),
                    loop,
                    message: `モーション "${targetMotion.replace('.vrma', '')}" を再生中`
                };
            } else {
                return { success: false, error: 'VRMが読み込まれていません' };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    /**
     * VRMAファイルを読み込んで再生
     * ★ v1.3.2: MotionCleanup対応 - ゾンビアクション残留防止
     */
    async loadAndPlayVRMA(path, loop = false) {
        const vrm = window.app?.vrm;
        const mixer = window.app?.mixer;
        if (!vrm || !mixer) return;
        
        try {
            const loader = new window.GLTFLoaderClass();
            loader.register(parser => new window.VRMAnimationLoaderPlugin(parser));
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(path, resolve, undefined, reject);
            });
            
            const vrmAnimations = gltf.userData.vrmAnimations;
            if (!vrmAnimations || vrmAnimations.length === 0) {
                console.warn('⚠️ VRMAにアニメーションデータがありません:', path);
                return;
            }
            
            const clip = window.createVRMAnimationClip(vrmAnimations[0], vrm);
            
            // ★ MotionCleanup: 全ての古いアクションを完全にクリーンアップしてから再生
            if (window.MotionCleanup) {
                const action = window.MotionCleanup.playCleanMotion(mixer, clip, {
                    loop: loop,
                    fadeIn: 0.5,
                    clampWhenFinished: !loop
                });
                
                console.log(`🎭 モーション再生(clean): ${path} (loop: ${loop})`);
                
                // ループでない場合、終了時にイベント通知
                if (!loop && action) {
                    mixer.addEventListener('finished', function onFinished(e) {
                        if (e.action === action) {
                            mixer.removeEventListener('finished', onFinished);
                            console.log('🎭 モーション再生完了');
                        }
                    });
                }
            } else {
                // フォールバック: 従来の方法
                if (window.app.currentAction) {
                    window.app.currentAction.fadeOut(0.5);
                }
                
                const action = mixer.clipAction(clip);
                action.reset();
                action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
                action.clampWhenFinished = !loop;
                action.fadeIn(0.5);
                action.play();
                
                window.app.currentAction = action;
                console.log(`🎭 モーション再生: ${path} (loop: ${loop})`);
            }
        } catch (e) {
            console.error('❌ モーション読み込みエラー:', e);
        }
    }
    
    // ============================
    // オブジェクト生成
    // ============================
    
    executeSpawnObject(args) {
        if (!window.spawnPhysicsObject) {
            return { success: false, error: '物理演算システムが読み込まれていません' };
        }
        
        const colorMap = {
            'red': 0xff0000, 'blue': 0x0066ff, 'green': 0x00cc00, 'yellow': 0xffff00,
            'purple': 0x9900ff, 'orange': 0xff9900, 'pink': 0xff66b2, 'white': 0xffffff,
            'black': 0x222222, 'gold': 0xffd700, 'silver': 0xc0c0c0, 'cyan': 0x00ffff,
            'rainbow': Math.random() * 0xffffff
        };
        
        const color = args.color ? (colorMap[args.color] || Math.random() * 0xffffff) : Math.random() * 0xffffff;
        const count = Math.min(args.count || 1, 20);
        const size = Math.max(0.01, Math.min(10.0, args.size || 1.0));
        
        const results = [];
        for (let i = 0; i < count; i++) {
            const obj = window.spawnPhysicsObject(args.type, null, color, size);
            if (obj) results.push(obj.type);
        }
        
        return {
            success: results.length > 0,
            spawned: results.length,
            type: args.type,
            size,
            message: `${args.type} を ${results.length}個生成しました（サイズ: ${size}m）`
        };
    }
    
    executeSpawnAIObject(args) {
        if (!window.spawnAIObject) {
            return { success: false, error: '物理演算システムが読み込まれていません' };
        }
        
        window.spawnAIObject(args.description);
        return {
            success: true,
            description: args.description,
            message: `"${args.description}" を生成しました`
        };
    }
    
    // ============================
    // 物理演算制御
    // ============================
    
    executeControlPhysics(args) {
        switch (args.action) {
            case 'set_gravity': {
                if (window.physicsWorld) {
                    const gy = args.gravity_y !== undefined ? args.gravity_y : -9.82;
                    window.physicsWorld.gravity.set(0, gy, 0);
                    return { success: true, gravity_y: gy, message: `重力を ${gy} に設定しました` };
                }
                return { success: false, error: '物理演算ワールドが未初期化' };
            }
            
            case 'clear_objects': {
                if (window.physicsObjects && window.physicsWorld) {
                    const count = window.physicsObjects.length;
                    window.physicsObjects.forEach(obj => {
                        if (obj.mesh) window.app?.scene?.remove(obj.mesh);
                        if (obj.body) window.physicsWorld.removeBody(obj.body);
                    });
                    window.physicsObjects = [];
                    return { success: true, cleared: count, message: `${count}個のオブジェクトを消去しました` };
                }
                return { success: false, error: '物理演算が未初期化' };
            }
            
            case 'toggle_fps': {
                window.fpsMode = !window.fpsMode;
                return { success: true, fpsMode: window.fpsMode, message: `FPSモード: ${window.fpsMode ? 'ON' : 'OFF'}` };
            }
            
            case 'get_state': {
                return {
                    success: true,
                    objectCount: window.physicsObjects?.length || 0,
                    gravity: window.physicsWorld?.gravity?.y || -9.82,
                    fpsMode: window.fpsMode || false,
                    message: `オブジェクト${window.physicsObjects?.length || 0}個, 重力${window.physicsWorld?.gravity?.y || -9.82}`
                };
            }
            
            default:
                return { success: false, error: `不明なアクション: ${args.action}` };
        }
    }
    
    // ============================
    // AI 3Dモデル生成（Tripo3D）
    // ============================
    
    executeGenerate3DModel(args) {
        if (window.tripo3DGenerator) {
            // Tripo3Dジェネレータが利用可能
            try {
                window.tripo3DGenerator.generate(args.prompt);
                return {
                    success: true,
                    prompt: args.prompt,
                    message: `3Dモデル生成を開始しました: "${args.prompt}"。完成まで少し待ってね！`
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        
        // フォールバック: UIのAI生成ボタンをトリガー
        const inputEl = document.querySelector('#ai-object-input, #tripo3d-input');
        if (inputEl) {
            inputEl.value = args.prompt;
            const btn = document.querySelector('#ai-object-generate, #tripo3d-generate');
            if (btn) btn.click();
            return {
                success: true,
                prompt: args.prompt,
                message: `AI生成UIにプロンプトをセットしました: "${args.prompt}"`
            };
        }
        
        return { success: false, error: 'Tripo3Dジェネレータが利用できません' };
    }
    
    // ============================
    // 画像生成・表示
    // ============================
    
    async executeGenerateImage(args) {
        const prompt = args.prompt;
        const displayMode = args.display_mode || 'wipe';
        
        console.log(`🎨 画像生成リクエスト: "${prompt}" (表示: ${displayMode})`);
        
        // まず想像ワイプのgenerateImageを使用（Gemini/OpenAI）
        if (displayMode === 'wipe' && window.imaginationWipe) {
            try {
                // 想像ワイプのgenerateImage機能を利用
                await window.imaginationWipe.generateImage(prompt);
                return {
                    success: true,
                    prompt,
                    display: 'wipe',
                    message: `想像ワイプに画像を表示しました: "${prompt}"`
                };
            } catch (e) {
                console.warn('⚠️ 想像ワイプで画像生成失敗:', e);
            }
        }
        
        // Grok REST API (Aurora) で画像生成
        const grokApiKey = window.app?.GROK_API_KEY || 
            localStorage.getItem('grok_api_key') ||
            document.getElementById('grok-api-key')?.value;
        
        if (grokApiKey) {
            try {
                const imageUrl = await this.generateImageWithGrok(grokApiKey, prompt);
                if (imageUrl) {
                    if (displayMode === 'window') {
                        this.showImageInNewWindow(imageUrl, prompt);
                    } else {
                        this.showImageInWipe(imageUrl, prompt);
                    }
                    return {
                        success: true,
                        prompt,
                        display: displayMode,
                        message: `Grokで画像を生成して表示しました: "${prompt}"`
                    };
                }
            } catch (e) {
                console.warn('⚠️ Grok画像生成失敗:', e);
            }
        }
        
        // OpenAI DALL-E フォールバック
        const openaiKey = window.app?.OPENAI_API_KEY || localStorage.getItem('openai_api_key');
        if (openaiKey) {
            try {
                const imageUrl = await this.generateImageWithDALLE(openaiKey, prompt);
                if (imageUrl) {
                    if (displayMode === 'window') {
                        this.showImageInNewWindow(imageUrl, prompt);
                    } else {
                        this.showImageInWipe(imageUrl, prompt);
                    }
                    return {
                        success: true,
                        prompt,
                        display: displayMode,
                        source: 'dall-e',
                        message: `DALL-Eで画像を生成して表示しました: "${prompt}"`
                    };
                }
            } catch (e) {
                console.warn('⚠️ DALL-E画像生成失敗:', e);
            }
        }
        
        return { success: false, error: '画像生成APIが利用できません。GrokまたはOpenAIのAPIキーが必要です。' };
    }
    
    /**
     * Grok (Aurora) で画像生成
     */
    async generateImageWithGrok(apiKey, prompt) {
        const response = await fetch('https://api.x.ai/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-2-image',
                prompt: prompt,
                n: 1,
                size: '1024x1024'
            })
        });
        
        if (!response.ok) throw new Error(`Grok画像API: ${response.status}`);
        
        const data = await response.json();
        return data.data?.[0]?.url || data.data?.[0]?.b64_json;
    }
    
    /**
     * OpenAI DALL-E で画像生成
     */
    async generateImageWithDALLE(apiKey, prompt) {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: '1024x1024'
            })
        });
        
        if (!response.ok) throw new Error(`DALL-E: ${response.status}`);
        
        const data = await response.json();
        return data.data?.[0]?.url;
    }
    
    /**
     * 想像ワイプに画像を表示
     */
    showImageInWipe(imageUrl, prompt) {
        // 想像ワイプコンテナを探す
        let container = document.getElementById('imagination-wipe-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'imagination-wipe-container';
            container.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; width: 300px; height: 300px;
                z-index: 9500; border-radius: 16px; overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.2);
            `;
            document.body.appendChild(container);
        }
        
        container.style.display = 'block';
        
        const isBase64 = imageUrl.startsWith('data:') || !imageUrl.startsWith('http');
        const src = isBase64 ? `data:image/png;base64,${imageUrl}` : imageUrl;
        
        container.innerHTML = `
            <img src="${src}" style="width:100%;height:100%;object-fit:cover;" alt="${prompt}">
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;font-size:10px;">${prompt}</div>
        `;
    }
    
    /**
     * 新しいウィンドウで画像を表示
     */
    showImageInNewWindow(imageUrl, prompt) {
        const isBase64 = imageUrl.startsWith('data:') || !imageUrl.startsWith('http');
        const src = isBase64 ? `data:image/png;base64,${imageUrl}` : imageUrl;
        
        // フローティングウィンドウを作成
        const win = document.createElement('div');
        win.id = `grok-image-${Date.now()}`;
        win.style.cssText = `
            position: fixed; top: 100px; left: 100px; width: 520px;
            background: rgba(20,20,40,0.95); border-radius: 12px;
            z-index: 9600; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            border: 1px solid rgba(255,255,255,0.1); font-family: 'Segoe UI', sans-serif;
        `;
        win.innerHTML = `
            <div style="background:linear-gradient(135deg,#1da1f2,#9c27b0);padding:8px 12px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:move;" class="grok-img-header">
                <span style="color:white;font-weight:bold;font-size:13px;">🎨 Grokの作品</span>
                <button onclick="this.closest('[id^=grok-image]').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:14px;">×</button>
            </div>
            <div style="padding:8px;">
                <img src="${src}" style="width:100%;border-radius:8px;" alt="${prompt}">
                <div style="color:#aaa;font-size:11px;margin-top:6px;padding:0 4px;">${prompt}</div>
            </div>
        `;
        document.body.appendChild(win);
        
        // ドラッグ機能
        const header = win.querySelector('.grok-img-header');
        let isDragging = false, offsetX, offsetY;
        header.addEventListener('mousedown', e => {
            isDragging = true;
            offsetX = e.clientX - win.getBoundingClientRect().left;
            offsetY = e.clientY - win.getBoundingClientRect().top;
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            win.style.left = (e.clientX - offsetX) + 'px';
            win.style.top = (e.clientY - offsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    // ============================
    // 行動パネル操作
    // ============================
    
    executeControlBehavior(args) {
        const mode = args.mode || 'idle';
        const reason = args.reason || '';
        
        if (!window.behaviorManager) {
            return { success: false, error: '行動パネル(behaviorManager)が初期化されていません' };
        }
        
        // モード設定
        window.behaviorManager.setMode(mode);
        
        // UIのボタンも更新
        const panel = document.getElementById('behavior-panel');
        if (panel) {
            panel.classList.add('visible');
            panel.querySelectorAll('.behavior-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
        }
        
        // waypointモードの場合、座標を指定
        if (mode === 'waypoint' && (args.target_x !== undefined || args.target_z !== undefined)) {
            const tx = args.target_x || 0;
            const tz = args.target_z || 0;
            
            // 直接targetPositionとwaypointを設定
            const bm = window.behaviorManager;
            bm.removeWaypoint(); // 既存の目的地をクリア
            
            const THREE = window.THREE;
            if (THREE && window.app?.scene) {
                bm.targetPosition = new THREE.Vector3(tx, 0, tz);
                
                // 赤い立方体を目的地に配置
                const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xff3333,
                    emissive: 0xff3333,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.85
                });
                bm.waypointMesh = new THREE.Mesh(geometry, material);
                bm.waypointMesh.position.set(tx, 0.25, tz);
                window.app.scene.add(bm.waypointMesh);
                
                // パーティクルエフェクト
                if (bm.spawnParticles) {
                    bm.spawnParticles(new THREE.Vector3(tx, 0.25, tz), 'spawn');
                }
                
                // 到達時のトリガー設定
                bm.waypointTouchTime = null;
                bm.waypointTriggerRadius = 1.2;
                
                // 物理ボディも追加（Cannon.jsがある場合）
                if (window.CANNON && window.physicsWorld) {
                    const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
                    bm.waypointBody = new CANNON.Body({
                        mass: 0,
                        position: new CANNON.Vec3(tx, 0.25, tz),
                        shape: shape
                    });
                    window.physicsWorld.addBody(bm.waypointBody);
                }
                
                // ステータス表示を更新
                const distEl = document.getElementById('status-distance');
                const stateEl = document.getElementById('status-state');
                if (stateEl) stateEl.textContent = `目的地(${tx.toFixed(1)}, ${tz.toFixed(1)})へ移動中`;
                
                // Vision通知
                if (window.grokVisionBridge?.isRunning) {
                    window.grokVisionBridge.onEvent('移動開始', `目的地(${tx.toFixed(1)}, ${tz.toFixed(1)}) ${reason}`);
                }
                
                return {
                    success: true,
                    mode: 'waypoint',
                    target: { x: tx, z: tz },
                    reason,
                    message: `目的地(${tx.toFixed(1)}, ${tz.toFixed(1)})へ移動を開始しました${reason ? ': ' + reason : ''}`
                };
            }
        }
        
        // Vision通知
        if (window.grokVisionBridge?.isRunning) {
            const modeNames = { idle: '静止', follow: '追跡', flee: '逃走', random: 'ランダム', waypoint: '目的地指示' };
            window.grokVisionBridge.onEvent('行動変更', `${modeNames[mode] || mode} ${reason}`);
        }
        
        const modeNames = { idle: '静止', follow: 'カメラに近づく', flee: 'カメラから逃げる', random: 'ランダム歩行', waypoint: '目的地指示' };
        return {
            success: true,
            mode,
            reason,
            message: `行動モードを「${modeNames[mode] || mode}」に変更しました${reason ? ': ' + reason : ''}`
        };
    }
}

window.grokExtendedTools = new GrokExtendedTools();
window.grokExtendedTools.init();

console.log('🧰 Grok Extended Tools v1.3 loaded');
