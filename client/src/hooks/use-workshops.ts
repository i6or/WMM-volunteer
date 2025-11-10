import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Workshop, type InsertWorkshop } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface WorkshopFilters {
  programId?: string;
  status?: string;
  search?: string;
}

export function useWorkshops(filters?: WorkshopFilters) {
  return useQuery<Workshop[]>({
    queryKey: ["/api/workshops", filters],
    queryFn: async ({ queryKey }) => {
      const [, filterParams] = queryKey as [string, WorkshopFilters | undefined];
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
      
      const response = await fetch(`/api/workshops?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch workshops");
      return response.json();
    },
  });
}

export function useWorkshop(id: string | undefined) {
  return useQuery<Workshop>({
    queryKey: ["/api/workshops", id],
    queryFn: async () => {
      const response = await fetch(`/api/workshops/${id}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch workshop");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertWorkshop) => {
      const response = await apiRequest("POST", "/api/workshops", data);
      return response.json() as Promise<Workshop>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
    },
  });
}

export function useUpdateWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Workshop> }) => {
      const response = await apiRequest("PUT", `/api/workshops/${id}`, data);
      return response.json() as Promise<Workshop>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workshops", variables.id] });
    },
  });
}

export function useDeleteWorkshop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/workshops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
    },
  });
}

