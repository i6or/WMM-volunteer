import { spawn } from 'child_process';
import { type Volunteer, type Opportunity } from '@shared/schema';
import { SalesforceProgramService } from "./salesforce-programs";

interface SalesforceConfig {
  username: string;
  password: string;
  securityToken: string;
  domain: string;
}

export class SalesforceService {
  public config: SalesforceConfig; // Made public for test endpoint
  public programService: SalesforceProgramService;

  constructor() {
    // Normalize domain - remove protocol and trailing slashes
    let domain = process.env.SALESFORCE_DOMAIN || 'login';
    if (domain.includes('://')) {
      // Extract domain from URL (e.g., https://wmm.lightning.force.com -> wmm.lightning.force.com)
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.hostname;
      } catch (e) {
        // If URL parsing fails, try simple string replacement
        domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }
    }
    // For custom domains, simple_salesforce expects just the hostname
    // For standard domains, use 'login' or 'test'
    if (domain.includes('lightning.force.com') || domain.includes('my.salesforce.com')) {
      // Extract the subdomain (e.g., 'wmm' from 'wmm.lightning.force.com')
      const parts = domain.split('.');
      if (parts.length >= 3 && parts[0] !== 'login' && parts[0] !== 'test') {
        domain = parts[0]; // Use subdomain as domain for custom instances
      } else {
        domain = 'login'; // Fallback to login
      }
    }
    
