import { Calendar, Clock, Users, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Program } from "@shared/schema";

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getFormatColor = (format: string | null) => {
    if (format?.toLowerCase().includes('virtual')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-program-${program.id}`}>
      <CardContent className="p-6">
        {/* Header with badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(program.status)} data-testid={`badge-status-${program.id}`}>
              {program.status || 'Active'}
            </Badge>
            {program.format && (
              <Badge className={getFormatColor(program.format)} data-testid={`badge-format-${program.id}`}>
                {program.format}
              </Badge>
            )}
          </div>
        </div>

        {/* Program name */}
        <h3 className="font-semibold text-foreground mb-2 text-lg" data-testid={`text-name-${program.id}`}>
          {program.name}
        </h3>

        {/* Partner */}
        {program.primaryProgramPartner && (
          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-partner-${program.id}`}>
            {program.primaryProgramPartner}
          </p>
        )}

        {/* Program details */}
        <div className="space-y-2 mb-4">
          {/* Start Date */}
          {program.startDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-start-date-${program.id}`}>
                Starts {formatDate(program.startDate)}
              </span>
            </div>
          )}

          {/* Workshop Schedule */}
          {(program.workshopDay || program.workshopTime) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-schedule-${program.id}`}>
                {program.workshopDay && `${program.workshopDay}s`}
                {program.workshopDay && program.workshopTime && ' at '}
                {program.workshopTime}
              </span>
            </div>
          )}

          {/* Number of Workshops */}
          {program.numberOfWorkshops && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span data-testid={`text-workshops-${program.id}`}>
                {program.numberOfWorkshops} workshops
              </span>
            </div>
          )}

          {/* Format indicator */}
          {program.format?.toLowerCase().includes('virtual') && program.zoomLink && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Video className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Virtual via Zoom</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
            asChild
            data-testid={`button-view-${program.id}`}
          >
            <a href={`/programs/${program.id}`}>View Details</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
