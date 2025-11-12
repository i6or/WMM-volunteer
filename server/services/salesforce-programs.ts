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
        # Filter by next 60 days
        start_date = now
        end_date = now + timedelta(days=60)
        end_date = datetime.combine(end_date.date(), datetime.max.time())
        
        start_date_str = start_date.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        end_date_str = end_date.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        date_filter = f"AND Program_Start_Date__c >= {start_date_str} AND Program_Start_Date__c <= {end_date_str}"
    elif filter_by_quarter:
        # Filter by current quarter
        current_month = now.month
        
        # Determine quarter
        if current_month in [1, 2, 3]:
            quarter_start_month = 1
            quarter_end_month = 3
        elif current_month in [4, 5, 6]:
            quarter_start_month = 4
            quarter_end_month = 6
        elif current_month in [7, 8, 9]:
            quarter_start_month = 7
            quarter_end_month = 9
        else:
            quarter_start_month = 10
            quarter_end_month = 12
        
        quarter_start = datetime(now.year, quarter_start_month, 1)
        quarter_end = datetime(now.year, quarter_end_month + 1, 1) - timedelta(days=1)
        quarter_end = datetime.combine(quarter_end.date(), datetime.max.time())
        
        quarter_start_str = quarter_start.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        quarter_end_str = quarter_end.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        date_filter = f"AND Program_Start_Date__c >= {quarter_start_str} AND Program_Start_Date__c <= {quarter_end_str}"
    else:
        date_filter = ""
    
    programs_query = f"""
        SELECT Id, Name, 
               Program_Start_Date__c, Program_End_Date__c,
               Status__c, Format__c,
               Program_Leader__c, Program_Leader_Full_Name__c,
               Primary_Program_Partner__c, Type__c,
               Zoom_link__c, Program_Schedule_Link__c,
               Total_Participants__c, Number_of_Workshops__c,
               Workshop_Start_Date_Time__c
        FROM Program__c
        WHERE Status__c != 'Cancelled'
        {date_filter}
        ORDER BY Program_Start_Date__c ASC
        LIMIT 100
    """
    
    try:
        programs = sf.query(programs_query)
        print(json.dumps({
            "success": True,
            "records": programs.get('records', []),
            "totalSize": programs.get('totalSize', 0)
        }))
    except Exception as e:
        # Try alternative field names if the above fails
        print(f"Error with standard query: {e}")
        # Fallback: try to describe the object to see available fields
        try:
            program_desc = sf.Program__c.describe()
            available_fields = [f['name'] for f in program_desc['fields']]
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

      return result.records || [];
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

