import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Mail, Ban, Check } from "lucide-react";
import { type Volunteer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AdminVolunteersTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/volunteers", { search: searchQuery, status: statusFilter, page: currentPage }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.page) searchParams.set('page', params.page.toString());
      
      const response = await fetch(`/api/volunteers?${searchParams.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch volunteers');
      return response.json() as Promise<{ volunteers: Volunteer[]; total: number }>;
    },
  });

  const updateVolunteerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Volunteer> }) => {
      return apiRequest("PUT", `/api/volunteers/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      toast({
        title: "Volunteer updated",
        description: "Volunteer status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const volunteers = data?.volunteers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleApprove = (volunteerId: string) => {
    updateVolunteerMutation.mutate({
      id: volunteerId,
      updates: { status: "active" }
    });
  };

  const handleDeactivate = (volunteerId: string) => {
    updateVolunteerMutation.mutate({
      id: volunteerId,
      updates: { status: "inactive" }
    });
  };

  const getInterestBadges = (volunteer: Volunteer) => {
    const interests = [];
    if (volunteer.interestFoodHunger) interests.push("Food & Hunger");
    if (volunteer.interestEducation) interests.push("Education");
    if (volunteer.interestEnvironment) interests.push("Environment");
    if (volunteer.interestHealth) interests.push("Health");
    if (volunteer.interestSeniors) interests.push("Seniors");
    if (volunteer.interestAnimals) interests.push("Animals");
    return interests;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading volunteers...</div>;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <h3 className="text-lg font-semibold text-foreground">Volunteer Management</h3>
          <div className="flex space-x-3">
            <div className="relative">
              <Input
                placeholder="Search volunteers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-w-64"
                data-testid="input-search-volunteers"
              />
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-foreground">
                <Checkbox data-testid="checkbox-select-all" />
              </th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Volunteer</th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Registration Date</th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Interest Areas</th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Hours Logged</th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {volunteers.map((volunteer) => {
              const interests = getInterestBadges(volunteer);
              return (
                <tr key={volunteer.id} className="hover:bg-muted/50" data-testid={`row-volunteer-${volunteer.id}`}>
                  <td className="p-4">
                    <Checkbox data-testid={`checkbox-volunteer-${volunteer.id}`} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium" data-testid={`text-initials-${volunteer.id}`}>
                          {getInitials(volunteer.firstName, volunteer.lastName)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`text-name-${volunteer.id}`}>
                          {volunteer.firstName} {volunteer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-email-${volunteer.id}`}>
                          {volunteer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground" data-testid={`text-date-${volunteer.id}`}>
                    {volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1" data-testid={`interests-${volunteer.id}`}>
                      {interests.slice(0, 2).map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {interests.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{interests.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground" data-testid={`text-hours-${volunteer.id}`}>
                    {volunteer.hoursLogged}
                  </td>
                  <td className="p-4">
                    <Badge className={`text-xs ${getStatusColor(volunteer.status || 'pending')}`} data-testid={`badge-status-${volunteer.id}`}>
                      {volunteer.status || 'pending'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" title="Edit" data-testid={`button-edit-${volunteer.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Message" data-testid={`button-message-${volunteer.id}`}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      {volunteer.status === "pending" ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Approve"
                          onClick={() => handleApprove(volunteer.id)}
                          className="text-green-600 hover:text-green-700"
                          data-testid={`button-approve-${volunteer.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Deactivate"
                          onClick={() => handleDeactivate(volunteer.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-deactivate-${volunteer.id}`}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
          Showing {Math.min((currentPage - 1) * 10 + 1, total)}-{Math.min(currentPage * 10, total)} of {total} volunteers
        </p>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            data-testid="button-previous-page"
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                data-testid={`button-page-${page}`}
              >
                {page}
              </Button>
            );
          })}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
