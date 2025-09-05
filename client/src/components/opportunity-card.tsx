import { Calendar, Clock, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Opportunity } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

const categoryColors = {
  "Financial Coaching": "bg-green-100 text-green-800",
  "Workshop Presenting": "bg-blue-100 text-blue-800", 
  "Program Support": "bg-emerald-100 text-emerald-800",
  "Administrative Support": "bg-orange-100 text-orange-800",
  "Event Planning": "bg-pink-100 text-pink-800",
  "Community Outreach": "bg-teal-100 text-teal-800",
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const signupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/signups", {
        volunteerId: "temp-volunteer-id", // This would come from user context
        opportunityId: opportunity.id,
        status: "confirmed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Sign up successful!",
        description: `You've been registered for ${opportunity.title}`,
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

  const fillPercentage = ((opportunity.filledSpots || 0) / opportunity.totalSpots) * 100;
  const formatDate = new Date(opportunity.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });

  const categoryColor = categoryColors[opportunity.category as keyof typeof categoryColors] || "bg-gray-100 text-gray-800";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-opportunity-${opportunity.id}`}>
      {opportunity.imageUrl && (
        <div 
          className="h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${opportunity.imageUrl})` }}
        />
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge className={`mb-2 ${categoryColor}`} data-testid={`badge-category-${opportunity.id}`}>
              {opportunity.category}
            </Badge>
            <h3 className="font-semibold text-foreground mb-1" data-testid={`text-title-${opportunity.id}`}>
              {opportunity.title}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-organization-${opportunity.id}`}>
              {opportunity.organization}
            </p>
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-favorite-${opportunity.id}`}>
            <Heart className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid={`text-description-${opportunity.id}`}>
          {opportunity.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span data-testid={`text-date-${opportunity.id}`}>{formatDate}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span data-testid={`text-time-${opportunity.id}`}>
              {opportunity.startTime} - {opportunity.endTime}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span data-testid={`text-location-${opportunity.id}`}>{opportunity.location}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-muted-foreground" data-testid={`text-capacity-${opportunity.id}`}>
              {opportunity.filledSpots}/{opportunity.totalSpots} spots filled
            </div>
            <div className="w-16 bg-muted rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full transition-all" 
                style={{ width: `${fillPercentage}%` }}
                data-testid={`progress-fill-${opportunity.id}`}
              />
            </div>
          </div>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-blue-600" 
            size="sm"
            onClick={() => signupMutation.mutate()}
            disabled={signupMutation.isPending || (opportunity.filledSpots || 0) >= opportunity.totalSpots}
            data-testid={`button-signup-${opportunity.id}`}
          >
            {signupMutation.isPending ? "Signing up..." : "Sign Up"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
