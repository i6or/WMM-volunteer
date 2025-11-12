import { SalesforceService } from "./salesforce";

/**
 * Salesforce Program and Workshop queries
 * Queries Programs first, then Workshops for each Program
 */

export interface SalesforceProgram {
  Id: string;
  Name: string;
  Program_Start_Date__c?: string;
  Program_End_Date__c?: string;
  Status__c?: string;
  Format__c?: string;
  Program_Leader__c?: string;
  Program_Leader_Full_Name__c?: string;
  Primary_Program_Partner__c?: string;
  Type__c?: string;
  Zoom_link__c?: string;
  Program_Schedule_Link__c?: string;
  Total_Participants__c?: number;
  Number_of_Workshops__c?: number;
  Workshop_Start_Date_Time__c?: string;
}

export interface SalesforceWorkshop {
  Id: string;
  Name: string;
  Program__c: string;
  Date_Time__c?: string;
  Presenter__c?: string;
  Attendee_Count__c?: number;
  Workshop_Name__c?: string;
}

export class SalesforceProgramService {
  private salesforceService: SalesforceService;
  
  constructor(salesforceService: SalesforceService) {
    this.salesforceService = salesforceService;
  }

  private async executePythonScript(scriptContent: string): Promise<any> {
    // Access the private executePythonScript method from SalesforceService
    return (this.salesforceService as any).executePythonScript(scriptContent);
  }

  private getConfig() {
    return (this.salesforceService as any).config;
  }

  /**
   * Get current quarter start and end dates
   */
  private getCurrentQuarterDates(): { start: string; end: string } {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    // Determine quarter
    let quarterStartMonth: number;
    let quarterEndMonth: number;
    
    if (currentMonth >= 0 && currentMonth <= 2) {
      // Q1: Jan-Mar
      quarterStartMonth = 0;
      quarterEndMonth = 2;
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      // Q2: Apr-Jun
      quarterStartMonth = 3;
      quarterEndMonth = 5;
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      // Q3: Jul-Sep
      quarterStartMonth = 6;
      quarterEndMonth = 8;
    } else {
      // Q4: Oct-Dec
      quarterStartMonth = 9;
      quarterEndMonth = 11;
    }
    
    const quarterStart = new Date(currentYear, quarterStartMonth, 1);
    const quarterEnd = new Date(currentYear, quarterEndMonth + 1, 0, 23, 59, 59); // Last day of quarter
    
    return {
      start: quarterStart.toISOString().split('T')[0] + 'T00:00:00Z',
      end: quarterEnd.toISOString().split('T')[0] + 'T23:59:59Z',
    };
  }

