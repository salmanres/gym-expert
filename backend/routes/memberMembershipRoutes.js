const express = require("express");
const router = express.Router();

const {
    assignMembership,
    getActiveMemberships,
    getLatestMemberships,
    getMemberMembershipHistory,
    updateAssignedMembership,
    deleteAssignedMembership,
    addBonusDays,
    addPayment,
    markPTSessionUsed,
    toggleFreezeMembership
} = require("../controllers/memberMembershipController");

const { protect, gymOwnerOrAdmin } = require("../middleware/authMiddleware");

router.use(protect);
router.use(gymOwnerOrAdmin);

router.post("/", assignMembership);
router.put("/:id", updateAssignedMembership);
router.delete("/:id", deleteAssignedMembership);
router.post("/:id/payment", addPayment);
router.post("/:id/bonus", addBonusDays);
router.post("/:id/use-session", markPTSessionUsed);
router.post("/:id/freeze", toggleFreezeMembership);

router.get("/active", getActiveMemberships);
router.get("/latest", getLatestMemberships);

router.get(
    "/member/:memberId",
    getMemberMembershipHistory
);

module.exports = router;