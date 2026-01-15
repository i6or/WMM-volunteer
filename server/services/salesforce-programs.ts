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
  Date__c?: string;
  Workshop_Type__c?: string; // EXISTING field in Salesforce - Workshop Type (e.g., "What is Money?", "Managing Your Money")
  Format__c?: string; // Format field from Salesforce (Virtual, In-Person, etc.)
  Topic__c?: string; // Topic field (newly created in SF)
  Workshop_Topic__c?: string; // Alternative field name for Topic
  Presenter__c?: string;
  Site_Name__c?: string;
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
   * Query all Programs from Salesforce - SIMPLIFIED VERSION
   * Uses the exact query pattern that we know works (test_query2)
   */
  async getPrograms(filterByCurrentQuarter: boolean = false, filterByNext60Days: boolean = false): Promise<{ records: SalesforceProgram[]; debug?: any; stderr?: string }> {
    const config = this.getConfig();
    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Get Salesforce config
    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'
    
    if not username or not password:
        print(json.dumps({"error": "Salesforce credentials not configured"}))
        exit(1)
    
    # Connect to Salesforce
    if domain not in ['login', 'test'] and '.' not in domain:
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=instance_url
        )
    else:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )
    
    # Build date filter if needed
    filter_by_quarter = ${filterByCurrentQuarter ? 'True' : 'False'}
    filter_by_next_60_days = ${filterByNext60Days ? 'True' : 'False'}
    
    if filter_by_next_60_days:
        date_filter = "Program_Start_Date__c >= TODAY AND Program_Start_Date__c <= NEXT_N_DAYS:60"
        where_clause = f"WHERE {date_filter}"
    elif filter_by_quarter:
        date_filter = "Program_Start_Date__c = THIS_QUARTER"
        where_clause = f"WHERE {date_filter}"
    else:
        where_clause = ""
    
    # Use expanded query with all needed fields including Number_of_Coaches_in_Program__c
    fields = """Id, Name, Program_Start_Date__c, Program_End_Date__c, Status__c, Status_a__c,
        Type__c, Format__c, Language__c,
        Workshop_Day__c, Workshop_Time__c, workshop_frequency__c, Number_of_Workshops__c,
        Program_Leader_Full_Name__c, Total_Participants__c, Number_of_Coaches_in_Program__c,
        Zoom_link__c, Program_Schedule_Link__c, Program_Partner__r.Name"""
    if where_clause:
        query = f"SELECT {fields} FROM Program__c {where_clause} LIMIT 100"
    else:
        query = f"SELECT {fields} FROM Program__c LIMIT 100"
    
    print(f"DEBUG: Executing query: {query}", file=sys.stderr)
    programs = sf.query(query)
    
    records = programs.get('records', [])
    total_size = programs.get('totalSize', 0)
    
    print(f"DEBUG: Query returned {total_size} total records, {len(records)} in response", file=sys.stderr)
    
    print(json.dumps({
        "success": True,
        "records": records,
        "totalSize": total_size,
        "debug": {
            "query": query,
            "totalSize": total_size,
            "recordsCount": len(records)
        }
    }))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    import traceback
    print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
