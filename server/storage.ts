import { type Volunteer, type InsertVolunteer, type Opportunity, type InsertOpportunity, type VolunteerSignup, type InsertVolunteerSignup, volunteers, opportunities, volunteerSignups } from "@shared/schema";
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
  getAllOpportunities(filters?: { category?: string; date?: string; search?: string }): Promise<Opportunity[]>;
  
  // Volunteer signup operations
  signupVolunteer(signup: InsertVolunteerSignup): Promise<VolunteerSignup>;
  getVolunteerSignups(volunteerId?: string, opportunityId?: string): Promise<VolunteerSignup[]>;
  cancelSignup(volunteerId: string, opportunityId: string): Promise<boolean>;
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

  async getAllOpportunities(filters?: { category?: string; date?: string; search?: string }): Promise<Opportunity[]> {
    let conditions = [];

    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(opportunities.category, filters.category));
    }

    if (filters?.date) {
      const filterDate = new Date(filters.date);
      conditions.push(sql`DATE(${opportunities.date}) = ${filterDate.toISOString().split('T')[0]}`);
    }

    if (filters?.search) {
      conditions.push(
        sql`${opportunities.title} ILIKE ${'%' + filters.search + '%'} OR ${opportunities.description} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const query = conditions.length > 0 
      ? db.select().from(opportunities).where(and(...conditions))
      : db.select().from(opportunities);

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
}

// Initialize database with sample data if empty
class DatabaseStorageWithInit extends DatabaseStorage {
  private initialized = false;

  async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Check if we have any opportunities
      const existingOpportunities = await this.getAllOpportunities();
      
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
