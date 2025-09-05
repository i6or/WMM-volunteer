import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdminVolunteersTable } from "@/components/admin-volunteers-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, UserPlus, CalendarCheck, Clock, Hourglass } from "lucide-react";

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("volunteers");
  
  // Salesforce test state
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [objectsResult, setObjectsResult] = useState<ObjectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch('/api/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Salesforce test functions
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

  const syncOpportunities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/salesforce/sync', {
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Admin Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Admin Dashboard</h2>
            <p className="text-muted-foreground">Manage volunteers, events, and track engagement metrics</p>
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <Button className="bg-primary text-primary-foreground hover:bg-blue-600" data-testid="button-new-event">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
            <Button variant="outline" data-testid="button-export-data">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Admin Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Registrations</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="admin-stat-registrations">
                      {stats.totalRegistrations?.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserPlus className="text-blue-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Events</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="admin-stat-events">
                      {stats.activeEvents}
                    </p>
                    <p className="text-xs text-green-600 mt-1">↑ 3 new this week</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CalendarCheck className="text-green-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="admin-stat-pending">
                      {stats.pendingApprovals}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Needs attention</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-orange-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Logged</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="admin-stat-hours">
                      {stats.totalHours?.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">↑ 8% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Hourglass className="text-green-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            <button
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "volunteers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("volunteers")}
              data-testid="tab-volunteers"
            >
              Volunteers
            </button>
            <button
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("events")}
              data-testid="tab-events"
            >
              Events
            </button>
            <button
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "reports"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("reports")}
              data-testid="tab-reports"
            >
              Reports
            </button>
            <button
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "salesforce"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("salesforce")}
              data-testid="tab-salesforce"
            >
              Salesforce
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "volunteers" && <AdminVolunteersTable />}
        
        {activeTab === "events" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Event Management</h3>
              <p className="text-muted-foreground">
                Event management interface would be implemented here with Salesforce custom object integration 
                for events, capacity tracking, and volunteer assignments.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === "reports" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Reports & Analytics</h3>
              <p className="text-muted-foreground">
                Detailed reporting interface would be implemented here with charts, export capabilities, 
                and Salesforce data integration.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === "salesforce" && (
          <div className="space-y-6">
            {/* Connection Test */}
            <Card>
              <CardHeader>
                <CardTitle>Salesforce Connection Test</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle>Explore Volunteer Objects</CardTitle>
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

            {/* Sync Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Volunteer Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Import volunteer shifts from Programs with related Volunteer Jobs in Salesforce (V4S).
                </p>
                <Button 
                  onClick={syncOpportunities} 
                  disabled={loading || !connectionResult?.success}
                  data-testid="sync-opportunities-button"
                >
                  {loading ? "Syncing..." : "Sync from Salesforce"}
                </Button>
                
                {syncResult && (
                  <div className={`p-4 rounded-lg ${
                    syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={syncResult.success ? "default" : "destructive"}>
                        {syncResult.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="font-medium">{syncResult.message}</span>
                    </div>
                    
                    {syncResult.count !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        {syncResult.count} opportunities synced from Salesforce
                      </p>
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
                      
                      <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
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
        )}
      </div>

      <Footer />
    </div>
  );
}
