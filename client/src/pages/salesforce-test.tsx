import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";

interface ConnectionResult {
  success: boolean;
  message: string;
  userInfo?: any;
  organizationId?: string;
}

interface ObjectResult {
  success: boolean;
  objects?: any[];
  totalObjects?: number;
  message?: string;
}

export function SalesforceTest() {
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [objectsResult, setObjectsResult] = useState<ObjectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/salesforce/test', {
        credentials: 'include'
      });
      const result = await response.json();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const exploreObjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/salesforce/objects', {
        credentials: 'include'
      });
      const result = await response.json();
      setObjectsResult(result);
    } catch (error) {
      setObjectsResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const queryObject = async (objectName: string) => {
    setLoading(true);
    setSelectedObject(objectName);
    try {
      const response = await fetch(`/api/salesforce/query/${objectName}?limit=5`, {
        credentials: 'include'
      });
      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      setQueryResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Salesforce Integration Test</h1>
          <p className="text-muted-foreground">
            Test your Salesforce connection and explore objects for volunteer opportunities.
          </p>
        </div>

        {/* Connection Test */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              data-testid="test-connection-button"
            >
              {loading ? "Testing..." : "Test Salesforce Connection"}
            </Button>
            
            {connectionResult && (
              <div className={`p-4 rounded-lg ${
                connectionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={connectionResult.success ? "default" : "destructive"}>
                    {connectionResult.success ? "Success" : "Failed"}
                  </Badge>
                  <span className="font-medium">{connectionResult.message}</span>
                </div>
                
                {connectionResult.userInfo && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Connected User:</p>
                    <p className="font-mono text-sm">
                      {connectionResult.userInfo.Name} ({connectionResult.userInfo.Email})
                    </p>
                  </div>
                )}
                
                {connectionResult.organizationId && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Organization:</p>
                    <p className="font-mono text-sm">{connectionResult.organizationId}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Objects Exploration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Explore Objects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={exploreObjects} 
              disabled={loading || !connectionResult?.success}
              data-testid="explore-objects-button"
            >
              {loading ? "Exploring..." : "Find Volunteer-Related Objects"}
            </Button>
            
            {objectsResult && (
              <div className={`p-4 rounded-lg ${
                objectsResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {objectsResult.success ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="default">Found</Badge>
                      <span className="font-medium">
                        {objectsResult.objects?.length || 0} volunteer-related objects 
                        (of {objectsResult.totalObjects} total)
                      </span>
                    </div>
                    
                    <div className="grid gap-3">
                      {objectsResult.objects?.map((obj, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-semibold">{obj.label}</span>
                              <span className="text-sm text-muted-foreground ml-2">({obj.name})</span>
                              {obj.custom && <Badge variant="outline" className="ml-2">Custom</Badge>}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => queryObject(obj.name)}
                              disabled={loading}
                            >
                              Query Records
                            </Button>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <strong>Fields:</strong> {obj.fields?.map((f: any) => f.label).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Failed</Badge>
                    <span>{objectsResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Results */}
        {queryResult && selectedObject && (
          <Card>
            <CardHeader>
              <CardTitle>Sample Records from {selectedObject}</CardTitle>
            </CardHeader>
            <CardContent>
              {queryResult.success ? (
                <div>
                  <Badge className="mb-4">
                    {queryResult.totalSize} total records found
                  </Badge>
                  
                  <div className="bg-gray-50 p-4 rounded-lg overflow-auto">
                    <pre className="text-sm">
                      {JSON.stringify(queryResult.records, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Query Failed</Badge>
                  <span>{queryResult.message}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}