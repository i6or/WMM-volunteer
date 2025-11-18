import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Users, Calendar, Clock } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Program } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch programs
  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs", { search: searchQuery, status: statusFilter }],
    queryFn: async ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);

      const response = await fetch(`/api/programs?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json() as Promise<Program[]>;
    },
  });

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
        {/* Hero Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-primary to-green-600 rounded-xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Empower Women & Girls Through Financial Education</h2>
              <p className="text-green-100 text-lg mb-6 max-w-2xl">
                Join our mission to build financial wellness, confidence, and security for women and girls living on low incomes through coaching and workshops.
              </p>
              <div className="flex gap-4">
                <Button className="bg-white text-primary hover:bg-green-50" data-testid="button-browse" asChild>
                  <a href="/coaching-opportunities">Browse Coaching Opportunities</a>
                </Button>
                <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20" asChild>
                  <a href="/register">Register as Volunteer</a>
                </Button>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute right-20 bottom-0 w-16 h-16 bg-white/10 rounded-full translate-y-8"></div>
          </div>
        </section>

        {/* Quick Stats */}
        {stats && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Volunteers</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-active-volunteers">
                      {stats.activeVolunteers?.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="text-green-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Programs</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-active-programs">
                      {programs?.length || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="text-blue-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-monthly-hours">
                      {stats.monthlyHours?.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-green-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Filters Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 min-w-64"
                    data-testid="input-search-programs"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                Showing {programs?.length || 0} programs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program Cards */}
        {isLoading ? (
          <div className="text-center py-8">Loading programs...</div>
        ) : programs && programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No programs found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
