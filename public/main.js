if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Registration failed', err));
    });
}

function launch() {
    const input = document.getElementById('url').value;
    if (!input) return;
    const urlStr = input.startsWith('http') ? input : 'https://' + input;
    const url = new URL(urlStr);
    const encoded = xor.encode(url.origin);
    location.href = url.pathname + "?sennin-origin=" + encoded;
}
