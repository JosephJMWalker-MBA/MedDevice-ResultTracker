
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // Label is part of FormLabel
// import { Textarea } from '@/components/ui/textarea'; // Medications textarea removed
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReadingFormData, ReadingFormSchema, type OcrData, BodyPositionOptions } from '@/lib/types';
import { callExtractDataAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileScan, Loader2, CheckCircle, AlertCircle, CalendarClockIcon } from 'lucide-react';
import Image from 'next/image';
import ExifReader from 'exifreader';


interface ReadingFormProps {
  onReadingAdded: (data: ReadingFormData) => void;
  isLoadingOcrParent: boolean;
  setIsLoadingOcrParent: (loading: boolean) => void;
}

// Utility function to convert File to Data URI
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ReadingForm({ onReadingAdded, isLoadingOcrParent, setIsLoadingOcrParent }: ReadingFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProcessingStatus, setOcrProcessingStatus] = useState<'idle' | 'exif_applied' | 'ocr_done' | 'error'>('idle');

  const form = useForm<ReadingFormData>({
    resolver: zodResolver(ReadingFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '', 
      diastolic: '',
      bodyPosition: BodyPositionOptions[0], // Default to "Sitting"
      // medications field removed
      imageFile: undefined,
    },
  });

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setIsLoadingOcrParent(true);
      setOcrProcessingStatus('idle');
      let exifDateApplied = false;

      try {
        const tags = await ExifReader.load(file);
        const dateTimeOriginal = tags['DateTimeOriginal']?.description;
        if (dateTimeOriginal && typeof dateTimeOriginal === 'string') {
          const parts = dateTimeOriginal.split(' ');
          if (parts.length === 2) {
            const dateFromExif = parts[0].replace(/:/g, '-'); // YYYY-MM-DD
            const timeFromExif = parts[1].substring(0, 5); // HH:MM
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
        const extractedData: OcrData = await callExtractDataAction(dataUri);
        
        if (extractedData.date && !form.getValues('date')) form.setValue('date', extractedData.date);
        if (extractedData.time && !form.getValues('time')) form.setValue('time', extractedData.time);
        
        if (extractedData.systolic) form.setValue('systolic', extractedData.systolic as any); // Ensure string for form if needed
        if (extractedData.diastolic) form.setValue('diastolic', extractedData.diastolic as any); // Ensure string for form if needed
        
        if (extractedData.systolic || extractedData.diastolic) {
            toast({ title: 'OCR Success', description: 'Systolic/Diastolic data extracted. Please verify.' });
        }
        setOcrProcessingStatus(ocrProcessingStatus === 'exif_applied' && !exifDateApplied ? 'ocr_done' : (exifDateApplied ? 'exif_applied' : 'ocr_done') );
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'OCR Error', description: error.message || 'Could not extract data from image.' });
        setOcrProcessingStatus('error');
      } finally {
        setIsLoadingOcrParent(false);
      }
    } else {
      setImagePreview(null);
      setOcrProcessingStatus('idle');
    }
  };

  const onSubmit: SubmitHandler<ReadingFormData> = (data) => {
    onReadingAdded(data);
    form.reset({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '', 
      diastolic: '',
      bodyPosition: BodyPositionOptions[0],
      // medications field removed
      imageFile: undefined, 
    });
    setImagePreview(null);
    setOcrProcessingStatus('idle');
    const fileInput = document.getElementById('imageFile') as HTMLInputElement | null;
    if (fileInput) {
        fileInput.value = ''; 
    }
    toast({ title: 'Reading Added', description: 'Your blood pressure reading has been saved.' });
  };
  
  useEffect(() => {
    if (!form.getValues('date')) {
      form.setValue('date', new Date().toISOString().split('T')[0]);
    }
    if (!form.getValues('time')) {
      form.setValue('time', new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }
  }, [form]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileScan className="h-7 w-7 text-primary" />
          Add New Reading
        </CardTitle>
        <CardDescription>Upload an image for OCR and EXIF date/time extraction, or enter details manually. Fill in all required fields.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="imageFile"
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel htmlFor="imageFile" className="text-base">Upload Image (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      id="imageFile" 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        field.onChange(e.target.files); 
                        handleImageChange(e);
                      }}
                      className="file:text-primary file:font-semibold hover:file:bg-primary/10"
                    />
                  </FormControl>
                  <FormDescription>EXIF data (date/time) will be extracted if available. OCR will attempt to fill other fields.</FormDescription>
                  <FormMessage />
                  {imagePreview && (
                    <div className="mt-2 relative w-48 h-32 rounded-md overflow-hidden border">
                      <Image src={imagePreview} alt="Reading preview" layout="fill" objectFit="contain" data-ai-hint="medical device"/>
                    </div>
                  )}
                  {isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing image...</div>}
                  {ocrProcessingStatus === 'exif_applied' && !isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-blue-600"><CalendarClockIcon className="mr-2 h-4 w-4" /> EXIF date/time applied. OCR results (if any) also applied.</div>}
                  {ocrProcessingStatus === 'ocr_done' && !isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-green-600"><CheckCircle className="mr-2 h-4 w-4" /> OCR successful.</div>}
                  {ocrProcessingStatus === 'error' && !isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-destructive"><AlertCircle className="mr-2 h-4 w-4" /> OCR failed. Please enter manually.</div>}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Date</FormLabel>
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
                    <FormLabel className="text-base">Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="systolic"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-base">Systolic (SYS)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 120" {...field} value={field.value ?? ''} />
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
                    <FormLabel className="text-base">Diastolic (DIA)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 80" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="bodyPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Body Position</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Medications FormField removed from here */}

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" disabled={isLoadingOcrParent || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Add Reading
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