`;

    try {
      const result = await this.salesforceService['executePythonScript'](scriptContent);
      console.log('[getPrograms] Raw Salesforce result:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error('Salesforce Programs query error:', result.error);
        return { records: [], debug: { error: result.error } };
      }

      if (result.success === false) {
        console.error('Salesforce Programs query failed:', result.error);
        return { records: [], debug: result };
      }

      const records = result.records || [];
      console.log(`[getPrograms] Returning ${records.length} records`);
      
      if (records.length > 0) {
        console.log('[getPrograms] First record:', JSON.stringify(records[0], null, 2));
      }
      
      return {
        records,
        debug: result.debug || null,
        stderr: result.stderr || null
      };
    } catch (error) {
      console.error('Failed to query Programs:', error);
      return { records: [], debug: { error: String(error) } };
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
    
    # For custom domains, we need to use instance_url instead
    if domain not in ['login', 'test'] and '.' not in domain:
        # Custom domain - use instance_url parameter
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=instance_url
        )
    else:
        # Standard domain
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )
    
    # Query Workshops for this Program
    # Including Workshop_Type__c, Format__c, Topic__c, and Date__c based on actual SF schema
    workshops_query1 = f"""
        SELECT Id, Name, Program__c,
               Date_Time__c, Date__c, Workshop_Type__c,
               Format__c, Topic__c, Workshop_Topic__c,
               Presenter__c, Site_Name__c
        FROM Workshop__c
        WHERE Program__c = '{programId}'
        ORDER BY Date_Time__c ASC NULLS LAST
    """

    # Alternative: try without ORDER BY
    workshops_query2 = f"""
        SELECT Id, Name, Program__c,
               Date_Time__c, Date__c, Workshop_Type__c,
               Format__c, Topic__c, Workshop_Topic__c,
               Presenter__c, Site_Name__c
        FROM Workshop__c
        WHERE Program__c = '{programId}'
    """
    
    # Try the first query
    try:
        workshops = sf.query(workshops_query1)
        print(json.dumps({
            "success": True,
            "records": workshops.get('records', []),
            "totalSize": workshops.get('totalSize', 0),
            "query": "query1"
        }))
    except Exception as e1:
        # Try the second query
        try:
            workshops = sf.query(workshops_query2)
            print(json.dumps({
                "success": True,
                "records": workshops.get('records', []),
                "totalSize": workshops.get('totalSize', 0),
                "query": "query2"
            }))
        except Exception as e2:
            # Try to describe the object to see available fields
            try:
                workshop_desc = sf.Workshop__c.describe()
                available_fields = [f['name'] for f in workshop_desc['fields']]
                print(json.dumps({
                    "success": False,
                    "error": f"Both queries failed. Query1: {str(e1)}, Query2: {str(e2)}",
                    "available_fields": available_fields[:30]
                }))
            except:
                print(json.dumps({
                    "success": False,
                    "error": f"Both queries failed. Query1: {str(e1)}, Query2: {str(e2)}"
                }))
    
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const result = await this.salesforceService['executePythonScript'](scriptContent);
      console.log(`[getWorkshopsForProgram] Raw result for ${programId}:`, JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error(`Salesforce Workshops query error for Program ${programId}:`, result.error);
        return [];
      }
      
      if (result.success === false) {
        console.error(`Salesforce Workshops query failed for Program ${programId}:`, result.error);
        if (result.available_fields) {
          console.log(`Available fields:`, result.available_fields);
        }
        return [];
      }

      const records = result.records || [];
      console.log(`[getWorkshopsForProgram] Returning ${records.length} workshops for program ${programId}`);
      return records;
    } catch (error) {
      console.error(`Failed to query Workshops for Program ${programId}:`, error);
      return [];
    }
  }

  /**
   * Query all Workshops from Salesforce (not filtered by program)
   */
  async getAllWorkshops(): Promise<SalesforceWorkshop[]> {
    const config = this.getConfig();
    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json

    # Get Salesforce config
    domain = '${config.domain}'
    username = '${config.username}'
    password = '${config.password}'
    security_token = '${config.securityToken}'

    if not username or not password:
        print(json.dumps({"error": "Salesforce credentials not configured"}))
        exit(1)

    # Connect to Salesforce
    if domain not in ['login', 'test'] and '.' not in domain:
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=instance_url
        )
    else:
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )

    # Query all Workshops - try multiple strategies
    # Strategy 1: Get all workshops (no date filter) - most inclusive
    workshops_query_all = """
        SELECT Id, Name, Program__c,
               Date_Time__c, Presenter__c, Site_Name__c
        FROM Workshop__c
        ORDER BY Date_Time__c DESC NULLS LAST
        LIMIT 1000
    """

    # Strategy 2: With date filter (Last quarter through next 2 quarters)
    workshops_query_filtered = """
        SELECT Id, Name, Program__c,
               Date_Time__c, Presenter__c, Site_Name__c
        FROM Workshop__c
        WHERE Date_Time__c >= LAST_QUARTER
          AND Date_Time__c <= NEXT_N_QUARTERS:2
        ORDER BY Date_Time__c DESC NULLS LAST
        LIMIT 1000
    """

    # Strategy 3: Without ORDER BY (in case ORDER BY causes issues)
    workshops_query_simple = """
        SELECT Id, Name, Program__c,
               Date_Time__c, Presenter__c, Site_Name__c
        FROM Workshop__c
        LIMIT 1000
    """

    # Try query_all first (most inclusive)
    try:
        print(f"DEBUG: Attempting query_all (no date filter)", file=sys.stderr)
        workshops = sf.query(workshops_query_all)
        totalSize = workshops.get('totalSize', 0)
        records = workshops.get('records', [])
        print(f"DEBUG: Query_all succeeded. TotalSize: {totalSize}, Records: {len(records)}", file=sys.stderr)
        print(json.dumps({
            "success": True,
            "records": records,
            "totalSize": totalSize,
            "query": "query_all"
        }))
    except Exception as e1:
        print(f"DEBUG: Query_all failed: {str(e1)}", file=sys.stderr)
        # Try filtered query
        try:
            print(f"DEBUG: Attempting query_filtered (with date range)", file=sys.stderr)
            workshops = sf.query(workshops_query_filtered)
            totalSize = workshops.get('totalSize', 0)
            records = workshops.get('records', [])
            print(f"DEBUG: Query_filtered succeeded. TotalSize: {totalSize}, Records: {len(records)}", file=sys.stderr)
            print(json.dumps({
                "success": True,
                "records": records,
                "totalSize": totalSize,
                "query": "query_filtered"
            }))
        except Exception as e2:
            print(f"DEBUG: Query_filtered failed: {str(e2)}", file=sys.stderr)
            # Try simple query without ORDER BY
            try:
                print(f"DEBUG: Attempting query_simple (no ORDER BY)", file=sys.stderr)
                workshops = sf.query(workshops_query_simple)
                totalSize = workshops.get('totalSize', 0)
                records = workshops.get('records', [])
                print(f"DEBUG: Query_simple succeeded. TotalSize: {totalSize}, Records: {len(records)}", file=sys.stderr)
                print(json.dumps({
                    "success": True,
                    "records": records,
                    "totalSize": totalSize,
                    "query": "query_simple"
                }))
            except Exception as e3:
                print(f"DEBUG: All queries failed. Query_all: {str(e1)}, Query_filtered: {str(e2)}, Query_simple: {str(e3)}", file=sys.stderr)
                print(json.dumps({
                    "success": False,
                    "error": f"All queries failed. Query_all: {str(e1)}, Query_filtered: {str(e2)}, Query_simple: {str(e3)}"
                }))

except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const result = await this.salesforceService['executePythonScript'](scriptContent);
      console.log(`[getAllWorkshops] Raw result:`, JSON.stringify(result, null, 2));

      // Log stderr if present
      if (result.stderr) {
        console.log(`[getAllWorkshops] Python stderr:`, result.stderr);
      }

      if (result.error) {
        console.error('Salesforce All Workshops query error:', result.error);
        return [];
      }

      if (result.success === false) {
        console.error('Salesforce All Workshops query failed:', result.error);
        return [];
      }

      // Handle Salesforce query response format - records might have attributes that need stripping
      let records = result.records || [];
      
      // Clean records if they have Salesforce attributes
      if (records.length > 0 && records[0].attributes) {
        records = records.map((record: any) => {
          const cleaned: any = {};
          Object.keys(record).forEach(key => {
            if (key !== 'attributes') {
              cleaned[key] = record[key];
            }
          });
          return cleaned;
        });
      }

      console.log(`[getAllWorkshops] Returning ${records.length} workshops`);
      console.log(`[getAllWorkshops] Query used: ${result.query || 'unknown'}`);
      console.log(`[getAllWorkshops] Total size from Salesforce: ${result.totalSize || 0}`);

      if (records.length > 0) {
        console.log(`[getAllWorkshops] First workshop:`, JSON.stringify(records[0], null, 2));
      } else {
        console.log(`[getAllWorkshops] WARNING: Query succeeded but returned 0 records.`);
        console.log(`[getAllWorkshops] Full result:`, JSON.stringify(result, null, 2));
        console.log(`[getAllWorkshops] This could mean:`);
        console.log(`[getAllWorkshops]   1. No workshops exist in Salesforce`);
        console.log(`[getAllWorkshops]   2. All workshops are outside the date range (if filtered)`);
        console.log(`[getAllWorkshops]   3. Query syntax issue (check Salesforce object name)`);
      }

      return records;
    } catch (error) {
      console.error('Failed to query all Workshops:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : String(error));
      return [];
    }
  }

  /**
   * Get all Programs with their Workshops
   * @param filterByCurrentQuarter - If true, only return programs starting in the current quarter
   * @param filterByNext60Days - If true, only return programs starting in the next 60 days
   */
  async getProgramsWithWorkshops(filterByCurrentQuarter: boolean = false, filterByNext60Days: boolean = false): Promise<Array<{ program: SalesforceProgram; workshops: SalesforceWorkshop[] }>> {
    const result = await this.getPrograms(filterByCurrentQuarter, filterByNext60Days);
    const programs = result.records || [];
    
    if (programs.length === 0) {
      return [];
    }
    
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

