importScripts('/src/encoder.js');

const PARAM_NAME = 'sennin-origin';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 静的ファイルとプロキシ自身へのリクエストは除外
    if (requestUrl.pathname.startsWith('/src/') || requestUrl.pathname.startsWith('/public/') || requestUrl.pathname === '/sw.js') {
        return;
    }

    event.respondWith((async () => {
        const client = await self.clients.get(event.clientId);
        const clientUrl = new URL(client?.url || self.location.href);
        const encodedOrigin = clientUrl.searchParams.get(PARAM_NAME);

        if (!encodedOrigin && requestUrl.origin === self.location.origin) {
            return fetch(event.request);
        }

        // 外部への直接リクエスト（リーク）を自分へ引き戻す
        if (requestUrl.origin !== self.location.origin) {
            const newEncoded = xor.encode(requestUrl.origin);
            return Response.redirect(`${self.location.origin}${requestUrl.pathname}${requestUrl.search}?${PARAM_NAME}=${newEncoded}`, 302);
        }

        // プロキシURLの構築
        const proxyUrl = new URL(event.request.url);
        proxyUrl.searchParams.set(PARAM_NAME, encodedOrigin);

        const headers = new Headers(event.request.headers);
        // Cookie隔離の復元
        const cookies = headers.get('Cookie') || '';
        const jarCookies = cookies.split('; ').filter(c => c.startsWith('sennin_cp_')).map(c => c.replace('sennin_cp_', '')).join('; ');
        headers.set('Cookie', jarCookies);

        return fetch(new Request(proxyUrl.href, {
            method: event.request.method,
            headers: headers,
            body: ['GET', 'HEAD'].includes(event.request.method) ? null : await event.request.blob(),
            redirect: 'manual'
        }));
    })());
});
