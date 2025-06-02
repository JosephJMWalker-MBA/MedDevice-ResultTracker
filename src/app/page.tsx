
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BloodPressureReading, TrendAnalysisResult, ReadingFormData, UserProfile, Symptom } from '@/lib/types';
import { BodyPositionOptions, ExerciseContextOptions } from '@/lib/types';
import { callAnalyzeTrendAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import ReadingForm from '@/components/blood-pressure/reading-form';
import TrendAnalysisDisplay from '@/components/blood-pressure/trend-analysis-display';
import ReadingList from '@/components/blood-pressure/reading-list';
import DisclaimerAlert from '@/components/blood-pressure/disclaimer-alert';
import BpChart from '@/components/blood-pressure/bp-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, FileScan } from 'lucide-react';
import type { AnalyzeBloodPressureTrendInput } from '@/ai/flows/analyze-blood-pressure-trend';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


export default function HomePage() {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<TrendAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEditingReading, setCurrentEditingReading] = useState<BloodPressureReading | null>(null);


  const triggerAnalysis = useCallback(async (currentReadings: BloodPressureReading[], profile: UserProfile | null) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReadings = currentReadings
      .filter(r => new Date(r.timestamp) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (recentReadings.length === 0) {
      setAnalysis({
        summary: "No recent readings in the last 30 days to analyze.\n\n⚠️ This is not medical advice. Consult a healthcare professional for any concerns.",
        flags: [],
        suggestions: ["Add more readings to get a trend analysis based on the last 30 days."]
      });
      setIsLoadingAnalysis(false);
      return;
    }

    setIsLoadingAnalysis(true);
    try {
      const analysisPayload: AnalyzeBloodPressureTrendInput = {
        readings: recentReadings.map(r => ({
          timestamp: r.timestamp,
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse, // Added
          bodyPosition: r.bodyPosition || BodyPositionOptions[0],
          exerciseContext: r.exerciseContext || ExerciseContextOptions[0],
          symptoms: r.symptoms || [],
        })),
        ...(profile?.age && { age: profile.age }),
        ...(profile?.weightLbs && { weightLbs: profile.weightLbs }),
        ...(profile?.gender && { gender: profile.gender }),
        ...(profile?.raceEthnicity && { raceEthnicity: profile.raceEthnicity }),
        ...(profile?.medicalConditions && profile.medicalConditions.length > 0 && { medicalConditions: profile.medicalConditions }),
        ...(profile?.medications && { medications: profile.medications }),
      };

      const result = await callAnalyzeTrendAction(analysisPayload);
      setAnalysis(result);
    } catch (error: any) {
      console.error("Error analyzing trend:", error);
      toast({ variant: 'destructive', title: 'Analysis Error', description: error.message || 'Could not analyze trend.' });
      setAnalysis(null);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsInitialLoad(true);
    let loadedReadings: BloodPressureReading[] = [];
    let loadedProfile: UserProfile | null = null;

    try {
      const storedReadingsRaw = localStorage.getItem('bpReadings');
      if (storedReadingsRaw) {
        const parsedReadings: any[] = JSON.parse(storedReadingsRaw);
        loadedReadings = parsedReadings.map((reading: any, index: number) => ({
          id: reading.id || `${new Date(reading.timestamp || Date.now()).getTime()}-${index}`,
          timestamp: reading.timestamp || new Date().toISOString(),
          systolic: typeof reading.systolic === 'number' ? reading.systolic : 0,
          diastolic: typeof reading.diastolic === 'number' ? reading.diastolic : 0,
          pulse: typeof reading.pulse === 'number' ? reading.pulse : undefined, // Added
          bodyPosition: BodyPositionOptions.includes(reading.bodyPosition) ? reading.bodyPosition : BodyPositionOptions[0],
          exerciseContext: ExerciseContextOptions.includes(reading.exerciseContext) ? reading.exerciseContext : ExerciseContextOptions[0],
          symptoms: Array.isArray(reading.symptoms) ? reading.symptoms : [],
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      setReadings(loadedReadings);

      const storedProfileRaw = localStorage.getItem('bpUserProfile');
      if (storedProfileRaw) {
        loadedProfile = JSON.parse(storedProfileRaw);
        setUserProfile(loadedProfile);
      }
    } catch (error) {
      console.error("Failed to load or migrate data from localStorage:", error);
      toast({ variant: 'destructive', title: 'Load Error', description: 'Could not load or migrate saved data.' });
    } finally {
      setIsInitialLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!isInitialLoad) {
        triggerAnalysis(readings, userProfile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, userProfile, isInitialLoad]);


  useEffect(() => {
    if (!isInitialLoad && readings) {
      try {
        localStorage.setItem('bpReadings', JSON.stringify(readings));
      } catch (error) {
        console.error("Failed to save readings to localStorage:", error);
        toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save readings.' });
      }
    }
  }, [readings, isInitialLoad, toast]);

  const handleFormSubmit = (data: ReadingFormData) => {
    if (currentEditingReading) { // Handle update
      const updatedReadings = readings.map(r =>
        r.id === currentEditingReading.id
          ? {
              ...r, // Keep original ID and other non-form fields
              timestamp: new Date(`${data.date}T${data.time}`).toISOString(),
              systolic: data.systolic,
              diastolic: data.diastolic,
              pulse: data.pulse ?? undefined,
              bodyPosition: data.bodyPosition,
              exerciseContext: data.exerciseContext,
              symptoms: data.symptoms || [],
            }
          : r
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setReadings(updatedReadings);
      toast({ title: 'Reading Updated', description: 'Your blood pressure reading has been updated.' });
      setShowEditModal(false);
      setCurrentEditingReading(null);
    } else { // Handle add new
      const newReading: BloodPressureReading = {
        id: Date.now().toString() + Math.random().toString(36).substring(2,9),
        timestamp: new Date(`${data.date}T${data.time}`).toISOString(),
        systolic: data.systolic,
        diastolic: data.diastolic,
        pulse: data.pulse ?? undefined,
        bodyPosition: data.bodyPosition,
        exerciseContext: data.exerciseContext,
        symptoms: data.symptoms || [],
      };
      const updatedReadings = [...readings, newReading].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setReadings(updatedReadings);
      toast({ title: 'Reading Added', description: 'Your blood pressure reading has been saved.' });
    }
  };

  const handleOpenEditModal = (id: string) => {
    const readingToEdit = readings.find(r => r.id === id);
    if (readingToEdit) {
      setCurrentEditingReading(readingToEdit);
      setShowEditModal(true);
    }
  };

  const handleDeleteReading = (id: string) => {
    const updatedReadings = readings.filter(r => r.id !== id);
    setReadings(updatedReadings);
    toast({ title: 'Reading Deleted', description: 'The blood pressure reading has been removed.' });
  };
  
  const editingReadingFormData: ReadingFormData | undefined = currentEditingReading ? {
    date: currentEditingReading.timestamp.split('T')[0],
    time: new Date(currentEditingReading.timestamp).toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    systolic: currentEditingReading.systolic,
    diastolic: currentEditingReading.diastolic,
    pulse: currentEditingReading.pulse ?? null, // Ensure it's null if undefined for the form
    bodyPosition: currentEditingReading.bodyPosition,
    exerciseContext: currentEditingReading.exerciseContext,
    symptoms: currentEditingReading.symptoms || [],
    // imageFile is not directly editable here, typically users would re-upload or just edit data
  } : undefined;


  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      {!showEditModal && (
         <ReadingForm
            onFormSubmit={handleFormSubmit}
            isLoadingExternally={isLoadingAnalysis}
        />
      )}

      <Dialog open={showEditModal} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowEditModal(false);
            setCurrentEditingReading(null);
          } else {
            setShowEditModal(true);
          }
        }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileScan className="h-6 w-6 text-primary"/>Edit Blood Pressure Reading</DialogTitle>
            <DialogDescription>
              Make changes to your existing blood pressure reading. Click "Update Reading" to save.
            </DialogDescription>
          </DialogHeader>
          {currentEditingReading && editingReadingFormData && (
            <ReadingForm
              onFormSubmit={handleFormSubmit}
              initialData={editingReadingFormData}
              isEditing={true}
              isLoadingExternally={isLoadingAnalysis}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); setCurrentEditingReading(null); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {isInitialLoad || (readings.length === 0 && !isLoadingAnalysis) ? (
        <Card className="shadow-lg" id="bp-chart-card">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-7 w-7 text-primary" />
                Blood Pressure Chart
            </CardTitle>
            <CardDescription>Add some readings to see your trends visualized.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Waiting for data...</p>
          </CardContent>
        </Card>
      ) : readings.length > 0 ? (
        <div id="bp-chart-card"><BpChart readings={readings} /></div>
      ): null}


      {isInitialLoad || isLoadingAnalysis ? (
        <Card className="shadow-lg">
          <CardHeader>
             <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-primary" />
                Trend Analysis
            </CardTitle>
            <CardDescription>Loading analysis based on your recent readings...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : (
        analysis && <TrendAnalysisDisplay analysis={analysis} />
      )}

      {isInitialLoad ? (
        <Card className="shadow-lg" id="reading-list-card">
          <CardHeader>
             <CardTitle className="text-2xl">Readings History</CardTitle>
             <CardDescription>Loading your past readings...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      ) : (
         <div id="reading-list-card">
            <ReadingList 
                readings={readings} 
                analysis={analysis}
                userProfile={userProfile}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteReading}
            />
        </div>
      )}

      <DisclaimerAlert />
    </div>
  );
}
