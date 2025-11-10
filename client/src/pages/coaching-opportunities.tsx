import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Opportunity } from "@shared/schema";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CoachingOpportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all opportunities
  const { data: opportunities, isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities", { search: searchQuery }],
    queryFn: async ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      
      const response = await fetch(`/api/opportunities?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      return response.json();
    },
  });

  // Fetch volunteer signups to show what user has signed up for
  const { data: mySignups } = useQuery({
    queryKey: ["/api/signups"],
    queryFn: async () => {
      // In a real app, you'd get the volunteer ID from auth context
      // For now, we'll get all signups and filter client-side
      const response = await fetch('/api/signups', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch signups');
      return response.json();
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      // In a real app, get volunteerId from auth context
      // For now, we'll need to handle this differently
      const response = await apiRequest("POST", "/api/signups", {
        volunteerId: "temp-id", // TODO: Get from auth
        opportunityId,
        status: "confirmed",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signups"] });
      toast({
        title: "Success!",
        description: "You've successfully signed up for this opportunity.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group opportunities by date
  const groupedOpportunities = opportunities?.reduce((acc, opp) => {
    const dateKey = new Date(opp.date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const dayOfWeek = new Date(opp.date).toLocaleDateString('en-US', { weekday: 'long' });
    const fullDateKey = `${dateKey} ${dayOfWeek}`;
    
    if (!acc[fullDateKey]) {
      acc[fullDateKey] = [];
    }
    acc[fullDateKey].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>) || {};

  // Sort dates
  const sortedDates = Object.keys(groupedOpportunities).sort((a, b) => {
    const dateA = new Date(a.split(' ')[0]);
    const dateB = new Date(b.split(' ')[0]);
    return dateA.getTime() - dateB.getTime();
  });

  const isSignedUp = (opportunityId: string) => {
    return mySignups?.some((signup: any) => signup.opportunityId === opportunityId) || false;
  };

  const isFull = (opp: Opportunity) => {
    return (opp.filledSpots || 0) >= opp.totalSpots;
  };

  const getAvailableSpots = (opp: Opportunity) => {
    return opp.totalSpots - (opp.filledSpots || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Women's Money Matters
              </h1>
              <h2 className="text-4xl font-bold text-green-600">
                Coaching Opportunities
              </h2>
            </div>
            <div className="text-sm text-gray-500">
              Dates shown as mm/dd/yyyy EST
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700">
              Thank you for your interest in coaching in an upcoming program! Please review the available slots below and click on the button to sign up. 
              The date shown is the start date of the weekly program. Full schedules can be found under "related files". Thank you!
            </p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-2">Already signed up?</p>
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              Change my sign up
            </Button>
          </div>
        </div>

        {/* Opportunities Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading opportunities...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No opportunities available at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="bg-green-700 text-white">
              <CardTitle className="text-xl">Available Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Location</th>
                      <th className="px-4 py-3 text-left font-semibold">Time</th>
                      <th className="px-4 py-3 text-left font-semibold">Available Opportunities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map((dateKey, dateIndex) => {
                      const [date, dayOfWeek] = dateKey.split(' ');
                      const dateOpps = groupedOpportunities[dateKey];
                      
                      return dateOpps.map((opp, oppIndex) => (
                        <tr 
                          key={opp.id} 
                          className={`border-b ${oppIndex === 0 ? 'bg-green-50' : ''}`}
                        >
                          {oppIndex === 0 && (
                            <td 
                              className="px-4 py-3 font-semibold text-green-700 align-top"
                              rowSpan={dateOpps.length}
                            >
                              <div>{date}</div>
                              <div className="text-sm font-normal text-gray-600">{dayOfWeek}</div>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {opp.title.split(' - ')[0]}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Start Date: {new Date(opp.date).toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                              }).replace(/\//g, '.')}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {opp.location}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="h-4 w-4" />
                              {opp.startTime} - {opp.endTime}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="mb-2">
                              <div className="font-medium text-gray-900">{opp.description}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4" />
                                {isFull(opp) ? (
                                  <span className="font-medium">All {opp.totalSpots} slots filled</span>
                                ) : (
                                  <span>
                                    {opp.filledSpots || 0} of {opp.totalSpots} slots filled
                                  </span>
                                )}
                              </div>
                              <div className="ml-4">
                                {isSignedUp(opp.id) ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Signed Up
                                  </Badge>
                                ) : isFull(opp) ? (
                                  <Button 
                                    disabled 
                                    variant="outline"
                                    className="bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed"
                                  >
                                    Full
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => signupMutation.mutate(opp.id)}
                                    disabled={signupMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {signupMutation.isPending ? "Signing up..." : "Sign Up"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}