  /**
   * Query all Programs from Salesforce
   * @param filterByCurrentQuarter - If true, only return programs starting in the current quarter
   * @param filterByNext60Days - If true, only return programs starting in the next 60 days
   */
  async getPrograms(filterByCurrentQuarter: boolean = false, filterByNext60Days: boolean = false): Promise<SalesforceProgram[]> {
    const config = this.getConfig();
    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    from datetime import datetime
    import traceback
    
    # Get Salesforce config from environment
    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'
    
    if not username or not password:
        print(json.dumps({"error": "Salesforce credentials not configured"}))
        exit(1)
    
    # Handle custom lightning domain
    if 'lightning.force.com' in domain:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=f'https://{domain}'
        )
    else:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )
    
    # Query Programs
    # Adjust field names based on your actual Salesforce schema
    filter_by_quarter = ${filterByCurrentQuarter}
    filter_by_next_60_days = ${filterByNext60Days}
    
    from datetime import datetime, timedelta
    now = datetime.now()
    
    if filter_by_next_60_days:
        # Use Salesforce date literals for better compatibility
        # NEXT_N_DAYS:60 means next 60 days from today
        # Try >= TODAY to include today's programs
        date_filter = "Program_Start_Date__c >= TODAY AND Program_Start_Date__c <= NEXT_N_DAYS:60"
    elif filter_by_quarter:
        # Use Salesforce date literals for current quarter
        # THIS_QUARTER covers the current quarter
        date_filter = "Program_Start_Date__c = THIS_QUARTER"
    else:
        date_filter = ""
    
    # Build the WHERE clause
    # Note: Status field might be Status__c or Status_a__c, and values might be different
    # For now, don't filter by Status - let date filters handle it
    if date_filter:
        where_clause = f"WHERE {date_filter}"
    else:
        # No date filter - get all programs (no status filter to see everything)
        where_clause = ""
    
    # Build query - use WHERE only if we have a where_clause
    if where_clause:
        programs_query = f"""
            SELECT Id, Name, 
                   Program_Start_Date__c, Program_End_Date__c,
                   Status__c, Status_a__c, Format__c,
                   Program_Leader__c, Program_Leader_Full_Name__c,
                   Primary_Program_Partner__c, Type__c,
                   Zoom_link__c, Program_Schedule_Link__c,
                   Total_Participants__c, Number_of_Workshops__c,
                   Workshop_Start_Date_Time__c
            FROM Program__c
            {where_clause}
            ORDER BY Program_Start_Date__c ASC
            LIMIT 100
        """
    else:
        programs_query = """
            SELECT Id, Name, 
                   Program_Start_Date__c, Program_End_Date__c,
                   Status__c, Status_a__c, Format__c,
                   Program_Leader__c, Program_Leader_Full_Name__c,
                   Primary_Program_Partner__c, Type__c,
                   Zoom_link__c, Program_Schedule_Link__c,
                   Total_Participants__c, Number_of_Workshops__c,
                   Workshop_Start_Date_Time__c
            FROM Program__c
            ORDER BY Program_Start_Date__c DESC
            LIMIT 100
        """
    
    try:
        # First, try a simple query to see if we can access Program__c at all
        test_query = "SELECT Id, Name FROM Program__c LIMIT 5"
        test_result = sf.query(test_query)
        print(f"DEBUG: Test query (no filters) returned {test_result.get('totalSize', 0)} records", file=sys.stderr)
        
        # Try query without Status filter, with date field
        test_query2 = "SELECT Id, Name, Program_Start_Date__c, Status__c, Status_a__c FROM Program__c LIMIT 5"
        test_result2 = sf.query(test_query2)
        print(f"DEBUG: Test query 2 (with date field) returned {test_result2.get('totalSize', 0)} records", file=sys.stderr)
        
        # Try query with date filter to see if date filter works
        if date_filter:
            test_query3 = f"SELECT Id, Name, Program_Start_Date__c FROM Program__c WHERE {date_filter} LIMIT 5"
            test_result3 = sf.query(test_query3)
            print(f"DEBUG: Test query 3 (with date filter) returned {test_result3.get('totalSize', 0)} records", file=sys.stderr)
        else:
            test_result3 = {"totalSize": 0, "records": []}
        
        # Now try the full query
        programs = sf.query(programs_query)
        print(f"DEBUG: Full query returned {programs.get('totalSize', 0)} records", file=sys.stderr)
        print(f"DEBUG: Query used: {programs_query}", file=sys.stderr)
        
        print(json.dumps({
            "success": True,
            "records": programs.get('records', []),
            "totalSize": programs.get('totalSize', 0),
            "debug": {
                "testQueryResults": test_result.get('totalSize', 0),
                "testQuery2Results": test_result2.get('totalSize', 0),
                "testQuery2Records": test_result2.get('records', [])[:2],  # First 2 records
                "testQuery3Results": test_result3.get('totalSize', 0),
                "testQuery3Records": test_result3.get('records', [])[:2],  # First 2 records with date filter
                "fullQueryResults": programs.get('totalSize', 0),
                "query": programs_query
            }
        }))
    except Exception as e:
        # Try alternative field names if the above fails
        print(f"Error with standard query: {e}", file=sys.stderr)
        # Fallback: try to describe the object to see available fields
        try:
            program_desc = sf.Program__c.describe()
            available_fields = [f['name'] for f in program_desc['fields']]
            # Also try a simple query without date filters
            simple_query = "SELECT Id, Name FROM Program__c WHERE Status__c != 'Cancelled' LIMIT 5"
            simple_result = sf.query(simple_query)
            print(json.dumps({
                "success": False,
                "error": f"Query failed: {str(e)}",
                "available_fields": available_fields[:30],  # First 30 fields
                "simpleQueryResults": simple_result.get('totalSize', 0),
                "simpleQueryRecords": simple_result.get('records', [])[:2]  # First 2 records
            }))
        except Exception as desc_error:
            print(json.dumps({
                "success": False,
                "error": f"Query failed: {str(e)}",
                "describeError": str(desc_error)
            }))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const result = await this.salesforceService['executePythonScript'](scriptContent);
      console.log('[getPrograms] Raw Salesforce result:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error('Salesforce Programs query error:', result.error);
        return [];
      }

      if (result.success === false) {
        console.error('Salesforce Programs query failed:', result.error);
        if (result.available_fields) {
          console.log('Available fields:', result.available_fields);
        }
        return [];
      }

      const records = result.records || [];
      console.log(`[getPrograms] Returning ${records.length} records`);
      if (records.length > 0) {
        console.log('[getPrograms] First record:', JSON.stringify(records[0], null, 2));
      }
      
      return records;
    } catch (error) {
      console.error('Failed to query Programs:', error);
      return [];
    }
  }

  /**
   * Query Workshops for a specific Program
   */
  async getWorkshopsForProgram(programId: string): Promise<SalesforceWorkshop[]> {
    const config = this.getConfig();
    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Get Salesforce config from environment
    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'
    
    if not username or not password:
        print(json.dumps({"error": "Salesforce credentials not configured"}))
        exit(1)
    
    # Handle custom lightning domain
    if 'lightning.force.com' in domain:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=f'https://{domain}'
        )
    else:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )
    
    # Query Workshops for this Program
    # Adjust field names based on your actual Salesforce schema
    workshops_query = f"""
        SELECT Id, Name, Program__c,
               Date_Time__c, Presenter__c,
               Attendee_Count__c, Workshop_Name__c
        FROM Workshop__c
        WHERE Program__c = '{programId}'
        ORDER BY Date_Time__c ASC
    """
    
    try:
        workshops = sf.query(workshops_query)
        print(json.dumps({
            "success": True,
            "records": workshops.get('records', []),
            "totalSize": workshops.get('totalSize', 0)
        }))
    except Exception as e:
        # Try alternative field names if the above fails
        print(f"Error with standard query: {e}")
        # Fallback: try to describe the object to see available fields
        try:
            workshop_desc = sf.Workshop__c.describe()
            available_fields = [f['name'] for f in workshop_desc['fields']]
            print(json.dumps({
                "success": False,
                "error": f"Query failed: {str(e)}",
                "available_fields": available_fields[:20]  # First 20 fields
            }))
        except:
            print(json.dumps({
                "success": False,
                "error": f"Query failed: {str(e)}"
            }))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const result = await this.salesforceService['executePythonScript'](scriptContent);
      if (result.error) {
        console.error(`Salesforce Workshops query error for Program ${programId}:`, result.error);
        return [];
      }

      if (result.success === false) {
        console.error(`Salesforce Workshops query failed for Program ${programId}:`, result.error);
        if (result.available_fields) {
          console.log('Available fields:', result.available_fields);
        }
        return [];
      }

      return result.records || [];
    } catch (error) {
      console.error(`Failed to query Workshops for Program ${programId}:`, error);
      return [];
    }
  }

  /**
   * Get all Programs with their Workshops
   * @param filterByCurrentQuarter - If true, only return programs starting in the current quarter
   * @param filterByNext60Days - If true, only return programs starting in the next 60 days
   */
  async getProgramsWithWorkshops(filterByCurrentQuarter: boolean = false, filterByNext60Days: boolean = false): Promise<Array<{ program: SalesforceProgram; workshops: SalesforceWorkshop[] }>> {
    const programs = await this.getPrograms(filterByCurrentQuarter, filterByNext60Days);
    
    const programsWithWorkshops = await Promise.all(
      programs.map(async (program) => {
        const workshops = await this.getWorkshopsForProgram(program.Id);
        return {
          program,
          workshops,
        };
      })
    );

    return programsWithWorkshops;
  }
}

