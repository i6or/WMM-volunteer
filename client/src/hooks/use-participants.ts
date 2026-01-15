import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Participant, type InsertParticipant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ParticipantFilters {
  programId?: string;
  status?: string;
  search?: string;
}

export function useParticipants(filters?: ParticipantFilters) {
  return useQuery<Participant[]>({
    queryKey: ["/api/participants", filters],
    queryFn: async ({ queryKey }) => {
      const [, filterParams] = queryKey as [string, ParticipantFilters | undefined];
      const params = new URLSearchParams();
      if (filterParams?.programId) {
        params.set("programId", filterParams.programId);
      }
      if (filterParams?.status && filterParams.status !== "all") {
        params.set("status", filterParams.status);
      }
      if (filterParams?.search) {
        params.set("search", filterParams.search);
      }
      
      const response = await fetch(`/api/participants?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch participants");
      return response.json();
    },
  });
}

export function useParticipant(id: string | undefined) {
  return useQuery<Participant>({
    queryKey: ["/api/participants", id],
    queryFn: async () => {
      const response = await fetch(`/api/participants/${id}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch participant");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertParticipant) => {
      const response = await apiRequest("POST", "/api/participants", data);
      return response.json() as Promise<Participant>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
    },
  });
}

export function useUpdateParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Participant> }) => {
      const response = await apiRequest("PUT", `/api/participants/${id}`, data);
      return response.json() as Promise<Participant>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participants", variables.id] });
    },
  });
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/participants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
    },
  });
}

