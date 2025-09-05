import { spawn } from 'child_process';
import { type Volunteer, type Opportunity } from '@shared/schema';

interface SalesforceConfig {
  username: string;
  password: string;
  securityToken: string;
  domain: string;
}

export class SalesforceService {
  private config: SalesforceConfig;

  constructor() {
    this.config = {
      username: process.env.SALESFORCE_USERNAME || '',
      password: process.env.SALESFORCE_PASSWORD || '',
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
      domain: process.env.SALESFORCE_DOMAIN || 'login',
    };
  }

  private async executePythonScript(scriptContent: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['-c', scriptContent]);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (error) {
            resolve(stdout);
          }
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });
    });
  }

  async createVolunteerRecord(volunteer: Volunteer): Promise<string | null> {
    if (!this.config.username || !this.config.password) {
      console.warn('Salesforce credentials not configured, skipping sync');
      return null;
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    volunteer_data = {
        'First_Name__c': '${volunteer.firstName.replace(/'/g, "\\'") || ''}',
        'Last_Name__c': '${volunteer.lastName.replace(/'/g, "\\'") || ''}',
        'Email__c': '${volunteer.email.replace(/'/g, "\\'") || ''}',
        'Phone__c': '${(volunteer.phone || '').replace(/'/g, "\\'") || ''}',
        'Street_Address__c': '${(volunteer.streetAddress || '').replace(/'/g, "\\'") || ''}',
        'City__c': '${(volunteer.city || '').replace(/'/g, "\\'") || ''}',
        'State__c': '${(volunteer.state || '').replace(/'/g, "\\'") || ''}',
        'ZIP_Code__c': '${(volunteer.zipCode || '').replace(/'/g, "\\'") || ''}',
        'Interest_Food_Hunger__c': ${volunteer.interestFoodHunger},
        'Interest_Education__c': ${volunteer.interestEducation},
        'Interest_Environment__c': ${volunteer.interestEnvironment},
        'Interest_Health__c': ${volunteer.interestHealth},
        'Interest_Seniors__c': ${volunteer.interestSeniors},
        'Interest_Animals__c': ${volunteer.interestAnimals},
        'Availability__c': '${(volunteer.availability || '').replace(/'/g, "\\'") || ''}',
        'Transportation__c': '${(volunteer.transportation || '').replace(/'/g, "\\'") || ''}',
        'Special_Skills__c': '${(volunteer.specialSkills || '').replace(/'/g, "\\'") || ''}',
        'Emergency_Contact_Name__c': '${(volunteer.emergencyContactName || '').replace(/'/g, "\\'") || ''}',
        'Emergency_Contact_Phone__c': '${(volunteer.emergencyContactPhone || '').replace(/'/g, "\\'") || ''}',
        'Emergency_Contact_Relationship__c': '${(volunteer.emergencyContactRelationship || '').replace(/'/g, "\\'") || ''}',
        'Opt_In_Communications__c': ${volunteer.optInCommunications},
        'Status__c': '${(volunteer.status || '').replace(/'/g, "\\'") || ''}'
    }
    
    result = sf.Volunteer__c.create(volunteer_data)
    print(json.dumps({"id": result["id"], "success": result["success"]}))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed", "success": false}))
except Exception as e:
    print(json.dumps({"error": str(e), "success": false}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      return result.success ? result.id : null;
    } catch (error) {
      console.error('Failed to create Salesforce volunteer record:', error);
      return null;
    }
  }

  async createOpportunityRecord(opportunity: Opportunity): Promise<string | null> {
    if (!this.config.username || !this.config.password) {
      console.warn('Salesforce credentials not configured, skipping sync');
      return null;
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    from datetime import datetime
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    opportunity_data = {
        'Title__c': '${opportunity.title.replace(/'/g, "\\'") || ''}',
        'Description__c': '${opportunity.description.replace(/'/g, "\\'") || ''}',
        'Organization__c': '${opportunity.organization.replace(/'/g, "\\'") || ''}',
        'Category__c': '${opportunity.category.replace(/'/g, "\\'") || ''}',
        'Event_Date__c': '${opportunity.date.toISOString().split('T')[0]}',
        'Start_Time__c': '${opportunity.startTime.replace(/'/g, "\\'") || ''}',
        'End_Time__c': '${opportunity.endTime.replace(/'/g, "\\'") || ''}',
        'Location__c': '${opportunity.location.replace(/'/g, "\\'") || ''}',
        'Total_Spots__c': ${opportunity.totalSpots},
        'Filled_Spots__c': ${opportunity.filledSpots},
        'Contact_Email__c': '${(opportunity.contactEmail || '').replace(/'/g, "\\'") || ''}',
        'Status__c': '${(opportunity.status || '').replace(/'/g, "\\'") || ''}'
    }
    
    # Note: V4S uses different objects - would need to create Volunteer_Hours__c instead
    result = {"id": "placeholder", "success": False}
    print(json.dumps({"error": "V4S integration - use Volunteer_Hours__c instead", "success": False}))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed", "success": False}))
