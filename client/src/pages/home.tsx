import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Users, Calendar, Clock, CheckSquare, X } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Program } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Default to all statuses
  const [dateRangeFilter, setDateRangeFilter] = useState("current_quarter"); // Default to current quarter
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", comments: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch programs
  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs", { search: searchQuery, status: statusFilter, dateRange: dateRangeFilter }],
    queryFn: async ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.dateRange) params.set('dateRange', filters.dateRange);

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

  // Coach signup mutation for multiple programs
  const signupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/coach-signups", {
        programIds: Array.from(selectedPrograms),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        comments: formData.comments || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-signups"] });
      toast({
        title: "Success!",
        description: `You've successfully signed up as a coach for ${selectedPrograms.size} program${selectedPrograms.size !== 1 ? 's' : ''}.`,
      });
      setSelectedPrograms(new Set());
      setShowSignupForm(false);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", comments: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up. Please try again.",
        variant: "destructive",
      });
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
              {/* Removed "Browse Coaching Opportunities" button - programs are displayed below */}
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
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger className="w-48" data-testid="select-date-range-filter">
                    <SelectValue placeholder="Current Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_quarter">Current Quarter</SelectItem>
                    <SelectItem value="next_3_months">Next 3 Months</SelectItem>
                    <SelectItem value="upcoming">All Upcoming</SelectItem>
                    <SelectItem value="all">All Programs</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
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

              <div className="flex items-center gap-4">
                {selectedPrograms.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {selectedPrograms.size} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPrograms(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                  Showing {programs?.length || 0} programs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Programs Banner */}
        {selectedPrograms.size > 0 && (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {selectedPrograms.size} program{selectedPrograms.size !== 1 ? 's' : ''} selected
                    {selectedPrograms.size >= 4 && " (maximum reached)"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPrograms(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => setShowSignupForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Signup ({selectedPrograms.size})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signup Form Dialog */}
        <Dialog open={showSignupForm} onOpenChange={setShowSignupForm}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Sign Up as Coach</DialogTitle>
              <DialogDescription>
                Sign up to coach in {selectedPrograms.size} program{selectedPrograms.size !== 1 ? 's' : ''}. 
                Please provide your information below.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.firstName || !formData.lastName || !formData.email) {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                  return;
                }
                signupMutation.mutate();
              }}
              className="space-y-4 mt-4"
            >
              {/* Selected Programs List */}
              <div className="space-y-2">
                <Label>Selected Programs</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                  {programs?.filter(p => selectedPrograms.has(p.id)).map((program) => (
                    <div key={program.id} className="text-sm flex items-center justify-between">
                      <span className="font-medium">{program.name || program.programType || "Program"}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newSelected = new Set(selectedPrograms);
                          newSelected.delete(program.id);
                          setSelectedPrograms(newSelected);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  placeholder="Any additional information you'd like to share..."
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSignupForm(false)}
                  disabled={signupMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "Signing up..." : "Sign Up"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Program Cards */}
        {isLoading ? (
          <div className="text-center py-8">Loading programs...</div>
        ) : programs && programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {programs.map((program) => (
              <ProgramCard 
                key={program.id} 
                program={program}
                isSelected={selectedPrograms.has(program.id)}
                onSelectChange={(selected) => {
                  const newSelected = new Set(selectedPrograms);
                  if (selected) {
                    // Check if already at max (4 programs)
                    if (newSelected.size >= 4) {
                      toast({
                        title: "Maximum reached",
                        description: "You can select up to 4 programs at a time.",
                        variant: "destructive",
                      });
                      return;
                    }
                    newSelected.add(program.id);
                  } else {
                    newSelected.delete(program.id);
                  }
                  setSelectedPrograms(newSelected);
                }}
              />
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
                  setDateRangeFilter("current_quarter");
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
