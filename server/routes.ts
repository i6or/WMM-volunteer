import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { salesforceService } from "./services/salesforce";
import { insertVolunteerSchema, insertOpportunitySchema, insertVolunteerSignupSchema } from "@shared/schema";
import { z } from "zod";

const volunteerQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.string().optional(),
});

const opportunityQuerySchema = z.object({
  category: z.string().optional(),
  date: z.string().optional(),
  search: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Volunteer routes
  app.get("/api/volunteers", async (req, res) => {
    try {
      const { page, limit, search, status } = volunteerQuerySchema.parse(req.query);
      
      if (search || status) {
        const volunteers = await storage.searchVolunteers(search || "", status);
        res.json({ volunteers, total: volunteers.length });
      } else {
        const result = await storage.getAllVolunteers(page, limit);
        res.json(result);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
    }
  });

  app.get("/api/volunteers/:id", async (req, res) => {
    const volunteer = await storage.getVolunteer(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }
    res.json(volunteer);
  });

  app.post("/api/volunteers", async (req, res) => {
    try {
      const volunteerData = insertVolunteerSchema.parse(req.body);
      
      // Check if email already exists
      const existingVolunteer = await storage.getVolunteerByEmail(volunteerData.email);
      if (existingVolunteer) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const volunteer = await storage.createVolunteer(volunteerData);
      
      // Sync with Salesforce in background
      salesforceService.createVolunteerRecord(volunteer).then(salesforceId => {
        if (salesforceId) {
          storage.updateVolunteer(volunteer.id, { salesforceId });
        }
      }).catch(error => {
        console.error("Failed to sync volunteer to Salesforce:", error);
      });

      res.status(201).json(volunteer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/volunteers/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const volunteer = await storage.updateVolunteer(req.params.id, updateData);
      
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }

      res.json(volunteer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/volunteers/:id", async (req, res) => {
    const success = await storage.deleteVolunteer(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Volunteer not found" });
    }
    res.status(204).send();
  });

  // Opportunity routes
  app.get("/api/opportunities", async (req, res) => {
    try {
      const filters = opportunityQuerySchema.parse(req.query);
      const opportunities = await storage.getAllOpportunities(filters);
      res.json(opportunities);
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
    }
  });

  app.get("/api/opportunities/:id", async (req, res) => {
    const opportunity = await storage.getOpportunity(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    res.json(opportunity);
  });

  app.post("/api/opportunities", async (req, res) => {
    try {
      const opportunityData = insertOpportunitySchema.parse(req.body);
      const opportunity = await storage.createOpportunity(opportunityData);
      
      // Sync with Salesforce in background
      salesforceService.createOpportunityRecord(opportunity).then(salesforceId => {
        if (salesforceId) {
          storage.updateOpportunity(opportunity.id, { salesforceId });
        }
      }).catch(error => {
        console.error("Failed to sync opportunity to Salesforce:", error);
      });

      res.status(201).json(opportunity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/opportunities/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const opportunity = await storage.updateOpportunity(req.params.id, updateData);
      
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      res.json(opportunity);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/opportunities/:id", async (req, res) => {
    const success = await storage.deleteOpportunity(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    res.status(204).send();
  });

  // Volunteer signup routes
  app.post("/api/signups", async (req, res) => {
    try {
      const signupData = insertVolunteerSignupSchema.parse(req.body);
      
      // Check if volunteer exists
      const volunteer = await storage.getVolunteer(signupData.volunteerId);
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }

      // Check if opportunity exists and has available spots
      const opportunity = await storage.getOpportunity(signupData.opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      const filledSpots = opportunity.filledSpots || 0;
      if (filledSpots >= opportunity.totalSpots) {
        return res.status(400).json({ message: "Opportunity is full" });
      }

      // Check if volunteer is already signed up
      const existingSignups = await storage.getVolunteerSignups(signupData.volunteerId, signupData.opportunityId);
      if (existingSignups.length > 0) {
        return res.status(400).json({ message: "Already signed up for this opportunity" });
      }

      const signup = await storage.signupVolunteer(signupData);
      res.status(201).json(signup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/signups", async (req, res) => {
    const { volunteerId, opportunityId } = req.query;
    const signups = await storage.getVolunteerSignups(
      volunteerId as string,
      opportunityId as string
    );
    res.json(signups);
  });

  app.delete("/api/signups/:volunteerId/:opportunityId", async (req, res) => {
    const { volunteerId, opportunityId } = req.params;
    const success = await storage.cancelSignup(volunteerId, opportunityId);
    if (!success) {
      return res.status(404).json({ message: "Signup not found" });
    }
    res.status(204).send();
  });

  // Salesforce connection test endpoint
  app.get("/api/salesforce/test", async (req, res) => {
    console.log("[DEBUG] Salesforce test endpoint hit");
    try {
      const result = await salesforceService.testConnection();
      console.log("[DEBUG] Salesforce test result:", result);
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (error) {
      console.log("[DEBUG] Salesforce test error:", error);
      res.status(500).json({ success: false, message: "Connection test failed" });
    }
  });

  // Salesforce objects exploration endpoint
  app.get("/api/salesforce/objects", async (req, res) => {
    try {
      const result = await salesforceService.exploreObjects();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Object exploration failed" });
    }
  });

  // Salesforce object query endpoint
  app.get("/api/salesforce/query/:objectName", async (req, res) => {
    try {
      const { objectName } = req.params;
      const { limit = 10 } = req.query;
      const result = await salesforceService.queryObject(objectName, parseInt(limit as string));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Query failed" });
    }
  });

  // Salesforce sync opportunities endpoint  
  app.post("/api/salesforce/sync", async (req, res) => {
    try {
      // Use V4S sync for volunteer opportunities
      const opportunities = await salesforceService.syncV4SOpportunities();
      
      // Store synced opportunities in local database
      let stored = 0;
      let skipped = 0;
      for (const opportunity of opportunities) {
        try {
          await storage.createOpportunity(opportunity);
          stored++;
        } catch (error) {
          console.log(`Skipped duplicate opportunity: ${opportunity.title}`);
          skipped++;
        }
      }
      
      res.json({ 
        success: true,
        message: `Successfully synced ${opportunities.length} volunteer shifts from V4S`,
        count: opportunities.length,
        stored: stored,
        skipped: skipped
      });
    } catch (error) {
      console.error('Sync failed:', error);
      res.status(500).json({ 
        success: false, 
        message: `Sync failed: ${error}` 
      });
    }
  });

  // Salesforce sync endpoint
  app.post("/api/sync/salesforce", async (req, res) => {
    try {
      const opportunities = await salesforceService.syncOpportunities();
      res.json({ 
        message: "Sync completed", 
        opportunitiesCount: opportunities.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const { volunteers } = await storage.getAllVolunteers();
      const opportunities = await storage.getAllOpportunities();
      const allSignups = await storage.getVolunteerSignups();
      
      const activeVolunteers = volunteers.filter(v => v.status === 'active').length;
      const openOpportunities = opportunities.filter(o => o.status === 'active' && (o.filledSpots || 0) < o.totalSpots).length;
      const pendingVolunteers = volunteers.filter(v => v.status === 'pending').length;
      const totalHours = volunteers.reduce((sum, v) => sum + parseFloat(v.hoursLogged || '0'), 0);

      res.json({
        activeVolunteers,
        totalRegistrations: volunteers.length,
        openOpportunities,
        activeEvents: opportunities.filter(o => o.status === 'active').length,
        pendingApprovals: pendingVolunteers,
        totalHours: Math.round(totalHours),
        monthlyHours: Math.round(totalHours * 0.8), // Mock monthly calculation
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
