const express = require("express");
const router = express.Router();

const {
    assignMembership,
    getActiveMemberships,
    getMemberMembershipHistory,
} = require("../controllers/memberMembershipController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, assignMembership);

router.get("/active", protect, getActiveMemberships);

router.get(
    "/member/:memberId",
    protect,
    getMemberMembershipHistory
);

module.exports = router;