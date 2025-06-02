
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type TrendAnalysisResult } from '@/lib/types';
import { Lightbulb, ListChecks, Info, AlertTriangle, AreaChart, ListOrdered } from 'lucide-react';

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

  const handleSuggestionClick = (action: 'TREND_CHART' | 'READING_HISTORY') => {
    let elementId = '';
    if (action === 'TREND_CHART') {
      elementId = 'bp-chart-card';
    } else if (action === 'READING_HISTORY') {
      elementId = 'reading-list-card';
    }

    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderSuggestion = (suggestion: string, index: number) => {
    const trendChartRegex = /\[TREND_CHART\]/;
    const readingHistoryRegex = /\[READING_HISTORY\]/;

    if (trendChartRegex.test(suggestion)) {
      const parts = suggestion.split(trendChartRegex);
      return (
        <li key={index} className="whitespace-pre-wrap">
          {parts[0]}
          <Button variant="link" className="p-0 h-auto font-normal text-base inline text-primary hover:underline" onClick={() => handleSuggestionClick('TREND_CHART')}>
            viewing your trend chart
          </Button>
          {parts[1]}
        </li>
      );
    }

    if (readingHistoryRegex.test(suggestion)) {
      const parts = suggestion.split(readingHistoryRegex);
      return (
        <li key={index} className="whitespace-pre-wrap">
          {parts[0]}
          <Button variant="link" className="p-0 h-auto font-normal text-base inline text-primary hover:underline" onClick={() => handleSuggestionClick('READING_HISTORY')}>
            review your reading history
          </Button>
          {parts[1]}
        </li>
      );
    }
    return <li key={index} className="whitespace-pre-wrap">{suggestion}</li>;
  };


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
                <Badge key={index} variant={flag.toLowerCase().includes("hypertension") || flag.toLowerCase().includes("crisis") ? "destructive" : "secondary"} className="text-sm px-3 py-1">
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
              {analysis.suggestions.map(renderSuggestion)}
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
