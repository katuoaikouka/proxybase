(function() {
    const originalLocation = window.location;
    const OriginalWS = window.WebSocket;
    const urlParams = new URLSearchParams(originalLocation.search);
    const encodedOrigin = urlParams.get('sennin-origin');

    if (!encodedOrigin) return;

    // Location擬装: JSが location.hostname 等を呼んだ際にターゲットドメインを返す
    const locationHandler = {
        get: (target, prop) => {
            if (prop === 'origin' || prop === 'hostname') {
                try {
                    return new URL(xor.decode(encodedOrigin)).hostname;
                } catch(e) { return target[prop]; }
            }
            if (typeof target[prop] === 'function') return target[prop].bind(target);
            return target[prop];
        },
        set: (target, prop, value) => {
            if (prop === 'href') {
                const url = new URL(value, originalLocation.href);
                const newEncoded = xor.encode(url.origin);
                originalLocation.href = url.pathname + "?sennin-origin=" + newEncoded;
                return true;
            }
            target[prop] = value;
            return true;
        }
    };
    window.proxiedLocation = new Proxy(originalLocation, locationHandler);

    // WebSocket擬装: 接続先をプロキシサーバーへ強制リライト
    window.WebSocket = function(url, protocols) {
        const wsUrl = new URL(url, originalLocation.href);
        const proxyWsUrl = `${location.protocol.replace('http', 'ws')}//${location.host}${wsUrl.pathname}?sennin-origin=${encodedOrigin}`;
        console.log("[Sennin] WebSocket Intercepted:", proxyWsUrl);
        return new OriginalWS(proxyWsUrl, protocols);
    };
    window.WebSocket.prototype = OriginalWS.prototype;
})();
