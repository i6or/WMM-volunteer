import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, MapPin, Users, Presentation } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Workshop } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PresenterOpportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

              <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                Showing {workshops?.length || 0} workshops
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workshop Cards */}
        {isLoading ? (
          <div className="text-center py-8">Loading workshops...</div>
        ) : workshops && workshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
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

// Workshop Card Component
function WorkshopCard({ workshop }: { workshop: WorkshopWithProgram }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const signupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/workshop-signups", {
        workshopId: workshop.id,
        role: "presenter",
        status: "confirmed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      toast({
        title: "Sign up successful!",
        description: `You've been registered as a presenter for ${workshop.type || workshop.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
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

  // Default spots for presenters
  const totalSpots = 2;
  const filledSpots = 0;
  const availableSpots = Math.max(0, totalSpots - filledSpots);

  // Use workshop.type if available, otherwise fall back to name
  const workshopType = workshop.type || workshop.name;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-workshop-${workshop.id}`}>
      <CardContent className="p-6">
        {/* Workshop topic badge */}
        <div className="mb-3">
          <Badge className="mb-2 bg-blue-100 text-blue-800" data-testid={`badge-topic-${workshop.id}`}>
            {workshop.topic || "Workshop"}
          </Badge>
        </div>

        {/* Workshop Type (replaces workshop name) */}
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

          {/* Format */}
          {workshop.programFormat && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-format-${workshop.id}`}>
                Format: {workshop.programFormat}
              </span>
            </div>
          )}

          {/* Location (fallback if no format) */}
          {!workshop.programFormat && workshop.location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-location-${workshop.id}`}>
                {workshop.location}
              </span>
            </div>
          )}

          {/* Description */}
          {workshop.description && (
            <p className="text-sm text-muted-foreground mt-2" data-testid={`text-description-${workshop.id}`}>
              {workshop.description}
            </p>
          )}
        </div>

        {/* Spots and Action button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid={`text-spots-${workshop.id}`}>
              {filledSpots}/{totalSpots} presenters
            </span>
          </div>
          <Button
            onClick={() => signupMutation.mutate()}
            disabled={signupMutation.isPending || availableSpots === 0}
            data-testid={`button-signup-${workshop.id}`}
          >
            Sign Up
          </Button>
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
