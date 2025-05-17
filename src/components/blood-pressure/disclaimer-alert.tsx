import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DisclaimerAlert() {
  return (
    <Alert variant="destructive" className="bg-amber-50 border-amber-300 text-amber-800 [&>svg]:text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 dark:[&>svg]:text-amber-500">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-semibold">Important Disclaimer</AlertTitle>
      <AlertDescription className="text-sm">
        The information and insights provided by PressureTrack AI are for informational purposes only and do not constitute medical advice. This tool is not a substitute for professional medical consultation, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or seen in this application.
      </AlertDescription>
    </Alert>
  );
}
