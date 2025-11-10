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
   * Query all Programs from Salesforce
   */
  async getPrograms(): Promise<SalesforceProgram[]> {
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
    programs_query = """
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
        ORDER BY Program_Start_Date__c DESC
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
   */
  async getProgramsWithWorkshops(): Promise<Array<{ program: SalesforceProgram; workshops: SalesforceWorkshop[] }>> {
    const programs = await this.getPrograms();
    
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

