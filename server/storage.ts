import { type Volunteer, type InsertVolunteer, type Opportunity, type InsertOpportunity, type VolunteerSignup, type InsertVolunteerSignup } from "@shared/schema";
import { randomUUID } from "crypto";

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

export const storage = new MemStorage();
