import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ArrowLeft, Calendar, Clock, MapPin, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Program, type Workshop } from "@shared/schema";

const signupFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  comments: z.string().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms",
  }),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function SignupForm() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  // Parse program IDs from URL
  const programIds = new URLSearchParams(search).get('programs')?.split(',') || [];

  // Fetch selected programs
  const { data: allPrograms } = useQuery({
    queryKey: ["/api/programs"],
    queryFn: async () => {
      const response = await fetch('/api/programs', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json() as Promise<Program[]>;
    },
  });

  const selectedPrograms = allPrograms?.filter(p => programIds.includes(p.id)) || [];

  // Fetch workshops for selected programs
  const { data: workshops } = useQuery({
    queryKey: ["/api/workshops", programIds],
    queryFn: async () => {
      // Fetch workshops for each selected program
      const allWorkshops: Workshop[] = [];
      for (const programId of programIds) {
        const response = await fetch(`/api/workshops?programId=${programId}`, { credentials: 'include' });
        if (response.ok) {
          const programWorkshops = await response.json() as Workshop[];
          allWorkshops.push(...programWorkshops);
        }
      }
      // Sort by date
      return allWorkshops.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: programIds.length > 0,
  });

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      comments: "",
      agreeToTerms: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      // Submit signup to backend
      const response = await fetch('/api/coach-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          programIds: programIds,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit signup');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sign up successful!",
        description: "You have been registered as a coach. Check your email for confirmation.",
      });
      setLocation('/signup/confirmation');
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupFormData) => {
    submitMutation.mutate(data);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return timeStr;
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period} EST`;
  };

  if (programIds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No programs selected.</p>
              <Button onClick={() => setLocation('/signup')}>
                Go Back to Program Selection
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/signup')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Program Selection
        </Button>

        {/* Selected Programs Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Your Selected Program{selectedPrograms.length > 1 ? 's' : ''}</h3>
            <div className="space-y-4">
              {selectedPrograms.map((program) => (
                <div key={program.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-medium">{program.name}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                    {program.startDate && (
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(program.startDate)}
                      </span>
                    )}
                    {program.workshopTime && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(program.workshopTime)}
                      </span>
                    )}
                    {program.format && (
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {program.format}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {program.numberOfWorkshops || 8} workshops
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workshop Schedule */}
        {workshops && workshops.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Presentation className="h-5 w-5 mr-2" />
                Workshop Schedule
              </h3>
              <div className="space-y-3">
                {workshops.map((workshop, index) => (
                  <div
                    key={workshop.id}
                    className="flex items-start gap-4 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {workshop.name || workshop.title || `Workshop ${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(workshop.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information Form */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-6">Your Information</h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="your@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} placeholder="(555) 555-5555" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any additional information you'd like to share..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted p-4 rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>I agree to the terms and conditions *</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          By signing up, I commit to attending the workshops and understand that my spot will be counted toward the program's coach capacity.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/signup')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#2e7d32] text-white hover:bg-[#1b5e20]"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? "Submitting..." : "Complete Sign Up"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
