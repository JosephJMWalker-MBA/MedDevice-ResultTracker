
'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfileFormData, UserProfileSchema, RaceEthnicityOptions, GenderOptions, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Save, UserCog } from 'lucide-react';

export default function ProfileForm() {
  const { toast } = useToast();

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      age: null,
      weightLbs: null,
      raceEthnicity: null,
      gender: null,
      medicalConditions: [],
      preferredReminderTime: null,
    },
  });

  useEffect(() => {
    try {
      const storedProfileRaw = localStorage.getItem('bpUserProfile');
      if (storedProfileRaw) {
        const storedProfile: UserProfile = JSON.parse(storedProfileRaw);
        form.reset({
          ...storedProfile,
          // Ensure medicalConditions is a string for the textarea
          medicalConditions: storedProfile.medicalConditions ? storedProfile.medicalConditions.join(', ') : '', 
        } as unknown as UserProfileFormData); // Type assertion might be needed due to transform
      }
    } catch (error) {
        console.error("Failed to load user profile from localStorage:", error);
        toast({ variant: 'destructive', title: 'Load Error', description: 'Could not load your profile.' });
    }
  }, [form, toast]);

  const onSubmit: SubmitHandler<UserProfileFormData> = (data) => {
    try {
      // The medicalConditions field from form data is already an array of strings due to Zod transform
      const profileToSave: UserProfile = {
        ...data,
         medicalConditions: Array.isArray(data.medicalConditions) ? data.medicalConditions : (typeof data.medicalConditions === 'string' ? data.medicalConditions.split(',').map(s => s.trim()).filter(Boolean) : []),
      };
      localStorage.setItem('bpUserProfile', JSON.stringify(profileToSave));
      toast({ title: 'Profile Saved', description: 'Your profile information has been updated.' });
    } catch (error) {
        console.error("Failed to save user profile to localStorage:", error);
        toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save your profile.' });
    }
  };

  return (
    <Card className="shadow-lg max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <UserCog className="h-7 w-7 text-primary" />
          User Profile
        </CardTitle>
        <CardDescription>
          This information helps personalize your blood pressure analysis. Data is stored locally in your browser.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your age" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightLbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your weight in lbs" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GenderOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="raceEthnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Race/Ethnicity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select race/ethnicity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RaceEthnicityOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="medicalConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Conditions</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder="List any existing medical conditions, separated by commas (e.g., Diabetes, Asthma)" 
                        {...field}
                        // Zod transform handles array to string for display and string to array for submission
                        value={Array.isArray(field.value) ? field.value.join(', ') : (field.value || '')}
                        onChange={e => field.onChange(e.target.value)} // Pass string to Zod for transform
                    />
                  </FormControl>
                  <FormDescription>Separate multiple conditions with a comma.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredReminderTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Reminder Time (for future notifications)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Set a time you'd like to be reminded to take your reading.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
