import { db } from "../db";
import { programs, workshops } from "@shared/schema";
import { eq } from "drizzle-orm";
import { SalesforceProgramService, type SalesforceProgram, type SalesforceWorkshop } from "./salesforce-programs";
import { randomUUID } from "crypto";

/**
 * Sync Programs and Workshops from Salesforce to the database
 */
export class ProgramSyncService {
  constructor(private programService: SalesforceProgramService) {}

  /**
   * Convert Salesforce Program to database Program format
   */
  private convertSalesforceProgram(sfProgram: SalesforceProgram): any {
    // Parse dates
    const startDate = sfProgram.Program_Start_Date__c
      ? new Date(sfProgram.Program_Start_Date__c)
      : null;
    const endDate = sfProgram.Program_End_Date__c
      ? new Date(sfProgram.Program_End_Date__c)
      : null;

    // Map Status__c or Status_a__c to our status
    const sfStatus = (sfProgram.Status__c || sfProgram.Status_a__c || "").toLowerCase();
    let status = "active";
    if (sfStatus.includes("completed") || sfStatus.includes("closed")) {
      status = "completed";
    } else if (sfStatus.includes("planned") || sfStatus.includes("upcoming")) {
      status = "upcoming";
    } else if (sfStatus.includes("progress") || sfStatus.includes("active")) {
      status = "active";
    }

    return {
      salesforceId: sfProgram.Id,
      name: sfProgram.Name || "Unnamed Program",
      description: `Program from Salesforce: ${sfProgram.Name}`,

      // Program Details
      status: status,
      programType: (sfProgram as any).Type__c || null,
      format: (sfProgram as any).Format__c || null,
      language: (sfProgram as any).Language__c || null,

      // Dates
      startDate: startDate,
      endDate: endDate,

      // Workshop Schedule
      workshopDay: (sfProgram as any).Workshop_Day__c || null,
      workshopTime: (sfProgram as any).Workshop_Time__c || null,
      workshopFrequency: (sfProgram as any).Workshop_Frequency__c || null,
      numberOfWorkshops: (sfProgram as any).Number_of_Workshops__c || null,

      // Partner & Leader
      primaryProgramPartner: (sfProgram as any).Program_Partner__r?.Name || null,
      programLeader: null,
      programLeaderName: (sfProgram as any).Program_Leader_Full_Name__c || null,

      // Participants & Coaches
      totalParticipants: (sfProgram as any).Total_Participants__c || null,
      numberOfCoaches: (sfProgram as any).Number_of_Coaches_in_Program__c || null,

      // Links
      zoomLink: (sfProgram as any).Zoom_link__c || null,
      scheduleLink: (sfProgram as any).Program_Schedule_Link__c || null,

      // Legacy fields
      duration: (sfProgram as any).Number_of_Workshops__c
        ? `${(sfProgram as any).Number_of_Workshops__c} workshops`
        : "TBD",
      ageRange: null, // Not available in Salesforce

      updatedAt: new Date(),
    };
  }

  /**
   * Convert Salesforce Workshop to database Workshop format
   */
  private convertSalesforceWorkshop(
    sfWorkshop: SalesforceWorkshop,
    programId: string
  ): any {
    // Parse date from Date_Time__c (only field available)
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

    // Use Name field directly (Workshop_Name__c doesn't exist)
    const workshopName = sfWorkshop.Name || "Unnamed Workshop";
    // Workshop_Type__c contains the workshop type (e.g., "What is Money?", "Managing Your Money")
    const workshopType = (sfWorkshop as any).Workshop_Type__c || null;
    // Topic field - try both possible field names
    const workshopTopic = (sfWorkshop as any).Topic__c || (sfWorkshop as any).Workshop_Topic__c || null;

    return {
      salesforceId: sfWorkshop.Id,
      programId: programId,
      name: workshopName, // Keep for internal reference, but don't display
      title: workshopName, // Legacy field
      topic: workshopTopic, // Topic from Salesforce (newly created field)
      type: workshopType, // Workshop Type from Salesforce (e.g., "What is Money?")
      format: null, // Will be inherited from program if needed
      description: null, // Remove redundant description that includes workshop name
      date: workshopDate || new Date(),
      startTime: startTime,
      endTime: "5:00 PM", // Default - not available
      location: sfWorkshop.Site_Name__c || null,
      maxParticipants: null,
      currentParticipants: 0,
      updatedAt: new Date(),
    };
  }

