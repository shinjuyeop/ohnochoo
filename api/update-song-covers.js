const { getServiceSupabase, readJsonBody } = require("./_push-utils");

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
            if (!song.title || !song.artist || !coverImageUrl) continue;
            coverByKey.set(getSongCoverKey(song.title, song.artist), coverImageUrl);
        }

        if (coverByKey.size === 0) {
            return res.status(200).json({ ok: true, updated: 0 });
        }

        const supabase = getServiceSupabase();
        const { data: existingSongs, error: selectError } = await supabase
            .from("songs")
            .select("id,title,artist,coverImageUrl");

        if (selectError) throw selectError;

        let updated = 0;
        for (const song of existingSongs ?? []) {
            if (song.coverImageUrl) continue;
            const coverImageUrl = coverByKey.get(getSongCoverKey(song.title, song.artist));
            if (!coverImageUrl) continue;

            const { error: updateError } = await supabase
                .from("songs")
                .update({ coverImageUrl })
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
