// ========================================
// Tripo3D プロキシサーバー
// CORSを回避してAPIを呼び出す
// ========================================

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8001;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    console.log(`📡 ${req.method} ${path}`);
    
    // タスク作成
    if (path === '/task' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body);
            
            const postData = JSON.stringify({
                type: 'text_to_model',
                prompt: data.prompt,
                model_version: 'v2.0-20240919',
                face_limit: 10000
            });
            
            const options = {
                hostname: 'api.tripo3d.ai',
                port: 443,
                path: '/v2/openapi/task',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.apiKey}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                apiRes.on('data', chunk => responseData += chunk);
                apiRes.on('end', () => {
                    res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(responseData);
                });
            });
            
            apiReq.on('error', (e) => {
                console.error('API Error:', e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            });
            
            apiReq.write(postData);
            apiReq.end();
        });
        return;
    }
    
    // タスク状態確認
    if (path.startsWith('/task/') && req.method === 'GET') {
        const taskId = path.split('/')[2];
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        
        const options = {
            hostname: 'api.tripo3d.ai',
            port: 443,
            path: `/v2/openapi/task/${taskId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        };
        
        const apiReq = https.request(options, (apiRes) => {
            let responseData = '';
            apiRes.on('data', chunk => responseData += chunk);
            apiRes.on('end', () => {
                res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
                res.end(responseData);
            });
        });
        
        apiReq.on('error', (e) => {
            console.error('API Error:', e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        });
        
        apiReq.end();
        return;
    }
    
    // GLBプロキシ（CORS回避）
    if (path === '/download-glb' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body);
            const glbUrl = data.url;
            
            console.log('📥 GLBダウンロード:', glbUrl);
            
            https.get(glbUrl, (glbRes) => {
                res.writeHead(200, {
                    'Content-Type': 'model/gltf-binary',
                    'Access-Control-Allow-Origin': '*'
                });
                glbRes.pipe(res);
            }).on('error', (e) => {
                console.error('GLBダウンロードエラー:', e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            });
        });
        return;
    }
    
    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🎨 Tripo3D Proxy Server               ║
║  http://localhost:${PORT}                  ║
╚════════════════════════════════════════╝
    `);
});
