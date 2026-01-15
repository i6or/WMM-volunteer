import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { type Program } from "@shared/schema";
import { Calendar, Users, Clock } from "lucide-react";

export default function ProgramsTest() {
  // Fetch all programs
  const { data: programs, isLoading, error } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    queryFn: async () => {
      const response = await fetch('/api/programs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json();
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Programs Test - Verify Data Loading
          </h1>
          <p className="text-gray-600">
            This page helps verify that programs are loading correctly from the database.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Loading programs...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600">Error loading programs: {error.message}</p>
            </CardContent>
          </Card>
        ) : !programs || programs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No programs found. Try seeding data from the admin dashboard.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="mb-4">
              <Badge className="bg-green-600 text-white">
                {programs.length} {programs.length === 1 ? 'Program' : 'Programs'} Found
              </Badge>
            </div>
            
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{program.name}</CardTitle>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                        {program.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Start: {formatDate(program.startDate)}
                          </div>
                        )}
                        {program.endDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            End: {formatDate(program.endDate)}
                          </div>
                        )}
                        {program.duration && (
                          <div>{program.duration}</div>
                        )}
                        {program.format && (
                          <Badge variant="outline">{program.format}</Badge>
                        )}
                        {program.status && (
                          <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>
                            {program.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {program.description && (
                    <p className="text-gray-700 mb-4">{program.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {program.ageRange && (
                      <div>
                        <span className="font-medium">Age Range:</span> {program.ageRange}
                      </div>
                    )}
                    {program.type && (
                      <div>
                        <span className="font-medium">Type:</span> {program.type}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

