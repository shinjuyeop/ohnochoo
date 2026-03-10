const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // CORS 및 브라우저 캐싱 설정 (30분 동안 Vercel Edge Cache 사용)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");

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
        const songs = [];

        function findSongs(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.title && obj.artistName) {
                if (obj.kind === 'song' || obj.playParams || obj.artwork) {
                    const isDuplicate = songs.some(s => s.title === obj.title && s.artist === obj.artistName);
                    if (!isDuplicate) {
                        songs.push({ title: obj.title, artist: obj.artistName });
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

        return res.status(200).json({ songs });
    } catch (error) {
        console.error("Apple Music 파싱 에러:", error.message);
        return res.status(500).json({ error: "파싱 중 서버 오류가 발생했습니다." });
    }
};