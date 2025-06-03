
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
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
import { UploadCloud, FileScan, Loader2, CheckCircle, AlertCircle, CalendarClockIcon, Bike, Stethoscope, HeartPulseIcon, Armchair, EyeOff, RotateCcw, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import ExifReader from 'exifreader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Adjust these for your monitor! (Display ROI for cropping)
const CROP_CONFIG = { x: 170, y: 120, width: 250, height: 150 }; // Example values, adjust as needed

interface ImagePreviewCropProps {
  src: string | null;
  crop: { x: number; y: number; width: number; height: number; };
}

function ImagePreviewCrop({ src, crop }: ImagePreviewCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src || !canvasRef.current) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas display size (CSS pixels)
        canvas.style.width = `${crop.width}px`;
        canvas.style.height = `${crop.height}px`;

        // Set canvas drawing surface size (actual pixels, for high-res displays)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = crop.width * dpr;
        canvas.height = crop.height * dpr;
        
        ctx.scale(dpr, dpr); // Scale context for high-res
        
        ctx.clearRect(0, 0, crop.width, crop.height);
        // Draw the cropped region of the image onto the canvas
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      }
    };
    img.onerror = () => {
        console.error("Failed to load image for canvas crop preview.");
    }
    img.src = src;
  }, [src, crop]);

  if (!src) return null;

  return (
    <div className="mt-2">
        <p className="text-sm font-medium text-muted-foreground mb-1">Display ROI Preview:</p>
        <canvas 
            ref={canvasRef} 
            width={crop.width} // Initial width, will be scaled by DPR
            height={crop.height} // Initial height, will be scaled by DPR
            className="border shadow rounded-md bg-slate-50"
            data-ai-hint="monitor screen crop"
        />
    </div>
  );
}


