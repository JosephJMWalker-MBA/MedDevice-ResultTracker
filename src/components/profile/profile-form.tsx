
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfileFormData, UserProfileSchema, RaceEthnicityOptions, GenderOptions, UserProfile, PreferredMailClientOptions } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Save, UserCog, CalendarPlus, Mail } from 'lucide-react'; // Removed BellRing, BellOff

// Helper function to format date for ICS (UTC based for DTSTAMP, local for event time)
function formatDateForICS(date: Date, isUtc: boolean = true): string {
  if (isUtc) {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  } else {
    // Local time for event display
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}00`;
  }
}

// Function to generate ICS content
function generateICSContent(preferredTime: string): string {
  const now = new Date();
  const [hours, minutes] = preferredTime.split(':').map(Number);

  let eventDate = new Date(); // Use local timezone for setting the event
  eventDate.setHours(hours, minutes, 0, 0);

  // If the preferred time today has already passed, schedule it for tomorrow.
  if (eventDate.getTime() <= now.getTime()) {
    eventDate.setDate(eventDate.getDate() + 1);
  }

  const dtstamp = formatDateForICS(new Date(), true); // Current time in UTC for DTSTAMP
  const dtstart = formatDateForICS(eventDate, false); // Event start time in local time
  const dtend = dtstart; // For an instant reminder, end can be same as start

  const uid = `pressuretrackai-reminder-${Date.now()}@pressuretrack.ai`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PressureTrackAI//ReminderFile//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${Intl.DateTimeFormat().resolvedOptions().timeZone}:${dtstart}`, // Specify local timezone
    `DTEND;TZID=${Intl.DateTimeFormat().resolvedOptions().timeZone}:${dtend}`,
    'SUMMARY:Take Blood Pressure Reading',
    'DESCRIPTION:Reminder from PressureTrack AI to take your blood pressure reading.',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M', // Alert at the time of the event
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Take Blood Pressure Reading',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

// Function to trigger download
function downloadICSFile(icsContent: string, filename: string = 'PressureTrackAIReminder.ics') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}


export default function ProfileForm() {
  const { toast } = useToast();
  
  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      age: null,
      weightLbs: null,
      raceEthnicity: null,
      gender: null,
      medicalConditions: '', 
      medications: '',
      preferredReminderTime: null,
      preferredMailClient: null,
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedProfileRaw = localStorage.getItem('bpUserProfile');
        if (storedProfileRaw) {
          const storedProfile: UserProfile = JSON.parse(storedProfileRaw);
          form.reset({
            age: storedProfile.age ?? null,
            weightLbs: storedProfile.weightLbs ?? null,
            raceEthnicity: storedProfile.raceEthnicity ?? null,
            gender: storedProfile.gender ?? null,
            medicalConditions: Array.isArray(storedProfile.medicalConditions) ? storedProfile.medicalConditions.join(', ') : (storedProfile.medicalConditions || ''),
            medications: storedProfile.medications || '',
            preferredReminderTime: storedProfile.preferredReminderTime || null,
            preferredMailClient: storedProfile.preferredMailClient || null,
          });
        }
      } catch (error) {
        console.error("Failed to load user profile from localStorage:", error);
        toast({ variant: 'destructive', title: 'Load Error', description: 'Could not load your profile.' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const onSubmit: SubmitHandler<UserProfileFormData> = (data) => {
    try {
      const medicalConditionsArray = typeof data.medicalConditions === 'string' 
        ? data.medicalConditions.split(',').map(s => s.trim()).filter(Boolean) 
        : (Array.isArray(data.medicalConditions) ? data.medicalConditions : []);

      const profileToSave: UserProfile = {
        age: data.age,
        weightLbs: data.weightLbs,
        raceEthnicity: data.raceEthnicity,
        gender: data.gender,
        medicalConditions: medicalConditionsArray,
        medications: data.medications || null,
        preferredReminderTime: data.preferredReminderTime || null,
        preferredMailClient: data.preferredMailClient || null,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('bpUserProfile', JSON.stringify(profileToSave));
      }
      toast({ title: 'Profile Saved', description: 'Your profile information has been updated.' });
    } catch (error) {
      console.error("Failed to save user profile to localStorage:", error);
      toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save your profile.' });
    }
  };

  const handleCreateReminderFile = () => {
    const preferredTime = form.getValues('preferredReminderTime');
    if (preferredTime) {
      const icsString = generateICSContent(preferredTime);
      downloadICSFile(icsString);
      toast({ title: 'Reminder File Created', description: 'PressureTrackAIReminder.ics has been downloaded. Open it to add to your calendar.' });
    } else {
      toast({ variant: 'destructive', title: 'No Time Set', description: 'Please set a preferred reminder time first.' });
    }
  };
  
  const medicalConditionsValue = form.watch('medicalConditions');
  const medicalConditionsForTextarea = Array.isArray(medicalConditionsValue) 
    ? medicalConditionsValue.join(', ') 
    : (typeof medicalConditionsValue === 'string' ? medicalConditionsValue : '');

  const preferredReminderTimeValue = form.watch('preferredReminderTime');

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
                      <Input type="number" placeholder="Your age" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
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
                      <Input type="number" placeholder="Your weight in lbs" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
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
                    <Select onValueChange={field.onChange} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
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
                    <Select onValueChange={field.onChange} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
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
                      value={medicalConditionsForTextarea}
                      onChange={e => field.onChange(e.target.value)} 
                    />
                  </FormControl>
                  <FormDescription>Separate multiple conditions with a comma.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Medications</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List any current medications, separated by commas (e.g., Lisinopril 10mg, Metformin 500mg)"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Separate multiple medications with a comma.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="preferredMailClient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Preferred Email Sharing Method
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PreferredMailClientOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Choose how "Share via Email" opens your email.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


            <FormField
              control={form.control}
              name="preferredReminderTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Reminder Time (for .ics file)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Set a time for the reminder event in the generated .ics file. Import this file into your calendar app.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCreateReminderFile} 
              disabled={!preferredReminderTimeValue}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Create Reminder File (.ics)
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

