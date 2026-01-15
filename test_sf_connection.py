import os
import sys
import json
from urllib.parse import urlparse

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
    
    # Your Salesforce credentials
    username = "sf+wmm@capetivate.com"
    password = "WomenBudget22"
    security_token = "V5HI5e5LearPE1TxiZEgOoNWc"
    domain = "https://wmm.lightning.force.com/"
    
    # Clean up domain URL if needed
    if 'http' in domain:
        domain = urlparse(domain).netloc
    domain = domain.replace('https://', '').replace('http://', '').rstrip('/')
    
    print(f"Using domain: {domain}")
    
    if 'lightning.force.com' in domain:
        # For custom My Domain, we need to use the instance_url parameter
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            instance_url=f'https://{domain}'
        )
    else:
        # Standard domain (login/test)
        sf = Salesforce(
            username=username,
            password=password,
            security_token=security_token,
            domain=domain
        )
    
    # Test connection by getting user info
    user_info = sf.query(f"SELECT Id, Name, Email FROM User WHERE Username = '{username}' LIMIT 1")
    
    result = {
        "success": True,
        "message": "Successfully connected to Salesforce",
        "userInfo": user_info['records'][0] if user_info['records'] else None,
        "organizationId": sf.sf_instance
    }
    
    print(json.dumps(result, indent=2))
    
except ImportError as e:
    print(json.dumps({
        "success": False, 
        "message": f"simple-salesforce not installed: {str(e)}"
    }, indent=2))
except Exception as e:
    print(json.dumps({
        "success": False, 
        "message": f"Connection failed: {str(e)}"
    }, indent=2))
