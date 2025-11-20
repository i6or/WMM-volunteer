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


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("volunteers");
  
  // Salesforce test state
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [programsResult, setProgramsResult] = useState<any>(null);
  const [workshopsResult, setWorkshopsResult] = useState<any>(null);
  const [dbCheckResult, setDbCheckResult] = useState<any>(null);
  const [schemaPushResult, setSchemaPushResult] = useState<any>(null);

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

  const testSpecificProgram = async () => {
    setLoading(true);
    try {
      // Test with the program ID the user mentioned earlier
      const response = await fetch('/api/salesforce/test-program/a0OUa00000HGsYwMAL', {
        credentials: 'include'
      });
      const result = await response.json();
      console.log('Test program result:', result);
      setProgramsResult({
        success: result.success,
        message: result.success ? 'Found program!' : `Error: ${result.error || result.message}`,
        testResult: result
      });
    } catch (error) {
      setProgramsResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const checkDatabase = async () => {
    setLoading(true);
    try {
      // First check connection
      const connResponse = await fetch('/api/debug/db-connection', {
        credentials: 'include'
      });
      const connResult = await connResponse.json();
      console.log('Database connection check:', connResult);
      
      // Then check programs
      const response = await fetch('/api/debug/db-programs', {
        credentials: 'include'
      });
      const result = await response.json();
      console.log('Database check result:', result);
      setDbCheckResult({
        success: !result.schemaMissing,
        message: result.message || `Database has ${result.count} programs`,
        count: result.count,
        programs: result.programs || [],
        schemaMissing: result.schemaMissing,
        tables: result.tables || [],
        testResult: {
          connection: connResult,
          programs: result
        }
      });
    } catch (error) {
      setDbCheckResult({
        success: false,
        message: `Database check failed: ${error}`
      });
    }
    setLoading(false);
  };

  const pushSchema = async () => {
    setLoading(true);
    setSchemaPushResult(null);
    try {
      const response = await fetch('/api/admin/push-schema', {
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();
      setSchemaPushResult(result);
      if (result.success) {
        // Refresh database check after successful push
        setTimeout(() => {
          checkDatabase();
        }, 1000);
      }
    } catch (error) {
      setSchemaPushResult({
        success: false,
        message: `Schema push failed: ${error}`
      });
    }
    setLoading(false);
  };

  const queryPrograms = async (filterType?: 'currentQuarter' | 'next60Days') => {
    setLoading(true);
    try {
      // Try simple endpoint first for "All Programs"
      if (!filterType) {
        try {
          const simpleResponse = await fetch('/api/salesforce/programs-simple', {
            credentials: 'include'
          });
          const simpleResult = await simpleResponse.json();
          if (simpleResult.success && simpleResult.count > 0) {
            setProgramsResult(simpleResult);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Simple endpoint failed, trying regular endpoint');
        }
      }
      
      // Use regular endpoint for filtered queries or if simple failed
      const params = new URLSearchParams();
      if (filterType === 'currentQuarter') {
        params.set('currentQuarter', 'true');
      } else if (filterType === 'next60Days') {
        params.set('next60Days', 'true');
      }
      
      const response = await fetch(`/api/salesforce/programs?${params.toString()}`, {
        credentials: 'include'
      });
      const result = await response.json();
      setProgramsResult(result);
    } catch (error) {
      setProgramsResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const queryProgramsWithWorkshops = async (filterType?: 'currentQuarter' | 'next60Days') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType === 'currentQuarter') {
        params.set('currentQuarter', 'true');
      } else if (filterType === 'next60Days') {
        params.set('next60Days', 'true');
      }
      
      const response = await fetch(`/api/salesforce/programs-with-workshops?${params.toString()}`, {
        credentials: 'include'
      });
      const result = await response.json();
      setWorkshopsResult(result);
    } catch (error) {
      setWorkshopsResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const syncProgramsToDatabase = async (filterType?: 'currentQuarter' | 'next60Days') => {
    setLoading(true);
    try {
      const body: any = {};
      if (filterType === 'currentQuarter') {
        body.currentQuarter = true;
      } else if (filterType === 'next60Days') {
        body.next60Days = true;
      }

      const response = await fetch('/api/salesforce/sync-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const result = await response.json();
      setSyncResult(result);
      if (result.success) {
        alert(`Successfully synced ${result.programsSynced} programs and ${result.workshopsSynced} workshops to database!`);
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `Network error: ${error}`
      });
    }
    setLoading(false);
  };

  const syncAllWorkshops = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/salesforce/sync-workshops', {
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();
      setSyncResult(result);
      if (result.success) {
        alert(`Successfully synced ${result.workshopsSynced} workshops to database!`);
      }
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
            {/* Database Connection Check */}
            <Card>
              <CardHeader>
                <CardTitle>Neon Database Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Verify your Neon database connection and check what data is currently stored.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={checkDatabase} 
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? "Checking..." : "Check Neon Database"}
                  </Button>
                  
                  {dbCheckResult && dbCheckResult.schemaMissing && (
                    <Button 
                      onClick={pushSchema} 
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {loading ? "Pushing..." : "Push Database Schema"}
                    </Button>
                  )}
                </div>
                
                {dbCheckResult && (
                  <div className={`p-4 rounded-lg ${
                    dbCheckResult.success ? 'bg-green-50 border border-green-200' : dbCheckResult.schemaMissing ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={dbCheckResult.success ? "default" : dbCheckResult.schemaMissing ? "secondary" : "destructive"}>
                        {dbCheckResult.success ? "Connected" : dbCheckResult.schemaMissing ? "Schema Missing" : "Failed"}
                      </Badge>
                      <span className="text-sm font-medium">{dbCheckResult.message}</span>
                    </div>
                    {dbCheckResult.schemaMissing && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                        <strong>⚠️ Action Required:</strong> Database tables are missing. Click "Push Database Schema" above to create all required tables (programs, workshops, opportunities, etc.).
                      </div>
                    )}
                    {dbCheckResult.testResult && dbCheckResult.testResult.connection && (
                      <div className="mt-3 space-y-2 text-xs">
                        <div><strong>Database:</strong> {dbCheckResult.testResult.connection.databaseName || 'N/A'}</div>
                        <div><strong>Host:</strong> {dbCheckResult.testResult.connection.connectionInfo?.host || 'N/A'}</div>
                        <div><strong>User:</strong> {dbCheckResult.testResult.connection.connectionInfo?.user || 'N/A'}</div>
                        {dbCheckResult.testResult.programs && (
                          <div className="mt-2">
                            <div><strong>Programs in database:</strong> {dbCheckResult.testResult.programs.count || 0}</div>
                            <div><strong>Tables:</strong> {dbCheckResult.testResult.programs.tables?.length > 0 ? dbCheckResult.testResult.programs.tables.join(', ') : 'None found'}</div>
                            {dbCheckResult.testResult.programs.programs && dbCheckResult.testResult.programs.programs.length > 0 && (
                              <div className="mt-2">
                                <strong>Sample programs:</strong>
                                <pre className="text-xs bg-white p-1 rounded mt-1 max-h-40 overflow-auto">
                                  {JSON.stringify(dbCheckResult.testResult.programs.programs, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {schemaPushResult && (
                  <div className={`p-4 rounded-lg ${
                    schemaPushResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={schemaPushResult.success ? "default" : "destructive"}>
                        {schemaPushResult.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-sm font-medium">{schemaPushResult.message}</span>
                    </div>
                    {schemaPushResult.output && (
                      <pre className="mt-2 text-xs bg-white p-2 rounded max-h-40 overflow-auto">
                        {schemaPushResult.output}
                      </pre>
                    )}
                    {schemaPushResult.error && (
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded max-h-40 overflow-auto">
                        {schemaPushResult.error}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* Query Programs from Salesforce */}
            <Card>
              <CardHeader>
                <CardTitle>Query Programs from Salesforce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Query Programs from Salesforce. Filter by Current Quarter or Next 60 Days to get real data.
                </p>
                <div className="mb-2 space-y-2">
                  <Button 
                    onClick={testSpecificProgram} 
                    disabled={loading || !connectionResult?.success}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? "Testing..." : "Test Specific Program (a0OUa00000HGsYwMAL)"}
                  </Button>
                  <Button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await fetch('/api/test-workshops/a0OUa00000HGsYwMAL', { credentials: 'include' });
                        const result = await response.json();
                        alert(`Found ${result.count} workshops:\n\n${JSON.stringify(result, null, 2)}`);
                      } catch (error) {
                        alert(`Error: ${error}`);
                      }
                      setLoading(false);
                    }}
                    disabled={loading || !connectionResult?.success}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? "Testing..." : "Test Workshops for Program"}
                  </Button>
                  <Button
                    onClick={checkDatabase}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? "Checking..." : "Check Neon Database"}
                  </Button>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await fetch('/api/salesforce/describe-workshop', { credentials: 'include' });
                        const result = await response.json();
                        console.log('Workshop__c fields:', result);
                        if (result.success) {
                          alert(`Workshop__c Object:\n\nTotal Workshops: ${result.totalWorkshops}\n\nFields (${result.fields.length}):\n${result.fields.map((f: any) => `${f.name} (${f.type})`).join('\n')}`);
                        } else {
                          alert(`Error: ${result.error}`);
                        }
                      } catch (error) {
                        alert(`Error: ${error}`);
                      }
                      setLoading(false);
                    }}
                    disabled={loading || !connectionResult?.success}
                    variant="outline"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {loading ? "Checking..." : "Describe Workshop__c Object"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const response = await fetch('/api/programs/all', { credentials: 'include' });
                          const result = await response.json();
                          setProgramsResult(result);
                        } catch (error) {
                          setProgramsResult({ success: false, message: `Error: ${error}` });
                        }
                        setLoading(false);
                      }}
                      disabled={loading || !connectionResult?.success}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? "Querying..." : "All Programs (Simple)"}
                    </Button>
                    <Button 
                      onClick={() => queryPrograms()} 
                      disabled={loading || !connectionResult?.success}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? "Querying..." : "All Programs (Old)"}
                    </Button>
                    <Button 
                      onClick={() => queryPrograms('currentQuarter')} 
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? "Querying..." : "Current Quarter"}
                    </Button>
                    <Button 
                      onClick={() => queryPrograms('next60Days')} 
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Querying..." : "Next 60 Days"}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => queryProgramsWithWorkshops()} 
                      disabled={loading || !connectionResult?.success}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? "Loading..." : "All + Workshops"}
                    </Button>
                    <Button 
                      onClick={() => queryProgramsWithWorkshops('currentQuarter')} 
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? "Loading..." : "Qtr + Workshops"}
                    </Button>
                    <Button 
                      onClick={() => queryProgramsWithWorkshops('next60Days')} 
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Loading..." : "60 Days + Workshops"}
                    </Button>
                  </div>
                </div>

                {/* Sync to Database Section */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Sync to Neon Database
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const response = await fetch('/api/programs/sync-all', {
                            method: 'POST',
                            credentials: 'include'
                          });
                          const result = await response.json();
                          setSyncResult(result);
                          if (result.success) {
                            alert(`Successfully synced ${result.programsSynced} programs and ${result.workshopsSynced} workshops!`);
                          }
                        } catch (error) {
                          setSyncResult({ success: false, message: `Error: ${error}` });
                        }
                        setLoading(false);
                      }}
                      disabled={loading || !connectionResult?.success}
                      variant="outline"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? "Syncing..." : "Sync All (Simple)"}
                    </Button>
                    <Button
                      onClick={() => syncProgramsToDatabase()}
                      disabled={loading || !connectionResult?.success}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? "Syncing..." : "Sync All Programs (Old)"}
                    </Button>
                    <Button
                      onClick={() => syncProgramsToDatabase('currentQuarter')}
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? "Syncing..." : "Sync Current Quarter"}
                    </Button>
                    <Button
                      onClick={() => syncProgramsToDatabase('next60Days')}
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Syncing..." : "Sync Next 60 Days"}
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={syncAllWorkshops}
                      disabled={loading || !connectionResult?.success}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {loading ? "Syncing..." : "Sync All Workshops Only"}
                    </Button>
                  </div>
                  {syncResult && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={syncResult.success ? "default" : "destructive"}>
                          {syncResult.success ? "Success" : "Failed"}
                        </Badge>
                        <span className="text-sm font-medium">{syncResult.message}</span>
                      </div>
                      {syncResult.success && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Programs synced: {syncResult.programsSynced} | Workshops synced: {syncResult.workshopsSynced}
                        </div>
                      )}
                      {syncResult.debug && (
                        <div className="mt-3 p-2 bg-gray-100 rounded text-xs space-y-1">
                          <div><strong>Debug Info:</strong></div>
                          <div>• Programs from Salesforce (with filters): {syncResult.debug.programsFromSalesforce}</div>
                          <div>• Programs without filters: {syncResult.debug.programsWithoutFilters}</div>
                          {syncResult.debug.sampleProgram && (
                            <div className="mt-2">
                              <strong>Sample Program:</strong>
                              <pre className="text-xs bg-white p-1 rounded mt-1 max-h-40 overflow-auto">
                                {JSON.stringify(syncResult.debug.sampleProgram, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {programsResult && (
                  <div className={`p-4 rounded-lg ${
                    programsResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={programsResult.success ? "default" : "destructive"}>
                        {programsResult.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-sm font-medium">
                        Found {programsResult.count || 0} Programs
                        {programsResult.filteredByNext60Days && " (Next 60 Days)"}
                        {programsResult.filteredByCurrentQuarter && " (Current Quarter)"}
                      </span>
                    </div>
                    {programsResult.success && programsResult.programs && (
                      <div className="mt-2 space-y-2">
                        {programsResult.debug && (
                          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded space-y-1">
                            <div><strong>Debug Info:</strong></div>
                            <div>• Test query (no filters): {programsResult.debug.testQueryResults ?? 'N/A'} records</div>
                            <div>• Test query 2 (with date field): {programsResult.debug.testQuery2Results ?? 'N/A'} records</div>
                            {programsResult.debug.testQuery3Results !== undefined && (
                              <div>• Test query 3 (date filter only): {programsResult.debug.testQuery3Results} records</div>
                            )}
                            <div>• Full query (all filters): {programsResult.debug.fullQueryResults ?? 'N/A'} records</div>
                            {programsResult.debug.testQuery2Records && programsResult.debug.testQuery2Records.length > 0 && (
                              <div className="mt-2 p-2 bg-white rounded">
                                <strong>Sample Programs (no filters) - Check their dates:</strong>
                                {programsResult.debug.testQuery2Records.map((record: any, idx: number) => (
                                  <div key={idx} className="mt-1 text-xs">
                                    <div><strong>{record.Name}</strong> (ID: {record.Id})</div>
                                    <div>Start Date: {record.Program_Start_Date__c || 'NULL'}</div>
                                    <div>Status: {record.Status__c || record.Status_a__c || 'NULL'}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {programsResult.debug.query && (
                              <div className="mt-2">
                                <strong>Query used:</strong>
                                <pre className="text-xs bg-white p-1 rounded mt-1 max-h-20 overflow-auto">
                                  {programsResult.debug.query}
                                </pre>
                              </div>
                            )}
                            {programsResult.debug.testQuery2Records && programsResult.debug.testQuery2Records.length > 0 && (
                              <div className="mt-2">
                                <strong>Sample records (no filters):</strong>
                                <pre className="text-xs bg-white p-1 rounded mt-1 max-h-40 overflow-auto">
                                  {JSON.stringify(programsResult.debug.testQuery2Records, null, 2)}
                                </pre>
                              </div>
                            )}
                            {programsResult.debug.testQuery3Records && programsResult.debug.testQuery3Records.length > 0 && (
                              <div className="mt-2">
                                <strong>Sample records (date filter only):</strong>
                                <pre className="text-xs bg-white p-1 rounded mt-1 max-h-40 overflow-auto">
                                  {JSON.stringify(programsResult.debug.testQuery3Records, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                        {programsResult.programs.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto">
                            <pre className="text-xs bg-white p-2 rounded border">
                              {JSON.stringify(programsResult.programs.slice(0, 3), null, 2)}
                              {programsResult.programs.length > 3 && `\n... and ${programsResult.programs.length - 3} more`}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                            Query succeeded but returned 0 programs. Check debug info above or try without filters.
                            {programsResult.debug && (
                              <div className="mt-2 text-xs space-y-1">
                                <div><strong>Query used:</strong> {programsResult.debug.query?.substring(0, 200)}...</div>
                                {programsResult.debug.testQueryResults !== undefined && (
                                  <div>Test query 1 (basic): {programsResult.debug.testQueryResults} records</div>
                                )}
                                {programsResult.debug.testQuery2Results !== undefined && (
                                  <div>Test query 2 (with fields): {programsResult.debug.testQuery2Results} records</div>
                                )}
                                {programsResult.debug.fullQueryResults !== undefined && (
                                  <div>Full query: {programsResult.debug.fullQueryResults} records</div>
                                )}
                                {programsResult.debug.testQuery2Records && programsResult.debug.testQuery2Records.length > 0 && (
                                  <div className="mt-2">
                                    <strong>Sample from test query 2:</strong>
                                    <pre className="text-xs bg-white p-1 rounded mt-1 max-h-20 overflow-auto">
                                      {JSON.stringify(programsResult.debug.testQuery2Records[0], null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!programsResult.success && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-red-700">{programsResult.message || programsResult.error}</p>
                        {programsResult.testResult && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <strong>Test Program Result:</strong>
                            <pre className="mt-1 bg-white p-1 rounded max-h-40 overflow-auto">
                              {JSON.stringify(programsResult.testResult, null, 2)}
                            </pre>
                          </div>
                        )}
                        {programsResult.available_fields && (
                          <div className="text-xs bg-gray-100 p-2 rounded">
                            <strong>Available fields:</strong> {programsResult.available_fields.join(', ')}
                          </div>
                        )}
                        {programsResult.simpleQueryResults !== undefined && (
                          <div className="text-xs text-blue-700">
                            Simple query (no date filters) returned {programsResult.simpleQueryResults} records
                            {programsResult.simpleQueryRecords && programsResult.simpleQueryRecords.length > 0 && (
                              <pre className="mt-1 bg-white p-1 rounded text-xs">
                                {JSON.stringify(programsResult.simpleQueryRecords, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {programsResult.success && programsResult.testResult && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                        <strong>Test Program Result:</strong>
                        <pre className="mt-1 bg-white p-1 rounded max-h-40 overflow-auto">
                          {JSON.stringify(programsResult.testResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {workshopsResult && (
                  <div className={`p-4 rounded-lg ${
                    workshopsResult.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={workshopsResult.success ? "default" : "destructive"}>
                        {workshopsResult.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-sm font-medium">
                        Found {workshopsResult.count || 0} Programs with Workshops
                        {workshopsResult.filteredByNext60Days && " (Next 60 Days)"}
                        {workshopsResult.filteredByCurrentQuarter && " (Current Quarter)"}
                      </span>
                    </div>
                    {workshopsResult.success && workshopsResult.data && (
                      <div className="mt-2 space-y-2">
                        {workshopsResult.data.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded border text-xs">
                            <div className="font-semibold">{item.program.Name}</div>
                            <div className="text-gray-600">{item.workshops.length} workshops</div>
                          </div>
                        ))}
                        {workshopsResult.data.length > 2 && (
                          <div className="text-xs text-gray-600">
                            ... and {workshopsResult.data.length - 2} more programs
                          </div>
                        )}
                      </div>
                    )}
                    {!workshopsResult.success && (
                      <p className="text-sm text-red-700">{workshopsResult.message}</p>
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
