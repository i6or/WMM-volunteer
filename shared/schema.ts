import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const volunteers = pgTable("volunteers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  streetAddress: text("street_address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  interestFoodHunger: boolean("interest_food_hunger").default(false),
  interestEducation: boolean("interest_education").default(false),
  interestEnvironment: boolean("interest_environment").default(false),
  interestHealth: boolean("interest_health").default(false),
  interestSeniors: boolean("interest_seniors").default(false),
  interestAnimals: boolean("interest_animals").default(false),
  availability: text("availability"),
  transportation: text("transportation"),
  specialSkills: text("special_skills"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  waiverSigned: boolean("waiver_signed").default(false),
  optInCommunications: boolean("opt_in_communications").default(false),
  status: text("status").default("pending"),
  hoursLogged: decimal("hours_logged").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  organization: text("organization").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location").notNull(),
  totalSpots: integer("total_spots").notNull(),
  filledSpots: integer("filled_spots").default(0),
  imageUrl: text("image_url"),
  requirements: text("requirements"),
  contactEmail: text("contact_email"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // V4S specific fields
  jobId: text("job_id"), // Salesforce Volunteer Job ID
  shiftId: text("shift_id"), // Salesforce Volunteer Shift ID
  campaignId: text("campaign_id"), // Salesforce Campaign ID
  duration: integer("duration"), // Duration in hours
  skillsNeeded: text("skills_needed"), // Multipicklist of skills
  displayOnWebsite: boolean("display_on_website").default(true),
});

export const volunteerSignups = pgTable("volunteer_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  volunteerId: varchar("volunteer_id").notNull().references(() => volunteers.id),
  opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id),
  status: text("status").default("confirmed"),
  hoursWorked: decimal("hours_worked").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVolunteerSchema = createInsertSchema(volunteers).omit({
  id: true,
  salesforceId: true,
  hoursLogged: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  salesforceId: true,
  filledSpots: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVolunteerSignupSchema = createInsertSchema(volunteerSignups).omit({
  id: true,
  createdAt: true,
});

export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteers.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertVolunteerSignup = z.infer<typeof insertVolunteerSignupSchema>;
export type VolunteerSignup = typeof volunteerSignups.$inferSelect;
