import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { salesforceService } from "./services/salesforce";
import { ProgramSyncService } from "./services/sync-programs";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { insertVolunteerSchema, insertOpportunitySchema, insertVolunteerSignupSchema, insertProgramSchema, insertWorkshopSchema, insertParticipantSchema, insertParticipantWorkshopSchema, workshops } from "@shared/schema";
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
});

const participantQuerySchema = z.object({
  programId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
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
    Program_Leader_Full_Name__c, Total_Participants__c, Zoom_link__c, Program_Schedule_Link__c,
    Workshop_Start_Date_Time__c, Program_Partner__r.Name
    FROM Program__c LIMIT 100"""
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

    # Try to query workshops
    query = "SELECT Id, Name, Program__c, Date_Time__c, Presenter__c, Site_Name__c FROM Workshop__c LIMIT 5"
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
    Program_Leader_Full_Name__c, Total_Participants__c, Zoom_link__c, Program_Schedule_Link__c,
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

  // Sync All Workshops from Salesforce to Database
  app.post("/api/salesforce/sync-workshops", async (req, res) => {
    try {
      console.log(`[SYNC-WORKSHOPS] Starting workshop sync`);

      // Get all workshops from Salesforce
      const sfWorkshops = await salesforceService.programService.getAllWorkshops();
      console.log(`[SYNC-WORKSHOPS] Found ${sfWorkshops.length} workshops in Salesforce`);

      if (sfWorkshops.length > 0) {
        console.log(`[SYNC-WORKSHOPS] Sample workshop:`, JSON.stringify(sfWorkshops[0], null, 2));
      }

      if (sfWorkshops.length === 0) {
        return res.json({
          success: true,
          message: `No workshops found in Salesforce. The Workshop__c object may be empty or the query failed.`,
          workshopsSynced: 0,
          debug: {
            note: "Check server logs for query errors"
          }
        });
      }

      // Sync each workshop to database
      let workshopsSynced = 0;
      const { randomUUID } = await import("crypto");

      for (const sfWorkshop of sfWorkshops) {
        try {
          // Parse date from Date_Time__c (only date field available)
          let workshopDate = null;
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

          const workshopData = {
            salesforceId: sfWorkshop.Id,
            programId: sfWorkshop.Program__c || null,
            name: workshopName,
            title: workshopName,
            topic: null,
            description: `Workshop: ${workshopName}`,
            date: workshopDate || new Date(),
            startTime: startTime,
            endTime: "5:00 PM",
            location: sfWorkshop.Site_Name__c || null,
            maxParticipants: null,
            currentParticipants: 0,
            updatedAt: new Date(),
          };

          // Check if workshop exists
          const [existingWorkshop] = await db
            .select()
            .from(workshops)
            .where(eq(workshops.salesforceId, sfWorkshop.Id))
            .limit(1);

          if (existingWorkshop) {
            await db
              .update(workshops)
              .set(workshopData)
              .where(eq(workshops.id, existingWorkshop.id));
          } else {
            await db
              .insert(workshops)
              .values({
                ...workshopData,
                id: randomUUID(),
                createdAt: new Date(),
              });
          }
          workshopsSynced++;
        } catch (error) {
          console.error(`Failed to sync workshop ${sfWorkshop.Id}:`, error);
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

  // Workshop routes
  app.get("/api/workshops", async (req, res) => {
    try {
      const filters = workshopQuerySchema.parse(req.query);
      const workshops = await storage.getAllWorkshops(filters);
      res.json(workshops);
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
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
