
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BloodPressureReading, TrendAnalysisResult, ReadingFormData, UserProfile } from '@/lib/types';
import { BodyPositionOptions, ExerciseContextOptions } from '@/lib/types';
import { callAnalyzeTrendAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import ReadingForm from '@/components/blood-pressure/reading-form';
import TrendAnalysisDisplay from '@/components/blood-pressure/trend-analysis-display';
import ReadingList from '@/components/blood-pressure/reading-list';
import DisclaimerAlert from '@/components/blood-pressure/disclaimer-alert';
import BpChart from '@/components/blood-pressure/bp-chart'; // Import the new chart component
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import type { AnalyzeBloodPressureTrendInput } from '@/ai/flows/analyze-blood-pressure-trend';


export default function HomePage() {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<TrendAnalysisResult | null>(null);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();

  const triggerAnalysis = useCallback(async (currentReadings: BloodPressureReading[], profile: UserProfile | null) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReadings = currentReadings
      .filter(r => new Date(r.timestamp) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // AI expects most recent first

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
          bodyPosition: r.bodyPosition || BodyPositionOptions[0],
          exerciseContext: r.exerciseContext || ExerciseContextOptions[0],
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
          bodyPosition: BodyPositionOptions.includes(reading.bodyPosition) ? reading.bodyPosition : BodyPositionOptions[0],
          exerciseContext: ExerciseContextOptions.includes(reading.exerciseContext) ? reading.exerciseContext : ExerciseContextOptions[0],
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // sort by date descending for display
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

  const handleAddReading = (data: ReadingFormData) => {
    const newReading: BloodPressureReading = {
      id: Date.now().toString() + Math.random().toString(36).substring(2,9),
      timestamp: new Date(`${data.date}T${data.time}`).toISOString(),
      systolic: data.systolic,
      diastolic: data.diastolic,
      bodyPosition: data.bodyPosition,
      exerciseContext: data.exerciseContext,
    };
    const updatedReadings = [...readings, newReading].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setReadings(updatedReadings);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <ReadingForm
        onReadingAdded={handleAddReading}
        isLoadingOcrParent={isLoadingOcr}
        setIsLoadingOcrParent={setIsLoadingOcr}
      />

      {isInitialLoad || (readings.length === 0 && !isLoadingAnalysis) ? (
        <Card className="shadow-lg">
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
        <BpChart readings={readings} />
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
        <Card className="shadow-lg">
          <CardHeader>
             <CardTitle className="text-2xl">Readings History</CardTitle>
             <CardDescription>Loading your past readings...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      ) : (
         <ReadingList readings={readings} analysis={analysis} />
      )}

      <DisclaimerAlert />
    </div>
  );
}

