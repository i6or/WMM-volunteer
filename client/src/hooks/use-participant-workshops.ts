import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ParticipantWorkshop, type InsertParticipantWorkshop } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useParticipantWorkshops(participantId?: string, workshopId?: string) {
  return useQuery<ParticipantWorkshop[]>({
    queryKey: ["/api/participant-workshops", { participantId, workshopId }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { participantId?: string; workshopId?: string }];
      const queryParams = new URLSearchParams();
      if (params.participantId) {
        queryParams.set("participantId", params.participantId);
      }
      if (params.workshopId) {
        queryParams.set("workshopId", params.workshopId);
      }
      
      const response = await fetch(`/api/participant-workshops?${queryParams.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch participant workshops");
      return response.json();
    },
  });
}

export function useRegisterParticipantForWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertParticipantWorkshop) => {
      const response = await apiRequest("POST", "/api/participant-workshops", data);
      return response.json() as Promise<ParticipantWorkshop>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participant-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
    },
  });
}

export function useUpdateParticipantWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ParticipantWorkshop> }) => {
      const response = await apiRequest("PUT", `/api/participant-workshops/${id}`, data);
      return response.json() as Promise<ParticipantWorkshop>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participant-workshops"] });
    },
  });
}

export function useRemoveParticipantFromWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ participantId, workshopId }: { participantId: string; workshopId: string }) => {
      await apiRequest("DELETE", `/api/participant-workshops/${participantId}/${workshopId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participant-workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
    },
  });
}

