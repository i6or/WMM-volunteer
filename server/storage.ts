import { type Volunteer, type InsertVolunteer, type Opportunity, type InsertOpportunity, type VolunteerSignup, type InsertVolunteerSignup, type Program, type InsertProgram, type Workshop, type InsertWorkshop, type Participant, type InsertParticipant, type ParticipantWorkshop, type InsertParticipantWorkshop, volunteers, opportunities, volunteerSignups, programs, workshops, participants, participantWorkshops } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { salesforceService } from "./services/salesforce";

export interface IStorage {
  // Volunteer operations
  getVolunteer(id: string): Promise<Volunteer | undefined>;
  getVolunteerByEmail(email: string): Promise<Volunteer | undefined>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  updateVolunteer(id: string, volunteer: Partial<Volunteer>): Promise<Volunteer | undefined>;
  deleteVolunteer(id: string): Promise<boolean>;
  getAllVolunteers(page?: number, limit?: number): Promise<{ volunteers: Volunteer[]; total: number }>;
  searchVolunteers(query: string, status?: string): Promise<Volunteer[]>;

  // Opportunity operations
  getOpportunity(id: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, opportunity: Partial<Opportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string): Promise<boolean>;
  getAllOpportunities(filters?: { category?: string; date?: string; search?: string; programId?: string }): Promise<Opportunity[]>;
  
  // Volunteer signup operations
  signupVolunteer(signup: InsertVolunteerSignup): Promise<VolunteerSignup>;
  getVolunteerSignups(volunteerId?: string, opportunityId?: string): Promise<VolunteerSignup[]>;
  cancelSignup(volunteerId: string, opportunityId: string): Promise<boolean>;

  // Program operations
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, program: Partial<Program>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<boolean>;
  getAllPrograms(filters?: { status?: string; search?: string }): Promise<Program[]>;

  // Workshop operations
  getWorkshop(id: string): Promise<Workshop | undefined>;
  createWorkshop(workshop: InsertWorkshop): Promise<Workshop>;
  updateWorkshop(id: string, workshop: Partial<Workshop>): Promise<Workshop | undefined>;
  deleteWorkshop(id: string): Promise<boolean>;
  getAllWorkshops(filters?: { programId?: string; status?: string; search?: string }): Promise<Workshop[]>;

  // Participant operations
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantByEmail(email: string): Promise<Participant | undefined>;
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  updateParticipant(id: string, participant: Partial<Participant>): Promise<Participant | undefined>;
  deleteParticipant(id: string): Promise<boolean>;
  getAllParticipants(filters?: { programId?: string; status?: string; search?: string }): Promise<Participant[]>;

