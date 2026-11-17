import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const plans=sqliteTable('plans',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),
 document:text('document').notNull(),thumbnail:text('thumbnail'),createdAt:text('created_at').notNull(),
 publicId:text('public_id').unique(),parentId:text('parent_id'),
},t=>[index('plans_owner_idx').on(t.owner)]);
export const conversations=sqliteTable('conversations',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),planId:text('plan_id'),title:text('title').notNull(),
 status:text('status').notNull().default('待接待'),contact:text('contact').notNull().default(''),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
 quote:text('quote'),staffReadAt:text('staff_read_at'),
},t=>[index('conversations_owner_idx').on(t.owner)]);
export const messages=sqliteTable('messages',{
 id:text('id').primaryKey(),conversationId:text('conversation_id').notNull(),role:text('role').notNull(),
 body:text('body').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('messages_conversation_idx').on(t.conversationId)]);
export const staff=sqliteTable('staff',{email:text('email').primaryKey(),createdAt:text('created_at').notNull()});
export const rateLimits=sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()});
export const imageJobs=sqliteTable('image_jobs',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),providerId:text('provider_id'),prompt:text('prompt').notNull(),
 status:text('status').notNull(),images:text('images').notNull().default('[]'),error:text('error'),createdAt:text('created_at').notNull(),
});
