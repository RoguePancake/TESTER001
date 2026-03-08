/**
 * ENGINE REGISTRY
 * Central export point for all 12 system engines.
 *
 * Architecture:
 *   Identity Engine    → user/auth/company management
 *   Permission Engine  → role-based access control
 *   Time Engine        → labor tracking
 *   Job Engine         → jobsite/project management
 *   Journal Engine     → daily notes and field logs
 *   Crew Engine        → team organization
 *   File Engine        → file uploads and attachments
 *   Activity Engine    → audit logging
 *   Notification Engine→ in-app alerts
 *   Analytics Engine   → operational metrics
 *   Automation Engine  → workflow automation
 *   Assistant Engine   → AI jobsite intelligence
 */

// Identity Engine
export * from "./identity";
export type { AppUser, Company } from "./identity";

// Permission Engine
export * from "./permissions";
export type { UserRole, Permission } from "./permissions";

// Time Engine
export * from "./time";
export type { TimeEntryInput, HourSummary } from "./time";

// Job Engine
export * from "./job";
export type { Job, JobStatus, CreateJobInput } from "./job";

// Journal Engine
export * from "./journal";
export type { JournalEntry, CreateJournalInput } from "./journal";

// Crew Engine
export * from "./crew";
export type { Crew, CrewMember } from "./crew";

// File Engine
export * from "./file";
export type { FileRecord, FileRefType, FileCategory } from "./file";

// Activity Engine
export * from "./activity";
export type { ActivityLog, ActivityAction } from "./activity";

// Notification Engine
export * from "./notification";
export type { Notification, NotificationType } from "./notification";

// Analytics Engine
export * from "./analytics";
export type { LaborMetrics, JobMetrics } from "./analytics";

// Automation Engine
export * from "./automation";
export type { AutomationRule, TriggerEvent } from "./automation";

// Assistant Engine
export * from "./assistant";
export type { JobsiteContext, AssistantRequest, AssistantResponse } from "./assistant";
