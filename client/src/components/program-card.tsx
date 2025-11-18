import { Calendar, Clock, Users, Heart } from "lucide-react";
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-program-${program.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge className={`mb-2 ${getStatusColor(program.status)}`} data-testid={`badge-status-${program.id}`}>
              {program.status || 'Active'}
            </Badge>
            <h3 className="font-semibold text-foreground mb-1" data-testid={`text-name-${program.id}`}>
              {program.name}
            </h3>
            {program.ageRange && (
              <p className="text-sm text-muted-foreground" data-testid={`text-age-range-${program.id}`}>
                {program.ageRange}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-favorite-${program.id}`}>
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {program.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid={`text-description-${program.id}`}>
            {program.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {program.startDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span data-testid={`text-start-date-${program.id}`}>
                Starts: {formatDate(program.startDate)}
              </span>
            </div>
          )}
          {program.duration && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span data-testid={`text-duration-${program.id}`}>
                {program.duration}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Button
            className="bg-primary text-primary-foreground hover:bg-blue-600"
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
