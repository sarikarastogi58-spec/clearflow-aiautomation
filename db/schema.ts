import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  websiteUrl: text("website_url"),
  placeId: text("place_id"),
  mapsUrl: text("maps_url"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  source: text("source").notNull().default("manual"),
  sourceRefreshedAt: text("source_refreshed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("business_place_idx").on(table.placeId), index("business_city_idx").on(table.city)]);

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  contactName: text("contact_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  stage: text("stage").notNull().default("researched"),
  requiredServices: text("required_services").notNull().default("[]"),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  score: integer("score").notNull().default(0),
  priority: text("priority").notNull().default("low"),
  websiteNeedScore: integer("website_need_score").notNull().default(0),
  businessPotentialScore: integer("business_potential_score").notNull().default(0),
  digitalGaps: text("digital_gaps").notNull().default("[]"),
  pitchAngle: text("pitch_angle").notNull().default(""),
  lastContactAt: text("last_contact_at"),
  nextActionAt: text("next_action_at"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("lead_pipeline_idx").on(table.priority, table.stage), uniqueIndex("lead_business_idx").on(table.businessId)]);

export const consents = sqliteTable("consents", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  channel: text("channel").notNull(),
  purpose: text("purpose").notNull().default("marketing"),
  status: text("status").notNull(),
  source: text("source").notNull(),
  proof: text("proof").notNull(),
  textVersion: text("text_version").notNull().default("v1"),
  capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"),
}, (table) => [index("consent_lookup_idx").on(table.leadId, table.channel, table.status)]);

export const suppressions = sqliteTable("suppressions", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  channel: text("channel").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("suppression_unique_idx").on(table.leadId, table.channel)]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").references(() => leads.id),
  direction: text("direction").notNull(),
  channel: text("channel").notNull(),
  body: text("body").notNull(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("queued"),
  campaign: text("campaign").notNull().default("support"),
  sentAt: text("sent_at"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("provider_message_idx").on(table.providerMessageId), index("message_lead_idx").on(table.leadId, table.createdAt)]);

export const followupJobs = sqliteTable("followup_jobs", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  channel: text("channel").notNull(),
  step: integer("step").notNull(),
  runAt: text("run_at").notNull(),
  status: text("status").notNull().default("scheduled"),
  attempts: integer("attempts").notNull().default(0),
  idempotencyKey: text("idempotency_key").notNull(),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("followup_idempotency_idx").on(table.idempotencyKey), index("followup_due_idx").on(table.status, table.runAt)]);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("event_type_idx").on(table.eventType, table.createdAt)]);

export const vaultSecrets = sqliteTable("vault_secrets", {
  name: text("name").primaryKey(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const providerConnections = sqliteTable("provider_connections", {
  provider: text("provider").primaryKey(),
  status: text("status").notNull().default("not_connected"),
  lastTestedAt: text("last_tested_at"),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
