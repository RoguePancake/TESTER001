/**
 * ENGINE REGISTRY
 * Central export point for all 12 system engines.
 *
 * Architecture:
 *   Identity Engine     → user/auth/company management
 *   Permission Engine   → role-based access control
 *   Time Engine         → labor tracking
 *   Job Engine          → jobsite/project management
 *   Journal Engine      → daily notes and field logs
 *   Crew Engine         → team organization
 *   File Engine         → file uploads and attachments
 *   Activity Engine     → audit logging
 *   Notification Engine → in-app alerts
 *   Analytics Engine    → operational metrics
 *   Automation Engine   → workflow automation
 *   Assistant Engine    → AI jobsite intelligence
 */

// Each engine is exported once via `export *` — do NOT add duplicate
// `export type { ... }` lines here; TypeScript will error on re-exports.

export * from "./identity";
export * from "./permissions";
export * from "./time";
export * from "./job";
export * from "./journal";
export * from "./crew";
export * from "./file";
export * from "./activity";
export * from "./notification";
export * from "./analytics";
export * from "./automation";
export * from "./assistant";
export * from "./employee";
export * from "./payroll";
export * from "./grading";
