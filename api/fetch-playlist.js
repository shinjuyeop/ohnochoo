const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // CORS 및 브라우저 캐싱 설정 (5초 동안 Vercel Edge Cache 사용)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate");

    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL이 필요합니다." });
    }

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const scriptContent = $('#serialized-server-data').html();

        if (!scriptContent) {
            return res.status(404).json({ error: "곡 정보를 찾을 수 없습니다." });
        }

        const parsedData = JSON.parse(scriptContent);
        const songsByKey = new Map();

        function resolveArtworkUrl(artwork) {
            if (!artwork || typeof artwork !== 'object') return null;

            const artworkSource = artwork.dictionary && typeof artwork.dictionary === 'object'
                ? artwork.dictionary
                : artwork;

            const rawUrl = artworkSource.url;
            if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

            const width = Number.isFinite(Number(artworkSource.width)) ? Number(artworkSource.width) : 300;
            const height = Number.isFinite(Number(artworkSource.height)) ? Number(artworkSource.height) : 300;

            return rawUrl
                .replace('{w}', String(width || 300))
                .replace('{h}', String(height || 300))
                .replace('{f}', 'jpg');
        }

        function resolveSongFields(obj) {
            if (!obj || typeof obj !== 'object') {
                return { title: null, artist: null, artwork: null };
            }

            const attributes = obj.attributes && typeof obj.attributes === 'object' ? obj.attributes : null;

            const title = obj.title || obj.name || attributes?.title || attributes?.name || null;
            const artist = obj.artistName || obj.artist || attributes?.artistName || attributes?.artist || null;
            const artwork = obj.artwork || attributes?.artwork || null;

            return { title, artist, artwork };
        }

        function findSongs(obj) {
            if (!obj || typeof obj !== 'object') return;
            const { title, artist, artwork } = resolveSongFields(obj);
            if (title && artist) {
                if (obj.kind === 'song' || obj.playParams || artwork || obj.attributes) {
                    const coverImageUrl = resolveArtworkUrl(artwork);
                    const key = `${title}|${artist}`;
                    const existingSong = songsByKey.get(key);
                    if (!existingSong) {
                        songsByKey.set(key, {
                            title,
                            artist,
                            coverImageUrl,
                        });
                    } else if (!existingSong.coverImageUrl && coverImageUrl) {
                        existingSong.coverImageUrl = coverImageUrl;
                    }
                }
            }
            if (Array.isArray(obj)) {
                for (const item of obj) { findSongs(item); }
            } else {
                for (const key in obj) { findSongs(obj[key]); }
            }
        }

        findSongs(parsedData);
        const songs = Array.from(songsByKey.values());

        return res.status(200).json({ songs });
    } catch (error) {
        console.error("Apple Music 파싱 에러:", error.message);
        return res.status(500).json({ error: "파싱 중 서버 오류가 발생했습니다." });
    }
};
