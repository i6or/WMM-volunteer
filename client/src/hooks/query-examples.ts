/**
 * Query Examples and Common Patterns
 * 
 * This file demonstrates common query patterns for working with Programs, Workshops, and Participants
 */

import { usePrograms, useProgram, useCreateProgram, useUpdateProgram } from "./use-programs";
import { useWorkshops, useWorkshop, useCreateWorkshop } from "./use-workshops";
import { useParticipants, useParticipant, useCreateParticipant } from "./use-participants";
import { useParticipantWorkshops, useRegisterParticipantForWorkshop } from "./use-participant-workshops";

/**
 * Example 1: Get all active programs
 */
export function ExampleGetAllActivePrograms() {
  const { data: programs, isLoading } = usePrograms({ status: "active" });
  
  // programs will be Program[] | undefined
  // isLoading will be true while fetching
}

/**
 * Example 2: Get a specific program with its workshops
 */
export function ExampleGetProgramWithWorkshops(programId: string) {
  const { data: program } = useProgram(programId);
  const { data: workshops } = useWorkshops({ programId });
  
  // program will be Program | undefined
  // workshops will be Workshop[] | undefined
}

/**
 * Example 3: Get all participants in a program
 */
export function ExampleGetProgramParticipants(programId: string) {
  const { data: participants } = useParticipants({ programId });
  
  // participants will be Participant[] | undefined
}

/**
 * Example 4: Get workshop registrations
 */
export function ExampleGetWorkshopRegistrations(workshopId: string) {
  const { data: registrations } = useParticipantWorkshops(undefined, workshopId);
  
  // registrations will be ParticipantWorkshop[] | undefined
}

/**
 * Example 5: Create a new program
 */
export function ExampleCreateProgram() {
  const createProgram = useCreateProgram();
  
  const handleCreate = async () => {
    try {
      const newProgram = await createProgram.mutateAsync({
        name: "Financial Futures",
        description: "8-week program for ages 22+",
        duration: "8-week program",
        ageRange: "ages 22+",
        status: "active",
      });
      console.log("Created program:", newProgram);
    } catch (error) {
      console.error("Failed to create program:", error);
    }
  };
}

/**
 * Example 6: Create a workshop for a program
 */
export function ExampleCreateWorkshop(programId: string) {
  const createWorkshop = useCreateWorkshop();
  
  const handleCreate = async () => {
    try {
      const newWorkshop = await createWorkshop.mutateAsync({
        programId,
        title: "Budgeting Basics",
        description: "Learn the fundamentals of budgeting",
        date: new Date("2025-04-01T10:00:00"),
        startTime: "10:00 AM",
        endTime: "11:30 AM",
        location: "Community Center",
        maxParticipants: 20,
        status: "scheduled",
      });
      console.log("Created workshop:", newWorkshop);
    } catch (error) {
      console.error("Failed to create workshop:", error);
    }
  };
}

/**
 * Example 7: Register a participant for a workshop
 */
export function ExampleRegisterParticipantForWorkshop(participantId: string, workshopId: string) {
  const register = useRegisterParticipantForWorkshop();
  
  const handleRegister = async () => {
    try {
      const registration = await register.mutateAsync({
        participantId,
        workshopId,
        attendanceStatus: "registered",
      });
      console.log("Registered participant:", registration);
    } catch (error) {
      console.error("Failed to register:", error);
    }
  };
}

/**
 * Example 8: Get all data for a program dashboard
 */
export function ExampleProgramDashboard(programId: string) {
  const { data: program } = useProgram(programId);
  const { data: workshops } = useWorkshops({ programId });
  const { data: participants } = useParticipants({ programId });
  
  // You now have all the data needed for a program dashboard
  // program: Program | undefined
  // workshops: Workshop[] | undefined
  // participants: Participant[] | undefined
}

/**
 * Example 9: Search programs by name
 */
export function ExampleSearchPrograms(searchTerm: string) {
  const { data: programs } = usePrograms({ search: searchTerm });
  
  // programs will be filtered by search term
}

/**
 * Example 10: Get participants by status
 */
export function ExampleGetParticipantsByStatus(programId: string, status: "enrolled" | "completed" | "withdrawn") {
  const { data: participants } = useParticipants({ programId, status });
  
  // participants will be filtered by status
}

