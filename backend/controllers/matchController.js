// Match controller - handles matching logic
exports.createMatch = (req, res) => {
    try {
        res.json({ message: "Match created" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMatch = (req, res) => {
    try {
        const { matchId } = req.params;
        res.json({ matchId, status: "active" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
