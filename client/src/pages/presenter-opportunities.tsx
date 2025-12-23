import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Calendar, Clock, MapPin, Users, Presentation, CheckSquare } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Workshop } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PresenterOpportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedWorkshops, setSelectedWorkshops] = useState<Set<string>>(new Set());
  const [pendingSignups, setPendingSignups] = useState<Set<string>>(new Set()); // Workshops added to signup list
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch workshops
  const { data: workshops, isLoading } = useQuery({
    queryKey: ["/api/workshops", { search: searchQuery, status: statusFilter }],
    queryFn: async ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);

      const response = await fetch(`/api/workshops?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch workshops');
      return response.json() as Promise<(Workshop & { programType?: string | null; programFormat?: string | null })[]>;
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const match = time.match(/^(\d{2}):(\d{2})/);
    if (!match) return time;

    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period} EST`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Presenter Opportunities</h2>
              <p className="text-blue-100 text-lg mb-6 max-w-2xl">
                Share your expertise! Sign up to present individual workshops on financial literacy topics.
              </p>
              <div className="flex gap-4">
                <Button className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                  <a href="/coaching-opportunities">View Coaching Opportunities</a>
                </Button>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute right-20 bottom-0 w-16 h-16 bg-white/10 rounded-full translate-y-8"></div>
          </div>
        </section>

        {/* Filters Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="All Workshops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workshops</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search workshops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 min-w-64"
                    data-testid="input-search-workshops"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {selectedWorkshops.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {selectedWorkshops.size} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWorkshops(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                  Showing {workshops?.length || 0} workshops
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Signups Banner */}
        {pendingSignups.size > 0 && (
          <Card className="mb-6 border-blue-500 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {pendingSignups.size} workshop{pendingSignups.size !== 1 ? 's' : ''} in your signup list
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingSignups(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => setShowSignupForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Complete Signup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signup Form Dialog */}
        <SignupFormDialog
          open={showSignupForm}
          onOpenChange={setShowSignupForm}
          pendingWorkshopIds={Array.from(pendingSignups)}
          workshops={workshops || []}
          onSuccess={() => {
            setPendingSignups(new Set());
            setShowSignupForm(false);
            setFormData({ firstName: "", lastName: "", email: "" });
            queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
          }}
        />

        {/* Workshop Cards */}
        {isLoading ? (
          <div className="text-center py-8">Loading workshops...</div>
        ) : workshops && workshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={workshop}
                isSelected={selectedWorkshops.has(workshop.id)}
                isPendingSignup={pendingSignups.has(workshop.id)}
                onSelectChange={(selected) => {
                  const newSelected = new Set(selectedWorkshops);
                  if (selected) {
                    if (newSelected.size >= 10) {
                      toast({
                        title: "Maximum reached",
                        description: "You can select up to 10 workshops at a time.",
                        variant: "destructive",
                      });
                      return;
                    }
                    newSelected.add(workshop.id);
                  } else {
                    newSelected.delete(workshop.id);
                  }
                  setSelectedWorkshops(newSelected);
                }}
                onSignUp={() => {
                  const newPending = new Set(pendingSignups);
                  if (newPending.size >= 10) {
                    toast({
                      title: "Maximum reached",
                      description: "You can sign up for up to 10 workshops at a time.",
                      variant: "destructive",
                    });
                    return;
                  }
                  newPending.add(workshop.id);
                  setPendingSignups(newPending);
                  toast({
                    title: "Added to signup list",
                    description: `${workshop.workshopType || "Workshop"} has been added to your signup list. Click "Complete Signup" to finalize.`,
                  });
                }}
                onRemoveFromSignup={() => {
                  const newPending = new Set(pendingSignups);
                  newPending.delete(workshop.id);
                  setPendingSignups(newPending);
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No workshops found matching your criteria.</p>
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

// Extended Workshop type with program information
type WorkshopWithProgram = Workshop & {
  programType?: string | null;
  programFormat?: string | null;
};

// Signup Form Dialog Component
function SignupFormDialog({
  open,
  onOpenChange,
  pendingWorkshopIds,
  workshops,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingWorkshopIds: string[];
  workshops: WorkshopWithProgram[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (pendingWorkshopIds.length === 0) {
        throw new Error("No workshops selected");
      }
      if (pendingWorkshopIds.length === 1) {
        return apiRequest("POST", "/api/workshop-signups", {
          workshopId: pendingWorkshopIds[0],
          role: "presenter",
          status: "confirmed",
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      } else {
        return apiRequest("POST", "/api/workshop-signups/bulk", {
          workshopIds: pendingWorkshopIds,
          role: "presenter",
          status: "confirmed",
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      const workshopNames = pendingWorkshopIds
        .map(id => workshops.find(w => w.id === id)?.workshopType || workshops.find(w => w.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      const moreCount = pendingWorkshopIds.length > 3 ? ` and ${pendingWorkshopIds.length - 3} more` : "";
      toast({
        title: "Sign up successful!",
        description: `You've been registered as a presenter for ${workshopNames}${moreCount}`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate();
  };

  const pendingWorkshops = pendingWorkshopIds
    .map(id => workshops.find(w => w.id === id))
    .filter(Boolean) as WorkshopWithProgram[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Workshop Signup</DialogTitle>
          <DialogDescription>
            Please provide your information to complete registration for {pendingWorkshopIds.length} workshop{pendingWorkshopIds.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workshop List */}
          <div className="space-y-2">
            <Label>Selected Workshops</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
              {pendingWorkshops.map((workshop) => (
                <div key={workshop.id} className="text-sm">
                  <span className="font-medium">{workshop.workshopType || "Workshop"}</span>
                  {workshop.date && (
                    <span className="text-muted-foreground ml-2">
                      - {new Date(workshop.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Fields */}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={signupMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={signupMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {signupMutation.isPending ? "Submitting..." : "Confirm Signup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Workshop Card Component
function WorkshopCard({ 
  workshop, 
  isSelected, 
  isPendingSignup,
  onSelectChange,
  onSignUp,
  onRemoveFromSignup
}: { 
  workshop: WorkshopWithProgram;
  isSelected: boolean;
  isPendingSignup: boolean;
  onSelectChange: (selected: boolean) => void;
  onSignUp: () => void;
  onRemoveFromSignup: () => void;
}) {

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const match = time.match(/^(\d{2}):(\d{2})/);
    if (!match) return time;

    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period} EST`;
  };

  // Default spots for presenters - changed to 1 per workshop
  const totalSpots = 1;
  const filledSpots = 0;
  const availableSpots = Math.max(0, totalSpots - filledSpots);

  // Use workshop.workshopType (from Workshop_Type__c in Salesforce) as the main title
  // This is the workshop type without program name (e.g., "What is Money?", "Managing Your Money")
  // Workshop_Type__c is the existing field in Salesforce - maps to workshop_type in database
  const workshopType = workshop.workshopType || "Workshop";

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-green-500' : ''} ${isPendingSignup ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`} data-testid={`card-workshop-${workshop.id}`}>
      <CardContent className="p-6">
        {/* Checkbox for selection */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectChange(checked === true)}
              id={`workshop-${workshop.id}`}
            />
            <label
              htmlFor={`workshop-${workshop.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Select for bulk signup
            </label>
          </div>
          {workshop.topic && (
            <Badge className="bg-blue-100 text-blue-800" data-testid={`badge-topic-${workshop.id}`}>
              {workshop.topic}
            </Badge>
          )}
        </div>

        {/* Workshop Type (main title - from SF Type field, no program name) */}
        <h3 className="font-semibold text-foreground mb-1 text-lg" data-testid={`text-type-${workshop.id}`}>
          {workshopType}
        </h3>

        {/* Date */}
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-date-${workshop.id}`}>
          {formatDate(workshop.date)}
        </p>

        {/* Workshop details */}
        <div className="space-y-2 mb-4">
          {/* Time */}
          {workshop.startTime && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-time-${workshop.id}`}>
                {formatTime(workshop.startTime)}
                {workshop.endTime && ` - ${formatTime(workshop.endTime)}`}
              </span>
            </div>
          )}

          {/* Program Type */}
          {workshop.programType && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Presentation className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-program-type-${workshop.id}`}>
                Type: {workshop.programType}
              </span>
            </div>
          )}

          {/* Format - from Workshop Format__c field */}
          {workshop.format && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-format-${workshop.id}`}>
                Format: {workshop.format}
              </span>
            </div>
          )}

          {/* Program Format (fallback if workshop format not available) */}
          {!workshop.format && workshop.programFormat && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-program-format-${workshop.id}`}>
                Format: {workshop.programFormat}
              </span>
            </div>
          )}

          {/* Location (fallback if no format) */}
          {!workshop.format && !workshop.programFormat && workshop.location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-location-${workshop.id}`}>
                {workshop.location}
              </span>
            </div>
          )}

        </div>

        {/* Spots and Action button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid={`text-spots-${workshop.id}`}>
              {filledSpots}/{totalSpots} presenter
            </span>
          </div>
          {isPendingSignup ? (
            <Button
              onClick={onRemoveFromSignup}
              variant="outline"
              size="sm"
              data-testid={`button-remove-${workshop.id}`}
            >
              Remove
            </Button>
          ) : (
            <Button
              onClick={onSignUp}
              disabled={availableSpots === 0}
              data-testid={`button-signup-${workshop.id}`}
              size="sm"
            >
              Sign Up
            </Button>
          )}
        </div>

        {/* Salesforce ID (debug) */}
        {workshop.salesforceId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono">
              SF ID: {workshop.salesforceId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
