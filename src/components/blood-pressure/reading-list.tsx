
'use client';

import type { BloodPressureReading, TrendAnalysisResult, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { History, TrendingUp, Activity, ThermometerSnowflake, ThermometerSun, PersonStanding, BedDouble, Sofa, HelpCircleIcon, FileText, FileArchive, Mail, Link2, Bike, Zap, Dumbbell, Stethoscope, HeartPulseIcon, Pencil, Trash2, MessageSquareText } from 'lucide-react';


interface ReadingListProps {
  readings: BloodPressureReading[];
  analysis: TrendAnalysisResult | null;
  userProfile: UserProfile | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const getBpCategory = (systolic: number, diastolic: number): { category: string; colorClass: string; Icon: React.ElementType } => {
  if (systolic < 90 || diastolic < 60) return { category: 'Low', colorClass: 'text-blue-500', Icon: ThermometerSnowflake };
  if (systolic < 120 && diastolic < 80) return { category: 'Normal', colorClass: 'text-green-500', Icon: Activity };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { category: 'Elevated', colorClass: 'text-yellow-500', Icon: TrendingUp };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { category: 'Hypertension Stage 1', colorClass: 'text-orange-500', Icon: TrendingUp };
  if (systolic >= 140 || diastolic >= 90) return { category: 'Hypertension Stage 2', colorClass: 'text-red-500', Icon: TrendingUp };
  if (systolic > 180 || diastolic > 120) return { category: 'Hypertensive Crisis', colorClass: 'text-red-700 font-bold', Icon: ThermometerSun };
  return { category: 'N/A', colorClass: 'text-muted-foreground', Icon: Activity };
};

const getBodyPositionIcon = (position?: BloodPressureReading['bodyPosition']): React.ElementType => {
  switch (position) {
    case 'Sitting': return Sofa;
    case 'Standing': return PersonStanding;
    case 'Lying Down': return BedDouble;
    case 'Other': return HelpCircleIcon;
    default: return Activity;
  }
};

const getExerciseContextIcon = (context?: BloodPressureReading['exerciseContext']): React.ElementType => {
  switch (context) {
    case 'Resting': return Dumbbell; // Changed from Stethoscope for resting exercise context
    case 'Pre-Exercise': return Zap; // Changed from Bike for pre-exercise
    case 'During Exercise': return Bike; // Keep Bike for during
    case 'Post-Exercise': return ThermometerSun; // Keep ThermometerSun for post
    default: return HelpCircleIcon;
  }
};


export default function ReadingList({ readings, analysis, userProfile, onEdit, onDelete }: ReadingListProps) {
  const { toast } = useToast();
  const disclaimerText = "⚠️ This is not medical advice. Consult a healthcare professional for any concerns.";

  const generateReportText = (includeDisclaimer = true): string => {
    let text = "";
    if (readings.length > 0) {
        text += "Blood Pressure Readings (most recent first, up to 15 shown):\n";
        readings.slice(0, 15).forEach(r => {
            text += `${format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm')} - SYS: ${r.systolic}, DIA: ${r.diastolic}${r.pulse ? `, Pulse: ${r.pulse} bpm` : ''}, Pos: ${r.bodyPosition}, Ex: ${r.exerciseContext}`;
            if (r.symptoms && r.symptoms.length > 0 && r.symptoms[0] !== "None") {
                text += `, Symptoms: ${r.symptoms.join(', ')}`;
            }
            text += '\n';
        });
        text += "\n";
    }

    if (analysis) {
        text += "Trend Analysis Summary:\n";
        if(analysis.summary) text += `${analysis.summary.replace(disclaimerText, '').trim()}\n\n`; // Remove disclaimer if present, then add at end
        if (analysis.flags && analysis.flags.length > 0) {
            text += "Flags:\n";
            analysis.flags.forEach(f => text += `- ${f}\n`);
            text += "\n";
        }
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            text += "Suggestions & Next Steps:\n";
            analysis.suggestions.forEach(s => text += `- ${s.replace(/\[.*?\]/g, '').trim()}\n`); // Remove placeholders like [TREND_CHART] for text share
            text += "\n";
        }
    }
    if (includeDisclaimer) {
        text += `\n${disclaimerText}`;
    }
    return text.trim();
  };

  const shareViaTextOrApp = async () => {
    if (readings.length === 0 && !analysis) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to share.' });
        return;
    }

    const reportText = generateReportText();
    const shareData = {
      title: 'My Blood Pressure Report',
      text: reportText,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const pdfBlob = await generatePdfBlob();
        if (pdfBlob) {
            const pdfFile = new File([pdfBlob], "blood_pressure_report.pdf", { type: "application/pdf" });
            const fullShareData = { ...shareData, files: [pdfFile] };
             if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share(fullShareData);
                toast({ title: 'Shared!', description: 'Report (PDF and text) sent to sharing target.' });
                return;
            }
        }
        // Fallback to text only if PDF cannot be shared or generation failed
        await navigator.share(shareData);
        toast({ title: 'Shared!', description: 'Report text sent to sharing target.' });

      } catch (error: any) {
        if (error.name === 'AbortError') {
          // User cancelled the share operation
          console.log('Share operation cancelled by user.');
          toast({ title: 'Share Cancelled', description: 'The share operation was cancelled.' });
        } else if (error.name === 'NotAllowedError') {
          console.error('Share permission denied:', error);
          toast({
            variant: 'destructive',
            title: 'Share Permission Denied',
            description: 'Could not share because permission was denied by the browser. Report copied to clipboard as a fallback.',
          });
          copyReportToClipboard(reportText);
        } else {
          console.error('Error sharing:', error);
          toast({
            variant: 'destructive',
            title: 'Share Error',
            description: `Could not share: ${error.message}. Report copied to clipboard as a fallback.`,
          });
          copyReportToClipboard(reportText);
        }
      }
    } else {
      copyReportToClipboard(reportText);
      toast({ title: 'Web Share Not Supported', description: 'Report text copied to clipboard. Please paste it into your messaging app.' });
    }
  };

  const copyReportToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied to Clipboard', description: 'Report text copied successfully.' });
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy report text.' });
        });
    } else {
        toast({ variant: 'destructive', title: 'Copy Failed', description: 'Clipboard API not available.' });
    }
  };


  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (readings.length === 0 && !analysis) {
      return null;
    }
    // Use a new instance of jsPDF for blob generation to avoid state issues
    const docInstance = new jsPDF(); 
    exportToPDF(true, docInstance); // Pass true for blob mode and the instance
    return docInstance.output('blob');
  };


  const exportToCSV = () => {
    if (readings.length === 0 && (!analysis || !analysis.summary)) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to export.' });
      return;
    }
    const dataToExport = readings.map(r => ({
      Date: format(new Date(r.timestamp), 'yyyy-MM-dd'),
      Time: format(new Date(r.timestamp), 'HH:mm:ss'),
      Systolic: r.systolic,
      Diastolic: r.diastolic,
      Pulse: r.pulse ?? 'N/A',
      'Body Position': r.bodyPosition,
      'Exercise Context': r.exerciseContext,
      'Symptoms': r.symptoms && r.symptoms.length > 0 && r.symptoms[0] !== "None" ? r.symptoms.join(', ') : '',
    }));

    let csvContent = Papa.unparse(dataToExport);
    let analysisSummaryText = "";

    if (analysis) {
        if (analysis.summary) {
            analysisSummaryText = analysis.summary.replace(disclaimerText, "").trim(); // Remove disclaimer for data section
            csvContent += `\n\nTrend Analysis Summary:\n"${analysisSummaryText.replace(/"/g, '""')}"`;
        }
        if (analysis.flags && analysis.flags.length > 0) {
            const analysisFlagsText = analysis.flags.map(f => `"${f.replace(/"/g, '""')}"`).join('\n');
            csvContent += `\n\nFlags:\n${analysisFlagsText}`;
        }
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            const analysisSuggestionsText = analysis.suggestions.map(s => `"${s.replace(/\[.*?\]/g, '').trim().replace(/"/g, '""')}"`).join('\n');
            csvContent += `\n\nSuggestions & Next Steps:\n${analysisSuggestionsText}`;
        }
    }
    csvContent += `\n\n${disclaimerText}`;


    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'blood_pressure_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Readings and analysis report exported to CSV.' });
  };

  const exportToPDF = (forBlob = false, doc?: jsPDF) => {
    if (readings.length === 0 && !analysis && !forBlob) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to export.' });
      return;
    }
    
    const pdfDoc = doc || new jsPDF();
    let startY = 20;
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const margin = 14;
    const bottomMarginForDisclaimer = 25; 

    const addDisclaimerToCurrentPage = (docInstance: jsPDF) => {
        const currentFontSize = docInstance.getFontSize();
        docInstance.setFontSize(8);
        const disclaimerLinesUnsafe = docInstance.splitTextToSize(disclaimerText, pageWidth - margin * 2);
        const disclaimerLines: string[] = Array.isArray(disclaimerLinesUnsafe) ? disclaimerLinesUnsafe : [disclaimerLinesUnsafe];
        let textHeight = disclaimerLines.length * 3.5; 
        
        docInstance.text(disclaimerLines, margin, pageHeight - (margin/2) - textHeight);
        docInstance.setFontSize(currentFontSize);
    };

    pdfDoc.setFontSize(16);
    pdfDoc.text('Blood Pressure Report - PressureTrack AI', pageWidth / 2, 15, { align: 'center' });
    startY = 25;


    if (readings.length > 0) {
        pdfDoc.setFontSize(12);
        pdfDoc.text('Readings History', margin, startY);
        startY += 7;

        const tableColumn = ["Date", "Time", "SYS", "DIA", "Pulse", "Position", "Exercise", "Symptoms"];
        const tableRows: any[][] = [];

        readings.forEach(reading => {
        const readingData = [
            format(new Date(reading.timestamp), 'yyyy-MM-dd'),
            format(new Date(reading.timestamp), 'HH:mm'),
            reading.systolic,
            reading.diastolic,
            reading.pulse ?? 'N/A',
            reading.bodyPosition,
            reading.exerciseContext,
            reading.symptoms && reading.symptoms.length > 0 && reading.symptoms[0] !== "None" ? reading.symptoms.join(', ') : '',
        ];
        tableRows.push(readingData);
        });

        (pdfDoc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [34, 102, 153] }, // Example: A shade of blue
            margin: { top: startY, left: margin, right: margin, bottom: bottomMarginForDisclaimer + 5 }, // Increased bottom margin for table
            // didDrawPage: (data: any) => { addDisclaimerToCurrentPage(pdfDoc); } // Removed from here
        });
        startY = (pdfDoc as any).lastAutoTable.finalY + 10;
    }


    if (analysis) {
        const checkAndAddPage = () => {
            if (startY > pageHeight - bottomMarginForDisclaimer - 20) { 
                pdfDoc.addPage();
                startY = margin + 5;
            }
        };

        checkAndAddPage();
        pdfDoc.setFontSize(14);
        pdfDoc.text('Trend Analysis Report', margin, startY);
        startY += 10;
        pdfDoc.setFontSize(11);

        const addSection = (title: string, content: string | string[]) => {
            checkAndAddPage();
            pdfDoc.setFont(undefined, 'bold');
            pdfDoc.text(title, margin, startY);
            startY += 6;
            pdfDoc.setFont(undefined, 'normal');
            
            const contentToProcess = typeof content === 'string' ? content.replace(disclaimerText, '').trim() : content;

            if (typeof contentToProcess === 'string') {
                const linesUnsafe = pdfDoc.splitTextToSize(contentToProcess, pageWidth - margin * 2);
                const lines: string[] = Array.isArray(linesUnsafe) ? linesUnsafe : [linesUnsafe];
                lines.forEach((line: string) => {
                    if (startY + 5 > pageHeight - bottomMarginForDisclaimer) { 
                        pdfDoc.addPage();
                        startY = margin + 5;
                    }
                    pdfDoc.text(line, margin, startY);
                    startY += 5;
                });
                startY += 4; 
            } else if (Array.isArray(contentToProcess)) {
                contentToProcess.forEach(item => {
                    const itemCleaned = item.replace(/\[.*?\]/g, '').trim();
                    const itemLinesUnsafe = pdfDoc.splitTextToSize(`• ${itemCleaned}`, pageWidth - (margin * 2) - 4);
                    const itemLines : string[] = Array.isArray(itemLinesUnsafe) ? itemLinesUnsafe : [itemLinesUnsafe];
                    itemLines.forEach((line: string) => {
                         if (startY + 5 > pageHeight - bottomMarginForDisclaimer) {
                            pdfDoc.addPage();
                            startY = margin + 5;
                        }
                        pdfDoc.text(line, margin + 2, startY); 
                        startY += 5;
                    });
                    startY += 1;
                });
                startY += 3; 
            }
        };

        if (analysis.summary) addSection('Summary:', analysis.summary);
        if (analysis.flags && analysis.flags.length > 0) addSection('Flags:', analysis.flags);
        if (analysis.suggestions && analysis.suggestions.length > 0) addSection('Suggestions & Next Steps:', analysis.suggestions);
    }
    
    const totalPages = (pdfDoc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i);
      addDisclaimerToCurrentPage(pdfDoc);
    }

    if (!forBlob) {
        pdfDoc.save('blood_pressure_report.pdf');
        toast({ title: 'Export Successful', description: 'Readings and analysis report exported to PDF.' });
    }
  };

  const shareViaEmail = () => {
    if (readings.length === 0 && !analysis) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to share.' });
        return;
    }
    const subject = "My Blood Pressure Report from PressureTrack AI";
    const body = generateReportText();
    
    let mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (userProfile?.preferredMailClient === "Gmail") {
        mailtoLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (userProfile?.preferredMailClient === "Outlook.com") {
        mailtoLink = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    if (typeof window !== "undefined") {
        window.open(mailtoLink, '_blank');
        toast({ title: 'Email Draft Opened', description: 'Your email client/tab should open with a draft.' });
    }
  };

  if (readings.length === 0) {
    return (
      <Card className="shadow-lg" id="reading-list-card">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Readings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No readings recorded yet. Add a new reading to start tracking.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg" id="reading-list-card">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Readings History
          </CardTitle>
          <CardDescription>A log of your past blood pressure measurements.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date & Time</TableHead>
              <TableHead>SYS/DIA</TableHead>
              <TableHead className="hidden sm:table-cell">
                <div className="flex items-center gap-1">
                  <HeartPulseIcon className="h-4 w-4" /> Pulse
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden sm:table-cell">Position</TableHead>
              <TableHead className="hidden md:table-cell">Exercise</TableHead>
              <TableHead className="hidden lg:table-cell">
                <div className="flex items-center gap-1">
                    <Stethoscope className="h-4 w-4" /> Symptoms
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((reading) => {
              const { category, colorClass, Icon: BPCategoryIcon } = getBpCategory(reading.systolic, reading.diastolic);
              const PositionIcon = getBodyPositionIcon(reading.bodyPosition);
              const ExerciseIcon = getExerciseContextIcon(reading.exerciseContext);
              return (
                <TableRow key={reading.id}>
                  <TableCell>
                    <div>{format(new Date(reading.timestamp), 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(reading.timestamp), 'p')}</div>
                  </TableCell>
                  <TableCell className="font-medium">{reading.systolic}/{reading.diastolic}</TableCell>
                  <TableCell className="hidden sm:table-cell">{reading.pulse ? `${reading.pulse} bpm` : 'N/A'}</TableCell>
                  <TableCell>
                    <div className={`${colorClass} font-medium flex items-center gap-1`}>
                        <BPCategoryIcon className="h-4 w-4"/> {category}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                     <div className="flex items-center gap-1 text-sm" title={reading.bodyPosition}>
                        <PositionIcon className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <span className="truncate max-w-[80px]">{reading.bodyPosition}</span>
                      </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                     <div className="flex items-center gap-1 text-sm" title={reading.exerciseContext}>
                        <ExerciseIcon className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <span className="truncate max-w-[100px]">{reading.exerciseContext}</span>
                      </div>
                  </TableCell>
                   <TableCell className="hidden lg:table-cell text-xs">
                    {reading.symptoms && reading.symptoms.length > 0 && reading.symptoms[0] !== "None" ? (
                        <div className="flex flex-wrap gap-1">
                        {reading.symptoms.map(symptom => (
                            <Badge key={symptom} variant="outline" className="text-xs px-1.5 py-0.5">{symptom}</Badge>
                        ))}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">N/A</span>
                    )}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(reading.id)} title="Edit Reading">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete Reading">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this blood pressure reading.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(reading.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
           {readings.length > 5 && <TableCaption>Scroll for more readings. Table shows most recent readings first.</TableCaption>}
        </Table>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4 flex-wrap">
          <Button variant="outline" onClick={exportToCSV} disabled={readings.length === 0 && !analysis}>
            <FileText className="mr-2 h-4 w-4" /> Export to CSV
          </Button>
          <Button variant="outline" onClick={() => exportToPDF()} disabled={readings.length === 0 && !analysis}>
            <FileArchive className="mr-2 h-4 w-4" /> Export to PDF
          </Button>
          <Button variant="outline" onClick={shareViaEmail} disabled={readings.length === 0 && !analysis}>
            <Mail className="mr-2 h-4 w-4" /> Share via Email
          </Button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button variant="outline" onClick={shareViaTextOrApp} disabled={readings.length === 0 && !analysis}>
              <MessageSquareText className="mr-2 h-4 w-4" /> Share Text/App
            </Button>
          )}
          <Button variant="outline" disabled title="Secure shareable link (Coming Soon)">
            <Link2 className="mr-2 h-4 w-4" /> Secure Link (Soon)
          </Button>
        </CardFooter>
    </Card>
  );
}

