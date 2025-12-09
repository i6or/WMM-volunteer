import { Calendar, MapPin, Heart, Users, Presentation, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Program } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default spots for coach volunteers
  // TODO: Replace with actual volunteer signup count when available
  const totalSpots = 20;
  const filledSpots = 0; // Will be populated from volunteer signups
  const availableSpots = Math.max(0, totalSpots - filledSpots);

  const signupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/program-signups", {
        programId: program.id,
        role: "coach",
        status: "confirmed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Sign up successful!",
        description: `You've been registered as a coach for ${program.name}`,
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
    if (!date) return "";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time from "12:00:00.000Z" to "12:00 PM EST"
  // Note: Salesforce stores times as local time with Z suffix (not actual UTC)
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";

    // Parse the time string (format: HH:MM:SS.sssZ)
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return timeStr;

    const hours = parseInt(match[1], 10);
    const minutes = match[2];

    // Convert to 12-hour format (no UTC conversion needed)
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period} EST`;
  };

  const getTypeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'financial futures':
        return 'bg-green-100 text-green-800';
      case 'life launch':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Build date range string
  const getDateRange = () => {
    if (program.startDate && program.endDate) {
      return `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`;
    } else if (program.startDate) {
      return `Starts ${formatDate(program.startDate)}`;
    }
    return "Dates TBD";
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-program-${program.id}`}>
      <CardContent className="p-6">
        {/* Type badge and Primary Program Partner */}
        <div className="flex items-start justify-between mb-3">
          <div>
            {program.programType && (
              <Badge className={`mb-2 ${getTypeColor(program.programType)}`} data-testid={`badge-type-${program.id}`}>
                {program.programType}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground" data-testid={`text-partner-${program.id}`}>
              {program.primaryProgramPartner || "Women's Money Matters"}
            </p>
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-favorite-${program.id}`}>
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Program Type as title */}
        <h3 className="font-semibold text-foreground mb-1 text-lg" data-testid={`text-name-${program.id}`}>
          {program.programType || program.name}
        </h3>

        {/* Date range */}
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-date-range-${program.id}`}>
          {getDateRange()}
        </p>

        {/* Program details */}
        <div className="space-y-2 mb-4">
          {/* Number of Workshops with Frequency */}
          {program.numberOfWorkshops && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Presentation className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-workshops-${program.id}`}>
                {program.numberOfWorkshops} {program.workshopFrequency?.toLowerCase() || ''} Workshops
              </span>
            </div>
          )}

          {/* Language */}
          {program.language && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-language-${program.id}`}>
                {program.language}
              </span>
            </div>
          )}

          {/* Workshop Day and Time combined */}
          {(program.workshopDay || program.workshopTime) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-schedule-${program.id}`}>
                {program.workshopDay && `${program.workshopDay}s`}
                {program.workshopDay && program.workshopTime && ' at '}
                {program.workshopTime && formatTime(program.workshopTime)}
              </span>
            </div>
          )}

          {/* Format (location) */}
          {program.format && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-format-${program.id}`}>
                {program.format}
              </span>
            </div>
          )}
        </div>

        {/* Spots and Action button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid={`text-spots-${program.id}`}>
              {filledSpots}/{totalSpots} spots filled
            </span>
          </div>
          <Button
            className="bg-green-500 text-white hover:bg-green-600"
            size="sm"
            onClick={() => signupMutation.mutate()}
            disabled={signupMutation.isPending || availableSpots <= 0}
            data-testid={`button-signup-${program.id}`}
          >
            {signupMutation.isPending ? "Signing up..." : "Sign Up"}
          </Button>
        </div>

        {/* Salesforce ID (debug) */}
        {program.salesforceId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono">
              SF ID: {program.salesforceId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
