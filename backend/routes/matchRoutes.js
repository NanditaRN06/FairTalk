const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");

router.post("/match/create", matchController.createMatch);
router.get("/match/:matchId", matchController.getMatch);
router.post("/match/report", require("../controllers/reportController").submitReport);

module.exports = router;