except Exception as e:
    print(json.dumps({"error": str(e), "success": False}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      return result.success ? result.id : null;
    } catch (error) {
      console.error('Failed to create Salesforce opportunity record:', error);
      return null;
    }
  }

  async updateVolunteerRecord(salesforceId: string, updates: Partial<Volunteer>): Promise<boolean> {
    if (!this.config.username || !this.config.password || !salesforceId) {
      return false;
    }

    // Similar pattern as create but using update method
    // Implementation would be added here for updating existing records
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; userInfo?: any }> {
    if (!this.config.username || !this.config.password) {
      return { success: false, message: 'Salesforce credentials not configured' };
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    # Test connection by getting user info
    user_info = sf.query("SELECT Id, Name, Email FROM User WHERE Username = '${this.config.username}' LIMIT 1")
    
    result = {
        "success": True,
        "message": "Successfully connected to Salesforce",
        "userInfo": user_info['records'][0] if user_info['records'] else None,
        "organizationId": sf.sf_instance
    }
    
    print(json.dumps(result))
    
except ImportError:
    print(json.dumps({"success": False, "message": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e)}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      return result;
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error}` };
    }
  }

  async exploreObjects(): Promise<{ success: boolean; objects?: any[]; message?: string }> {
    if (!this.config.username || !this.config.password) {
      return { success: false, message: 'Salesforce credentials not configured' };
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    # Get all custom objects that might contain volunteer opportunities
    objects_desc = sf.describe()
    
    relevant_objects = []
    
    for obj in objects_desc['sobjects']:
        obj_name = obj['name']
        # Look for objects that might contain volunteer opportunities
        if any(keyword in obj_name.lower() for keyword in ['volunteer', 'opportunity', 'event', 'activity', 'program']):
            try:
                # Get detailed description of the object
                obj_detail = getattr(sf, obj_name).describe()
                
                fields = []
                for field in obj_detail['fields']:
                    fields.append({
                        'name': field['name'],
                        'label': field['label'],
                        'type': field['type'],
                        'custom': field['custom']
                    })
                
                relevant_objects.append({
                    'name': obj_name,
                    'label': obj['label'],
                    'custom': obj['custom'],
                    'fields': fields[:10]  # Limit to first 10 fields for brevity
                })
            except:
                # Skip objects we can't describe
                pass
    
    result = {
        "success": True,
        "objects": relevant_objects,
        "totalObjects": len(objects_desc['sobjects'])
    }
    
    print(json.dumps(result))
    
except ImportError:
    print(json.dumps({"success": False, "message": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e)}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      return result;
    } catch (error) {
      return { success: false, message: `Schema exploration failed: ${error}` };
    }
  }

  async queryObject(objectName: string, limit: number = 10): Promise<any> {
    if (!this.config.username || !this.config.password) {
      return { success: false, message: 'Salesforce credentials not configured' };
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    # Get object fields first, then query with specific fields
    obj_desc = getattr(sf, '${objectName}').describe()
    
    # For V4S Shift objects, ensure we get the date field
    if '${objectName}' == 'GW_Volunteers__Volunteer_Shift__c':
        queryable_fields = ['Id', 'Name', 'GW_Volunteers__Start_Date_Time__c', 
                          'GW_Volunteers__Duration__c', 'GW_Volunteers__Total_Volunteers__c',
                          'GW_Volunteers__Number_of_Volunteers_Still_Needed__c',
                          'GW_Volunteers__Volunteer_Job__c', 'GW_Volunteers__Description__c',
                          'GW_Volunteers__Desired_Number_of_Volunteers__c']
    else:
        # Get first 15 fields for other objects (excluding complex types)
        queryable_fields = []
        for field in obj_desc['fields'][:30]:  # Check more fields
            if field['type'] in ['string', 'textarea', 'email', 'phone', 'url', 'date', 'datetime', 'boolean', 'int', 'double', 'currency', 'percent', 'id', 'reference']:
                queryable_fields.append(field['name'])
        
        if not queryable_fields:
            queryable_fields = ['Id']  # At minimum, select Id
    
    fields_str = ', '.join(queryable_fields)
    records = sf.query(f"SELECT {fields_str} FROM ${objectName} LIMIT ${limit}")
    
    result = {
        "success": True,
        "records": records['records'],
        "totalSize": records['totalSize']
    }
    
    print(json.dumps(result))
    
except ImportError:
    print(json.dumps({"success": False, "message": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e)}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      return result;
    } catch (error) {
      return { success: false, message: `Query failed: ${error}` };
    }
  }

  // Original sync from Program__c and Workshop__c
  async syncOpportunities(): Promise<Opportunity[]> {
    // This is the original function that syncs from Program__c and Workshop__c
    // Keeping it for backward compatibility
    return [];
  }

  async syncV4SOpportunities(): Promise<Opportunity[]> {
    if (!this.config.username || !this.config.password) {
      return [];
    }

    const scriptContent = `
import sys
import os
sys.path.append(os.path.expanduser('~/.pythonlibs'))

try:
    from simple_salesforce import Salesforce
    import json
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    all_opportunities = []
    
    # Directly query ALL Volunteer Jobs (bypass Program for now)
    try:
        jobs = sf.query("""
            SELECT Id, Name, GW_Volunteers__Description__c,
                   GW_Volunteers__Location__c, GW_Volunteers__Campaign__c,
                   GW_Volunteers__Skills_Needed__c, GW_Volunteers__Display_on_Website__c
            FROM GW_Volunteers__Volunteer_Job__c 
            LIMIT 100
        """)
        
        print(f"Found {len(jobs['records'])} volunteer jobs")
        
        # For each job, get its shifts
        for job in jobs['records']:
            job_id = job['Id']
            shifts = sf.query(f"""
                SELECT Id, Name, GW_Volunteers__Start_Date_Time__c,
                       GW_Volunteers__Duration__c, GW_Volunteers__Total_Volunteers__c,
                       GW_Volunteers__Number_of_Volunteers_Still_Needed__c,
                       GW_Volunteers__Description__c,
                       GW_Volunteers__System_Note__c
                FROM GW_Volunteers__Volunteer_Shift__c
                WHERE GW_Volunteers__Volunteer_Job__c = '{job_id}'
                AND GW_Volunteers__Start_Date_Time__c != null
                ORDER BY GW_Volunteers__Start_Date_Time__c
                LIMIT 50
            """)
            
            print(f"  Job {job['Name']}: {len(shifts['records'])} shifts with dates")
            
            # Add each shift with a date as an opportunity
            for shift in shifts['records']:
                shift_date = shift.get('GW_Volunteers__Start_Date_Time__c')
                if shift_date is not None and shift_date != '':
                    print(f"    Adding shift: {shift['Name']} on {shift_date}")
                    all_opportunities.append({
                        'program': None,  # We'll get program later when we add the relationship
                        'job': job,
                        'shift': shift
                    })
                
    except Exception as e:
        print(f"Error querying Programs and V4S objects: {e}")
    
    result = {
        'records': all_opportunities,
        'totalSize': len(all_opportunities)
    }
    
    print(json.dumps(result))
    
except ImportError:
    print(json.dumps({"error": "simple-salesforce not installed"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      if (result.error) {
        console.error('Salesforce sync error:', result.error);
        return [];
      }

      // Transform V4S data to local format
      return result.records?.map((item: any) => {
        const program = item.program;
        const job = item.job;
        const shift = item.shift;
        
        // Determine category based on job name
        let category = 'Volunteer Opportunity';
        if (job.Name?.toLowerCase().includes('coach')) {
          category = 'Financial Coaching';
        } else if (job.Name?.toLowerCase().includes('presenter')) {
          category = 'Workshop Presenting';
        } else if (job.Name?.toLowerCase().includes('observer')) {
          category = 'Workshop Observing';
        } else if (job.Name?.toLowerCase().includes('admin')) {
          category = 'Administrative Support';
        }
        
        // Parse date and time from shift
        const shiftDate = shift.GW_Volunteers__Start_Date_Time__c 
          ? new Date(shift.GW_Volunteers__Start_Date_Time__c)
          : null;
          
        // Skip shifts without dates
        if (!shiftDate || isNaN(shiftDate.getTime())) {
          return null;
        }
          
        const duration = shift.GW_Volunteers__Duration__c || 1;
        const endTime = new Date(shiftDate.getTime() + (duration * 60 * 60 * 1000));
        
        // Include shift name or date in title to differentiate
        const shiftLabel = shift.Name || shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          id: shift.Id,
          salesforceId: shift.Id,
          title: `${job.Name || 'Volunteer Opportunity'}${program?.Name ? ` - ${program.Name}` : ''} (${shiftLabel})`,
          description: job.GW_Volunteers__Description__c || shift.GW_Volunteers__Description__c || 'Join us for this volunteer opportunity',
          organization: "Women's Money Matters",
          category: category,
          date: shiftDate,
          startTime: shiftDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          endTime: endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          location: job.GW_Volunteers__Location__c || 'See details',
          totalSpots: shift.GW_Volunteers__Total_Volunteers__c || 1,
          filledSpots: shift.GW_Volunteers__Total_Volunteers__c 
            ? (shift.GW_Volunteers__Total_Volunteers__c - (shift.GW_Volunteers__Number_of_Volunteers_Still_Needed__c || 0))
            : 0,
          contactEmail: 'volunteer@womensmoneymatters.org',
          status: 'active',
          imageUrl: null,
          requirements: job.GW_Volunteers__Skills_Needed__c || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          jobId: job.Id,  // Keep reference to the job
          shiftId: shift.Id  // Keep reference to the shift
        };
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
    }
  }
}

export const salesforceService = new SalesforceService();
