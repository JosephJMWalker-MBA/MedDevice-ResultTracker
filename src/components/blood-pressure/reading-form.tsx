
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ReadingFormData, ReadingFormSchema, type OcrData } from '@/lib/types';
import { callExtractDataAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileScan, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

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
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const form = useForm<ReadingFormData>({
    resolver: zodResolver(ReadingFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '', // Initialize as empty string
      diastolic: '', // Initialize as empty string
      age: '',       // Initialize as empty string
      weight: '',     // Initialize as empty string
      medications: '',
      // imageFile is implicitly undefined here, which is fine for file inputs.
    },
  });

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setIsLoadingOcrParent(true);
      setOcrStatus('idle');
      try {
        const dataUri = await fileToDataUri(file);
        const extractedData: OcrData = await callExtractDataAction(dataUri);
        
        // form.setValue will convert number to string for input type="number" if needed,
        // or keep as number. The key is it's a defined value.
        if (extractedData.date) form.setValue('date', extractedData.date);
        if (extractedData.time) form.setValue('time', extractedData.time);
        if (extractedData.systolic) form.setValue('systolic', extractedData.systolic);
        if (extractedData.diastolic) form.setValue('diastolic', extractedData.diastolic);
        
        toast({ title: 'OCR Success', description: 'Data extracted. Please verify and complete the form.' });
        setOcrStatus('success');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'OCR Error', description: error.message || 'Could not extract data from image.' });
        setOcrStatus('error');
      } finally {
        setIsLoadingOcrParent(false);
      }
    } else {
      setImagePreview(null);
      setOcrStatus('idle');
    }
  };

  const onSubmit: SubmitHandler<ReadingFormData> = (data) => {
    onReadingAdded(data);
    form.reset({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      systolic: '', // Reset to empty string
      diastolic: '', // Reset to empty string
      age: data.age, // Keep previously submitted numeric age (data.age is number from Zod)
      weight: data.weight, // Keep previously submitted numeric weight (data.weight is number from Zod)
      medications: '', 
      imageFile: undefined, // Reset file input
    });
    setImagePreview(null);
    setOcrStatus('idle');
    const fileInput = document.getElementById('imageFile') as HTMLInputElement | null;
    if (fileInput) {
        fileInput.value = '';
    }
    toast({ title: 'Reading Added', description: 'Your blood pressure reading has been saved.' });
  };
  
  // This useEffect is mostly redundant now as defaultValues handles date/time.
  // Keeping it in case of edge cases or if defaultValues were removed for date/time.
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
        <CardDescription>Upload an image of your reading or enter details manually. Fill in all fields for accurate tracking.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="imageFile"
              render={({ field }) => ( // field.value will be FileList or undefined
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
                  <FormMessage />
                  {imagePreview && (
                    <div className="mt-2 relative w-48 h-32 rounded-md overflow-hidden border">
                      <Image src={imagePreview} alt="Reading preview" layout="fill" objectFit="contain" data-ai-hint="medical device"/>
                    </div>
                  )}
                  {isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing image...</div>}
                  {ocrStatus === 'success' && !isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-green-600"><CheckCircle className="mr-2 h-4 w-4" /> OCR successful.</div>}
                  {ocrStatus === 'error' && !isLoadingOcrParent && <div className="flex items-center mt-2 text-sm text-destructive"><AlertCircle className="mr-2 h-4 w-4" /> OCR failed. Please enter manually.</div>}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => ( // field.value is string
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
                render={({ field }) => ( // field.value is string
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
                render={({ field }) => ( // field.value is '' or number (or string representation of number)
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
                render={({ field }) => ( // field.value is '' or number
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => ( // field.value is '' or number
                  <FormItem>
                    <FormLabel className="text-base">Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your current age" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => ( // field.value is '' or number
                  <FormItem>
                    <FormLabel className="text-base">Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your current weight in lbs" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => ( // field.value is string
                <FormItem>
                  <FormLabel className="text-base">Medications (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List any medications you are currently taking, e.g., Lisinopril 10mg" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

