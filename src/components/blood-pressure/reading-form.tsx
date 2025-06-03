
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ReadingFormData, ReadingFormSchema, type OcrData, BodyPositionOptions, ExerciseContextOptions, StaticSymptomsList, type OcrRawData, type ImageProcessingResult } from '@/lib/types';
import { callExtractDataAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileScan, Loader2, CheckCircle, AlertCircle, CalendarClockIcon, Bike, Stethoscope, HeartPulseIcon, Armchair, EyeOff } from 'lucide-react';
import Image from 'next/image';
import ExifReader from 'exifreader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface ReadingFormProps {
  onFormSubmit: (data: ReadingFormData, additionalData: {
    glare_detected?: boolean;
    variance?: number;
    user_correction?: boolean;
    image_url?: string;
    heatmap_url?: string;
    ocr_raw?: OcrRawData | null;
  }) => void;
  initialData?: ReadingFormData; 
  isEditing?: boolean;
  isLoadingExternally?: boolean; 
}

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ReadingForm({ onFormSubmit, initialData, isEditing = false, isLoadingExternally = false }: ReadingFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [ocrProcessingStatus, setOcrProcessingStatus] = useState<'idle' | 'exif_applied' | 'ocr_done' | 'error'>('idle');
  
  // New state for glare detection and user correction
  const [glareDetected, setGlareDetected] = useState(false);
  const [ocrInitialValues, setOcrInitialValues] = useState<Partial<ReadingFormData> | null>(null);
  const [processedImageData, setProcessedImageData] = useState<{
    variance?: number;
    image_url?: string;
    heatmap_url?: string;
    ocr_raw?: OcrRawData | null;
  } | null>(null);


  const form = useForm<ReadingFormData>({
    resolver: zodResolver(ReadingFormSchema),
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '' as any, // Allow empty string initially
      diastolic: '' as any,
      pulse: '' as any,
      bodyPosition: BodyPositionOptions[0],
      exerciseContext: ExerciseContextOptions[0],
      symptoms: [],
      imageFile: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      setImagePreview(null); 
      setOcrProcessingStatus('idle');
      setGlareDetected(false);
      setOcrInitialValues(null);
      setProcessedImageData(null);
    } else {
        if (!form.getValues('date')) {
          form.setValue('date', new Date().toISOString().split('T')[0]);
        }
        if (!form.getValues('time')) {
          form.setValue('time', new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        }
    }
  }, [initialData, form]);


  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setGlareDetected(false); // Reset glare status on new image
    setOcrInitialValues(null);
    setProcessedImageData(null);
    
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setIsLoadingOcr(true);
      setOcrProcessingStatus('idle');
      let exifDateApplied = false;

      try {
        const tags = await ExifReader.load(file);
        const dateTimeOriginal = tags['DateTimeOriginal']?.description;
        if (dateTimeOriginal && typeof dateTimeOriginal === 'string') {
          const parts = dateTimeOriginal.split(' ');
          if (parts.length === 2) {
            const dateFromExif = parts[0].replace(/:/g, '-');
            const timeFromExif = parts[1].substring(0, 5);
            form.setValue('date', dateFromExif);
            form.setValue('time', timeFromExif);
            toast({ title: 'EXIF Data Applied', description: 'Date and time auto-filled from image metadata.', className: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 [&>svg]:text-blue-600' });
            setOcrProcessingStatus('exif_applied');
            exifDateApplied = true;
          }
        }
      } catch (exifError) {
        console.warn("Could not read EXIF data:", exifError);
      }

      try {
        const dataUri = await fileToDataUri(file);
        const extractedResult: ImageProcessingResult = await callExtractDataAction(dataUri);
        
        setProcessedImageData({
            variance: extractedResult.variance,
            image_url: extractedResult.image_url,
            heatmap_url: extractedResult.heatmap_url,
            ocr_raw: extractedResult.ocr_raw,
        });

        if (extractedResult.glare_detected) {
          setGlareDetected(true);
          toast({ variant: 'destructive', title: 'Glare Detected', description: 'Image may be difficult to read. Consider retaking in better lighting. You can still enter values manually.', duration: 7000 });
          // Don't auto-fill if glare is detected, let user decide or enter manually
          setOcrProcessingStatus('error'); // Or a new status like 'glare_warning'
        } else {
          setGlareDetected(false);
          const initialVals: Partial<ReadingFormData> = {};
          if (extractedResult.date && !form.getValues('date') && !exifDateApplied) form.setValue('date', extractedResult.date);
          if (extractedResult.time && !form.getValues('time') && !exifDateApplied) form.setValue('time', extractedResult.time);

          if (extractedResult.systolic) { form.setValue('systolic', extractedResult.systolic as any); initialVals.systolic = extractedResult.systolic as any; }
          if (extractedResult.diastolic) { form.setValue('diastolic', extractedResult.diastolic as any); initialVals.diastolic = extractedResult.diastolic as any; }
          if (extractedResult.pulse != null) { form.setValue('pulse', extractedResult.pulse as any); initialVals.pulse = extractedResult.pulse as any; }
          setOcrInitialValues(initialVals);

          if (extractedResult.systolic || extractedResult.diastolic || extractedResult.pulse) {
              toast({ title: 'OCR Success', description: 'Data extracted. Please verify.' });
          }
          setOcrProcessingStatus(ocrProcessingStatus === 'exif_applied' && !exifDateApplied ? 'ocr_done' : (exifDateApplied ? 'exif_applied' : 'ocr_done') );
        }

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Processing Error', description: error.message || 'Could not extract data from image.' });
        setOcrProcessingStatus('error');
      } finally {
        setIsLoadingOcr(false);
      }
    } else {
      setImagePreview(null);
      setOcrProcessingStatus('idle');
      setGlareDetected(false);
    }
  };

  const onSubmit: SubmitHandler<ReadingFormData> = (data) => {
    let user_correction = false;
    if (ocrInitialValues) {
      if (data.systolic !== ocrInitialValues.systolic ||
          data.diastolic !== ocrInitialValues.diastolic ||
          (data.pulse ?? null) !== (ocrInitialValues.pulse ?? null) // handle optional pulse
         ) {
        user_correction = true;
      }
    } else if (imagePreview) { // Image was uploaded, but no OCR values means user entered all manually
        user_correction = true; 
    }


    onFormSubmit(data, {
        glare_detected: glareDetected,
        variance: processedImageData?.variance,
        user_correction: user_correction,
        image_url: processedImageData?.image_url,
        heatmap_url: processedImageData?.heatmap_url,
        ocr_raw: processedImageData?.ocr_raw,
    }); 

    if (!isEditing) { 
      form.reset({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        systolic: '' as any,
        diastolic: '' as any,
        pulse: '' as any,
        bodyPosition: BodyPositionOptions[0],
        exerciseContext: ExerciseContextOptions[0],
        symptoms: [],
        imageFile: undefined,
      });
      setImagePreview(null);
      setOcrProcessingStatus('idle');
      setGlareDetected(false);
      setOcrInitialValues(null);
      setProcessedImageData(null);
      const fileInput = document.getElementById('imageFile') as HTMLInputElement | null;
      if (fileInput) {
          fileInput.value = '';
      }
    }
  };

  const FormContent = (
    <>
      {!isEditing && (
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileScan className="h-7 w-7 text-primary" />
            Add New Reading
          </CardTitle>
          <CardDescription>Upload an image for OCR and EXIF date/time extraction, or enter details manually. Fill in all required fields.</CardDescription>
        </CardHeader>
      )}
      <CardContent className={`space-y-6 ${isEditing ? 'pt-6' : ''}`}>
       {!isEditing && (
        <>
        <FormField
          control={form.control}
          name="imageFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="imageFile">Upload Image (Optional)</FormLabel>
              <FormControl>
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    field.onChange(e.target.files); // For react-hook-form
                    handleImageChange(e); // For custom logic
                  }}
                  className="file:text-primary file:font-semibold hover:file:bg-primary/10"
                />
              </FormControl>
              <FormDescription>EXIF date/time and OCR will be attempted. Image quality affects accuracy.</FormDescription>
              <FormMessage />
              {imagePreview && (
                <div className="mt-2 relative w-48 h-32 rounded-md overflow-hidden border">
                  <Image src={imagePreview} alt="Reading preview" layout="fill" objectFit="contain" data-ai-hint="medical device"/>
                </div>
              )}
              {isLoadingOcr && <div className="flex items-center mt-2 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing image...</div>}
              {ocrProcessingStatus === 'exif_applied' && !isLoadingOcr && <div className="flex items-center mt-2 text-sm text-blue-600"><CalendarClockIcon className="mr-2 h-4 w-4" /> EXIF date/time applied. OCR results (if any) also applied.</div>}
              {ocrProcessingStatus === 'ocr_done' && !isLoadingOcr && !glareDetected && <div className="flex items-center mt-2 text-sm text-green-600"><CheckCircle className="mr-2 h-4 w-4" /> OCR successful. Please verify values.</div>}
              {ocrProcessingStatus === 'error' && !isLoadingOcr && <div className="flex items-center mt-2 text-sm text-destructive"><AlertCircle className="mr-2 h-4 w-4" /> OCR failed or glare detected. Please enter manually.</div>}
            </FormItem>
          )}
        />
        {glareDetected && !isLoadingOcr && (
            <Alert variant="destructive">
                <EyeOff className="h-4 w-4" />
                <AlertTitle>Glare Detected</AlertTitle>
                <AlertDescription>
                The uploaded image appears to have glare, which might affect OCR accuracy. 
                We recommend retaking the photo in better lighting without direct reflections on the monitor screen.
                You can still proceed by verifying or manually entering the values below.
                </AlertDescription>
            </Alert>
        )}
        </>
       )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="systolic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">Systolic (SYS)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 120" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="diastolic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">Diastolic (DIA)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 80" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pulse"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                    <HeartPulseIcon className="h-4 w-4 text-muted-foreground" />
                    Pulse (bpm)
                </FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="bodyPosition"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="flex items-center gap-1">
                    <Armchair className="h-4 w-4 text-muted-foreground" /> 
                    Body Position
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select body position" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {BodyPositionOptions.map(option => (
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
            name="exerciseContext"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="flex items-center gap-1">
                    <Bike className="h-4 w-4 text-muted-foreground" />
                    Exercise Context
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select exercise context" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {ExerciseContextOptions.map(option => (
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
          name="symptoms"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="flex items-center gap-1">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    Symptoms (Optional)
                </FormLabel>
                <FormDescription>
                  Select any symptoms you were experiencing at the time of reading.
                </FormDescription>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                {StaticSymptomsList.map((symptom) => (
                  <FormField
                    key={symptom}
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={symptom}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(symptom)}
                              onCheckedChange={(checked) => {
                                let symptômesValue = field.value ? [...field.value] : [];
                                if (symptom === "None") {
                                    symptômesValue = checked ? ["None"] : [];
                                } else {
                                    symptômesValue = symptômesValue.filter(s => s !== "None"); 
                                    if (checked) {
                                        if (!symptômesValue.includes(symptom)) {
                                            symptômesValue.push(symptom);
                                        }
                                    } else {
                                        symptômesValue = symptômesValue.filter(
                                            (value) => value !== symptom
                                        );
                                    }
                                }
                                return field.onChange(symptômesValue);
                              }}
                              disabled={(symptom !== "None" && field.value?.includes("None")) || (glareDetected && isLoadingOcr) } // Disable if glare detected during processing
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {symptom}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className={isEditing ? 'justify-end' : ''}>
        <Button type="submit" className={`w-full md:w-auto ${isEditing ? '' : 'w-full md:w-auto'}`} disabled={isLoadingOcr || form.formState.isSubmitting || isLoadingExternally }>
          {form.formState.isSubmitting || isLoadingExternally ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isEditing ? 'Update Reading' : 'Add Reading'}
        </Button>
      </CardFooter>
    </>
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {isEditing ? (
          FormContent 
        ) : (
          <Card className="shadow-lg">
            {FormContent}
          </Card>
        )}
      </form>
    </Form>
  );
}
