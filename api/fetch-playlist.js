const APPLE_MUSIC_HOST = "music.apple.com";
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

function parseAppleMusicUrl(rawUrl, baseUrl) {
    let url;
    try {
        url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    } catch {
        throw new Error("올바른 Apple Music URL이 아니에요.");
    }

    const isAppleMusicHost = url.hostname === APPLE_MUSIC_HOST || url.hostname.endsWith(`.${APPLE_MUSIC_HOST}`);
    if (url.protocol !== "https:" || !isAppleMusicHost || url.username || url.password || url.port) {
        throw new Error("Apple Music의 HTTPS URL만 사용할 수 있어요.");
    }
    return url;
}

async function readTextWithLimit(response) {
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new Error("Apple Music 응답이 너무 커요.");
    }

    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new Error("Apple Music 응답이 너무 커요.");
        }
        text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
}

async function fetchAppleMusicPage(rawUrl) {
    let url = parseAppleMusicUrl(rawUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                redirect: "manual",
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; ohnochoo/1.0; +https://github.com/shinjuyeop/ohnochoo)",
                    Accept: "text/html,application/xhtml+xml",
                },
            });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get("location");
                if (!location || redirectCount === MAX_REDIRECTS) {
                    throw new Error("Apple Music 리디렉션을 확인할 수 없어요.");
                }
                url = parseAppleMusicUrl(location, url);
                continue;
            }
            if (!response.ok) throw new Error(`Apple Music 응답 오류 (${response.status})`);

            const contentType = response.headers.get("content-type") || "";
            if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
                throw new Error("Apple Music HTML 응답이 아니에요.");
            }
            return await readTextWithLimit(response);
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error("Apple Music 페이지를 불러오지 못했어요.");
}

function extractSerializedData(html) {
    const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
    for (const match of scripts) {
        if (/\bid\s*=\s*(["'])serialized-server-data\1/i.test(match[1])) return match[2];
    }
    return null;
}

module.exports = async (req, res) => {
    // CORS 및 브라우저 캐싱 설정
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const url = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ error: "URL이 필요합니다." });
    }

    try {
        const html = await fetchAppleMusicPage(url);
        const scriptContent = extractSerializedData(html);

        if (!scriptContent) {
            return res.status(404).json({ error: "곡 정보를 찾을 수 없습니다." });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(scriptContent);
        } catch {
            throw new Error("Apple Music 곡 정보 형식을 읽지 못했어요.");
        }
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
        const isInputError = error.message.includes("URL") || error.message.includes("HTTPS");
        const message = error.name === "AbortError" ? "Apple Music 응답 시간이 너무 오래 걸려요." : error.message;
        return res.status(isInputError ? 400 : 502).json({ error: message || "Apple Music을 불러오지 못했어요." });
    }
};
