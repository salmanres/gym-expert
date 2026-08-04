const express = require("express");
const router = express.Router();

const {
    assignMembership,
    getActiveMemberships,
    getMemberMembershipHistory,
    updateAssignedMembership,
    addBonusDays
} = require("../controllers/memberMembershipController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, assignMembership);
router.put("/:id", protect, updateAssignedMembership);
router.post("/:id/bonus", protect, addBonusDays);

router.get("/active", protect, getActiveMemberships);

router.get(
    "/member/:memberId",
    protect,
    getMemberMembershipHistory
);

module.exports = router;