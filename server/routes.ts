import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { salesforceService } from "./services/salesforce";
import { ProgramSyncService } from "./services/sync-programs";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { insertVolunteerSchema, insertOpportunitySchema, insertVolunteerSignupSchema, insertProgramSchema, insertWorkshopSchema, insertParticipantSchema, insertParticipantWorkshopSchema, workshops, programs } from "@shared/schema";
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
  programId: z.string().optional(),
});

const programQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  dateRange: z.string().optional(),
});

const workshopQuerySchema = z.object({
  programId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  programStatus: z.string().optional(), // Filter workshops by program status (default: 'active')
});

const participantQuerySchema = z.object({
  programId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

// Code version for debugging deployments
const CODE_VERSION = "2024-12-11-v17-lead-if-no-contact";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auto-migrate: Add workshop_type and format columns to workshops table if they don't exist
  try {
    const columnsResult = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'workshops' AND column_name IN ('workshop_type', 'type', 'format')
    `);
    const existingColumns = columnsResult.rows.map((r: any) => r.column_name);
    
    // Migrate from 'type' to 'workshop_type' if needed
    if (existingColumns.includes('type') && !existingColumns.includes('workshop_type')) {
      console.log('[AUTO-MIGRATION] Renaming type column to workshop_type...');
      await db.execute(sql`ALTER TABLE workshops RENAME COLUMN type TO workshop_type`);
      console.log('[AUTO-MIGRATION] ✓ Renamed type to workshop_type');
    } else if (!existingColumns.includes('workshop_type')) {
      console.log('[AUTO-MIGRATION] Adding workshop_type column to workshops table...');
      await db.execute(sql`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS workshop_type TEXT`);
      console.log('[AUTO-MIGRATION] ✓ Added workshop_type column');
    }
    
    if (!existingColumns.includes('format')) {
      console.log('[AUTO-MIGRATION] Adding format column to workshops table...');
      await db.execute(sql`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS format TEXT`);
      console.log('[AUTO-MIGRATION] ✓ Added format column');
    }
  } catch (error) {
    console.error('[AUTO-MIGRATION] Error checking/adding columns:', error);
    // Don't fail startup if migration fails - it might be a permissions issue
  }

  // Version check endpoint
  app.get("/api/version", (req, res) => {
    res.json({ version: CODE_VERSION, timestamp: new Date().toISOString() });
  });

  // Database migration endpoint - adds missing columns to workshops table
  app.post("/api/admin/migrate-workshops-table", async (req, res) => {
    try {
      // Check current columns
      const columnsResult = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'workshops'
      `);
      const existingColumns = columnsResult.rows.map((r: any) => r.column_name);

      const migrations: string[] = [];

      // Add 'name' column if it doesn't exist
      if (!existingColumns.includes('name')) {
        await db.execute(sql`ALTER TABLE workshops ADD COLUMN name text`);
        migrations.push("Added 'name' column");
      }

      // Add 'topic' column if it doesn't exist
      if (!existingColumns.includes('topic')) {
        await db.execute(sql`ALTER TABLE workshops ADD COLUMN topic text`);
        migrations.push("Added 'topic' column");
      }

      // Update any null names to use title
      await db.execute(sql`UPDATE workshops SET name = COALESCE(title, 'Unnamed Workshop') WHERE name IS NULL`);

      res.json({
        success: true,
        existingColumns,
        migrations: migrations.length > 0 ? migrations : ["No migrations needed - all columns exist"],
        message: "Migration complete"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Database migration endpoint - creates coach_signups table
  app.post("/api/admin/migrate-coach-signups-table", async (req, res) => {
    try {
      // Check if table exists
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'coach_signups'
        )
      `);

      const tableExists = tableCheck.rows[0]?.exists;

      if (tableExists) {
        return res.json({
          success: true,
          message: "coach_signups table already exists",
          created: false
        });
      }

      // Create the table
      await db.execute(sql`
        CREATE TABLE coach_signups (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          salesforce_id TEXT UNIQUE,
          program_id VARCHAR NOT NULL REFERENCES programs(id),
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          comments TEXT,
          status TEXT DEFAULT 'confirmed',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      res.json({
        success: true,
        message: "coach_signups table created successfully",
        created: true
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Database migration endpoint - adds missing columns to programs table
  app.post("/api/admin/migrate-programs-table", async (req, res) => {
    try {
      // Check current columns
      const columnsResult = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'programs'
      `);
      const existingColumns = columnsResult.rows.map((r: any) => r.column_name);

      const migrations: string[] = [];

      // Add 'number_of_coaches' column if it doesn't exist
      if (!existingColumns.includes('number_of_coaches')) {
        await db.execute(sql`ALTER TABLE programs ADD COLUMN number_of_coaches integer`);
        migrations.push("Added 'number_of_coaches' column");
      }

      res.json({
        success: true,
        existingColumns,
        migrations: migrations.length > 0 ? migrations : ["No migrations needed - all columns exist"],
        message: "Migration complete"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // ============================================
  // SIMPLE PROGRAMS ENDPOINTS - MINIMAL APPROACH
  // ============================================

  // Get ALL programs - simplest possible, no filters, no complexity
  app.get("/api/programs/all", async (req, res) => {
    try {
      const config = salesforceService.config;
      
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

query = "SELECT Id, Name, Program_Start_Date__c, Program_End_Date__c, Status__c, Status_a__c FROM Program__c LIMIT 100"
result = sf.query(query)

print(json.dumps({
    "success": True,
    "records": result.get('records', []),
    "totalSize": result.get('totalSize', 0)
}))
`;

      const pythonResult = await salesforceService['executePythonScript'](scriptContent);
      
      if (pythonResult.error) {
        return res.status(500).json({ success: false, error: pythonResult.error });
      }
      
      const records = pythonResult.records || [];
      
      res.json({
        success: true,
        programs: records,
        count: records.length
      });
    } catch (error) {
      console.error('[SIMPLE PROGRAMS] Error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Sync ALL programs - simplest possible
  app.post("/api/programs/sync-all", async (req, res) => {
    try {
      const config = salesforceService.config;
      
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

query = """SELECT Id, Name, Program_Start_Date__c, Program_End_Date__c,
    Status__c, Status_a__c, Type__c, Format__c, Language__c,
    Workshop_Day__c, Workshop_Time__c, workshop_frequency__c, Number_of_Workshops__c,
    Program_Leader_Full_Name__c, Total_Participants__c, Number_of_Coaches_in_Program__c,
    Zoom_link__c, Program_Schedule_Link__c,
    Workshop_Start_Date_Time__c, Program_Partner__r.Name
    FROM Program__c
    WHERE Program_Start_Date__c >= LAST_N_MONTHS:6
    ORDER BY Program_Start_Date__c DESC
    LIMIT 100"""
result = sf.query(query)

print(json.dumps({
    "success": True,
    "records": result.get('records', []),
    "totalSize": result.get('totalSize', 0)
}))
`;

      const pythonResult = await salesforceService['executePythonScript'](scriptContent);

      if (pythonResult.error) {
        return res.status(500).json({ success: false, error: pythonResult.error });
      }

      const sfPrograms = pythonResult.records || [];
      console.log(`[SYNC-ALL] Found ${sfPrograms.length} programs in Salesforce`);
      
      if (sfPrograms.length === 0) {
        return res.json({
          success: false,
          message: "No programs found in Salesforce",
          count: 0
        });
      }
      
      // Sync them using the sync service
      const syncService = new ProgramSyncService(salesforceService.programService);
      // Manually sync each program since we have the records
      let programsSynced = 0;
      let workshopsSynced = 0;
      
      for (const sfProgram of sfPrograms) {
        try {
          console.log(`[SYNC-ALL] Syncing program ${sfProgram.Id} (${sfProgram.Name})`);
          const { program, workshops } = await syncService.syncProgram(sfProgram);
          programsSynced++;
          workshopsSynced += workshops.length;
          console.log(`[SYNC-ALL] Program ${sfProgram.Id}: synced ${workshops.length} workshops`);
        } catch (error) {
          console.error(`Failed to sync program ${sfProgram.Id}:`, error);
          console.error(`Error details:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Synced ${programsSynced} programs and ${workshopsSynced} workshops`,
        programsSynced,
        workshopsSynced
      });
    } catch (error) {
      console.error('[SYNC-ALL] Error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Test workshops for a specific program
  app.get("/api/test-workshops/:programId", async (req, res) => {
    try {
      const { programId } = req.params;
      console.log(`[TEST] Testing workshops for program ${programId}`);
      
      const workshops = await salesforceService.programService.getWorkshopsForProgram(programId);
      
      res.json({
        success: true,
        programId,
        workshops,
        count: workshops.length
      });
    } catch (error) {
      console.error('[TEST] Error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // ============================================
  // END SIMPLE ENDPOINTS
  // ============================================

  // Health check endpoint for Railway
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

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

  // Bulk signup for all opportunities in a program (for program-level roles)
  app.post("/api/signups/bulk-program", async (req, res) => {
    try {
      const { volunteerId, programId, category } = req.body;
      
      if (!volunteerId || !programId || !category) {
        return res.status(400).json({ message: "volunteerId, programId, and category are required" });
      }

      // Check if volunteer exists
      const volunteer = await storage.getVolunteer(volunteerId);
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }

      // Get all opportunities for this program and category
      // Use type assertion since getAllOpportunities accepts programId but TypeScript doesn't infer it from schema
      const allOpportunities = await storage.getAllOpportunities({ programId, category } as Parameters<typeof storage.getAllOpportunities>[0]);
      const programOpportunities = allOpportunities.filter(opp => 
        opp.category === category && 
        (opp.filledSpots || 0) < opp.totalSpots
      );

      if (programOpportunities.length === 0) {
        return res.status(400).json({ message: "No available opportunities found for this program and category" });
      }

      // Check if volunteer is already signed up for any of these opportunities
      const existingSignups = await storage.getVolunteerSignups(volunteerId);
      const existingOpportunityIds = new Set(existingSignups.map((s: any) => s.opportunityId));
      
      const opportunitiesToSignUp = programOpportunities.filter(
        opp => !existingOpportunityIds.has(opp.id)
      );

      if (opportunitiesToSignUp.length === 0) {
        return res.status(400).json({ message: "Already signed up for all opportunities in this program" });
      }

      // Sign up for all opportunities
      const signups = [];
      for (const opportunity of opportunitiesToSignUp) {
        try {
          const signup = await storage.signupVolunteer({
            volunteerId,
            opportunityId: opportunity.id,
            status: "confirmed",
          });
          signups.push(signup);
        } catch (error) {
          console.error(`Failed to sign up for opportunity ${opportunity.id}:`, error);
        }
      }

      res.status(201).json({
        success: true,
        message: `Successfully signed up for ${signups.length} opportunities`,
        signups,
        count: signups.length,
      });
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

  // ============================================
  // COACH SIGNUPS - New volunteer coach registration
  // ============================================

  // Create coach signup(s) for one or more programs
  app.post("/api/coach-signups", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, comments, programIds } = req.body;

      if (!firstName || !lastName || !email || !programIds || programIds.length === 0) {
        return res.status(400).json({
          message: "firstName, lastName, email, and programIds are required"
        });
      }

      // Validate that programs exist
      const validProgramIds: string[] = [];
      for (const programId of programIds) {
        const programResult = await db.execute(sql`
          SELECT id, salesforce_id, name FROM programs WHERE id = ${programId}
        `);
        if (programResult.rows.length > 0) {
          validProgramIds.push(programId);
        }
      }

      if (validProgramIds.length === 0) {
        return res.status(404).json({ message: "No valid programs found" });
      }

      // Create coach signups for each program
      const signups = [];
      for (const programId of validProgramIds) {
        try {
          // Insert coach signup record using raw SQL (table may not exist yet)
          const result = await db.execute(sql`
            INSERT INTO coach_signups (id, program_id, first_name, last_name, email, phone, comments, status, created_at, updated_at)
            VALUES (gen_random_uuid(), ${programId}, ${firstName}, ${lastName}, ${email}, ${phone || null}, ${comments || null}, 'confirmed', NOW(), NOW())
            RETURNING *
          `);

          if (result.rows.length > 0) {
            signups.push(result.rows[0]);
          }

          // Get program's Salesforce ID for the affiliate contact creation
          const programResult = await db.execute(sql`
            SELECT salesforce_id FROM programs WHERE id = ${programId}
          `);
          const sfProgramId = programResult.rows[0]?.salesforce_id;

          if (sfProgramId) {
            // Create Participant in Salesforce (async - don't block response)
            // This will: 1. Find/create Contact, 2. Create Participant__c record
            createSalesforceParticipant({
              firstName,
              lastName,
              email,
              phone,
              programSalesforceId: sfProgramId as string,
              participantType: 'Coach Applicant',
            }).then(sfResult => {
              console.log(`[COACH-SIGNUP] SF Participant created for program ${sfProgramId}:`, sfResult);
            }).catch(error => {
              console.error(`[COACH-SIGNUP] Failed to create SF participant for program ${sfProgramId}:`, error);
            });
          }
        } catch (insertError) {
          console.error(`[COACH-SIGNUP] Failed to insert signup for program ${programId}:`, insertError);
        }
      }

      res.status(201).json({
        success: true,
        message: `Successfully signed up as coach for ${signups.length} program(s)`,
        signups,
        count: signups.length,
      });
    } catch (error) {
      console.error('[COACH-SIGNUP] Error:', error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get coach signups (optionally filtered by email or program)
  app.get("/api/coach-signups", async (req, res) => {
    try {
      const { email, programId } = req.query;

      let query = sql`SELECT cs.*, p.name as program_name, p.salesforce_id as program_sf_id
                      FROM coach_signups cs
                      LEFT JOIN programs p ON cs.program_id = p.id
                      WHERE 1=1`;

      if (email) {
        query = sql`SELECT cs.*, p.name as program_name, p.salesforce_id as program_sf_id
                    FROM coach_signups cs
                    LEFT JOIN programs p ON cs.program_id = p.id
                    WHERE cs.email = ${email}`;
      } else if (programId) {
        query = sql`SELECT cs.*, p.name as program_name, p.salesforce_id as program_sf_id
                    FROM coach_signups cs
                    LEFT JOIN programs p ON cs.program_id = p.id
                    WHERE cs.program_id = ${programId}`;
      }

      const result = await db.execute(query);
      res.json(result.rows);
    } catch (error) {
      console.error('[COACH-SIGNUP] Get error:', error);
      res.status(500).json({ message: "Failed to fetch coach signups" });
    }
  });

  // Helper function to create Salesforce Participant or Lead
  // 1. Search for existing Contact by email OR phone
  // 2. If Contact found → Create Participant__c record
  // 3. If Contact NOT found → Create Lead instead
  async function createSalesforceParticipant(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    programSalesforceId: string;
    participantType?: string; // "Coach Applicant" or "Presenter Applicant"
  }) {
    const config = salesforceService.config;
    const participantType = data.participantType || 'Coach Applicant';

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

first_name = '${data.firstName.replace(/'/g, "\\'")}'
last_name = '${data.lastName.replace(/'/g, "\\'")}'
email = '${data.email.replace(/'/g, "\\'")}'
phone = '${(data.phone || '').replace(/'/g, "\\'")}'
program_id = '${data.programSalesforceId}'
participant_type = '${participantType}'

result = {"success": False}

try:
    # Step 1: Search for existing Contact by email OR phone
    contact_id = None

    # First try email match
    if email:
        contact_query = sf.query(f"SELECT Id, FirstName, LastName, Email, Phone FROM Contact WHERE Email = '{email}' LIMIT 1")
        if contact_query['totalSize'] > 0:
            contact_id = contact_query['records'][0]['Id']
            result['contactFoundBy'] = 'email'

    # If not found by email, try phone match
    if not contact_id and phone:
        # Clean phone for comparison (remove common formatting)
        phone_query = sf.query(f"SELECT Id, FirstName, LastName, Email, Phone FROM Contact WHERE Phone = '{phone}' LIMIT 1")
        if phone_query['totalSize'] > 0:
            contact_id = phone_query['records'][0]['Id']
            result['contactFoundBy'] = 'phone'

    if contact_id:
        # Contact found - create Participant
        result['contactFound'] = True
        result['contactId'] = contact_id

        # Check if Participant already exists for this Contact + Program
        existing_participant = sf.query(f"SELECT Id FROM Participant__c WHERE Client__c = '{contact_id}' AND Program__c = '{program_id}' LIMIT 1")

        if existing_participant['totalSize'] > 0:
            result['participantExists'] = True
            result['participantId'] = existing_participant['records'][0]['Id']
            result['success'] = True
            result['message'] = 'Participant already registered for this program'
        else:
            # Create Participant__c record
            new_participant = sf.Participant__c.create({
                'Client__c': contact_id,
                'Program__c': program_id,
                'Participant_Type2__c': participant_type
            })
            result['participantId'] = new_participant['id']
            result['participantCreated'] = True
            result['success'] = True
            result['message'] = 'Participant created successfully'
    else:
        # Contact NOT found - create Lead instead
        # Get program name for lead description
        program_query = sf.query(f"SELECT Name FROM Program__c WHERE Id = '{program_id}' LIMIT 1")
        program_name = program_query['records'][0]['Name'] if program_query['totalSize'] > 0 else 'Unknown Program'

        new_lead = sf.Lead.create({
            'FirstName': first_name,
            'LastName': last_name,
            'Email': email,
            'Phone': phone if phone else None,
            'Company': 'n/a',
            'Status': 'Interested',
            'LeadSource': 'Volunteer App',
            'Description': f'Signed up as {participant_type} for program: {program_name} (ID: {program_id})'
        })
        result['leadCreated'] = True
        result['leadId'] = new_lead['id']
        result['success'] = True
        result['message'] = 'Lead created - no matching Contact found'

except Exception as e:
    result['error'] = str(e)
    result['success'] = False

print(json.dumps(result))
`;

    try {
      const result = await salesforceService['executePythonScript'](scriptContent);
      console.log('[COACH-SIGNUP] Salesforce participant result:', result);
      return result;
    } catch (error) {
      console.error('[COACH-SIGNUP] Salesforce participant error:', error);
      throw error;
    }
  }

  // ============================================
  // END COACH SIGNUPS
  // ============================================

  // Explore Participant__c object fields in Salesforce
  app.get("/api/salesforce/describe-participant", async (req, res) => {
    const config = salesforceService.config;

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

results = {}

# Describe Participant__c object
try:
    desc = sf.Participant__c.describe()
    fields = []
    for f in desc['fields']:
        field_info = {
            'name': f['name'],
            'label': f['label'],
            'type': f['type'],
            'required': not f['nillable'] and not f['defaultedOnCreate']
        }
        if f['type'] == 'picklist':
            field_info['picklistValues'] = [p['value'] for p in f['picklistValues'] if p['active']]
        if f['type'] == 'reference':
            field_info['referenceTo'] = f['referenceTo']
        fields.append(field_info)
    results['Participant__c'] = {
        'exists': True,
        'fields': fields
    }
except Exception as e:
    results['Participant__c'] = {'exists': False, 'error': str(e)}

# Also check Contact for creating new contacts
try:
    contact_desc = sf.Contact.describe()
    contact_fields = []
    for f in contact_desc['fields']:
        if f['name'] in ['Id', 'FirstName', 'LastName', 'Email', 'Phone', 'AccountId', 'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode']:
            contact_fields.append({
                'name': f['name'],
                'label': f['label'],
                'type': f['type'],
                'required': not f['nillable'] and not f['defaultedOnCreate']
            })
    results['Contact'] = {
        'exists': True,
        'key_fields': contact_fields
    }
except Exception as e:
    results['Contact'] = {'exists': False, 'error': str(e)}

print(json.dumps(results))
`;

    try {
      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Search for a Contact by email
  app.get("/api/salesforce/search-contact", async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const config = salesforceService.config;
    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

email = '${(email as string).replace(/'/g, "\\'")}'

# Search for contact by email
result = sf.query(f"SELECT Id, FirstName, LastName, Email, Phone, AccountId FROM Contact WHERE Email = '{email}' LIMIT 1")

if result['totalSize'] > 0:
    contact = result['records'][0]
    print(json.dumps({
        "found": True,
        "contact": {
            "id": contact['Id'],
            "firstName": contact.get('FirstName'),
            "lastName": contact.get('LastName'),
            "email": contact.get('Email'),
            "phone": contact.get('Phone'),
            "accountId": contact.get('AccountId')
        }
    }))
else:
    print(json.dumps({"found": False}))
`;

    try {
      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
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

  // Test query for a specific program ID
  app.get("/api/salesforce/test-program/:programId", async (req, res) => {
    try {
      const { programId } = req.params;
      const config = salesforceService['config'];
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Domain should be 'login', 'test', or custom domain subdomain (e.g., 'wmm')
    domain = '${config.domain}'
    
    # For custom domains, we need to use instance_url instead
    if domain not in ['login', 'test'] and '.' not in domain:
        # Custom domain - use instance_url parameter
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(
            username='${config.username}',
            password='${config.password}',
            security_token='${config.securityToken}',
            instance_url=instance_url
        )
    else:
        # Standard domain
        sf = Salesforce(
            username='${config.username}',
            password='${config.password}',
            security_token='${config.securityToken}',
            domain=domain
        )
    
    # Try to query the specific program
    try:
        program = sf.Program__c.get('${programId}')
        print(json.dumps({
            "success": True,
            "program": program
        }))
    except Exception as e:
        # Try SOQL query instead
        try:
            query = f"SELECT Id, Name, Program_Start_Date__c FROM Program__c WHERE Id = '${programId}'"
            result = sf.query(query)
            print(json.dumps({
                "success": True,
                "query": query,
                "result": result
            }))
        except Exception as e2:
            print(json.dumps({
                "success": False,
                "error": str(e2),
                "originalError": str(e)
            }))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
      
      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json(result);
    } catch (error) {
      console.error("Failed to test program query:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to test program query: ${error}` 
      });
    }
  });

  // DEBUG: Test different date filters for programs
  app.get("/api/salesforce/debug-quarter-query", async (req, res) => {
    try {
      const config = salesforceService.config;
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    from datetime import datetime

    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'

    if domain not in ['login', 'test'] and '.' not in domain:
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=instance_url)
    else:
        sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

    results = {}

    # Test 1: THIS_QUARTER
    try:
        query1 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c WHERE Program_Start_Date__c = THIS_QUARTER LIMIT 10"
        result1 = sf.query(query1)
        results["THIS_QUARTER"] = {
            "query": query1,
            "count": result1.get('totalSize', 0),
            "records": [{"Id": r.get("Id"), "Name": r.get("Name"), "StartDate": r.get("Program_Start_Date__c")} for r in result1.get('records', [])]
        }
    except Exception as e1:
        results["THIS_QUARTER"] = {"error": str(e1)}

    # Test 2: THIS_FISCAL_QUARTER
    try:
        query2 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c WHERE Program_Start_Date__c = THIS_FISCAL_QUARTER LIMIT 10"
        result2 = sf.query(query2)
        results["THIS_FISCAL_QUARTER"] = {
            "query": query2,
            "count": result2.get('totalSize', 0),
            "records": [{"Id": r.get("Id"), "Name": r.get("Name"), "StartDate": r.get("Program_Start_Date__c")} for r in result2.get('records', [])]
        }
    except Exception as e2:
        results["THIS_FISCAL_QUARTER"] = {"error": str(e2)}

    # Test 3: Explicit date range (Q4 2025: Oct 1 - Dec 31)
    try:
        query3 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c WHERE Program_Start_Date__c >= 2025-10-01 AND Program_Start_Date__c <= 2025-12-31 LIMIT 10"
        result3 = sf.query(query3)
        results["EXPLICIT_Q4_2025"] = {
            "query": query3,
            "count": result3.get('totalSize', 0),
            "records": [{"Id": r.get("Id"), "Name": r.get("Name"), "StartDate": r.get("Program_Start_Date__c")} for r in result3.get('records', [])]
        }
    except Exception as e3:
        results["EXPLICIT_Q4_2025"] = {"error": str(e3)}

    # Test 4: Recent programs (last 30 days to next 60 days)
    try:
        query4 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c WHERE Program_Start_Date__c >= LAST_N_DAYS:30 AND Program_Start_Date__c <= NEXT_N_DAYS:60 LIMIT 10"
        result4 = sf.query(query4)
        results["LAST_30_NEXT_60"] = {
            "query": query4,
            "count": result4.get('totalSize', 0),
            "records": [{"Id": r.get("Id"), "Name": r.get("Name"), "StartDate": r.get("Program_Start_Date__c")} for r in result4.get('records', [])]
        }
    except Exception as e4:
        results["LAST_30_NEXT_60"] = {"error": str(e4)}

    # Test 5: All programs (no filter)
    try:
        query5 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c ORDER BY Program_Start_Date__c DESC NULLS LAST LIMIT 10"
        result5 = sf.query(query5)
        results["ALL_PROGRAMS"] = {
            "query": query5,
            "count": result5.get('totalSize', 0),
            "records": [{"Id": r.get("Id"), "Name": r.get("Name"), "StartDate": r.get("Program_Start_Date__c")} for r in result5.get('records', [])]
        }
    except Exception as e5:
        results["ALL_PROGRAMS"] = {"error": str(e5)}

    # Get current date info
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1

    print(json.dumps({
        "success": True,
        "currentDate": now.strftime("%Y-%m-%d"),
        "currentQuarter": f"Q{quarter} {now.year}",
        "results": results
    }))

except Exception as e:
    import traceback
    print(json.dumps({
        "success": False,
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
`;

      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to test quarter queries: ${error}`
      });
    }
  });

  // SIMPLE endpoint to get all programs - uses exact working query
  app.get("/api/salesforce/programs-simple", async (req, res) => {
    try {
      const config = salesforceService.config;
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'
    
    if domain not in ['login', 'test'] and '.' not in domain:
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=instance_url)
    else:
        sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)
    
    # Use the EXACT query that we know works
    query = "SELECT Id, Name, Program_Start_Date__c, Program_End_Date__c, Status__c, Status_a__c FROM Program__c LIMIT 100"
    print(f"DEBUG: Executing: {query}", file=sys.stderr)
    
    result = sf.query(query)
    records = result.get('records', [])
    total = result.get('totalSize', 0)
    
    print(f"DEBUG: Got {total} total, {len(records)} records", file=sys.stderr)
    
    print(json.dumps({
        "success": True,
        "records": records,
        "totalSize": total
    }))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    import traceback
    print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
`;

      const result = await salesforceService['executePythonScript'](scriptContent);
      console.log('[SIMPLE] Result:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        return res.status(500).json({ success: false, error: result.error });
      }
      
      res.json({
        success: true,
        programs: result.records || [],
        count: result.records?.length || 0,
        totalSize: result.totalSize || 0
      });
    } catch (error) {
      console.error('[SIMPLE] Error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Describe Program__c object to see all available fields
  app.get("/api/salesforce/describe-program", async (req, res) => {
    try {
      const config = salesforceService.config;
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json

    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'

    if domain not in ['login', 'test'] and '.' not in domain:
        sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
    else:
        sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

    # Describe Program__c object
    program_desc = sf.Program__c.describe()

    # Filter for coach/volunteer related fields
    all_fields = [{"name": f['name'], "type": f['type'], "label": f['label']} for f in program_desc['fields']]
    coach_fields = [f for f in all_fields if 'coach' in f['name'].lower() or 'coach' in f['label'].lower() or 'volunteer' in f['name'].lower() or 'volunteer' in f['label'].lower() or 'number' in f['name'].lower()]

    print(json.dumps({
        "success": True,
        "coachRelatedFields": coach_fields,
        "allFields": all_fields
    }))

except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
`;

      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to describe Program__c: ${error}`
      });
    }
  });

  // Query Programs from Salesforce
  app.get("/api/salesforce/programs", async (req, res) => {
    try {
      const { currentQuarter, next60Days } = req.query;
      const filterByCurrentQuarter = currentQuarter === 'true' || currentQuarter === '1';
      const filterByNext60Days = next60Days === 'true' || next60Days === '1';
      
      console.log(`[API] Querying programs - Current Quarter: ${filterByCurrentQuarter}, Next 60 Days: ${filterByNext60Days}`);
      
      const result = await salesforceService.programService.getPrograms(filterByCurrentQuarter, filterByNext60Days);
      
      // Simplified function always returns { records, debug, stderr }
      const programs = result.records || [];
      const debug = result.debug || null;
      const stderr = result.stderr || null;
      
      console.log(`[API] Query result:`, {
        programsCount: programs.length,
        hasDebug: !!debug,
        debugInfo: debug
      });
      
      res.json({ 
        success: true,
        programs,
        count: programs.length,
        filteredByCurrentQuarter: filterByCurrentQuarter,
        filteredByNext60Days: filterByNext60Days,
        debug: debug,
        stderr: stderr
      });
    } catch (error) {
      console.error("Failed to query Programs:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to query Programs: ${error}` 
      });
    }
  });

  // Query Workshops for a specific Program
  app.get("/api/salesforce/programs/:programId/workshops", async (req, res) => {
    try {
      const { programId } = req.params;
      const workshops = await salesforceService.programService.getWorkshopsForProgram(programId);
      res.json({ 
        success: true,
        programId,
        workshops,
        count: workshops.length
      });
    } catch (error) {
      console.error(`Failed to query Workshops for Program ${req.params.programId}:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to query Workshops: ${error}` 
      });
    }
  });

  // Test Workshop query directly
  app.get("/api/salesforce/test-workshop-query", async (req, res) => {
    try {
      const config = salesforceService.config;
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json

    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'

    if domain not in ['login', 'test'] and '.' not in domain:
        sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
    else:
        sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

    # Try to query workshops with date filter
    query = "SELECT Id, Name, Program__c, Date_Time__c, Presenter__c, Site_Name__c FROM Workshop__c WHERE Date_Time__c >= LAST_QUARTER AND Date_Time__c <= NEXT_N_QUARTERS:2 ORDER BY Date_Time__c DESC LIMIT 5"
    result = sf.query(query)

    print(json.dumps({
        "success": True,
        "query": query,
        "totalSize": result.get('totalSize', 0),
        "records": result.get('records', [])
    }))

except Exception as e:
    import traceback
    print(json.dumps({
        "success": False,
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
`;

      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to test workshop query: ${error}`
      });
    }
  });

  // Describe Workshop__c object to see available fields
  app.get("/api/salesforce/describe-workshop", async (req, res) => {
    try {
      const config = salesforceService.config;
      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json

    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'

    if domain not in ['login', 'test'] and '.' not in domain:
        sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
    else:
        sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

    # Describe Workshop__c object
    workshop_desc = sf.Workshop__c.describe()
    fields = [{"name": f['name'], "type": f['type'], "label": f['label']} for f in workshop_desc['fields']]

    # Also try to count workshops
    count_query = "SELECT COUNT() FROM Workshop__c"
    count_result = sf.query(count_query)

    print(json.dumps({
        "success": True,
        "fields": fields,
        "totalWorkshops": count_result.get('totalSize', 0)
    }))

except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const result = await salesforceService['executePythonScript'](scriptContent);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to describe Workshop__c: ${error}`
      });
    }
  });

  // Get all Programs with their Workshops
  app.get("/api/salesforce/programs-with-workshops", async (req, res) => {
    try {
      const { currentQuarter, next60Days } = req.query;
      const filterByCurrentQuarter = currentQuarter === 'true' || currentQuarter === '1';
      const filterByNext60Days = next60Days === 'true' || next60Days === '1';
      
      const programsWithWorkshops = await salesforceService.programService.getProgramsWithWorkshops(filterByCurrentQuarter, filterByNext60Days);
      res.json({ 
        success: true,
        data: programsWithWorkshops,
        count: programsWithWorkshops.length,
        filteredByCurrentQuarter: filterByCurrentQuarter,
        filteredByNext60Days: filterByNext60Days
      });
    } catch (error) {
      console.error("Failed to query Programs with Workshops:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to query Programs with Workshops: ${error}` 
      });
    }
  });

  // Sync Programs and Workshops from Salesforce to Database - SIMPLIFIED
  app.post("/api/salesforce/sync-programs", async (req, res) => {
    try {
      const { currentQuarter, next60Days } = req.body;
      const filterByCurrentQuarter = currentQuarter === true || currentQuarter === 'true' || currentQuarter === '1';
      const filterByNext60Days = next60Days === true || next60Days === 'true' || next60Days === '1';

      console.log(`[SYNC] Starting sync - Current Quarter: ${filterByCurrentQuarter}, Next 60 Days: ${filterByNext60Days}`);

      const config = salesforceService.config;

      // Build date filter for SOQL query
      let whereClause = "";
      if (filterByNext60Days) {
        whereClause = "WHERE Program_Start_Date__c >= TODAY AND Program_Start_Date__c <= NEXT_N_DAYS:60";
      } else if (filterByCurrentQuarter) {
        whereClause = "WHERE Program_Start_Date__c = THIS_QUARTER";
      }

      const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

from simple_salesforce import Salesforce
import json

domain = '${config.domain}'
username = '${config.username}'
password = '${config.password}'
security_token = '${config.securityToken}'

if domain not in ['login', 'test'] and '.' not in domain:
    sf = Salesforce(username=username, password=password, security_token=security_token, instance_url=f"https://{domain}.my.salesforce.com")
else:
    sf = Salesforce(username=username, password=password, security_token=security_token, domain=domain)

query = """SELECT Id, Name, Program_Start_Date__c, Program_End_Date__c,
    Status__c, Status_a__c, Type__c, Format__c, Language__c,
    Workshop_Day__c, Workshop_Time__c, workshop_frequency__c, Number_of_Workshops__c,
    Program_Leader_Full_Name__c, Total_Participants__c, Number_of_Coaches_in_Program__c,
    Zoom_link__c, Program_Schedule_Link__c,
    Workshop_Start_Date_Time__c, Program_Partner__r.Name
    FROM Program__c ${whereClause} LIMIT 100"""
result = sf.query(query)

print(json.dumps({
    "success": True,
    "records": result.get('records', []),
    "totalSize": result.get('totalSize', 0),
    "query": query
}))
`;

      const pythonResult = await salesforceService['executePythonScript'](scriptContent);

      if (pythonResult.error) {
        return res.status(500).json({ success: false, error: pythonResult.error });
      }

      const sfPrograms = pythonResult.records || [];
      console.log(`[SYNC] Found ${sfPrograms.length} programs in Salesforce`);
      console.log(`[SYNC] Query used: ${pythonResult.query}`);

      if (sfPrograms.length === 0) {
        return res.json({
          success: false,
          message: `No programs found. Query returned 0 programs.`,
          programsSynced: 0,
          workshopsSynced: 0,
          debug: { query: pythonResult.query }
        });
      }

      // Sync them using the sync service
      const syncService = new ProgramSyncService(salesforceService.programService);
      let programsSynced = 0;
      let workshopsSynced = 0;

      for (const sfProgram of sfPrograms) {
        try {
          console.log(`[SYNC] Syncing program ${sfProgram.Id} (${sfProgram.Name})`);
          const { program, workshops } = await syncService.syncProgram(sfProgram);
          programsSynced++;
          workshopsSynced += workshops.length;
          console.log(`[SYNC] Program ${sfProgram.Id}: synced ${workshops.length} workshops`);
        } catch (error) {
          console.error(`Failed to sync program ${sfProgram.Id}:`, error);
        }
      }

      console.log(`[SYNC] Completed - ${programsSynced} programs, ${workshopsSynced} workshops`);

      res.json({
        success: true,
        message: `Synced ${programsSynced} programs and ${workshopsSynced} workshops to database`,
        programsSynced,
        workshopsSynced
      });
    } catch (error) {
      console.error("Failed to sync Programs:", error);
      res.status(500).json({
        success: false,
        message: `Failed to sync Programs: ${error}`
      });
    }
  });

  // Debug endpoint to test getAllWorkshops
  app.get("/api/salesforce/test-get-all-workshops", async (req, res) => {
    try {
      console.log(`[TEST-GET-ALL-WORKSHOPS] Starting`);
      const sfWorkshops = await salesforceService.programService.getAllWorkshops();
      console.log(`[TEST-GET-ALL-WORKSHOPS] Returned ${sfWorkshops.length} workshops`);

      res.json({
        success: sfWorkshops.length > 0,
        count: sfWorkshops.length,
        workshops: sfWorkshops.slice(0, 3), // First 3
        message: sfWorkshops.length === 0 ? "getAllWorkshops returned empty array - check server logs" : `Found ${sfWorkshops.length} workshops`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Debug endpoint: Try to sync just ONE workshop using RAW SQL (bypasses Drizzle schema)
  app.post("/api/salesforce/sync-one-workshop", async (req, res) => {
    try {
      // Get workshops
      const sfWorkshops = await salesforceService.programService.getAllWorkshops();
      if (sfWorkshops.length === 0) {
        return res.json({ success: false, error: "No workshops found from Salesforce" });
      }

      const sfWorkshop = sfWorkshops[0]; // Just the first one
      console.log(`[SYNC-ONE] Trying to sync workshop:`, JSON.stringify(sfWorkshop, null, 2));

      // Find matching program using raw SQL
      let dbProgramId = null;
      if (sfWorkshop.Program__c) {
        const programResult = await db.execute(
          sql`SELECT id FROM programs WHERE salesforce_id = ${sfWorkshop.Program__c} LIMIT 1`
        );
        if (programResult.rows.length > 0) {
          dbProgramId = (programResult.rows[0] as any).id;
          console.log(`[SYNC-ONE] Found matching program: ${dbProgramId}`);
        } else {
          console.log(`[SYNC-ONE] No matching program for ${sfWorkshop.Program__c}`);
        }
      }

      // Parse date
      let workshopDate = new Date();
      let startTime = "9:00 AM";
      if (sfWorkshop.Date_Time__c) {
        workshopDate = new Date(sfWorkshop.Date_Time__c);
        startTime = workshopDate.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: true
        });
      }

      const workshopName = sfWorkshop.Name || "Unnamed Workshop";

      // Use RAW SQL to insert (bypasses Drizzle schema which may be out of sync)
      const insertResult = await db.execute(sql`
        INSERT INTO workshops (
          id, salesforce_id, program_id, name, title, topic, description,
          date, start_time, end_time, location, max_participants,
          current_participants, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${sfWorkshop.Id},
          ${dbProgramId},
          ${workshopName},
          ${workshopName},
          NULL,
          ${'Workshop: ' + workshopName},
          ${workshopDate},
          ${startTime},
          ${'5:00 PM'},
          ${sfWorkshop.Site_Name__c || null},
          NULL,
          0,
          'scheduled',
          NOW(),
          NOW()
        )
        ON CONFLICT (salesforce_id) DO UPDATE SET
          name = EXCLUDED.name,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          date = EXCLUDED.date,
          start_time = EXCLUDED.start_time,
          program_id = EXCLUDED.program_id,
          location = EXCLUDED.location,
          updated_at = NOW()
        RETURNING id, name, title
      `);

      res.json({
        success: true,
        message: "Successfully synced 1 workshop!",
        result: insertResult.rows[0]
      });
    } catch (error) {
      console.error(`[SYNC-ONE] Error:`, error);
      res.status(500).json({
        success: false,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Sync All Workshops from Salesforce to Database
  app.post("/api/salesforce/sync-workshops", async (req, res) => {
    try {
      console.log(`[SYNC-WORKSHOPS] ===== Starting workshop sync - CODE VERSION: ${new Date().toISOString()} =====`);
      console.log(`[SYNC-WORKSHOPS] Using method: salesforceService.programService.getAllWorkshops()`);

      // Get all workshops from Salesforce
      const sfWorkshops = await salesforceService.programService.getAllWorkshops();
      console.log(`[SYNC-WORKSHOPS] getAllWorkshops() returned ${sfWorkshops.length} workshops`);
      console.log(`[SYNC-WORKSHOPS] Type of result:`, typeof sfWorkshops, `Array.isArray:`, Array.isArray(sfWorkshops));

      if (sfWorkshops.length > 0) {
        console.log(`[SYNC-WORKSHOPS] Sample workshop:`, JSON.stringify(sfWorkshops[0], null, 2));
      }

      if (sfWorkshops.length === 0) {
        return res.json({
          success: true,
          message: `No workshops found in Salesforce. getAllWorkshops() returned empty array. Check server logs for errors.`,
          workshopsSynced: 0,
          debug: {
            note: "The method returned [] - check [getAllWorkshops] logs for query errors"
          }
        });
      }

      // Sync each workshop to database using RAW SQL (bypasses Drizzle schema mismatch)
      let workshopsSynced = 0;

      for (const sfWorkshop of sfWorkshops) {
        try {
          // Map Salesforce program ID to database program ID using raw SQL
          let dbProgramId = null;
          if (sfWorkshop.Program__c) {
            const programResult = await db.execute(
              sql`SELECT id FROM programs WHERE salesforce_id = ${sfWorkshop.Program__c} LIMIT 1`
            );
            if (programResult.rows.length > 0) {
              dbProgramId = (programResult.rows[0] as any).id;
            }
          }

          // Parse date from Date_Time__c
          let workshopDate = new Date();
          let startTime = "9:00 AM";

          if (sfWorkshop.Date_Time__c) {
            const dateTime = new Date(sfWorkshop.Date_Time__c);
            workshopDate = dateTime;
            startTime = dateTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }

          const workshopName = sfWorkshop.Name || "Unnamed Workshop";
          // Workshop_Type__c is the EXISTING field in Salesforce - use this!
          const workshopType = (sfWorkshop as any).Workshop_Type__c || null;
          // Format__c from Salesforce Workshop object
          const workshopFormat = (sfWorkshop as any).Format__c || null;
          // Topic field - try both possible field names
          const workshopTopic = (sfWorkshop as any).Topic__c || (sfWorkshop as any).Workshop_Topic__c || null;

          // Use RAW SQL with UPSERT (bypasses Drizzle schema)
          await db.execute(sql`
            INSERT INTO workshops (
              id, salesforce_id, program_id, name, title, topic, workshop_type, description,
              date, start_time, end_time, location, max_participants,
              current_participants, status, created_at, updated_at
            ) VALUES (
              gen_random_uuid(),
              ${sfWorkshop.Id},
              ${dbProgramId},
              ${workshopName},
              ${workshopName},
              ${workshopTopic},
              ${workshopType},
              ${workshopFormat},
              NULL,
              ${workshopDate},
              ${startTime},
              ${'5:00 PM'},
              ${sfWorkshop.Site_Name__c || null},
              NULL,
              0,
              'scheduled',
              NOW(),
              NOW()
            )
            ON CONFLICT (salesforce_id) DO UPDATE SET
              name = EXCLUDED.name,
              title = EXCLUDED.title,
              topic = EXCLUDED.topic,
              workshop_type = EXCLUDED.workshop_type,
              format = EXCLUDED.format,
              description = EXCLUDED.description,
              date = EXCLUDED.date,
              start_time = EXCLUDED.start_time,
              program_id = EXCLUDED.program_id,
              location = EXCLUDED.location,
              updated_at = NOW()
          `);
          workshopsSynced++;
        } catch (error) {
          console.error(`Failed to sync workshop ${sfWorkshop.Id}:`, error);
          // Return error on first failure so we can see what's wrong
          return res.status(500).json({
            success: false,
            message: `Failed to sync workshop ${sfWorkshop.Id}: ${error}`,
            workshopsSynced,
            failedWorkshop: sfWorkshop,
            error: String(error)
          });
        }
      }

      console.log(`[SYNC-WORKSHOPS] Completed - ${workshopsSynced} workshops synced`);

      res.json({
        success: true,
        message: `Synced ${workshopsSynced} workshops to database`,
        workshopsSynced
      });
    } catch (error) {
      console.error("Failed to sync Workshops:", error);
      res.status(500).json({
        success: false,
        message: `Failed to sync Workshops: ${error}`
      });
    }
  });

  // Program routes
  app.get("/api/programs", async (req, res) => {
    try {
      const filters = programQuerySchema.parse(req.query);
      const programs = await storage.getAllPrograms(filters);
      console.log(`[API /api/programs] Returning ${programs.length} programs from database`);
      res.json(programs);
    } catch (error) {
      console.error('[API /api/programs] Error:', error);
      res.status(400).json({ message: "Invalid query parameters" });
    }
  });

  // Debug endpoint to check database connection
  app.get("/api/debug/db-connection", async (req, res) => {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      // Extract connection info without exposing password
      const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
      const connectionInfo = urlMatch ? {
        user: urlMatch[1],
        host: urlMatch[3],
        database: urlMatch[4],
        hasPassword: !!urlMatch[2]
      } : { error: 'Could not parse DATABASE_URL' };
      
      // Try a simple query to test connection
      try {
        const testResult = await db.execute(sql`SELECT 1 as test, current_database() as db_name, version() as version`);
        res.json({
          success: true,
          connectionInfo,
          testQuery: 'Success',
          databaseName: testResult.rows[0]?.db_name,
          version: (testResult.rows[0]?.version as string)?.substring?.(0, 50) || 'Unknown'
        });
      } catch (queryError) {
        res.json({
          success: false,
          connectionInfo,
          error: String(queryError)
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error checking database connection:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug endpoint to check what's in Neon database
  app.get("/api/debug/db-programs", async (req, res) => {
    try {
      // First check what tables exist
      const tablesResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      const tables = tablesResult.rows.map((r: any) => r.table_name);
      
      // Check if programs table exists
      const hasProgramsTable = tables.includes('programs');
      
      if (!hasProgramsTable) {
        return res.json({ 
          count: 0,
          programs: [],
          tables: tables,
          message: 'Database schema not applied. Tables missing. Click "Push Database Schema" to create tables.',
          schemaMissing: true,
          error: 'relation "programs" does not exist'
        });
      }
      
      // If table exists, try to query programs
      try {
        const programs = await storage.getAllPrograms({});
        console.log(`[DEBUG] Database has ${programs.length} programs`);
        
        res.json({ 
          count: programs.length,
          programs: programs.slice(0, 5), // First 5 for debugging
          tables: tables,
          message: `Database contains ${programs.length} programs`
        });
      } catch (queryError: any) {
        // If query fails, still return table info
        res.json({
          count: 0,
          programs: [],
          tables: tables,
          message: `Tables exist but query failed: ${queryError.message}`,
          queryError: String(queryError)
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error checking database:', error);
      res.status(500).json({ 
        error: String(error),
        message: 'Failed to check database. Verify DATABASE_URL is correct.'
      });
    }
  });

  // Admin endpoint to add workshop type and format columns
  app.post("/api/admin/add-workshop-columns", async (req, res) => {
    try {
      console.log('[MIGRATION] Adding workshop_type and format columns to workshops table...');
      
      // Check if old 'type' column exists and migrate it
      const columnsResult = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'workshops' AND column_name IN ('workshop_type', 'type')
      `);
      const existingColumns = columnsResult.rows.map((r: any) => r.column_name);
      
      if (existingColumns.includes('type') && !existingColumns.includes('workshop_type')) {
        // Migrate from 'type' to 'workshop_type'
        await db.execute(sql`ALTER TABLE workshops RENAME COLUMN type TO workshop_type`);
        console.log('[MIGRATION] ✓ Renamed type to workshop_type');
      } else if (!existingColumns.includes('workshop_type')) {
        // Add workshop_type column
        await db.execute(sql`
          ALTER TABLE workshops
          ADD COLUMN IF NOT EXISTS workshop_type TEXT
        `);
        console.log('[MIGRATION] ✓ Added workshop_type column');
      }
      
      // Add format column
      await db.execute(sql`
        ALTER TABLE workshops
        ADD COLUMN IF NOT EXISTS format TEXT
      `);
      console.log('[MIGRATION] ✓ Added format column');
      
      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_workshops_workshop_type ON workshops(workshop_type)
      `);
      console.log('[MIGRATION] ✓ Created index on workshop_type column');
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_workshops_format ON workshops(format)
      `);
      console.log('[MIGRATION] ✓ Created index on format column');
      
      // Verify the columns were added
      const verifyResult = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'workshops' 
          AND column_name IN ('workshop_type', 'format')
        ORDER BY column_name
      `);
      
      const addedColumns = verifyResult.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type
      }));
      
      res.json({
        success: true,
        message: 'Successfully added workshop_type and format columns to workshops table',
        columns: addedColumns
      });
    } catch (error) {
      console.error('[MIGRATION] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add columns',
        error: String(error)
      });
    }
  });

  // Admin endpoint to push database schema
  app.post("/api/admin/push-schema", async (req, res) => {
    try {
      // Use drizzle-kit push via spawn
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const pushProcess = spawn('npx', ['drizzle-kit', 'push'], {
          env: { ...process.env },
          shell: true,
          cwd: process.cwd()
        });
        
        let stdout = '';
        let stderr = '';
        
        pushProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          console.log('[Schema Push]', data.toString());
        });
        
        pushProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          console.error('[Schema Push Error]', data.toString());
        });
        
        pushProcess.on('close', (code) => {
          if (code === 0) {
            res.json({
              success: true,
              message: 'Database schema pushed successfully',
              output: stdout
            });
          } else {
            res.status(500).json({
              success: false,
              message: 'Failed to push schema',
              error: stderr || stdout,
              code
            });
          }
          resolve(undefined);
        });
        
        pushProcess.on('error', (error) => {
          res.status(500).json({
            success: false,
            message: 'Failed to start schema push process',
            error: String(error)
          });
          resolve(undefined);
        });
      });
    } catch (error) {
      console.error('[Schema Push] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to push schema',
        error: String(error)
      });
    }
  });

  // Admin endpoint to delete old programs (before current year)
  app.delete("/api/admin/programs/cleanup", async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const cutoffDate = new Date(`${currentYear}-01-01`);

      // Find old programs
      const allPrograms = await storage.getAllPrograms({ dateRange: 'all', status: 'all' });
      const oldPrograms = allPrograms.filter(p => {
        if (!p.startDate) return false;
        return new Date(p.startDate) < cutoffDate;
      });

      console.log(`[Cleanup] Found ${oldPrograms.length} programs before ${currentYear}`);

      if (oldPrograms.length === 0) {
        return res.json({
          success: true,
          message: 'No old programs to delete',
          deleted: 0
        });
      }

      // Delete each old program (this will handle cascading deletes via storage)
      let deletedCount = 0;
      const deletedPrograms: string[] = [];

      for (const program of oldPrograms) {
        try {
          // First delete associated workshops
          const programWorkshops = await storage.getAllWorkshops({ programId: program.id, programStatus: 'all' });
          for (const workshop of programWorkshops) {
            await storage.deleteWorkshop(workshop.id);
          }

          // Then delete the program
          const deleted = await storage.deleteProgram(program.id);
          if (deleted) {
            deletedCount++;
            const year = program.startDate ? new Date(program.startDate).getFullYear() : 'unknown';
            deletedPrograms.push(`[${year}] ${program.name}`);
          }
        } catch (err) {
          console.error(`[Cleanup] Failed to delete program ${program.id}:`, err);
        }
      }

      res.json({
        success: true,
        message: `Deleted ${deletedCount} programs from before ${currentYear}`,
        deleted: deletedCount,
        programs: deletedPrograms
      });
    } catch (error) {
      console.error('[Cleanup] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup old programs',
        error: String(error)
      });
    }
  });

  app.get("/api/programs/:id", async (req, res) => {
    const program = await storage.getProgram(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.json(program);
  });

  app.post("/api/programs", async (req, res) => {
    try {
      const programData = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(programData);
      res.status(201).json(program);
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

  app.put("/api/programs/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const program = await storage.updateProgram(req.params.id, updateData);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/programs/:id", async (req, res) => {
    const success = await storage.deleteProgram(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.status(204).send();
  });

  // Debug endpoint to test workshop query
  app.get("/api/debug/workshops", async (req, res) => {
    try {
      // Simple count query
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM workshops`);
      const totalCount = (countResult.rows[0] as any)?.count || 0;
      
      // Simple select without JOIN
      const simpleResult = await db.select().from(workshops).limit(5);
      
      res.json({
        totalCount,
        sampleWorkshops: simpleResult,
        message: `Found ${totalCount} total workshops, showing ${simpleResult.length} samples`
      });
    } catch (error) {
      res.status(500).json({ 
        error: String(error),
        message: "Failed to query workshops"
      });
    }
  });

  // Workshop routes
  app.get("/api/workshops", async (req, res) => {
    try {
      // Clean up query parameters - convert empty strings to undefined
      const cleanedQuery: any = {};
      if (req.query.programId && req.query.programId !== '') {
        cleanedQuery.programId = req.query.programId;
      }
      if (req.query.status && req.query.status !== '' && req.query.status !== 'all') {
        cleanedQuery.status = req.query.status;
      }
      if (req.query.search && req.query.search !== '') {
        cleanedQuery.search = req.query.search;
      }
      if (req.query.programStatus && req.query.programStatus !== '') {
        cleanedQuery.programStatus = req.query.programStatus;
      }

      console.log('[WORKSHOPS] Query params:', req.query);
      console.log('[WORKSHOPS] Cleaned params:', cleanedQuery);

      const filters = workshopQuerySchema.parse(cleanedQuery);
      
      // First check if workshops exist at all
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM workshops`);
      const totalCount = parseInt((countResult.rows[0] as any)?.count || '0', 10);
      console.log(`[WORKSHOPS] Total workshops in DB: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log('[WORKSHOPS] No workshops found in database');
        return res.json([]);
      }
      
      const workshops = await storage.getAllWorkshops(filters);
      
      // Debug logging
      console.log(`[WORKSHOPS] Query returned ${workshops.length} workshops`);
      console.log(`[WORKSHOPS] First workshop sample:`, workshops.length > 0 ? JSON.stringify(workshops[0], null, 2) : 'none');
      
      res.json(workshops);
    } catch (error) {
      console.error('[WORKSHOPS] Error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors,
          receivedQuery: req.query
        });
      }
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  app.get("/api/workshops/:id", async (req, res) => {
    const workshop = await storage.getWorkshop(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }
    res.json(workshop);
  });

  app.post("/api/workshops", async (req, res) => {
    try {
      const workshopData = insertWorkshopSchema.parse(req.body);
      const workshop = await storage.createWorkshop(workshopData);
      res.status(201).json(workshop);
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

  app.put("/api/workshops/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const workshop = await storage.updateWorkshop(req.params.id, updateData);
      
      if (!workshop) {
        return res.status(404).json({ message: "Workshop not found" });
      }

      res.json(workshop);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/workshops/:id", async (req, res) => {
    const success = await storage.deleteWorkshop(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Workshop not found" });
    }
    res.status(204).send();
  });

  // Workshop Signups endpoint
  app.post("/api/workshop-signups", async (req, res) => {
    try {
      const { workshopId, role, status, email, firstName, lastName } = req.body;

      if (!workshopId) {
        return res.status(400).json({ message: "Workshop ID is required" });
      }

      // Get workshop details
      const workshop = await storage.getWorkshop(workshopId);
      if (!workshop) {
        return res.status(404).json({ message: "Workshop not found" });
      }

      // Get program details for type, format, and zoom link
      let program = null;
      if (workshop.programId) {
        program = await storage.getProgram(workshop.programId);
      }

      // Get volunteer by email if provided, otherwise create a temporary record
      let volunteer = null;
      if (email) {
        volunteer = await storage.getVolunteerByEmail(email);
        if (!volunteer && firstName && lastName) {
          // Create volunteer record if doesn't exist
          volunteer = await storage.createVolunteer({
            firstName,
            lastName,
            email,
            status: "active",
          });
        }
      }

      // Create participant workshop record
      if (volunteer) {
        // Check if participant exists, create if not
        let participant = await storage.getParticipantByEmail(email);
        if (!participant) {
          participant = await storage.createParticipant({
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            email: volunteer.email,
            phone: volunteer.phone || null,
            status: "active",
          });
        }

        // Register participant for workshop
        await storage.registerParticipantForWorkshop({
          participantId: participant.id,
          workshopId: workshop.id,
          notes: role ? `Role: ${role}` : null,
        });

        // Update workshop current participants count
        await storage.updateWorkshop(workshop.id, {
          currentParticipants: (workshop.currentParticipants || 0) + 1,
        });
      }

      // Send confirmation email
      if (email) {
        try {
          await sendWorkshopConfirmationEmail({
            email,
            firstName: firstName || "Volunteer",
            lastName: lastName || "",
            workshop: {
              type: workshop.workshopType || workshop.name,
              date: workshop.date,
              startTime: workshop.startTime,
              endTime: workshop.endTime,
              location: workshop.location,
            },
            program: program ? {
              type: program.programType,
              format: program.format,
              zoomLink: program.zoomLink,
            } : null,
          });
        } catch (emailError) {
          console.error("[WORKSHOP-SIGNUP] Failed to send email:", emailError);
          // Don't fail the signup if email fails
        }
      }

      res.status(201).json({
        success: true,
        message: "Successfully signed up for workshop",
        workshopId: workshop.id,
      });
    } catch (error) {
      console.error("[WORKSHOP-SIGNUP] Error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Bulk Workshop Signups endpoint
  app.post("/api/workshop-signups/bulk", async (req, res) => {
    try {
      const { workshopIds, role, status, email, firstName, lastName } = req.body;

      if (!workshopIds || !Array.isArray(workshopIds) || workshopIds.length === 0) {
        return res.status(400).json({ message: "Workshop IDs array is required" });
      }

      if (workshopIds.length > 10) {
        return res.status(400).json({ message: "Maximum 10 workshops can be selected at once" });
      }

      // Get volunteer by email if provided, otherwise create a temporary record
      let volunteer = null;
      if (email) {
        volunteer = await storage.getVolunteerByEmail(email);
        if (!volunteer && firstName && lastName) {
          volunteer = await storage.createVolunteer({
            firstName,
            lastName,
            email,
            status: "active",
          });
        }
      } else if (firstName && lastName) {
        // Create a temporary volunteer record if no email provided
        volunteer = await storage.createVolunteer({
          firstName,
          lastName,
          email: `temp-${Date.now()}@temp.local`, // Temporary email
          status: "active",
        });
      }

      if (!volunteer) {
        return res.status(400).json({ message: "Volunteer information (email or name) is required" });
      }

      // Get or create participant
      const participantEmail = email || volunteer.email;
      let participant = await storage.getParticipantByEmail(participantEmail);
      if (!participant) {
        participant = await storage.createParticipant({
          firstName: volunteer.firstName,
          lastName: volunteer.lastName,
          email: participantEmail,
          phone: volunteer.phone || null,
          status: "active",
        });
      }

      const results = [];
      const errors = [];

      // Process each workshop signup
      for (const workshopId of workshopIds) {
        try {
          const workshop = await storage.getWorkshop(workshopId);
          if (!workshop) {
            errors.push({ workshopId, error: "Workshop not found" });
            continue;
          }

          // Check if already registered
          const existingRegistrations = await storage.getParticipantWorkshops(
            participant.id,
            workshopId
          );
          if (existingRegistrations.length > 0) {
            errors.push({ workshopId, error: "Already registered for this workshop" });
            continue;
          }

          // Register participant for workshop
          await storage.registerParticipantForWorkshop({
            participantId: participant.id,
            workshopId: workshop.id,
            notes: role ? `Role: ${role}` : null,
          });

          // Update workshop current participants count
          await storage.updateWorkshop(workshop.id, {
            currentParticipants: (workshop.currentParticipants || 0) + 1,
          });

          results.push({ workshopId, success: true });

          // Get program details for email
          let program = null;
          if (workshop.programId) {
            program = await storage.getProgram(workshop.programId);
          }

          // Send confirmation email for each workshop (only if valid email provided)
          if (email && !email.startsWith('temp-')) {
            try {
              await sendWorkshopConfirmationEmail({
                email,
                firstName: firstName || volunteer.firstName,
                lastName: lastName || volunteer.lastName,
                workshop: {
                  type: workshop.workshopType || workshop.name,
                  date: workshop.date,
                  startTime: workshop.startTime,
                  endTime: workshop.endTime,
                  location: workshop.location,
                },
                program: program ? {
                  type: program.programType,
                  format: program.format,
                  zoomLink: program.zoomLink,
                } : null,
              });
            } catch (emailError) {
              console.error(`[BULK-SIGNUP] Failed to send email for workshop ${workshopId}:`, emailError);
              // Don't fail the signup if email fails
            }
          }
        } catch (error) {
          console.error(`[BULK-SIGNUP] Error processing workshop ${workshopId}:`, error);
          errors.push({ workshopId, error: String(error) });
        }
      }

      res.status(201).json({
        success: results.length > 0,
        message: `Successfully signed up for ${results.length} workshop${results.length !== 1 ? 's' : ''}`,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("[BULK-SIGNUP] Error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Helper function to send workshop confirmation email
  async function sendWorkshopConfirmationEmail(data: {
    email: string;
    firstName: string;
    lastName: string;
    workshop: {
      type: string | null;
      date: Date | string | null;
      startTime: string | null;
      endTime: string | null;
      location: string | null;
    };
    program: {
      type: string | null;
      format: string | null;
      zoomLink: string | null;
    } | null;
  }) {
    const formatDate = (date: Date | string | null) => {
      if (!date) return "TBD";
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatTime = (time: string | null) => {
      if (!time) return "";
      const match = time.match(/^(\d{2}):(\d{2})/);
      if (!match) return time;
      const hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period} EST`;
    };

    const workshopType = data.workshop.workshopType || "Workshop";
    const workshopDate = formatDate(data.workshop.date);
    const workshopTime = data.workshop.startTime 
      ? `${formatTime(data.workshop.startTime)}${data.workshop.endTime ? ` - ${formatTime(data.workshop.endTime)}` : ''}`
      : "TBD";

    // Determine location/zoom link
    let locationInfo = "";
    if (data.program?.format === "Virtual" && data.program?.zoomLink) {
      locationInfo = `Zoom Link: ${data.program.zoomLink}`;
    } else if (data.workshop.location) {
      locationInfo = `Location: ${data.workshop.location}`;
    } else if (data.program?.format === "In-Person" && data.workshop.location) {
      locationInfo = `Location: ${data.workshop.location}`;
    }

    const subject = `Workshop Registration Confirmation: ${workshopType}`;
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Workshop Registration Confirmation</h2>
            <p>Dear ${data.firstName} ${data.lastName},</p>
            <p>Thank you for registering as a presenter for the following workshop:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${workshopType}</h3>
              <p><strong>Date:</strong> ${workshopDate}</p>
              <p><strong>Time:</strong> ${workshopTime}</p>
              ${data.program?.type ? `<p><strong>Program Type:</strong> ${data.program.type}</p>` : ''}
              ${data.program?.format ? `<p><strong>Format:</strong> ${data.program.format}</p>` : ''}
              ${locationInfo ? `<p><strong>${locationInfo.includes('Zoom') ? '' : 'Location: '}</strong>${locationInfo.replace(/^(Zoom Link:|Location:)\s*/, '')}</p>` : ''}
            </div>
            ${data.program?.zoomLink && data.program.format === "Virtual" ? `
              <p><strong>Join the workshop:</strong> <a href="${data.program.zoomLink}" style="color: #2563eb;">${data.program.zoomLink}</a></p>
            ` : ''}
            <p>We look forward to having you present at this workshop!</p>
            <p>Best regards,<br>Women's Money Matters</p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Workshop Registration Confirmation

Dear ${data.firstName} ${data.lastName},

Thank you for registering as a presenter for the following workshop:

${workshopType}
Date: ${workshopDate}
Time: ${workshopTime}
${data.program?.type ? `Program Type: ${data.program.type}\n` : ''}${data.program?.format ? `Format: ${data.program.format}\n` : ''}${locationInfo ? `${locationInfo}\n` : ''}

${data.program?.zoomLink && data.program.format === "Virtual" ? `Join the workshop: ${data.program.zoomLink}\n` : ''}

We look forward to having you present at this workshop!

Best regards,
Women's Money Matters
    `;

    // TODO: Implement actual email sending using your preferred email service
    // For now, we'll log it. You can integrate with:
    // - Nodemailer
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - etc.
    
    console.log("[EMAIL] Workshop Confirmation Email:");
    console.log("To:", data.email);
    console.log("Subject:", subject);
    console.log("Body:", textBody);

    // Placeholder for actual email sending
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: data.email,
    //   subject,
    //   html: htmlBody,
    //   text: textBody,
    // });

    return { success: true, message: "Email queued for sending" };
  }

  // Participant routes
  app.get("/api/participants", async (req, res) => {
    try {
      const filters = participantQuerySchema.parse(req.query);
      const participants = await storage.getAllParticipants(filters);
      res.json(participants);
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    const participant = await storage.getParticipant(req.params.id);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }
    res.json(participant);
  });

  app.post("/api/participants", async (req, res) => {
    try {
      const participantData = insertParticipantSchema.parse(req.body);
      
      // Check if email already exists
      const existingParticipant = await storage.getParticipantByEmail(participantData.email);
      if (existingParticipant) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const participant = await storage.createParticipant(participantData);
      res.status(201).json(participant);
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

  app.put("/api/participants/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const participant = await storage.updateParticipant(req.params.id, updateData);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      res.json(participant);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/participants/:id", async (req, res) => {
    const success = await storage.deleteParticipant(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Participant not found" });
    }
    res.status(204).send();
  });

  // Participant-Workshop registration routes
  app.post("/api/participant-workshops", async (req, res) => {
    try {
      const registrationData = insertParticipantWorkshopSchema.parse(req.body);
      
      // Check if participant exists
      const participant = await storage.getParticipant(registrationData.participantId);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      // Check if workshop exists and has available spots
      const workshop = await storage.getWorkshop(registrationData.workshopId);
      if (!workshop) {
        return res.status(404).json({ message: "Workshop not found" });
      }

      const currentParticipants = workshop.currentParticipants || 0;
      if (workshop.maxParticipants && currentParticipants >= workshop.maxParticipants) {
        return res.status(400).json({ message: "Workshop is full" });
      }

      // Check if participant is already registered
      const existingRegistrations = await storage.getParticipantWorkshops(
        registrationData.participantId,
        registrationData.workshopId
      );
      if (existingRegistrations.length > 0) {
        return res.status(400).json({ message: "Already registered for this workshop" });
      }

      const registration = await storage.registerParticipantForWorkshop(registrationData);
      res.status(201).json(registration);
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

  app.get("/api/participant-workshops", async (req, res) => {
    const { participantId, workshopId } = req.query;
    const registrations = await storage.getParticipantWorkshops(
      participantId as string,
      workshopId as string
    );
    res.json(registrations);
  });

  app.put("/api/participant-workshops/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const registration = await storage.updateParticipantWorkshop(req.params.id, updateData);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      res.json(registration);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/participant-workshops/:participantId/:workshopId", async (req, res) => {
    const { participantId, workshopId } = req.params;
    const success = await storage.removeParticipantFromWorkshop(participantId, workshopId);
    if (!success) {
      return res.status(404).json({ message: "Registration not found" });
    }
    res.status(204).send();
  });

  // Seed data endpoint (for development/testing)
  app.post("/api/seed", async (req, res) => {
    try {
      const { seedRealData } = await import("./seed-data");
      const result = await seedRealData();
      res.json({ 
        success: true, 
        message: "Data seeded successfully",
        ...result
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ 
        success: false, 
        message: `Seed failed: ${error}` 
      });
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
