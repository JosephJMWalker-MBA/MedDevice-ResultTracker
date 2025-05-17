import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type TrendAnalysisResult } from '@/lib/types';
import { Lightbulb, ListChecks, Info, AlertTriangle } from 'lucide-react';

interface TrendAnalysisDisplayProps {
  analysis: TrendAnalysisResult | null;
}

export default function TrendAnalysisDisplay({ analysis }: TrendAnalysisDisplayProps) {
  if (!analysis) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Info className="h-7 w-7 text-primary" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No analysis data available. Add some readings to see your trends.</p>
        </CardContent>
      </Card>
    );
  }

  const hasWarningDisclaimer = analysis.summary.includes("⚠️") || analysis.suggestions.some(s => s.includes("⚠️"));

  return (
    <Card className="shadow-lg border-primary/50">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          Blood Pressure Trend Analysis
        </CardTitle>
        <CardDescription>Insights based on your readings from the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5 text-accent" />Summary</h3>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
        </div>

        {analysis.flags && analysis.flags.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" />Flags</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.flags.map((flag, index) => (
                <Badge key={index} variant={flag.toLowerCase().includes("hypertension") ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" />Personalized Suggestions</h3>
            <ul className="list-disc list-inside space-y-1 text-foreground/90 leading-relaxed">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="whitespace-pre-wrap">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        {!hasWarningDisclaimer && (
           <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-destructive" /> 
            This is not medical advice. Consult a healthcare professional for any concerns.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
