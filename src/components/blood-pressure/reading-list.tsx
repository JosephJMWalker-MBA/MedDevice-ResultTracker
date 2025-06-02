
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type BloodPressureReading, type BodyPosition, type ExerciseContext, type TrendAnalysisResult } from '@/lib/types';
import { History, TrendingUp, Activity, ThermometerSnowflake, ThermometerSun, PersonStanding, BedDouble, Sofa, HelpCircleIcon, FileText, FileArchive, Mail, Link2, Bike, Zap, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';


interface ReadingListProps {
  readings: BloodPressureReading[];
  analysis: TrendAnalysisResult | null;
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

const getBodyPositionIcon = (position: BodyPosition): React.ElementType => {
  switch (position) {
    case 'Sitting': return Sofa;
    case 'Standing': return PersonStanding;
    case 'Lying Down': return BedDouble;
    case 'Other': return HelpCircleIcon;
    default: return Activity;
  }
};

const getExerciseContextIcon = (context: ExerciseContext): React.ElementType => {
  switch (context) {
    case 'Resting': return Dumbbell;
    case 'Pre-Exercise': return Zap;
    case 'During Exercise': return Bike;
    case 'Post-Exercise': return ThermometerSun;
    default: return HelpCircleIcon;
  }
};


export default function ReadingList({ readings, analysis }: ReadingListProps) {
  const { toast } = useToast();
  const disclaimerText = "⚠️ This is not medical advice. Consult a healthcare professional for any concerns.";

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
      'Body Position': r.bodyPosition,
      'Exercise Context': r.exerciseContext,
    }));

    let csvContent = Papa.unparse(dataToExport);

    if (analysis && analysis.summary) {
        csvContent += `\n\nTrend Analysis Summary:\n"${analysis.summary.replace(/"/g, '""').replace(disclaimerText, '').trim()}"`;
    }
    if (analysis && analysis.flags && analysis.flags.length > 0) {
        csvContent += `\n\nFlags:\n${analysis.flags.map(f => `"${f.replace(/"/g, '""')}"`).join('\n')}`;
    }
    if (analysis && analysis.suggestions && analysis.suggestions.length > 0) {
        csvContent += `\n\nSuggestions:\n${analysis.suggestions.map(s => `"${s.replace(/"/g, '""')}"`).join('\n')}`;
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
    toast({ title: 'Export Successful', description: 'Readings and analysis report exported to CSV.' });
  };

  const exportToPDF = () => {
    if (readings.length === 0 && !analysis) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to export.' });
      return;
    }
    const doc = new jsPDF();
    let startY = 20;

    doc.setFontSize(16);
    doc.text('Blood Pressure Report - PressureTrack AI', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    startY = 25;


    if (readings.length > 0) {
        doc.setFontSize(12);
        doc.text('Readings History', 14, startY);
        startY += 7;

        const tableColumn = ["Date", "Time", "Systolic (mmHg)", "Diastolic (mmHg)", "Body Position", "Exercise Context"];
        const tableRows: any[][] = [];

        readings.forEach(reading => {
        const readingData = [
            format(new Date(reading.timestamp), 'yyyy-MM-dd'),
            format(new Date(reading.timestamp), 'HH:mm:ss'),
            reading.systolic,
            reading.diastolic,
            reading.bodyPosition,
            reading.exerciseContext,
        ];
        tableRows.push(readingData);
        });

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [34, 102, 153] }, // Primary color from theme (approx)
            didDrawPage: (data: any) => {
                // Footer with disclaimer on each page
                doc.setFontSize(8);
                const pageHeight = doc.internal.pageSize.getHeight();
                const disclaimerLines = doc.splitTextToSize(disclaimerText, doc.internal.pageSize.getWidth() - data.settings.margin.left - data.settings.margin.right);
                doc.text(disclaimerLines, data.settings.margin.left, pageHeight - 10 - (disclaimerLines.length -1) * 3.5 ); // Adjust Y for multi-line
            },
            margin: { bottom: 20 } // Ensure space for footer
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
    }


    if (analysis) {
        if (startY > doc.internal.pageSize.getHeight() - 30) { // Check if new page is needed before analysis
            doc.addPage();
            startY = 20;
        }
        doc.setFontSize(14);
        doc.text('Trend Analysis Report', 14, startY);
        startY += 10;

        doc.setFontSize(11);

        const addSection = (title: string, content: string | string[]) => {
            if (startY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); startY = 20; }
            doc.setFont(undefined, 'bold');
            doc.text(title, 14, startY);
            startY += 6;
            doc.setFont(undefined, 'normal');
            
            const contentToProcess = typeof content === 'string' ? content.replace(disclaimerText, '').trim() : content;

            if (typeof contentToProcess === 'string') {
                const lines = doc.splitTextToSize(contentToProcess, doc.internal.pageSize.getWidth() - 28);
                if (startY + (lines.length * 5) > doc.internal.pageSize.getHeight() - 25) {
                    doc.addPage(); startY = 20;
                }
                doc.text(lines, 14, startY);
                startY += (lines.length * 5) + 4;
            } else if (Array.isArray(contentToProcess)) {
                contentToProcess.forEach(item => {
                    const itemLines = doc.splitTextToSize(`• ${item}`, doc.internal.pageSize.getWidth() - 32);
                    if (startY + (itemLines.length * 5) > doc.internal.pageSize.getHeight() - 25) {
                       doc.addPage(); startY = 20;
                    }
                    doc.text(itemLines, 16, startY);
                    startY += (itemLines.length * 5) + 1;
                });
                startY += 3;
            }
        };

        if (analysis.summary) {
            addSection('Summary:', analysis.summary);
        }
        if (analysis.flags && analysis.flags.length > 0) {
            addSection('Flags:', analysis.flags);
        }
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            addSection('Suggestions & Next Steps:', analysis.suggestions);
        }
    }

    doc.save('blood_pressure_report.pdf');
    toast({ title: 'Export Successful', description: 'Readings and analysis report exported to PDF.' });
  };

  const shareViaEmail = () => {
    if (readings.length === 0 && !analysis) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No readings or analysis to share.' });
        return;
    }
    const subject = "My Blood Pressure Report from PressureTrack AI";
    let body = "Hello,\n\nPlease find my blood pressure report from PressureTrack AI below.\n\n";

    if (readings.length > 0) {
        body += "==== Recent Readings (up to 10) ====\n";
        const recentReadings = readings.slice(0, 10);
        recentReadings.forEach(r => {
            body += `${format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm')} - SYS: ${r.systolic}, DIA: ${r.diastolic}, Position: ${r.bodyPosition}, Exercise: ${r.exerciseContext}\n`;
        });
        body += "\n";
    }

    if (analysis) {
        body += "==== Trend Analysis ====\n";
        if(analysis.summary) body += `Summary:\n${analysis.summary.replace(disclaimerText, '').trim()}\n\n`;
        if (analysis.flags && analysis.flags.length > 0) {
            body += "Flags:\n";
            analysis.flags.forEach(f => body += `- ${f}\n`);
            body += "\n";
        }
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            body += "Suggestions & Next Steps:\n";
            analysis.suggestions.forEach(s => body += `- ${s}\n`);
            body += "\n";
        }
    }

    body += `\nBest regards,\n\nGenerated by PressureTrack AI.\n${disclaimerText}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    toast({ title: 'Email Draft Opened', description: 'Your email client should open with a draft.' });
  };

  if (readings.length === 0) {
    return (
      <Card className="shadow-lg">
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
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
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
              <TableHead>Systolic (mmHg)</TableHead>
              <TableHead>Diastolic (mmHg)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden sm:table-cell">Position</TableHead>
              <TableHead className="hidden md:table-cell">Exercise</TableHead>
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
                  <TableCell className="font-medium">{reading.systolic}</TableCell>
                  <TableCell className="font-medium">{reading.diastolic}</TableCell>
                  <TableCell className={`${colorClass} font-medium flex items-center gap-1`}>
                    <BPCategoryIcon className="h-4 w-4"/> {category}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                     <div className="flex items-center gap-1 text-sm" title={reading.bodyPosition}>
                        <PositionIcon className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <span>{reading.bodyPosition}</span>
                      </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                     <div className="flex items-center gap-1 text-sm" title={reading.exerciseContext}>
                        <ExerciseIcon className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <span>{reading.exerciseContext}</span>
                      </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
           {readings.length > 5 && <TableCaption>Scroll for more readings.</TableCaption>}
        </Table>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={exportToCSV} disabled={readings.length === 0 && !analysis}>
            <FileText className="mr-2 h-4 w-4" /> Export to CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF} disabled={readings.length === 0 && !analysis}>
            <FileArchive className="mr-2 h-4 w-4" /> Export to PDF
          </Button>
          <Button variant="outline" onClick={shareViaEmail} disabled={readings.length === 0 && !analysis}>
            <Mail className="mr-2 h-4 w-4" /> Share via Email
          </Button>
          <Button variant="outline" disabled title="Secure shareable link (Coming Soon)">
            <Link2 className="mr-2 h-4 w-4" /> Secure Link (Soon)
          </Button>
        </CardFooter>
    </Card>
  );
}

