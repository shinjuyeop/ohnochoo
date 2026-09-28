const { getServiceSupabase, readJsonBody } = require("./_push-utils");
const { resolveAlbum } = require("./_apple-music-album");

function getSongCoverKey(title, artist) {
    return `${String(title ?? "").trim().toLowerCase()}|${String(artist ?? "").trim().toLowerCase()}`;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { songs } = await readJsonBody(req);
        if (!Array.isArray(songs)) {
            return res.status(400).json({ error: "songs 배열이 필요합니다." });
        }

        const coverByKey = new Map();
        for (const song of songs) {
            const coverImageUrl = typeof song.coverImageUrl === "string" ? song.coverImageUrl.trim() : "";
            const album = resolveAlbum(song);
            if (!song.title || !song.artist || (!coverImageUrl && !album.albumUrl)) continue;
            coverByKey.set(getSongCoverKey(song.title, song.artist), { coverImageUrl, ...album });
        }

        if (coverByKey.size === 0) {
            return res.status(200).json({ ok: true, updated: 0 });
        }

        const supabase = getServiceSupabase();
        const { data: existingSongs, error: selectError } = await supabase
            .from("songs")
            .select("*");

        if (selectError) throw selectError;

        let updated = 0;
        for (const song of existingSongs ?? []) {
            if (song.archived_at) continue;
            const metadata = coverByKey.get(getSongCoverKey(song.title, song.artist));
            if (!metadata) continue;
            const patch = {};
            if (!song.coverImageUrl && metadata.coverImageUrl) patch.coverImageUrl = metadata.coverImageUrl;
            // Older DBs can continue filling covers until the records migration is applied.
            if (Object.hasOwn(song, "album_url") && !song.album_url && metadata.albumUrl) {
                patch.album_url = metadata.albumUrl;
                patch.album_name = metadata.albumName;
            }
            if (!Object.keys(patch).length) continue;

            const { error: updateError } = await supabase
                .from("songs")
                .update(patch)
                .eq("id", song.id);

            if (updateError) throw updateError;
            updated += 1;
        }

        return res.status(200).json({ ok: true, updated });
    } catch (error) {
        console.error("update-song-covers failed:", error);
        return res.status(500).json({ error: error.message || "커버 저장 실패" });
    }
};