  // Participant-Workshop operations
  registerParticipantForWorkshop(registration: InsertParticipantWorkshop): Promise<ParticipantWorkshop>;
  getParticipantWorkshops(participantId?: string, workshopId?: string): Promise<ParticipantWorkshop[]>;
  updateParticipantWorkshop(id: string, updates: Partial<ParticipantWorkshop>): Promise<ParticipantWorkshop | undefined>;
  removeParticipantFromWorkshop(participantId: string, workshopId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private volunteers: Map<string, Volunteer>;
  private opportunities: Map<string, Opportunity>;
  private volunteerSignups: Map<string, VolunteerSignup>;

  constructor() {
    this.volunteers = new Map();
    this.opportunities = new Map();
    this.volunteerSignups = new Map();

    // Initialize with some sample opportunities
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleOpportunities: Opportunity[] = [
      {
        id: randomUUID(),
        salesforceId: null,
        title: "Financial Futures Coach - Monday Sessions",
        description: "Provide 1-on-1 financial coaching to women in our 8-week Financial Futures program. Help participants build budgeting skills, improve credit, and develop savings strategies. Training provided.",
        organization: "Women's Money Matters",
        category: "Financial Coaching",
        date: new Date("2025-03-17T12:00:00"),
        startTime: "12:00 PM",
        endTime: "1:30 PM",
        location: "Online (Zoom) or Community Partner Site",
        totalSpots: 8,
        filledSpots: 5,
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
        requirements: "Must complete volunteer coach training. Financial background helpful but not required.",
        contactEmail: "volunteer@womensmoneymatters.org",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        salesforceId: null,
        title: "Life Launch Collective Presenter",
        description: "Present financial literacy workshops to young women (ages 16-22) in our 12-week Life Launch Collective program. Topics include budgeting basics, saving for goals, and building credit.",
        organization: "Women's Money Matters",
        category: "Workshop Presenting",
        date: new Date("2025-03-20T18:00:00"),
        startTime: "6:00 PM",
        endTime: "7:00 PM",
        location: "Community Partner Location - Cambridge",
        totalSpots: 2,
        filledSpots: 1,
        imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
        requirements: "Comfortable presenting to groups. Previous financial education experience preferred.",
        contactEmail: "programs@womensmoneymatters.org",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        salesforceId: null,
        title: "Saturday Financial Futures Coach",
        description: "Support women in our weekend Financial Futures program with personalized financial coaching. Help participants set financial goals and create action plans for long-term financial health.",
        organization: "Women's Money Matters",
        category: "Financial Coaching",
        date: new Date("2025-03-22T09:30:00"),
        startTime: "9:30 AM",
        endTime: "11:00 AM",
        location: "Boston Area Community Center",
        totalSpots: 6,
        filledSpots: 4,
        imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
        requirements: "Volunteer coach training required. Must commit to full 8-week program cycle.",
        contactEmail: "coaching@womensmoneymatters.org",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        salesforceId: null,
        title: "Program Administrative Support",
        description: "Help with registration, participant communication, and program logistics for our Financial Futures and Life Launch Collective programs. Great way to support our mission behind the scenes.",
        organization: "Women's Money Matters",
        category: "Administrative Support",
        date: new Date("2025-03-19T10:00:00"),
        startTime: "10:00 AM",
        endTime: "2:00 PM",
        location: "Women's Money Matters Office - Boston",
        totalSpots: 3,
        filledSpots: 1,
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
        requirements: "Basic computer skills required. Attention to detail and organization skills.",
        contactEmail: "admin@womensmoneymatters.org",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleOpportunities.forEach(opportunity => {
      this.opportunities.set(opportunity.id, opportunity);
    });
  }

  // Volunteer operations
  async getVolunteer(id: string): Promise<Volunteer | undefined> {
    return this.volunteers.get(id);
  }

  async getVolunteerByEmail(email: string): Promise<Volunteer | undefined> {
    return Array.from(this.volunteers.values()).find(
      (volunteer) => volunteer.email === email,
    );
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const id = randomUUID();
    const volunteer: Volunteer = {
      ...insertVolunteer,
      id,
      salesforceId: null,
      hoursLogged: "0",
      status: insertVolunteer.status || "pending",
      phone: insertVolunteer.phone || null,
      streetAddress: insertVolunteer.streetAddress || null,
      city: insertVolunteer.city || null,
      state: insertVolunteer.state || null,
      zipCode: insertVolunteer.zipCode || null,
      availability: insertVolunteer.availability || null,
      transportation: insertVolunteer.transportation || null,
      specialSkills: insertVolunteer.specialSkills || null,
      emergencyContactName: insertVolunteer.emergencyContactName || null,
      emergencyContactPhone: insertVolunteer.emergencyContactPhone || null,
      emergencyContactRelationship: insertVolunteer.emergencyContactRelationship || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.volunteers.set(id, volunteer);
    return volunteer;
  }

  async updateVolunteer(id: string, updates: Partial<Volunteer>): Promise<Volunteer | undefined> {
    const volunteer = this.volunteers.get(id);
    if (!volunteer) return undefined;

    const updated = { ...volunteer, ...updates, updatedAt: new Date() };
    this.volunteers.set(id, updated);
    return updated;
  }

  async deleteVolunteer(id: string): Promise<boolean> {
    return this.volunteers.delete(id);
  }

  async getAllVolunteers(page = 1, limit = 10): Promise<{ volunteers: Volunteer[]; total: number }> {
    const allVolunteers = Array.from(this.volunteers.values());
    const total = allVolunteers.length;
    const startIndex = (page - 1) * limit;
    const volunteers = allVolunteers.slice(startIndex, startIndex + limit);
    
    return { volunteers, total };
  }

  async searchVolunteers(query: string, status?: string): Promise<Volunteer[]> {
    const allVolunteers = Array.from(this.volunteers.values());
    
    return allVolunteers.filter(volunteer => {
      const matchesQuery = !query || 
        volunteer.firstName.toLowerCase().includes(query.toLowerCase()) ||
        volunteer.lastName.toLowerCase().includes(query.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(query.toLowerCase());
      
      const matchesStatus = !status || volunteer.status === status;
      
      return matchesQuery && matchesStatus;
    });
  }

  // Opportunity operations
  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    return this.opportunities.get(id);
  }

  async createOpportunity(insertOpportunity: InsertOpportunity): Promise<Opportunity> {
    const id = randomUUID();
    const opportunity: Opportunity = {
      ...insertOpportunity,
      id,
      salesforceId: null,
      filledSpots: 0,
      status: insertOpportunity.status || "active",
      imageUrl: insertOpportunity.imageUrl || null,
      requirements: insertOpportunity.requirements || null,
      contactEmail: insertOpportunity.contactEmail || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.opportunities.set(id, opportunity);
    return opportunity;
  }

  async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const opportunity = this.opportunities.get(id);
    if (!opportunity) return undefined;

    const updated = { ...opportunity, ...updates, updatedAt: new Date() };
    this.opportunities.set(id, updated);
    return updated;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    return this.opportunities.delete(id);
  }

  async getAllOpportunities(filters?: { category?: string; date?: string; search?: string }): Promise<Opportunity[]> {
    let opportunities = Array.from(this.opportunities.values());

    if (filters?.category && filters.category !== "All Categories") {
      opportunities = opportunities.filter(opp => opp.category === filters.category);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.title.toLowerCase().includes(query) ||
        opp.description.toLowerCase().includes(query) ||
        opp.organization.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return opportunities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Volunteer signup operations
  async signupVolunteer(insertSignup: InsertVolunteerSignup): Promise<VolunteerSignup> {
    const id = randomUUID();
    const signup: VolunteerSignup = {
      ...insertSignup,
      id,
      status: insertSignup.status || "confirmed",
      hoursWorked: insertSignup.hoursWorked || null,
      createdAt: new Date(),
    };

    this.volunteerSignups.set(id, signup);

    // Update opportunity filled spots
    const opportunity = this.opportunities.get(insertSignup.opportunityId);
    if (opportunity) {
      const currentFilled = opportunity.filledSpots || 0;
      opportunity.filledSpots = currentFilled + 1;
      this.opportunities.set(opportunity.id, opportunity);
    }

    return signup;
  }

  async getVolunteerSignups(volunteerId?: string, opportunityId?: string): Promise<VolunteerSignup[]> {
    const allSignups = Array.from(this.volunteerSignups.values());
    
    return allSignups.filter(signup => {
      if (volunteerId && signup.volunteerId !== volunteerId) return false;
      if (opportunityId && signup.opportunityId !== opportunityId) return false;
      return true;
    });
  }

  async cancelSignup(volunteerId: string, opportunityId: string): Promise<boolean> {
    const signup = Array.from(this.volunteerSignups.values()).find(
      s => s.volunteerId === volunteerId && s.opportunityId === opportunityId
    );

    if (!signup) return false;

    this.volunteerSignups.delete(signup.id);

    // Update opportunity filled spots
    const opportunity = this.opportunities.get(opportunityId);
    if (opportunity) {
      const currentFilled = opportunity.filledSpots || 0;
      if (currentFilled > 0) {
        opportunity.filledSpots = currentFilled - 1;
        this.opportunities.set(opportunity.id, opportunity);
      }
    }

    return true;
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // Volunteer operations
  async getVolunteer(id: string): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    return volunteer || undefined;
  }

  async getVolunteerByEmail(email: string): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.email, email));
    return volunteer || undefined;
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const id = randomUUID();
    const volunteer: Volunteer = {
      ...insertVolunteer,
      id,
      salesforceId: null,
      hoursLogged: "0",
      status: insertVolunteer.status || "pending",
      phone: insertVolunteer.phone || null,
      dateOfBirth: insertVolunteer.dateOfBirth || null,
      streetAddress: insertVolunteer.streetAddress || null,
      city: insertVolunteer.city || null,
      state: insertVolunteer.state || null,
      zipCode: insertVolunteer.zipCode || null,
      availability: insertVolunteer.availability || null,
      transportation: insertVolunteer.transportation || null,
      specialSkills: insertVolunteer.specialSkills || null,
      emergencyContactName: insertVolunteer.emergencyContactName || null,
      emergencyContactPhone: insertVolunteer.emergencyContactPhone || null,
      emergencyContactRelationship: insertVolunteer.emergencyContactRelationship || null,
      waiverSigned: insertVolunteer.waiverSigned || false,
      interestFoodHunger: insertVolunteer.interestFoodHunger || false,
      interestEducation: insertVolunteer.interestEducation || false,
      interestEnvironment: insertVolunteer.interestEnvironment || false,
      interestHealth: insertVolunteer.interestHealth || false,
      interestSeniors: insertVolunteer.interestSeniors || false,
      interestAnimals: insertVolunteer.interestAnimals || false,
      optInCommunications: insertVolunteer.optInCommunications || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(volunteers).values(volunteer).returning();

    // Sync to Salesforce
    try {
      const salesforceId = await salesforceService.createVolunteerRecord(created);
      if (salesforceId) {
        const [updated] = await db.update(volunteers)
          .set({ salesforceId, updatedAt: new Date() })
          .where(eq(volunteers.id, created.id))
          .returning();
        return updated;
      }
    } catch (error) {
      console.error('Failed to sync volunteer to Salesforce:', error);
    }

    return created;
  }

  async updateVolunteer(id: string, updates: Partial<Volunteer>): Promise<Volunteer | undefined> {
    const [updated] = await db.update(volunteers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(volunteers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteVolunteer(id: string): Promise<boolean> {
    const result = await db.delete(volunteers).where(eq(volunteers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllVolunteers(page: number = 1, limit: number = 10): Promise<{ volunteers: Volunteer[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [volunteerResults, countResult] = await Promise.all([
      db.select().from(volunteers).limit(limit).offset(offset),
      db.select({ count: count() }).from(volunteers)
    ]);

    return {
      volunteers: volunteerResults,
      total: countResult[0]?.count || 0
    };
  }

  async searchVolunteers(query: string, status?: string): Promise<Volunteer[]> {
    let conditions = [
      sql`${volunteers.firstName} ILIKE ${'%' + query + '%'} OR ${volunteers.lastName} ILIKE ${'%' + query + '%'} OR ${volunteers.email} ILIKE ${'%' + query + '%'}`
    ];

    if (status && status !== "all") {
      conditions.push(eq(volunteers.status, status));
    }

    const result = await db.select().from(volunteers).where(and(...conditions));
    return result;
  }

  // Opportunity operations
  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity || undefined;
  }

  async createOpportunity(insertOpportunity: InsertOpportunity): Promise<Opportunity> {
    const id = randomUUID();
    const opportunity: Opportunity = {
      ...insertOpportunity,
      id,
      salesforceId: null,
      filledSpots: 0,
      imageUrl: insertOpportunity.imageUrl || null,
      requirements: insertOpportunity.requirements || null,
      contactEmail: insertOpportunity.contactEmail || null,
      status: insertOpportunity.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(opportunities).values(opportunity).returning();

    // Sync to Salesforce
    try {
      const salesforceId = await salesforceService.createOpportunityRecord(created);
      if (salesforceId) {
        const [updated] = await db.update(opportunities)
          .set({ salesforceId, updatedAt: new Date() })
          .where(eq(opportunities.id, created.id))
          .returning();
        return updated;
      }
    } catch (error) {
      console.error('Failed to sync opportunity to Salesforce:', error);
    }

    return created;
  }

  async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const [updated] = await db.update(opportunities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(opportunities.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    const result = await db.delete(opportunities).where(eq(opportunities.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllOpportunities(filters?: { category?: string; date?: string; search?: string; programId?: string }): Promise<Opportunity[]> {
    let conditions = [];

    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(opportunities.category, filters.category));
    }

    if (filters?.programId) {
      conditions.push(eq(opportunities.programId, filters.programId));
    }

    if (filters?.date && filters.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.date) {
        case 'this_week': {
          // Get start of current week (Sunday) and end of week (Saturday)
          const dayOfWeek = today.getDay();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - dayOfWeek);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          conditions.push(
            sql`${opportunities.date} >= ${startOfWeek.toISOString()} AND ${opportunities.date} <= ${endOfWeek.toISOString()}`
          );
          break;
        }
        case 'this_month': {
          // Get first and last day of current month
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          conditions.push(
            sql`${opportunities.date} >= ${startOfMonth.toISOString()} AND ${opportunities.date} <= ${endOfMonth.toISOString()}`
          );
          break;
        }
        case 'this_weekend': {
          // Get upcoming Saturday and Sunday
          const dayOfWeek = today.getDay();
          const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
          const saturday = new Date(today);
          saturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday));
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          sunday.setHours(23, 59, 59, 999);

          conditions.push(
            sql`${opportunities.date} >= ${saturday.toISOString()} AND ${opportunities.date} <= ${sunday.toISOString()}`
          );
          break;
        }
        default: {
          // Treat as exact date match for backwards compatibility
          const filterDate = new Date(filters.date);
          conditions.push(sql`DATE(${opportunities.date}) = ${filterDate.toISOString().split('T')[0]}`);
        }
      }
    } else {
      // Default: Only show opportunities from today onwards (no past opportunities)
      const now = new Date();
      conditions.push(sql`${opportunities.date} >= ${now.toISOString()}`);
    }

    if (filters?.search) {
      conditions.push(
        sql`${opportunities.title} ILIKE ${'%' + filters.search + '%'} OR ${opportunities.description} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const query = conditions.length > 0
      ? db.select().from(opportunities).where(and(...conditions)).orderBy(opportunities.date)
      : db.select().from(opportunities).orderBy(opportunities.date);

    return await query;
  }

  // Volunteer signup operations
  async signupVolunteer(signup: InsertVolunteerSignup): Promise<VolunteerSignup> {
    const id = randomUUID();
    const volunteerSignup: VolunteerSignup = {
      ...signup,
      id,
      status: signup.status || "confirmed",
      hoursWorked: signup.hoursWorked || "0",
      createdAt: new Date(),
    };

    const [created] = await db.insert(volunteerSignups).values(volunteerSignup).returning();

    // Update opportunity filled spots
    await db.update(opportunities)
      .set({ 
        filledSpots: sql`${opportunities.filledSpots} + 1`,
        updatedAt: new Date()
      })
      .where(eq(opportunities.id, signup.opportunityId));

    return created;
  }

  async getVolunteerSignups(volunteerId?: string, opportunityId?: string): Promise<VolunteerSignup[]> {
    let conditions = [];

    if (volunteerId) {
      conditions.push(eq(volunteerSignups.volunteerId, volunteerId));
    }

    if (opportunityId) {
      conditions.push(eq(volunteerSignups.opportunityId, opportunityId));
    }

    const query = conditions.length > 0 
      ? db.select().from(volunteerSignups).where(and(...conditions))
      : db.select().from(volunteerSignups);

    return await query;
  }

  async cancelSignup(volunteerId: string, opportunityId: string): Promise<boolean> {
    const result = await db.delete(volunteerSignups)
      .where(and(
        eq(volunteerSignups.volunteerId, volunteerId),
        eq(volunteerSignups.opportunityId, opportunityId)
      ));

    if ((result.rowCount || 0) > 0) {
      // Update opportunity filled spots
      await db.update(opportunities)
        .set({ 
          filledSpots: sql`GREATEST(${opportunities.filledSpots} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(opportunities.id, opportunityId));
      
      return true;
    }

    return false;
  }

  // Program operations
  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program || undefined;
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const id = randomUUID();
    const program: Program = {
      ...insertProgram,
      id,
      salesforceId: null,
      status: insertProgram.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(programs).values(program).returning();
    return created;
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined> {
    const [updated] = await db.update(programs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(programs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProgram(id: string): Promise<boolean> {
    const result = await db.delete(programs).where(eq(programs.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllPrograms(filters?: { status?: string; search?: string }): Promise<Program[]> {
    let conditions = [];

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(programs.status, filters.status));
    }

    if (filters?.search) {
      conditions.push(
        sql`${programs.name} ILIKE ${'%' + filters.search + '%'} OR ${programs.description} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const query = conditions.length > 0 
      ? db.select().from(programs).where(and(...conditions))
      : db.select().from(programs);

    return await query;
  }

  // Workshop operations
  async getWorkshop(id: string): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshops).where(eq(workshops.id, id));
    return workshop || undefined;
  }

  async createWorkshop(insertWorkshop: InsertWorkshop): Promise<Workshop> {
    const id = randomUUID();
    const workshop: Workshop = {
      ...insertWorkshop,
      id,
      salesforceId: null,
      currentParticipants: 0,
      status: insertWorkshop.status || "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(workshops).values(workshop).returning();
    return created;
  }

  async updateWorkshop(id: string, updates: Partial<Workshop>): Promise<Workshop | undefined> {
    const [updated] = await db.update(workshops)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workshops.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorkshop(id: string): Promise<boolean> {
    const result = await db.delete(workshops).where(eq(workshops.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllWorkshops(filters?: { programId?: string; status?: string; search?: string }): Promise<Workshop[]> {
    let conditions = [];

    if (filters?.programId) {
      conditions.push(eq(workshops.programId, filters.programId));
    }

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(workshops.status, filters.status));
    }

    if (filters?.search) {
      conditions.push(
        sql`${workshops.title} ILIKE ${'%' + filters.search + '%'} OR ${workshops.description} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const query = conditions.length > 0 
      ? db.select().from(workshops).where(and(...conditions))
      : db.select().from(workshops);

    return await query;
  }

  // Participant operations
  async getParticipant(id: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant || undefined;
  }

  async getParticipantByEmail(email: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.email, email));
    return participant || undefined;
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = randomUUID();
    const participant: Participant = {
      ...insertParticipant,
      id,
      salesforceId: null,
      status: insertParticipant.status || "enrolled",
      enrollmentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(participants).values(participant).returning();
    return created;
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const [updated] = await db.update(participants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    const result = await db.delete(participants).where(eq(participants.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllParticipants(filters?: { programId?: string; status?: string; search?: string }): Promise<Participant[]> {
    let conditions = [];

    if (filters?.programId) {
      conditions.push(eq(participants.programId, filters.programId));
    }

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(participants.status, filters.status));
    }

    if (filters?.search) {
      conditions.push(
        sql`${participants.firstName} ILIKE ${'%' + filters.search + '%'} OR ${participants.lastName} ILIKE ${'%' + filters.search + '%'} OR ${participants.email} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const query = conditions.length > 0 
      ? db.select().from(participants).where(and(...conditions))
      : db.select().from(participants);

    return await query;
  }

  // Participant-Workshop operations
  async registerParticipantForWorkshop(registration: InsertParticipantWorkshop): Promise<ParticipantWorkshop> {
    const id = randomUUID();
    const participantWorkshop: ParticipantWorkshop = {
      ...registration,
      id,
      attendanceStatus: registration.attendanceStatus || "registered",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(participantWorkshops).values(participantWorkshop).returning();

    // Update workshop current participants count
    await db.update(workshops)
      .set({ 
        currentParticipants: sql`${workshops.currentParticipants} + 1`,
        updatedAt: new Date()
      })
      .where(eq(workshops.id, registration.workshopId));

    return created;
  }

  async getParticipantWorkshops(participantId?: string, workshopId?: string): Promise<ParticipantWorkshop[]> {
    let conditions = [];

    if (participantId) {
      conditions.push(eq(participantWorkshops.participantId, participantId));
    }

    if (workshopId) {
      conditions.push(eq(participantWorkshops.workshopId, workshopId));
    }

    const query = conditions.length > 0 
      ? db.select().from(participantWorkshops).where(and(...conditions))
      : db.select().from(participantWorkshops);

    return await query;
  }

  async updateParticipantWorkshop(id: string, updates: Partial<ParticipantWorkshop>): Promise<ParticipantWorkshop | undefined> {
    const [updated] = await db.update(participantWorkshops)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(participantWorkshops.id, id))
      .returning();
    return updated || undefined;
  }

  async removeParticipantFromWorkshop(participantId: string, workshopId: string): Promise<boolean> {
    const result = await db.delete(participantWorkshops)
      .where(and(
        eq(participantWorkshops.participantId, participantId),
        eq(participantWorkshops.workshopId, workshopId)
      ));

    if ((result.rowCount || 0) > 0) {
      // Update workshop current participants count
      await db.update(workshops)
        .set({ 
          currentParticipants: sql`GREATEST(${workshops.currentParticipants} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(workshops.id, workshopId));
      
      return true;
    }

    return false;
  }
}

// Initialize database with sample data if empty
class DatabaseStorageWithInit extends DatabaseStorage {
  private initialized = false;

  async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Check if we have any opportunities - query directly to avoid infinite loop
      const existingOpportunities = await db.select().from(opportunities).limit(1);
      
      if (existingOpportunities.length === 0) {
        console.log('Initializing database with sample opportunities...');
        
        // Create sample opportunities for Women's Money Matters
        const sampleOpportunities = [
          {
            title: "Financial Futures Coach - Monday Sessions",
            description: "Provide 1-on-1 financial coaching to women in our 8-week Financial Futures program. Help participants build budgeting skills, improve credit, and develop savings strategies. Training provided.",
            organization: "Women's Money Matters",
            category: "Financial Coaching",
            date: new Date("2025-03-17T12:00:00"),
            startTime: "12:00 PM",
            endTime: "1:30 PM",
            location: "Online (Zoom) or Community Partner Site",
            totalSpots: 8,
            filledSpots: 5,
            imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
            requirements: "Must complete volunteer coach training. Financial background helpful but not required.",
            contactEmail: "volunteer@womensmoneymatters.org",
            status: "active" as const,
          },
          {
            title: "Life Launch Collective Presenter",
            description: "Present financial literacy workshops to young women (ages 16-22) in our 12-week Life Launch Collective program. Topics include budgeting basics, saving for goals, and building credit.",
            organization: "Women's Money Matters",
            category: "Workshop Presenting",
            date: new Date("2025-03-20T18:00:00"),
            startTime: "6:00 PM",
            endTime: "7:00 PM",
            location: "Community Partner Location - Cambridge",
            totalSpots: 2,
            filledSpots: 1,
            imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
            requirements: "Comfortable presenting to groups. Previous financial education experience preferred.",
            contactEmail: "programs@womensmoneymatters.org",
            status: "active" as const,
          },
          {
            title: "Saturday Financial Futures Coach",
            description: "Support women in our weekend Financial Futures program with personalized financial coaching. Help participants set financial goals and create action plans for long-term financial health.",
            organization: "Women's Money Matters",
            category: "Financial Coaching",
            date: new Date("2025-03-22T09:30:00"),
            startTime: "9:30 AM",
            endTime: "11:00 AM",
            location: "Boston Area Community Center",
            totalSpots: 6,
            filledSpots: 4,
            imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
            requirements: "Volunteer coach training required. Must commit to full 8-week program cycle.",
            contactEmail: "coaching@womensmoneymatters.org",
            status: "active" as const,
          },
          {
            title: "Program Administrative Support",
            description: "Help with registration, participant communication, and program logistics for our Financial Futures and Life Launch Collective programs. Great way to support our mission behind the scenes.",
            organization: "Women's Money Matters",
            category: "Administrative Support",
            date: new Date("2025-03-19T10:00:00"),
            startTime: "10:00 AM",
            endTime: "2:00 PM",
            location: "Women's Money Matters Office - Boston",
            totalSpots: 3,
            filledSpots: 1,
            imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=192",
            requirements: "Basic computer skills required. Attention to detail and organization skills.",
            contactEmail: "admin@womensmoneymatters.org",
            status: "active" as const,
          },
        ];

        for (const opportunity of sampleOpportunities) {
          await this.createOpportunity(opportunity);
        }
        
        console.log('Database initialized with sample data');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
    
    this.initialized = true;
  }

  async getAllOpportunities(filters?: { category?: string; date?: string; search?: string }): Promise<Opportunity[]> {
    if (!this.initialized) {
      await this.ensureInitialized();
    }
    return super.getAllOpportunities(filters);
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    await this.ensureInitialized();
    return super.createVolunteer(insertVolunteer);
  }
}

export const storage = new DatabaseStorageWithInit();
