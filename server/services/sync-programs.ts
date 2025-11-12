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

    return {
      salesforceId: sfProgram.Id,
      name: sfProgram.Name || "Unnamed Program",
      description: `Program from Salesforce: ${sfProgram.Name}`,
      duration: sfProgram.Number_of_Workshops__c 
        ? `${sfProgram.Number_of_Workshops__c} workshops` 
        : "TBD",
      ageRange: null, // Not available in Salesforce query
      status: sfProgram.Status__c?.toLowerCase() === "planned" ? "active" : "active",
      format: sfProgram.Format__c || null,
      startDate: startDate,
      endDate: endDate,
      type: sfProgram.Type__c || null,
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
    // Parse date/time
    const dateTime = sfWorkshop.Date_Time__c 
      ? new Date(sfWorkshop.Date_Time__c) 
      : null;

    return {
      salesforceId: sfWorkshop.Id,
      programId: programId,
      title: sfWorkshop.Workshop_Name__c || sfWorkshop.Name || "Unnamed Workshop",
      description: `Workshop: ${sfWorkshop.Name}`,
      date: dateTime,
      startTime: dateTime 
        ? dateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        : null,
      endTime: null, // Not available in Salesforce query
      location: null, // Not available in Salesforce query
      maxParticipants: null,
      currentParticipants: sfWorkshop.Attendee_Count__c || 0,
      presenter: sfWorkshop.Presenter__c || null,
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
    const sfWorkshops = await this.programService.getWorkshopsForProgram(sfProgram.Id);

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
    // Query programs from Salesforce
    const sfPrograms = await this.programService.getPrograms(filterByCurrentQuarter, filterByNext60Days);

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

