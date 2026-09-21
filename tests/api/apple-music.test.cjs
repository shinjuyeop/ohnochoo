const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { resolveAlbum } = require("../../api/_apple-music-album");

const albumUrl = "https://music.apple.com/kr/album/the-album/123456789";
const albumLink = (url = albumUrl) => ({ title: "The Album", segue: { destination: { contentDescriptor: { kind: "album", url } } } });

test("playlist album metadata takes precedence over song URLs and drops track parameters", () => {
    assert.deepEqual(resolveAlbum({ tertiaryLinks: [albumLink(`${albumUrl}?i=987654321#track`)], contentDescriptor: { url: "https://music.apple.com/kr/album/other/222222222?i=987654321" } }), { albumName: "The Album", albumUrl });
    assert.deepEqual(resolveAlbum({ attributes: { albumName: "The Album", url: `${albumUrl}?i=987654321` } }), { albumName: "The Album", albumUrl });
    assert.deepEqual(resolveAlbum({ relationships: { albums: { data: [{ attributes: { name: "The Album", url: albumUrl } }] } } }), { albumName: "The Album", albumUrl });
});

test("non-album and untrusted destinations cannot become album links", () => {
    for (const url of ["javascript:alert(1)", "https://music.apple.com.evil.example/kr/album/test/123", "https://user:pass@music.apple.com/kr/album/test/123", "http://music.apple.com/kr/album/test/123", "https://music.apple.com:444/kr/album/test/123", "https://music.apple.com/kr/playlist/test/pl.123", "https://music.apple.com/kr/artist/test/123"]) {
        assert.deepEqual(resolveAlbum({ tertiaryLinks: [albumLink(url)] }), { albumUrl: null, albumName: null }, url);
    }
});

test("playlist parsing preserves song and cover fields while enriching duplicate metadata", async () => {
    const filename = path.resolve(__dirname, "../../api/fetch-playlist.js");
    const data = [
        { title: "Song", artistName: "Artist", kind: "song", contentDescriptor: { url: `${albumUrl}?i=987654321` } },
        { title: "Song", artistName: "Artist", artwork: { dictionary: { url: "https://example.com/{w}x{h}.{f}", width: 300, height: 300 } }, tertiaryLinks: [albumLink()] },
    ];
    const context = {
        module: { exports: {} }, require: createRequire(filename), URL, AbortController, TextDecoder, setTimeout, clearTimeout,
        console: { error() {} },
        fetch: async () => new Response(`<script id="serialized-server-data">${JSON.stringify(data)}</script>`, { headers: { "Content-Type": "text/html" } }),
    };
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), context);
    const res = { setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); } };
    await context.module.exports({ query: { url: "https://music.apple.com/kr/playlist/test/pl.test" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.songs, [{ title: "Song", artist: "Artist", coverImageUrl: "https://example.com/300x300.jpg", albumUrl, albumName: "The Album" }]);
});
