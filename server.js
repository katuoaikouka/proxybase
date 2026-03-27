const express = require('express');
const axios = require('axios');
const http = require('http');
const WebSocket = require('ws');
const xor = require('./src/encoder');
const app = express();

app.use('/src', express.static('src'));
app.use(express.static('public'));

// リライト関数: HTML/CSS内のリンクをプロキシ経由に置換
const rewrite = (data, encoded, type) => {
    if (type === 'html') {
        data = data.replace('<head>', `<head><script src="/src/encoder.js"></script><script src="/src/inject.js"></script>`);
        return data.replace(/(href|src|action)="([^"]+)"/g, (m, attr, url) => {
            if (url.startsWith('#') || url.startsWith('javascript:')) return m;
            const sep = url.includes('?') ? '&' : '?';
            return `${attr}="${url}${sep}sennin-origin=${encoded}"`;
        });
    }
    if (type === 'css') {
        return data.replace(/url\((.*?)\)/g, (m, url) => `url(${url}${url.includes('?') ? '&' : '?'}sennin-origin=${encoded})`);
    }
    return data;
};

app.get('*', async (req, res) => {
    const encoded = req.query['sennin-origin'];
    if (!encoded) return res.sendFile(__dirname + '/public/index.html');

    try {
        const targetOrigin = xor.decode(encoded);
        const targetUrl = targetOrigin + req.path + (req.url.includes('?') ? '?' + req.url.split('?') : '');

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer',
            headers: { 'User-Agent': req.headers['user-agent'], 'Accept': req.headers['accept'] },
            validateStatus: false
        });

        const contentType = response.headers['content-type'] || '';
        let data = response.data;

        if (contentType.includes('text/html')) data = rewrite(data.toString(), encoded, 'html');
        else if (contentType.includes('text/css')) data = rewrite(data.toString(), encoded, 'css');

        // Cookie隔離: 名前を sennin_cp_ でラップ
        const cookies = response.headers['set-cookie'];
        if (cookies) res.setHeader('Set-Cookie', cookies.map(c => `sennin_cp_${c}; Path=/; SameSite=Lax`));

        res.set('Content-Type', contentType);
        res.send(data);
    } catch (e) {
        res.status(500).send("Proxy Server Error: " + e.message);
    }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    try {
        const params = new URLSearchParams(req.url.split('?'));
        const encoded = params.get('sennin-origin');
        if (!encoded) return ws.close();

        const targetBase = xor.decode(encoded).replace(/^http/, 'ws');
        const targetWs = new WebSocket(targetBase + req.url.split('?'));

        ws.on('message', (msg) => targetWs.readyState === WebSocket.OPEN && targetWs.send(msg));
        targetWs.on('message', (msg) => ws.readyState === WebSocket.OPEN && ws.send(msg));
        targetWs.on('error', () => ws.close());
        ws.on('close', () => targetWs.close());
    } catch(e) { ws.close(); }
});

server.listen(3000, () => console.log('🚀 Sennin Proxy active at http://localhost:3000'));
