import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Opportunity, type Program } from "@shared/schema";
import { Calendar, Clock, MapPin, Users, CheckCircle2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProgramWithOpportunities {
  program: Program;
  opportunities: Opportunity[];
  opportunitiesByType: Record<string, Opportunity[]>;
}

export default function CoachingOpportunities() {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all programs
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    queryFn: async () => {
      const response = await fetch('/api/programs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json();
    },
  });

  // Fetch all opportunities
  const { data: opportunities, isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      return response.json();
    },
  });

  // Fetch volunteer signups
  const { data: mySignups } = useQuery({
    queryKey: ["/api/signups"],
    queryFn: async () => {
      const response = await fetch('/api/signups', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch signups');
      return response.json();
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
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

  // Group opportunities by program and then by category/type
  const programsWithOpportunities: ProgramWithOpportunities[] = (programs || [])
    .map(program => {
      const programOpps = (opportunities || []).filter(opp => opp.programId === program.id);
      
      // Group opportunities by category/type
      const opportunitiesByType = programOpps.reduce((acc, opp) => {
        const type = opp.category || "Other";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(opp);
        return acc;
      }, {} as Record<string, Opportunity[]>);

      return {
        program,
        opportunities: programOpps,
        opportunitiesByType,
      };
    })
    .filter(pwo => pwo.opportunities.length > 0)
    .sort((a, b) => {
      // Sort by program start date
      const dateA = a.program.startDate ? new Date(a.program.startDate).getTime() : 0;
      const dateB = b.program.startDate ? new Date(b.program.startDate).getTime() : 0;
      return dateA - dateB;
    });

  const isSignedUp = (opportunityId: string) => {
    return mySignups?.some((signup: any) => signup.opportunityId === opportunityId) || false;
  };

  const isFull = (opp: Opportunity) => {
    return (opp.filledSpots || 0) >= opp.totalSpots;
  };

  const getTotalSpots = (opps: Opportunity[]) => {
    return opps.reduce((sum, opp) => sum + opp.totalSpots, 0);
  };

  const getFilledSpots = (opps: Opportunity[]) => {
    return opps.reduce((sum, opp) => sum + (opp.filledSpots || 0), 0);
  };

  const getAvailableSpots = (opps: Opportunity[]) => {
    return getTotalSpots(opps) - getFilledSpots(opps);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" asChild>
              <a href="/my-signups">View My Signups</a>
            </Button>
          </div>
        </div>

        {/* Programs with Opportunities */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading opportunities...</p>
          </div>
        ) : programsWithOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No opportunities available at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {programsWithOpportunities.map(({ program, opportunitiesByType }) => {
              const programDate = program.startDate ? new Date(program.startDate) : null;
              const programDateStr = programDate 
                ? programDate.toLocaleDateString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric',
                    weekday: 'long'
                  })
                : "TBD";

              return (
                <Card key={program.id} className="overflow-hidden">
                  <CardHeader className="bg-green-700 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{program.name}</CardTitle>
                        <div className="flex flex-wrap gap-4 text-sm text-green-100 mt-2">
                          {program.startDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Start: {formatDate(program.startDate)}
                            </div>
                          )}
                          {program.duration && (
                            <div>{program.duration}</div>
                          )}
                          {program.ageRange && (
                            <div>{program.ageRange}</div>
                          )}
                          {program.format && (
                            <Badge variant="outline" className="border-green-300 text-green-100">
                              {program.format}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(opportunitiesByType).map(([type, typeOpps]) => {
                        const totalSpots = getTotalSpots(typeOpps);
                        const filledSpots = getFilledSpots(typeOpps);
                        const availableSpots = getAvailableSpots(typeOpps);
                        const isTypeFull = availableSpots === 0;
                        const hasAnySignedUp = typeOpps.some(opp => isSignedUp(opp.id));

                        return (
                          <AccordionItem key={type} value={type} className="border-b">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-4">
                                  <div className="text-left">
                                    <div className="font-semibold text-gray-900">{type}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {typeOpps.length} {typeOpps.length === 1 ? 'opportunity' : 'opportunities'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {filledSpots} / {totalSpots} spots filled
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {availableSpots} available
                                    </div>
                                  </div>
                                  {hasAnySignedUp && (
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Signed Up
                                    </Badge>
                                  )}
                                  {!hasAnySignedUp && !isTypeFull && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Sign up for the first available opportunity
                                        const firstAvailable = typeOpps.find(opp => !isFull(opp) && !isSignedUp(opp.id));
                                        if (firstAvailable) {
                                          signupMutation.mutate(firstAvailable.id);
                                        }
                                      }}
                                      disabled={signupMutation.isPending}
                                    >
                                      Sign Up
                                    </Button>
                                  )}
                                  {isTypeFull && !hasAnySignedUp && (
                                    <Badge variant="outline" className="border-gray-300 text-gray-500">
                                      Full
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4">
                              <div className="space-y-3 pt-2">
                                {typeOpps.map((opp) => {
                                  const oppDate = new Date(opp.date);
                                  const isOppFull = isFull(opp);
                                  const isOppSignedUp = isSignedUp(opp.id);

                                  return (
                                    <div 
                                      key={opp.id} 
                                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 mb-2">
                                            {opp.title}
                                          </div>
                                          <div className="text-sm text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <Calendar className="h-3 w-3" />
                                              {formatDate(opp.date)} - {oppDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-3 w-3" />
                                              {opp.startTime} - {opp.endTime}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <MapPin className="h-3 w-3" />
                                              {opp.location}
                                            </div>
                                            {opp.description && (
                                              <div className="mt-2 text-gray-700">
                                                {opp.description}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="ml-4 flex flex-col items-end gap-2">
                                          <div className="text-sm text-gray-600 text-right">
                                            <div className="font-medium">
                                              {opp.filledSpots || 0} / {opp.totalSpots} filled
                                            </div>
                                            <div className="text-xs">
                                              {opp.totalSpots - (opp.filledSpots || 0)} available
                                            </div>
                                          </div>
                                          {isOppSignedUp ? (
                                            <Badge className="bg-green-100 text-green-800 border-green-300">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              Signed Up
                                            </Badge>
                                          ) : isOppFull ? (
                                            <Badge variant="outline" className="border-gray-300 text-gray-500">
                                              Full
                                            </Badge>
                                          ) : (
                                            <Button
                                              size="sm"
                                              onClick={() => signupMutation.mutate(opp.id)}
                                              disabled={signupMutation.isPending}
                                              className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                              {signupMutation.isPending ? "Signing up..." : "Sign Up"}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
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
