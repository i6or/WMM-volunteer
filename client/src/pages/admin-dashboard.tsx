import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdminVolunteersTable } from "@/components/admin-volunteers-table";
import { Plus, Download, UserPlus, CalendarCheck, Clock, Hourglass } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("volunteers");

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch('/api/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

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
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Hourglass className="text-purple-600 h-6 w-6" />
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
      </div>

      <Footer />
    </div>
  );
}
