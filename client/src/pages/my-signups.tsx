import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SignupWithOpportunity {
  id: string;
  volunteerId: string;
  opportunityId: string;
  status: string;
  hoursWorked: string;
  createdAt: string;
  opportunity: {
    id: string;
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    category: string;
  };
}

export default function MySignups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all signups (in real app, filter by authenticated volunteer ID)
  const { data: signups, isLoading } = useQuery({
    queryKey: ["/api/signups"],
    queryFn: async () => {
      const response = await fetch('/api/signups', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch signups');
      const signups = await response.json();
      
      // Fetch opportunity details for each signup
      const signupsWithDetails = await Promise.all(
        signups.map(async (signup: any) => {
          try {
            const oppResponse = await fetch(`/api/opportunities/${signup.opportunityId}`, {
              credentials: 'include'
            });
            if (oppResponse.ok) {
              const opportunity = await oppResponse.json();
              return { ...signup, opportunity };
            }
          } catch (error) {
            console.error(`Failed to fetch opportunity ${signup.opportunityId}:`, error);
          }
          return signup;
        })
      );
      
      return signupsWithDetails.filter((s: any) => s.opportunity);
    },
  });

  const cancelSignupMutation = useMutation({
    mutationFn: async ({ volunteerId, opportunityId }: { volunteerId: string; opportunityId: string }) => {
      await apiRequest("DELETE", `/api/signups/${volunteerId}/${opportunityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Success!",
        description: "You've cancelled your signup.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel signup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group signups by date
  const groupedSignups = signups?.reduce((acc, signup: SignupWithOpportunity) => {
    if (!signup.opportunity) return acc;
    
    const dateKey = new Date(signup.opportunity.date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const dayOfWeek = new Date(signup.opportunity.date).toLocaleDateString('en-US', { weekday: 'long' });
    const fullDateKey = `${dateKey} ${dayOfWeek}`;
    
    if (!acc[fullDateKey]) {
      acc[fullDateKey] = [];
    }
    acc[fullDateKey].push(signup);
    return acc;
  }, {} as Record<string, SignupWithOpportunity[]>) || {};

  const sortedDates = Object.keys(groupedSignups).sort((a, b) => {
    const dateA = new Date(a.split(' ')[0]);
    const dateB = new Date(b.split(' ')[0]);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Signups
          </h1>
          <p className="text-gray-600">
            View and manage your coaching opportunity signups
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading your signups...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">You haven't signed up for any opportunities yet.</p>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <a href="/coaching-opportunities">Browse Opportunities</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const [date, dayOfWeek] = dateKey.split(' ');
              const dateSignups = groupedSignups[dateKey];
              
              return (
                <Card key={dateKey}>
                  <CardHeader className="bg-green-50 border-b">
                    <CardTitle className="text-xl text-green-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {date} - {dayOfWeek}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {dateSignups.map((signup: SignupWithOpportunity) => (
                        <div key={signup.id} className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {signup.opportunity.title}
                              </h3>
                              <p className="text-gray-600 mb-3">
                                {signup.opportunity.description}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {signup.opportunity.startTime} - {signup.opportunity.endTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {signup.opportunity.location}
                                </div>
                                <Badge variant="outline" className="border-green-300 text-green-700">
                                  {signup.opportunity.category}
                                </Badge>
                                <Badge variant="outline" className="border-blue-300 text-blue-700">
                                  Status: {signup.status}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelSignupMutation.mutate({
                                volunteerId: signup.volunteerId,
                                opportunityId: signup.opportunityId
                              })}
                              disabled={cancelSignupMutation.isPending}
                              className="ml-4 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

