import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, index, integer, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const partners = pgTable('partners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  partnerCutPct: numeric('partner_cut_pct', { precision: 5, scale: 2 }).notNull(),
  platformFeePct: numeric('platform_fee_pct', { precision: 5, scale: 2 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  plainDisplayPin: text('plain_display_pin').notNull(),
  websiteUrl: text('website_url'),
  payoutInfo: jsonb('payout_info'),
  totalEarned: numeric('total_earned', { precision: 12, scale: 2 }).notNull().default('0.00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const partnerPayoutLogs = pgTable('partner_payout_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  partnerId: uuid('partner_id').notNull(),
  gigId: uuid('gig_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type', { enum: ['commission_earned', 'payout_made'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  partnerIdIdx: index('idx_partner_payout_logs_partner_id').on(table.partnerId),
}));