interface ReadingFormProps {
  onFormSubmit: (data: ReadingFormData, additionalData: {
    glare_detected?: boolean;
    variance?: number;
    user_correction?: boolean;
    image_url?: string;
    heatmap_url?: string;
    ocr_raw?: OcrRawData | null;
    consensus?: boolean;
    ocr_alternates?: ImageProcessingResult['ocr_alternates'];
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
  const [imagePreview, setImagePreview] = useState<string | null>(null); // For local blob URL
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [ocrProcessingStatus, setOcrProcessingStatus] = useState<'idle' | 'exif_applied' | 'ocr_done' | 'error' | 'glare_warning' | 'consensus_fail'>('idle');
  
  const [glareDetected, setGlareDetected] = useState(false);
  const [ocrDisagreement, setOcrDisagreement] = useState(false);
  const [ocrInitialValues, setOcrInitialValues] = useState<Partial<ReadingFormData> | null>(null);
  const [processedImageData, setProcessedImageData] = useState<{
    variance?: number;
    image_url?: string; 
    heatmap_url?: string; 
    ocr_raw?: OcrRawData | null;
    consensus?: boolean;
    ocr_alternates?: ImageProcessingResult['ocr_alternates'];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<ReadingFormData>({
    resolver: zodResolver(ReadingFormSchema),
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '' as any,
      diastolic: '' as any,
      pulse: '' as any,
      bodyPosition: BodyPositionOptions[0],
      exerciseContext: ExerciseContextOptions[0],
      symptoms: [],
      imageFile: undefined,
    },
  });

  const resetImageState = () => {
    setImagePreview(null);
    setOcrProcessingStatus('idle');
    setGlareDetected(false);
    setOcrDisagreement(false);
    setOcrInitialValues(null);
    setProcessedImageData(null);
    form.setValue('imageFile', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    console.log("UserAction: Image state reset (retake or cleared)");
  };
  
  const handleRetakePhoto = () => {
    resetImageState();
  };

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      resetImageState(); 
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
    resetImageState(); 
    
    if (file) {
      console.log("UserAction: Image selected by user", { name: file.name, size: file.size, type: file.type });
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
            console.log("UserAction: EXIF data applied", { date: dateFromExif, time: timeFromExif });
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
            consensus: extractedResult.consensus,
            ocr_alternates: extractedResult.ocr_alternates,
        });
        
        const initialVals: Partial<ReadingFormData> = {};

        if (extractedResult.date && !exifDateApplied) { form.setValue('date', extractedResult.date); initialVals.date = extractedResult.date;}
        if (extractedResult.time && !exifDateApplied) { form.setValue('time', extractedResult.time); initialVals.time = extractedResult.time;}
        if (extractedResult.systolic) { form.setValue('systolic', extractedResult.systolic as any); initialVals.systolic = extractedResult.systolic as any; }
        if (extractedResult.diastolic) { form.setValue('diastolic', extractedResult.diastolic as any); initialVals.diastolic = extractedResult.diastolic as any; }
        if (extractedResult.pulse != null) { form.setValue('pulse', extractedResult.pulse as any); initialVals.pulse = extractedResult.pulse as any; }
        setOcrInitialValues(initialVals);


        if (extractedResult.glare_detected) {
          setGlareDetected(true);
          setOcrProcessingStatus('glare_warning');
          console.log("UserAction: Glare detected by backend", { variance: extractedResult.variance });
        } else if (extractedResult.consensus === false) {
          setOcrDisagreement(true);
          setOcrProcessingStatus('consensus_fail');
          toast({ title: 'OCR Disagreement', description: 'Could not confidently read all numbers. Please verify.', variant: 'default', className: 'bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-300 [&>svg]:text-yellow-600' });
          console.log("UserAction: OCR disagreement", { alternates: extractedResult.ocr_alternates, raw: extractedResult.ocr_raw });
        } else { // No glare, consensus true
          setGlareDetected(false);
          setOcrDisagreement(false);
           if (extractedResult.systolic || extractedResult.diastolic || extractedResult.pulse) {
              toast({ title: 'OCR Success', description: 'Data extracted. Please verify.' });
              console.log("UserAction: OCR data applied with consensus", { values: initialVals, raw: extractedResult.ocr_raw });
          } else {
              toast({ title: 'OCR Partial/No Data', description: 'Could not extract all values. Please enter manually.' });
              console.log("UserAction: OCR data partially applied or no data found (with consensus)", { raw: extractedResult.ocr_raw });
          }
          setOcrProcessingStatus(exifDateApplied ? 'exif_applied' : 'ocr_done');
        }

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Processing Error', description: error.message || 'Could not extract data from image.' });
        setOcrProcessingStatus('error');
        console.error("UserAction: Image processing error", { error: error.message });
      } finally {
        setIsLoadingOcr(false);
      }
    }
  };

  const onSubmit: SubmitHandler<ReadingFormData> = (data) => {
    let user_correction = false;
    if (ocrInitialValues) { 
      if ( (data.systolic !== ocrInitialValues.systolic && ocrInitialValues.systolic !== undefined) ||
           (data.diastolic !== ocrInitialValues.diastolic && ocrInitialValues.diastolic !== undefined) ||
           ((data.pulse ?? null) !== (ocrInitialValues.pulse ?? null) && ocrInitialValues.pulse !== undefined)
         ) {
        user_correction = true;
        console.log("UserAction: OCR data corrected by user", { ocr: ocrInitialValues, user: data });
      }
    } else if (imagePreview && (data.systolic || data.diastolic || data.pulse)) { 
      user_correction = true; 
      console.log("UserAction: Manual entry after image upload (no OCR data or glare/disagreement)", { data });
    }

    onFormSubmit(data, {
        glare_detected: glareDetected,
        variance: processedImageData?.variance,
        user_correction: user_correction,
        image_url: processedImageData?.image_url,
        heatmap_url: processedImageData?.heatmap_url,
        ocr_raw: processedImageData?.ocr_raw,
        consensus: processedImageData?.consensus,
        ocr_alternates: processedImageData?.ocr_alternates,
    }); 
    console.log("UserAction: Form submitted", { data, additionalData: { ...processedImageData, user_correction } });


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
      resetImageState(); 
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
              <FormLabel htmlFor="imageFile-input">Upload Image (Optional)</FormLabel>
              <FormControl>
                <Input
                  id="imageFile-input" 
                  type="file"
                  accept="image/*"
                  ref={fileInputRef} 
                  onChange={(e) => {
                    handleImageChange(e);
                  }}
                  className="file:text-primary file:font-semibold hover:file:bg-primary/10"
                  disabled={isLoadingOcr}
                />
              </FormControl>
              <FormDescription>EXIF date/time and OCR will be attempted. Image quality affects accuracy.</FormDescription>
              <FormMessage />
              {imagePreview && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Your Uploaded Image:</p>
                    <div className="relative w-full max-w-xs h-auto rounded-md overflow-hidden border aspect-[4/3] bg-slate-100">
                        <Image src={imagePreview} alt="Reading preview" layout="fill" objectFit="contain" data-ai-hint="medical device"/>
                        {processedImageData?.heatmap_url && (
                            <Image 
                                src={processedImageData.heatmap_url} 
                                alt="Heatmap Overlay" 
                                layout="fill" 
                                objectFit="contain" 
                                className="opacity-50 pointer-events-none"
                                data-ai-hint="heatmap overlay"
                            />
                        )}
                    </div>
                  </div>
                  <ImagePreviewCrop src={imagePreview} crop={CROP_CONFIG} />
                </div>
              )}
              {isLoadingOcr && <div className="flex items-center mt-2 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing image...</div>}
              {!isLoadingOcr && ocrProcessingStatus === 'exif_applied' && <div className="flex items-center mt-2 text-sm text-blue-600"><CalendarClockIcon className="mr-2 h-4 w-4" /> EXIF applied. OCR results also applied if successful and consensus met.</div>}
              {!isLoadingOcr && ocrProcessingStatus === 'ocr_done' && !glareDetected && !ocrDisagreement && <div className="flex items-center mt-2 text-sm text-green-600"><CheckCircle className="mr-2 h-4 w-4" /> OCR successful. Please verify values.</div>}
              {!isLoadingOcr && ocrProcessingStatus === 'error' && <div className="flex items-center mt-2 text-sm text-destructive"><AlertCircle className="mr-2 h-4 w-4" /> OCR failed. Please enter manually.</div>}
            </FormItem>
          )}
        />
        {glareDetected && ocrProcessingStatus === 'glare_warning' && !isLoadingOcr && (
            <Alert variant="destructive">
                <EyeOff className="h-4 w-4" />
                <AlertTitle>Glare Detected</AlertTitle>
                <AlertDescription className="space-y-2">
                <p>We detected glare or poor contrast on your image (variance: {processedImageData?.variance?.toFixed(2) ?? 'N/A'}). 
                This may affect OCR accuracy. Please retake the photo in better lighting, adjusting the angle to avoid reflections on the monitor screen.
                </p>
                <p>You can still proceed by verifying or manually entering the values below, but results might be inaccurate.</p>
                </AlertDescription>
                 <Button type="button" variant="outline" size="sm" onClick={handleRetakePhoto} className="mt-3">
                    <RotateCcw className="mr-2 h-4 w-4"/>
                    Retake Photo
                </Button>
            </Alert>
        )}
        {ocrDisagreement && !glareDetected && ocrProcessingStatus === 'consensus_fail' && !isLoadingOcr && (
             <Alert variant="default" className="border-yellow-500/50 text-yellow-700 bg-yellow-50 [&>svg]:text-yellow-600 dark:border-yellow-600/50 dark:text-yellow-400 dark:bg-yellow-900/30 dark:[&>svg]:text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn't Confirm Reading</AlertTitle>
                <AlertDescription className="space-y-2">
                <p>
                    We couldn't confidently read all numbers from the photo. The values below are our best guess. 
                    Please verify them carefully or retake the photo.
                </p>
                {/* 
                // Optional: Display alternate values if design allows 
                {processedImageData?.ocr_alternates && (
                    <div>
                        <p className="text-xs font-semibold mt-1">Detected options (Primary / Secondary):</p>
                        <ul className="text-xs list-disc list-inside">
                            {processedImageData.ocr_alternates.sys.some(s => s !== null) && <li>Systolic: {processedImageData.ocr_alternates.sys.filter(s=>s).join(' / ') || "N/A"}</li>}
                            {processedImageData.ocr_alternates.dia.some(s => s !== null) && <li>Diastolic: {processedImageData.ocr_alternates.dia.filter(s=>s).join(' / ') || "N/A"}</li>}
                            {processedImageData.ocr_alternates.pul.some(s => s !== null) && <li>Pulse: {processedImageData.ocr_alternates.pul.filter(s=>s).join(' / ') || "N/A"}</li>}
                        </ul>
                    </div>
                )}
                */}
                </AlertDescription>
                 <Button type="button" variant="outline" size="sm" onClick={handleRetakePhoto} className="mt-3">
                    <RotateCcw className="mr-2 h-4 w-4"/>
                    Retake Photo
                </Button>
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
                  <Input type="date" {...field} disabled={isLoadingOcr}/>
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
                  <Input type="time" {...field} disabled={isLoadingOcr}/>
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
                  <Input type="number" placeholder="e.g., 120" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isLoadingOcr}/>
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
                  <Input type="number" placeholder="e.g., 80" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isLoadingOcr}/>
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
                  <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} disabled={isLoadingOcr}/>
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOcr} >
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOcr}>
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
                              disabled={isLoadingOcr}
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
      <CardFooter className={`${isEditing ? 'justify-end' : 'justify-start'} pt-0`}>
        <Button 
            type="submit" 
            className={`w-full md:w-auto ${isEditing ? '' : 'md:w-auto'}`} 
            disabled={isLoadingOcr || form.formState.isSubmitting || isLoadingExternally || (glareDetected && !form.formState.isDirty && !isEditing) || (ocrDisagreement && !form.formState.isDirty && !isEditing) }
        >
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
