const mongoose = require("mongoose");

const memberMembershipSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
    },

    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    membershipPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },

    // Plan Details (Snapshot)
    planName: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    durationUnit: {
      type: String,
      enum: ["Days", "Weeks", "Months", "Years"],
      required: true,
    },

    totalSessions: {
      type: Number,
      default: 0,
    },

    usedSessions: {
      type: Number,
      default: 0,
    },

    // Membership Dates
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Pricing
    originalPrice: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    finalPrice: {
      type: Number,
      required: true,
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    balanceAmount: {
      type: Number,
      default: 0,
    },

    paidUntilDate: {
      type: Date,
    },

    // Membership Status
    membershipStatus: {
      type: String,
      enum: [
        "Active",
        "Expired",
        "Frozen",
        "Cancelled",
      ],
      default: "Active",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "MemberMembership",
  memberMembershipSchema
);