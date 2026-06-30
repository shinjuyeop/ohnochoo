module.exports = async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const publicKey = process.env.VAPID_PUBLIC_KEY || "";
    if (!publicKey) {
        return res.status(500).json({ error: "VAPID_PUBLIC_KEY가 설정되지 않았습니다." });
    }

    return res.status(200).json({ publicKey });
};
