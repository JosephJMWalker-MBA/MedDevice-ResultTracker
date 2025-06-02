
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
import { UserProfileFormData, UserProfileSchema, RaceEthnicityOptions, GenderOptions, UserProfile, PreferredMailClientOptions, PreferredMailClient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Save, UserCog, BellRing, BellOff, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ProfileForm() {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const reminderTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      try {
        const storedProfileRaw = localStorage.getItem('bpUserProfile');
        if (storedProfileRaw) {
          const storedProfile: UserProfile = JSON.parse(storedProfileRaw);
          if (form) {
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
        }
      } catch (error) {
        console.error("Failed to load user profile from localStorage:", error);
        if (toast) {
          toast({ variant: 'destructive', title: 'Load Error', description: 'Could not load your profile.' });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      if (toast) {
        toast({ variant: 'destructive', title: 'Unsupported', description: 'Notifications are not supported by your browser.' });
      }
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (toast) {
      if (permission === 'granted') {
        toast({ title: 'Permissions Granted', description: 'You will now receive reminders.' });
      } else if (permission === 'denied') {
        toast({ variant: 'destructive', title: 'Permissions Denied', description: 'Notifications blocked. You can enable them in browser settings.' });
      } else {
        toast({ title: 'Permissions Undetermined', description: 'Notification permission not yet granted or denied.' });
      }
    }
  };

  const scheduleReminder = useCallback(() => {
    if (reminderTimeoutIdRef.current) {
      clearTimeout(reminderTimeoutIdRef.current);
      reminderTimeoutIdRef.current = null;
    }
    
    if (typeof window === 'undefined') return; 

    const preferredReminderTimeValue = form.getValues('preferredReminderTime');

    if (notificationPermission === 'granted' && preferredReminderTimeValue) {
      const [hours, minutes] = preferredReminderTimeValue.split(':').map(Number);
      const now = new Date();
      let reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

      if (reminderDateTime.getTime() <= now.getTime()) {
        reminderDateTime.setDate(reminderDateTime.getDate() + 1);
      }

      const delay = reminderDateTime.getTime() - now.getTime();

      if (delay > 0) {
        const newTimeoutId = setTimeout(() => {
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('PressureTrack AI Reminder', {
                body: 'Time to take your blood pressure reading!',
              });
            }
          } catch (e) {
            console.error("Error showing notification:", e)
          }
          scheduleReminder(); 
        }, delay);
        reminderTimeoutIdRef.current = newTimeoutId;
      }
    }
  }, [notificationPermission, form]);

  useEffect(() => {
    scheduleReminder();
    return () => {
      if (reminderTimeoutIdRef.current) {
        clearTimeout(reminderTimeoutIdRef.current);
      }
    };
  }, [scheduleReminder, form.watch('preferredReminderTime')]);


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
      if (toast) {
        toast({ title: 'Profile Saved', description: 'Your profile information has been updated.' });
      }
      scheduleReminder();
    } catch (error) {
      console.error("Failed to save user profile to localStorage:", error);
      if (toast) {
        toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save your profile.' });
      }
    }
  };
  
  const medicalConditionsValue = form.watch('medicalConditions');
  const medicalConditionsForTextarea = Array.isArray(medicalConditionsValue) 
    ? medicalConditionsValue.join(', ') 
    : (typeof medicalConditionsValue === 'string' ? medicalConditionsValue : '');


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
                  <FormLabel>Preferred Reminder Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Set a time you'd like to be reminded to take your reading. Notifications work best if this page is kept open.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {typeof window !== 'undefined' && 'Notification' in window && (
              <FormItem>
                <FormLabel>Notification Settings</FormLabel>
                {notificationPermission === 'granted' && (
                  <Alert variant="default" className="bg-green-50 border-green-300 text-green-800 [&>svg]:text-green-600 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300 dark:[&>svg]:text-green-500">
                    <BellRing className="h-5 w-5" />
                    <AlertTitle>Reminders Enabled</AlertTitle>
                    <AlertDescription>
                      You will receive a reminder at your preferred time if this page is open.
                    </AlertDescription>
                  </Alert>
                )}
                {notificationPermission === 'denied' && (
                  <Alert variant="destructive">
                    <BellOff className="h-5 w-5" />
                    <AlertTitle>Reminders Disabled</AlertTitle>
                    <AlertDescription>
                      Notifications are blocked by your browser. To enable them, please adjust your browser's site settings for this page.
                    </AlertDescription>
                  </Alert>
                )}
                {notificationPermission === 'default' && (
                  <Alert>
                    <BellRing className="h-5 w-5" />
                    <AlertTitle>Setup Reminders</AlertTitle>
                    <AlertDescription>
                      Allow notifications to get reminders at your preferred time.
                       <Button type="button" variant="link" onClick={handleRequestPermission} className="p-0 h-auto ml-1">Enable Notifications</Button>
                    </AlertDescription>
                  </Alert>
                )}
                 {notificationPermission !== 'default' && notificationPermission !== 'denied' && (
                   <Button type="button" variant="outline" size="sm" onClick={handleRequestPermission} className="mt-2">
                      Test Notification Permission
                   </Button>
                 )}
              </FormItem>
            )}


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
