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

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  name: text("name").notNull(),
  description: text("description"),
  duration: text("duration"), // e.g., "8-week program"
  ageRange: text("age_range"), // e.g., "ages 22+", "ages 16-22"
  status: text("status").default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workshops = pgTable("workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  programId: varchar("program_id").references(() => programs.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  status: text("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  programId: varchar("program_id").references(() => programs.id),
  workshopId: varchar("workshop_id").references(() => workshops.id),
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

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesforceId: text("salesforce_id").unique(),
  programId: varchar("program_id").references(() => programs.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  streetAddress: text("street_address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  status: text("status").default("enrolled"), // enrolled, completed, withdrawn, waitlisted
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  completionDate: timestamp("completion_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const participantWorkshops = pgTable("participant_workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull().references(() => participants.id),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  attendanceStatus: text("attendance_status").default("registered"), // registered, attended, absent, excused
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  salesforceId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkshopSchema = createInsertSchema(workshops).omit({
  id: true,
  salesforceId: true,
  currentParticipants: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  salesforceId: true,
  enrollmentDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParticipantWorkshopSchema = createInsertSchema(participantWorkshops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteers.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertVolunteerSignup = z.infer<typeof insertVolunteerSignupSchema>;
export type VolunteerSignup = typeof volunteerSignups.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipantWorkshop = z.infer<typeof insertParticipantWorkshopSchema>;
export type ParticipantWorkshop = typeof participantWorkshops.$inferSelect;
