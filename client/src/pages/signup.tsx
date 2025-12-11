import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, MapPin, Check } from "lucide-react";
import { type Program } from "@shared/schema";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());

  // Fetch programs - upcoming ones only
  const { data: programs, isLoading } = useQuery({
    queryKey: ["/api/programs", { dateRange: "upcoming" }],
    queryFn: async () => {
      const response = await fetch('/api/programs?dateRange=upcoming', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json() as Promise<Program[]>;
    },
  });

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    if (selectedPrograms.size === 0) return;
    // Store selected programs and navigate to form
    const programIds = Array.from(selectedPrograms).join(',');
    setLocation(`/signup/form?programs=${programIds}`);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return { day: "", weekday: "" };
    const d = new Date(date);
    return {
      day: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return timeStr;
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${period}`;
  };

  // Calculate end time (add 1.5 hours)
  const getEndTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return "";
    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    // Add 1.5 hours
    minutes += 30;
    hours += 1;
    if (minutes >= 60) {
      minutes -= 60;
      hours += 1;
    }
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const getSlotStatus = (program: Program) => {
    const filled = program.numberOfCoaches || 0;
    const total = 20;
    const available = total - filled;

    if (available <= 0) return { status: 'full', text: `All ${filled} slots filled`, available: 0 };
    return { status: 'available', text: `${filled} of ${total} slots filled`, available };
  };

  // Sort programs by start date
  const sortedPrograms = programs?.slice().sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dateA - dateB;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Dates shown as mm/dd/yyyy EST</p>
        </div>

        {/* Table Header */}
        <div className="bg-[#2e7d32] text-white rounded-t-lg">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Location</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-4">Available Opportunities</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        {/* Program List */}
        {isLoading ? (
          <div className="bg-white border border-t-0 p-8 text-center">
            Loading programs...
          </div>
        ) : sortedPrograms && sortedPrograms.length > 0 ? (
          <div className="bg-white border border-t-0 divide-y">
            {sortedPrograms.map((program) => {
              const { day, weekday } = formatDate(program.startDate);
              const slotInfo = getSlotStatus(program);
              const isSelected = selectedPrograms.has(program.id);
              const isFull = slotInfo.available <= 0;

              return (
                <div
                  key={program.id}
                  className={`grid grid-cols-12 gap-4 p-4 items-start ${isSelected ? 'bg-green-50' : ''}`}
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <div className="font-semibold">{day}</div>
                    <div className="text-muted-foreground">{weekday}</div>
                  </div>

                  {/* Location */}
                  <div className="col-span-3">
                    <div className="text-sm">
                      {program.name}
                      {program.format && ` - ${program.format}`}
                      {program.format === 'Virtual' && ' Zoom Meeting'}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="col-span-2">
                    <div className="font-semibold">
                      {formatTime(program.workshopTime)}-
                    </div>
                    <div className="font-semibold">
                      {getEndTime(program.workshopTime)}
                    </div>
                  </div>

                  {/* Available Opportunities */}
                  <div className="col-span-4">
                    <div className="font-semibold text-lg mb-2">
                      Coach {program.format === 'Virtual' ? '' : 'In-Person'} - {program.numberOfWorkshops || 8} {program.workshopFrequency?.toLowerCase() || 'weekly'} workshops ({program.format?.toLowerCase() || 'virtual'})
                    </div>
                    <Badge
                      className={`${
                        isFull
                          ? 'bg-[#2e7d32] text-white'
                          : 'bg-[#8bc34a] text-white'
                      }`}
                    >
                      {slotInfo.text}
                    </Badge>
                  </div>

                  {/* Action Button */}
                  <div className="col-span-1 flex justify-end">
                    {isFull ? (
                      <Button
                        disabled
                        className="bg-[#f9a825] text-white hover:bg-[#f9a825] min-w-[100px]"
                      >
                        Full
                      </Button>
                    ) : isSelected ? (
                      <Button
                        onClick={() => toggleProgram(program.id)}
                        className="bg-[#4caf50] text-white hover:bg-[#43a047] min-w-[100px]"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Selected
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggleProgram(program.id)}
                        className="bg-[#4caf50] text-white hover:bg-[#43a047] min-w-[100px]"
                      >
                        Sign Up
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-t-0 p-8 text-center">
            <p className="text-muted-foreground">No upcoming programs available.</p>
          </div>
        )}

        {/* Save & Continue Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleContinue}
            disabled={selectedPrograms.size === 0}
            className="bg-[#2e7d32] text-white hover:bg-[#1b5e20] px-8 py-3 text-lg"
          >
            Save & Continue
          </Button>
        </div>

        {selectedPrograms.size > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            {selectedPrograms.size} program{selectedPrograms.size > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}
