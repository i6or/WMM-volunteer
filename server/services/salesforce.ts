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
    
    result = sf.Volunteer_Opportunity__c.create(opportunity_data)
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
    
    # Get first 10 fields for the query (excluding complex types)
    queryable_fields = []
    for field in obj_desc['fields'][:15]:  # Limit to first 15 fields
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
    
    # Query Program__c objects for volunteer opportunities
    try:
        programs = sf.query("""
            SELECT Id, Name, Description__c, Start_Date__c, End_Date__c, 
                   Location__c, Max_Participants__c, Status__c,
                   Contact_Email__c, Program_Type__c
            FROM Program__c 
            WHERE Status__c = 'Active'
        """)
        
        for record in programs['records']:
            all_opportunities.append({
                'source': 'Program__c',
                'record': record
            })
    except Exception as e:
        print(f"Error querying Program__c: {e}")
    
    # Query Workshop__c objects for volunteer opportunities  
    try:
        workshops = sf.query("""
            SELECT Id, Name, Description__c, Workshop_Date__c, Start_Time__c,
                   End_Time__c, Location__c, Max_Attendees__c, Status__c,
                   Contact_Email__c, Workshop_Type__c
            FROM Workshop__c
            WHERE Status__c = 'Active'
        """)
        
        for record in workshops['records']:
            all_opportunities.append({
                'source': 'Workshop__c', 
                'record': record
            })
    except Exception as e:
        print(f"Error querying Workshop__c: {e}")
    
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

      // Transform Salesforce data to local format
      return result.records?.map((item: any) => {
        const record = item.record;
        const source = item.source;
        
        if (source === 'Program__c') {
          return {
            id: record.Id,
            salesforceId: record.Id,
            title: record.Name || 'Program Volunteer Opportunity',
            description: record.Description__c || 'Help support this program',
            organization: "Women's Money Matters",
            category: record.Program_Type__c || 'Program Support',
            date: new Date(record.Start_Date__c || new Date()),
            startTime: '9:00 AM', // Default since programs may not have specific times
            endTime: '5:00 PM',
            location: record.Location__c || 'TBD',
            totalSpots: record.Max_Participants__c || 10,
            filledSpots: 0, // Would need another query to get actual registrations
            contactEmail: record.Contact_Email__c || 'volunteer@womensmoneymatters.org',
            status: record.Status__c?.toLowerCase() || 'active',
            imageUrl: null,
            requirements: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else if (source === 'Workshop__c') {
          return {
            id: record.Id,
            salesforceId: record.Id,
            title: record.Name || 'Workshop Volunteer Opportunity',
            description: record.Description__c || 'Help facilitate this workshop',
            organization: "Women's Money Matters",
            category: record.Workshop_Type__c || 'Workshop Presenting',
            date: new Date(record.Workshop_Date__c || new Date()),
            startTime: record.Start_Time__c || '6:00 PM',
            endTime: record.End_Time__c || '7:00 PM',
            location: record.Location__c || 'TBD',
            totalSpots: record.Max_Attendees__c || 20,
            filledSpots: 0, // Would need another query to get actual registrations
            contactEmail: record.Contact_Email__c || 'programs@womensmoneymatters.org',
            status: record.Status__c?.toLowerCase() || 'active',
            imageUrl: null,
            requirements: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        
        return null;
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
    }
  }
}

export const salesforceService = new SalesforceService();