  /**
   * Sync a single program and its workshops
   */
  async syncProgram(sfProgram: SalesforceProgram): Promise<{ program: any; workshops: any[] }> {
    // Check if program already exists by Salesforce ID
    const [existingProgram] = await db
      .select()
      .from(programs)
      .where(eq(programs.salesforceId, sfProgram.Id))
      .limit(1);

    let program;
    if (existingProgram) {
      // Update existing program
      const programData = this.convertSalesforceProgram(sfProgram);
      const [updated] = await db
        .update(programs)
        .set(programData)
        .where(eq(programs.id, existingProgram.id))
        .returning();
      program = updated;
    } else {
      // Create new program
      const programData = {
        ...this.convertSalesforceProgram(sfProgram),
        id: randomUUID(),
        createdAt: new Date(),
      };
      const [created] = await db
        .insert(programs)
        .values(programData)
        .returning();
      program = created;
    }

    // Get workshops for this program
    console.log(`[SYNC] Fetching workshops for program ${sfProgram.Id} (${sfProgram.Name})`);
    const sfWorkshops = await this.programService.getWorkshopsForProgram(sfProgram.Id);
    console.log(`[SYNC] Found ${sfWorkshops.length} workshops for program ${sfProgram.Id}`);

    // Sync workshops
    const syncedWorkshops = [];
    for (const sfWorkshop of sfWorkshops) {
      // Check if workshop already exists
      const [existingWorkshop] = await db
        .select()
        .from(workshops)
        .where(eq(workshops.salesforceId, sfWorkshop.Id))
        .limit(1);

      if (existingWorkshop) {
        // Update existing workshop
        const workshopData = this.convertSalesforceWorkshop(sfWorkshop, program.id);
        const [updated] = await db
          .update(workshops)
          .set(workshopData)
          .where(eq(workshops.id, existingWorkshop.id))
          .returning();
        syncedWorkshops.push(updated);
      } else {
        // Create new workshop
        const workshopData = {
          ...this.convertSalesforceWorkshop(sfWorkshop, program.id),
          id: randomUUID(),
          createdAt: new Date(),
        };
        const [created] = await db
          .insert(workshops)
          .values(workshopData)
          .returning();
        syncedWorkshops.push(created);
      }
    }

    return { program, workshops: syncedWorkshops };
  }

  /**
   * Sync all programs (optionally filtered by Next 60 Days or Current Quarter)
   */
  async syncAllPrograms(filterByNext60Days: boolean = false, filterByCurrentQuarter: boolean = false): Promise<{
    programsSynced: number;
    workshopsSynced: number;
    programs: any[];
  }> {
    // Query programs from Salesforce - simplified function always returns { records, debug }
    const result = await this.programService.getPrograms(filterByCurrentQuarter, filterByNext60Days);
    const sfPrograms = result.records || [];

    let totalWorkshops = 0;
    const syncedPrograms = [];

    // Sync each program
    for (const sfProgram of sfPrograms) {
      try {
        const { program, workshops } = await this.syncProgram(sfProgram);
        syncedPrograms.push(program);
        totalWorkshops += workshops.length;
      } catch (error) {
        console.error(`Failed to sync program ${sfProgram.Id}:`, error);
      }
    }

    return {
      programsSynced: syncedPrograms.length,
      workshopsSynced: totalWorkshops,
      programs: syncedPrograms,
    };
  }
}