    this.config = {
      username: process.env.SALESFORCE_USERNAME || '',
      password: process.env.SALESFORCE_PASSWORD || '',
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
      domain: domain,
    };
    this.programService = new SalesforceProgramService(this);
  }

  private async executePythonScript(scriptContent: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Try different Python commands based on environment
      const pythonCommand = process.env.NODE_ENV === 'production' 
        ? 'venv/bin/python'  // Use virtual environment Python in production
        : 'python3';
      
      const pythonProcess = spawn(pythonCommand, ['-c', scriptContent]);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        // Also log stderr for debugging (debug prints go to stderr)
        console.log('[Python stderr]', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout);
            // Include stderr in response for debugging
            if (stderr && !parsed.stderr) {
              parsed.stderr = stderr;
            }
            resolve(parsed);
          } catch (error) {
            console.error('[Python] Failed to parse JSON:', stdout);
            console.error('[Python] stderr:', stderr);
            resolve({ error: `Failed to parse JSON: ${error}`, stdout, stderr });
          }
        } else {
          console.error('[Python] Script failed with code', code);
          console.error('[Python] stderr:', stderr);
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
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

# Try multiple paths for Python libraries in different environments
possible_paths = [
    os.path.expanduser('~/.pythonlibs'),
    '.pythonlibs',  # Railway local installation
    '/app/.pythonlibs',  # Railway container path
    os.path.join(os.getcwd(), '.pythonlibs')
]

for path in possible_paths:
    if os.path.exists(path):
        sys.path.insert(0, path)
        break

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
    
except ImportError as e:
    print(json.dumps({"error": f"simple-salesforce not installed: {str(e)}", "success": False}))
except Exception as e:
    print(json.dumps({"error": str(e), "success": False}))
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

  async getVolunteerOpportunities(): Promise<Opportunity[]> {
    if (!this.config.username || !this.config.password) {
      return [];
    }

    const scriptContent = `
import sys
import os

# Try multiple paths for Python libraries
possible_paths = [
    os.path.expanduser('~/.pythonlibs'),
    '.pythonlibs',
    '/app/.pythonlibs',
    os.path.join(os.getcwd(), '.pythonlibs')
]

for path in possible_paths:
    if os.path.exists(path):
        sys.path.insert(0, path)
        break

try:
    from simple_salesforce import Salesforce
    import json
    from datetime import datetime, timedelta
    
    # Handle custom lightning domain
    domain = '${this.config.domain}'
    if 'lightning.force.com' in domain:
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=f'https://{domain}'
        )
    else:
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            domain=domain
        )
    
    # Query for active volunteer jobs with their shifts
    jobs_query = """
        SELECT Id, Name, GW_Volunteers__Description__c,
               GW_Volunteers__Location__c, GW_Volunteers__Campaign__c,
               GW_Volunteers__Skills_Needed__c, GW_Volunteers__Display_on_Website__c
        FROM GW_Volunteers__Volunteer_Job__c 
        WHERE GW_Volunteers__Display_on_Website__c = true
    """
    
    jobs_result = sf.query(jobs_query)
    opportunities = []
    
    for job in jobs_result['records']:
        # Get upcoming shifts for this job
        job_id = job['Id']
        shifts_query = f"""
            SELECT Id, Name, GW_Volunteers__Start_Date_Time__c,
                   GW_Volunteers__Duration__c, GW_Volunteers__Total_Volunteers__c,
                   GW_Volunteers__Number_of_Volunteers_Still_Needed__c,
                   GW_Volunteers__Description__c
            FROM GW_Volunteers__Volunteer_Shift__c
            WHERE GW_Volunteers__Volunteer_Job__c = '{job_id}'
            AND GW_Volunteers__Start_Date_Time__c >= TODAY
            AND GW_Volunteers__Number_of_Volunteers_Still_Needed__c > 0
            ORDER BY GW_Volunteers__Start_Date_Time__c ASC
            LIMIT 5
        """
        
        shifts_result = sf.query(shifts_query)
        
        # Create opportunity object with shifts
        opportunity = {
            'id': job['Id'],
            'title': job['Name'],
            'description': job.get('GW_Volunteers__Description__c', ''),
            'location': job.get('GW_Volunteers__Location__c', ''),
            'skillsNeeded': job.get('GW_Volunteers__Skills_Needed__c', ''),
            'shifts': []
        }
        
        for shift in shifts_result['records']:
            shift_data = {
                'id': shift['Id'],
                'startDateTime': shift.get('GW_Volunteers__Start_Date_Time__c'),
                'duration': shift.get('GW_Volunteers__Duration__c', 1),
                'totalSpots': shift.get('GW_Volunteers__Total_Volunteers__c', 1),
                'spotsAvailable': shift.get('GW_Volunteers__Number_of_Volunteers_Still_Needed__c', 0),
                'description': shift.get('GW_Volunteers__Description__c', '')
            }
            opportunity['shifts'].append(shift_data)
        
        # Only include jobs with available shifts
        if opportunity['shifts']:
            opportunities.append(opportunity)
    
    print(json.dumps(opportunities))
    
except ImportError as e:
    print(json.dumps({"error": f"simple-salesforce not installed: {str(e)}", "opportunities": []}))
except Exception as e:
    print(json.dumps({"error": str(e), "opportunities": []}))
`;

    try {
      const result = await this.executePythonScript(scriptContent);
      if (result.error) {
        console.error('Salesforce sync error:', result.error);
        return [];
      }

      // Transform V4S data to local format
      return result.map((item: any) => {
        const job = item;
        const shifts = item.shifts;
        
        // Determine category based on job name
        let category = 'Volunteer Opportunity';
        if (job.title?.toLowerCase().includes('coach')) {
          category = 'Financial Coaching';
        } else if (job.title?.toLowerCase().includes('presenter')) {
          category = 'Workshop Presenting';
        } else if (job.title?.toLowerCase().includes('observer')) {
          category = 'Workshop Observing';
        } else if (job.title?.toLowerCase().includes('admin')) {
          category = 'Administrative Support';
        }
        
        // Parse date and time from shift
        const shiftDate = shifts[0].startDateTime 
          ? new Date(shifts[0].startDateTime)
          : null;
          
        // Skip shifts without dates
        if (!shiftDate || isNaN(shiftDate.getTime())) {
          return null;
        }
          
        const duration = shifts[0].duration || 1;
        const endTime = new Date(shiftDate.getTime() + (duration * 60 * 60 * 1000));
        
        // Handle volunteer spots safely
        const totalSpots = shifts[0].totalSpots || 1;
        const stillNeeded = shifts[0].spotsAvailable || 0;
        const filledSpots = totalSpots > 0 ? Math.max(0, totalSpots - stillNeeded) : 0;
        
        // Include shift name or date in title to differentiate
        const shiftLabel = shifts[0].startDateTime || shiftDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        
        return {
          id: job.id,
          salesforceId: job.id,
          title: `${job.title} (${shiftLabel})`,
          description: job.description || 'Join us for this volunteer opportunity',
          organization: "Women's Money Matters",
          category: category,
          date: shiftDate,
          startTime: shiftDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          endTime: endTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          location: job.location || 'Location TBD',
          totalSpots: totalSpots,
          filledSpots: filledSpots,
          contactEmail: 'volunteer@womensmoneymatters.org',
          status: job.skillsNeeded ? 'active' : 'inactive',
          imageUrl: null,
          requirements: job.skillsNeeded || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          // V4S specific fields
          jobId: job.id,
          shiftId: shifts[0].id,
          campaignId: job.campaignId || null,
          duration: duration,
          skillsNeeded: job.skillsNeeded || null,
          displayOnWebsite: job.displayOnWebsite || false
        };
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
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
    
    # Domain should be 'login', 'test', or custom domain subdomain (e.g., 'wmm')
    domain = '${this.config.domain}'
    
    # For custom domains, we need to use instance_url instead
    if domain not in ['login', 'test'] and '.' not in domain:
        # Custom domain - use instance_url parameter
        instance_url = f"https://{domain}.my.salesforce.com"
        sf = Salesforce(
            username='${this.config.username}',
            password='${this.config.password}',
            security_token='${this.config.securityToken}',
            instance_url=instance_url
        )
    else:
        # Standard domain
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
                for field in obj_detail['fields'][:30]:  # Check more fields
                    if field['type'] in ['string', 'textarea', 'email', 'phone', 'url', 'date', 'datetime', 'boolean', 'int', 'double', 'currency', 'percent', 'id', 'reference']:
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
  async getVolunteerJobs(): Promise<Opportunity[]> {
    // This is the original function that syncs from Program__c and Workshop__c
    // Keeping it for backward compatibility
    return [];
  }

  async syncOpportunities(): Promise<Opportunity[]> {
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
                ORDER BY GW_Volunteers__Start_Date_Time__c DESC
                LIMIT 50
            """)
            
            print(f"  Job {job['Name']}: {len(shifts['records'])} shifts with dates")
            
            # Add each shift with a date as an opportunity
            for shift in shifts['records']:
                shift_date = shift.get('GW_Volunteers__Start_Date_Time__c')
                if shift_date is not None and shift_date != '':
                    print(f"    Adding shift: {shift['Name']} on {shift_date}")
                    all_opportunities.append({
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
        
        // Handle volunteer spots safely
        const totalSpots = shift.GW_Volunteers__Total_Volunteers__c || 1;
        const stillNeeded = shift.GW_Volunteers__Number_of_Volunteers_Still_Needed__c || 0;
        const filledSpots = totalSpots > 0 ? Math.max(0, totalSpots - stillNeeded) : 0;
        
        // Include shift name or date in title to differentiate
        const shiftLabel = shift.Name || shiftDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        
        return {
          id: shift.Id,
          salesforceId: shift.Id,
          title: `${job.Name || 'Volunteer Opportunity'} (${shiftLabel})`,
          description: shift.GW_Volunteers__Description__c || job.GW_Volunteers__Description__c || 'Join us for this volunteer opportunity',
          organization: "Women's Money Matters",
          category: category,
          date: shiftDate,
          startTime: shiftDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          endTime: endTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          location: job.GW_Volunteers__Location__c || 'Location TBD',
          totalSpots: totalSpots,
          filledSpots: filledSpots,
          contactEmail: 'volunteer@womensmoneymatters.org',
          status: job.GW_Volunteers__Display_on_Website__c ? 'active' : 'inactive',
          imageUrl: null,
          requirements: job.GW_Volunteers__Skills_Needed__c || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          // V4S specific fields
          jobId: job.Id,
          shiftId: shift.Id,
          campaignId: job.GW_Volunteers__Campaign__c || null,
          duration: duration,
          skillsNeeded: job.GW_Volunteers__Skills_Needed__c || null,
          displayOnWebsite: job.GW_Volunteers__Display_on_Website__c || false
        };
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
    }
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
                ORDER BY GW_Volunteers__Start_Date_Time__c DESC
                LIMIT 50
            """)
            
            print(f"  Job {job['Name']}: {len(shifts['records'])} shifts with dates")
            
            # Add each shift with a date as an opportunity
            for shift in shifts['records']:
                shift_date = shift.get('GW_Volunteers__Start_Date_Time__c')
                if shift_date is not None and shift_date != '':
                    print(f"    Adding shift: {shift['Name']} on {shift_date}")
                    all_opportunities.append({
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
        
        // Handle volunteer spots safely
        const totalSpots = shift.GW_Volunteers__Total_Volunteers__c || 1;
        const stillNeeded = shift.GW_Volunteers__Number_of_Volunteers_Still_Needed__c || 0;
        const filledSpots = totalSpots > 0 ? Math.max(0, totalSpots - stillNeeded) : 0;
        
        // Include shift name or date in title to differentiate
        const shiftLabel = shift.Name || shiftDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        
        return {
          id: shift.Id,
          salesforceId: shift.Id,
          title: `${job.Name || 'Volunteer Opportunity'} (${shiftLabel})`,
          description: shift.GW_Volunteers__Description__c || job.GW_Volunteers__Description__c || 'Join us for this volunteer opportunity',
          organization: "Women's Money Matters",
          category: category,
          date: shiftDate,
          startTime: shiftDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          endTime: endTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          location: job.GW_Volunteers__Location__c || 'Location TBD',
          totalSpots: totalSpots,
          filledSpots: filledSpots,
          contactEmail: 'volunteer@womensmoneymatters.org',
          status: job.GW_Volunteers__Display_on_Website__c ? 'active' : 'inactive',
          imageUrl: null,
          requirements: job.GW_Volunteers__Skills_Needed__c || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          // V4S specific fields
          jobId: job.Id,
          shiftId: shift.Id,
          campaignId: job.GW_Volunteers__Campaign__c || null,
          duration: duration,
          skillsNeeded: job.GW_Volunteers__Skills_Needed__c || null,
          displayOnWebsite: job.GW_Volunteers__Display_on_Website__c || false
        };
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
    }
  }
}

export const salesforceService = new SalesforceService();
