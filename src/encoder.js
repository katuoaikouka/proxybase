const KEY = 2;
const xor = {
    encode(str) {
        if (!str) return str;
        const xored = str.split('').map((c, i) => 
            i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ KEY) : c
        ).join('');
        return btoa(xored).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    decode(str) {
        if (!str) return str;
        const decoded = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
        return decoded.split('').map((c, i) => 
            i % 2 ? String.fromCharCode(c.charCodeAt(0) ^ KEY) : c
        ).join('');
    }
};

if (typeof module !== 'undefined') {
    module.exports = xor;
} else {
    self.xor = xor;
}
