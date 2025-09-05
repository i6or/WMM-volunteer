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
sys.path.append('/usr/local/lib/python3.8/site-packages')

try:
    from simple_salesforce import Salesforce
    import json
    
    sf = Salesforce(
        username='${this.config.username}',
        password='${this.config.password}',
        security_token='${this.config.securityToken}',
        domain='${this.config.domain}'
    )
    
    volunteer_data = {
        'First_Name__c': '${volunteer.firstName}',
        'Last_Name__c': '${volunteer.lastName}',
        'Email__c': '${volunteer.email}',
        'Phone__c': '${volunteer.phone || ''}',
        'Street_Address__c': '${volunteer.streetAddress || ''}',
        'City__c': '${volunteer.city || ''}',
        'State__c': '${volunteer.state || ''}',
        'ZIP_Code__c': '${volunteer.zipCode || ''}',
        'Interest_Food_Hunger__c': ${volunteer.interestFoodHunger},
        'Interest_Education__c': ${volunteer.interestEducation},
        'Interest_Environment__c': ${volunteer.interestEnvironment},
        'Interest_Health__c': ${volunteer.interestHealth},
        'Interest_Seniors__c': ${volunteer.interestSeniors},
        'Interest_Animals__c': ${volunteer.interestAnimals},
        'Availability__c': '${volunteer.availability || ''}',
        'Transportation__c': '${volunteer.transportation || ''}',
        'Special_Skills__c': '${volunteer.specialSkills || ''}',
        'Emergency_Contact_Name__c': '${volunteer.emergencyContactName || ''}',
        'Emergency_Contact_Phone__c': '${volunteer.emergencyContactPhone || ''}',
        'Emergency_Contact_Relationship__c': '${volunteer.emergencyContactRelationship || ''}',
        'Opt_In_Communications__c': ${volunteer.optInCommunications},
        'Status__c': '${volunteer.status}'
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
sys.path.append('/usr/local/lib/python3.8/site-packages')

try:
    from simple_salesforce import Salesforce
    import json
    from datetime import datetime
    
    sf = Salesforce(
        username='${this.config.username}',
        password='${this.config.password}',
        security_token='${this.config.securityToken}',
        domain='${this.config.domain}'
    )
    
    opportunity_data = {
        'Title__c': '${opportunity.title}',
        'Description__c': '${opportunity.description}',
        'Organization__c': '${opportunity.organization}',
        'Category__c': '${opportunity.category}',
        'Event_Date__c': '${opportunity.date.toISOString().split('T')[0]}',
        'Start_Time__c': '${opportunity.startTime}',
        'End_Time__c': '${opportunity.endTime}',
        'Location__c': '${opportunity.location}',
        'Total_Spots__c': ${opportunity.totalSpots},
        'Filled_Spots__c': ${opportunity.filledSpots},
        'Contact_Email__c': '${opportunity.contactEmail || ''}',
        'Status__c': '${opportunity.status}'
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

  async syncOpportunities(): Promise<Opportunity[]> {
    if (!this.config.username || !this.config.password) {
      return [];
    }

    const scriptContent = `
import sys
sys.path.append('/usr/local/lib/python3.8/site-packages')

try:
    from simple_salesforce import Salesforce
    import json
    
    sf = Salesforce(
        username='${this.config.username}',
        password='${this.config.password}',
        security_token='${this.config.securityToken}',
        domain='${this.config.domain}'
    )
    
    opportunities = sf.query("""
        SELECT Id, Title__c, Description__c, Organization__c, Category__c, 
               Event_Date__c, Start_Time__c, End_Time__c, Location__c,
               Total_Spots__c, Filled_Spots__c, Contact_Email__c, Status__c
        FROM Volunteer_Opportunity__c 
        WHERE Status__c = 'Active'
    """)
    
    print(json.dumps(opportunities))
    
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
      return result.records?.map((record: any) => ({
        id: record.Id,
        salesforceId: record.Id,
        title: record.Title__c,
        description: record.Description__c,
        organization: record.Organization__c,
        category: record.Category__c,
        date: new Date(record.Event_Date__c),
        startTime: record.Start_Time__c,
        endTime: record.End_Time__c,
        location: record.Location__c,
        totalSpots: record.Total_Spots__c,
        filledSpots: record.Filled_Spots__c,
        contactEmail: record.Contact_Email__c,
        status: record.Status__c,
        imageUrl: null,
        requirements: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) || [];
    } catch (error) {
      console.error('Failed to sync opportunities from Salesforce:', error);
      return [];
    }
  }
}

export const salesforceService = new SalesforceService();
