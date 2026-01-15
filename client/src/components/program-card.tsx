import { Calendar, MapPin, Heart, Users, Presentation, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Program } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const [signupOpen, setSignupOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    comments: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Use numberOfCoaches from Salesforce data
  const totalSpots = 20; // Default max coaches per program
  const filledSpots = program.numberOfCoaches || 0;
  const availableSpots = Math.max(0, totalSpots - filledSpots);
  const isFull = availableSpots === 0;

  // Coach signup mutation
  const signupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/coach-signups", {
        programIds: [program.id],
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
        description: "You've successfully signed up as a coach for this program.",
      });
      setSignupOpen(false);
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
      case 'girls life launch':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'upcoming':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
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
        {/* Type badge, Status badge, and Primary Program Partner */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {program.programType && (
                <Badge className={getTypeColor(program.programType)} data-testid={`badge-type-${program.id}`}>
                  {program.programType}
                </Badge>
              )}
              {program.status && (
                <Badge variant="outline" className={`text-xs ${getStatusColor(program.status)}`} data-testid={`badge-status-${program.id}`}>
                  {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                </Badge>
              )}
            </div>
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

        {/* Description */}
        {program.description && (
          <p className="text-sm text-foreground mb-4" data-testid={`text-description-${program.id}`}>
            {program.description}
          </p>
        )}

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

        {/* Coach count and Sign up button */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2" data-testid={`text-spots-${program.id}`}>
              {filledSpots}/{totalSpots} coaches
            </span>
          </div>
          
          <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isFull || signupMutation.isPending}
                data-testid={`button-signup-${program.id}`}
              >
                {isFull ? "Full" : "Sign Up"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Sign Up as Coach</DialogTitle>
                <DialogDescription>
                  Sign up to coach in {program.name || program.programType || "this program"}. 
                  {program.numberOfWorkshops && ` This program includes ${program.numberOfWorkshops} ${program.workshopFrequency?.toLowerCase() || 'weekly'} workshops.`}
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupOpen(false)}
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
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
