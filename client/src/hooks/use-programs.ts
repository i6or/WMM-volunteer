import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Program, type InsertProgram } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ProgramFilters {
  status?: string;
  search?: string;
}

export function usePrograms(filters?: ProgramFilters) {
  return useQuery<Program[]>({
    queryKey: ["/api/programs", filters],
    queryFn: async ({ queryKey }) => {
      const [, filterParams] = queryKey as [string, ProgramFilters | undefined];
      const params = new URLSearchParams();
      if (filterParams?.status && filterParams.status !== "all") {
        params.set("status", filterParams.status);
      }
      if (filterParams?.search) {
        params.set("search", filterParams.search);
      }
      
      const response = await fetch(`/api/programs?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch programs");
      return response.json();
    },
  });
}

export function useProgram(id: string | undefined) {
  return useQuery<Program>({
    queryKey: ["/api/programs", id],
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch program");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertProgram) => {
      const response = await apiRequest("POST", "/api/programs", data);
      return response.json() as Promise<Program>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Program> }) => {
      const response = await apiRequest("PUT", `/api/programs/${id}`, data);
      return response.json() as Promise<Program>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs", variables.id] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
  });
}

