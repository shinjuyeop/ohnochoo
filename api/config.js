module.exports = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    // Keep the legacy push-key URL as a rewrite without deploying another function.
    if (req.query?.resource === "vapid-public-key") {
        const publicKey = process.env.VAPID_PUBLIC_KEY || "";
        if (!publicKey) {
            return res.status(500).json({ error: "VAPID_PUBLIC_KEY가 설정되지 않았습니다." });
        }
        return res.status(200).json({ publicKey });
    }

    res.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    });
};
