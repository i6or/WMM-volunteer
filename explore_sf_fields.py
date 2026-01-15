import os
from simple_salesforce import Salesforce

# Your Salesforce credentials
username = "sf+wmm@capetivate.com"
password = "WomenBudget22"
security_token = "V5HI5e5LearPE1TxiZEgOoNWc"
domain = "https://wmm.lightning.force.com/"

try:
    # For custom lightning domain, use instance_url parameter
    sf = Salesforce(
        username=username,
        password=password,
        security_token=security_token,
        instance_url=domain
    )
    
    print("✅ Connected to Salesforce!")
    
    # Get detailed field information for Volunteer Jobs
    print("\n=== VOLUNTEER JOB FIELDS ===")
    job_desc = sf.GW_Volunteers__Volunteer_Job__c.describe()
    for field in job_desc['fields']:
        if field['name'] in ['Id', 'Name', 'GW_Volunteers__Description__c', 
                           'GW_Volunteers__Location__c', 'GW_Volunteers__Campaign__c',
                           'GW_Volunteers__Skills_Needed__c', 'GW_Volunteers__Display_on_Website__c',
                           'GW_Volunteers__Program__c', 'GW_Volunteers__Status__c']:
            print(f"{field['name']}: {field['label']} ({field['type']})")
    
    # Get detailed field information for Volunteer Shifts
    print("\n=== VOLUNTEER SHIFT FIELDS ===")
    shift_desc = sf.GW_Volunteers__Volunteer_Shift__c.describe()
    for field in shift_desc['fields']:
        if field['name'] in ['Id', 'Name', 'GW_Volunteers__Start_Date_Time__c',
                           'GW_Volunteers__Duration__c', 'GW_Volunteers__Total_Volunteers__c',
                           'GW_Volunteers__Number_of_Volunteers_Still_Needed__c',
                           'GW_Volunteers__Description__c', 'GW_Volunteers__System_Note__c',
                           'GW_Volunteers__Volunteer_Job__c', 'GW_Volunteers__Status__c']:
            print(f"{field['name']}: {field['label']} ({field['type']})")
    
    # Get sample data to see what we're working with
    print("\n=== SAMPLE VOLUNTEER JOBS ===")
    jobs = sf.query("""
        SELECT Id, Name, GW_Volunteers__Description__c,
               GW_Volunteers__Location__c, GW_Volunteers__Campaign__c,
               GW_Volunteers__Skills_Needed__c, GW_Volunteers__Display_on_Website__c
        FROM GW_Volunteers__Volunteer_Job__c 
        LIMIT 5
    """)
    
    print(f"Found {len(jobs['records'])} total jobs")
    
    for job in jobs['records']:
        print(f"\nJob: {job['Name']}")
        print(f"  ID: {job['Id']}")
        print(f"  Description: {job.get('GW_Volunteers__Description__c', 'N/A')}")
        print(f"  Location: {job.get('GW_Volunteers__Location__c', 'N/A')}")
        print(f"  Campaign: {job.get('GW_Volunteers__Campaign__c', 'N/A')}")
        print(f"  Skills Needed: {job.get('GW_Volunteers__Skills_Needed__c', 'N/A')}")
        print(f"  Display on Website: {job.get('GW_Volunteers__Display_on_Website__c', 'N/A')}")
        
        # Get shifts for this job
        job_id = job['Id']
        shifts = sf.query(f"""
            SELECT Id, Name, GW_Volunteers__Start_Date_Time__c,
                   GW_Volunteers__Duration__c, GW_Volunteers__Total_Volunteers__c,
                   GW_Volunteers__Number_of_Volunteers_Still_Needed__c,
                   GW_Volunteers__Description__c
            FROM GW_Volunteers__Volunteer_Shift__c
            WHERE GW_Volunteers__Volunteer_Job__c = '{job_id}'
            AND GW_Volunteers__Start_Date_Time__c != null
            ORDER BY GW_Volunteers__Start_Date_Time__c DESC
            LIMIT 3
        """)
        
        print(f"  Recent Shifts: {len(shifts['records'])}")
        for shift in shifts['records']:
            start_time = shift.get('GW_Volunteers__Start_Date_Time__c')
            duration = shift.get('GW_Volunteers__Duration__c', 1)
            total_spots = shift.get('GW_Volunteers__Total_Volunteers__c', 1)
            still_needed = shift.get('GW_Volunteers__Number_of_Volunteers_Still_Needed__c', 0)
            filled = total_spots - still_needed if total_spots else 0
            
            print(f"    - {start_time} ({duration}h) - {filled}/{total_spots} spots")
    
except Exception as e:
    print(f"❌ Error: {e}")
