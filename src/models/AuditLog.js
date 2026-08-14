/**
 * AuditLog Model
 * Records security audit logs for system events (Authentication, Snippet, Comment, Admin, Payment).
 */
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    userName: {
      type: String,
      default: "System / Guest",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Authentication", "Snippet", "Comment", "Admin", "Payment", "User"],
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceType: {
      type: String,
      default: "System",
      trim: true,
    },
    resourceId: {
      type: String,
      default: "",
      trim: true,
    },
    resourceName: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Success", "Failed"],
      default: "Success",
      index: true,
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
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

// Performance Indexes for fast filtering and pagination
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ type: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ userEmail: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1, type: 1, status: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
