/**
 * ActivityLog Database Model
 * Records audit logs for system events: payments, snippet creation/edit/deletion, user registration, snippet comments.
 */
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        "payment",
        "snippet_create",
        "snippet_edit",
        "snippet_delete",
        "user_register",
        "snippet_comment",
        "user_update_profile",
        "user_update_avatar",
        "user_change_password"
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for efficient pagination and filtering
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
