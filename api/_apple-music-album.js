function albumUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.hostname !== "music.apple.com" || url.username || url.password || url.port) return null;
        if (!/^\/[a-z]{2}\/album\/(?:[^/]+\/)?\d+\/?$/i.test(url.pathname)) return null;
        // An album page should not retain the track-selection or tracking parameters.
        url.search = "";
        url.hash = "";
        return url.href;
    } catch { return null; }
}

function resolveAlbum(song) {
    const attributes = song.attributes ?? {};
    const candidates = [];
    for (const link of Array.isArray(song.tertiaryLinks) ? song.tertiaryLinks : []) {
        const descriptor = link?.segue?.destination?.contentDescriptor;
        if (descriptor?.kind === "album") candidates.push({ url: descriptor.url, name: link.title });
    }
    for (const album of Array.isArray(song.relationships?.albums?.data) ? song.relationships.albums.data : []) {
        candidates.push({ url: album.attributes?.url, name: album.attributes?.name });
    }
    const name = song.albumName || attributes.albumName;
    candidates.push(
        { url: song.albumUrl || attributes.albumUrl, name },
        { url: song.contentDescriptor?.url, name },
        { url: attributes.url || song.url, name },
    );
    for (const candidate of candidates) {
        const url = albumUrl(candidate.url);
        if (url) return { albumUrl: url, albumName: typeof candidate.name === "string" ? candidate.name.trim() || null : null };
    }
    return { albumUrl: null, albumName: null };
}

module.exports = { resolveAlbum };
