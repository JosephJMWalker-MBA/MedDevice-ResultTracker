
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type BloodPressureReading, type BodyPosition } from '@/lib/types';
import { History, TrendingUp, Activity, ThermometerSnowflake, ThermometerSun, Pill, PersonStanding, BedDouble, Sofa, HelpCircleIcon, FileText, FileArchive, Mail, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import for the autoTable plugin
import { useToast } from '@/hooks/use-toast';


interface ReadingListProps {
  readings: BloodPressureReading[];
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


export default function ReadingList({ readings }: ReadingListProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (readings.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No readings to export.' });
      return;
    }
    const dataToExport = readings.map(r => ({
      Date: format(new Date(r.timestamp), 'yyyy-MM-dd'),
      Time: format(new Date(r.timestamp), 'HH:mm:ss'),
      Systolic: r.systolic,
      Diastolic: r.diastolic,
      'Body Position': r.bodyPosition,
      Medications: r.medications,
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'blood_pressure_readings.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Readings exported to CSV.' });
  };

  const exportToPDF = () => {
    if (readings.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No readings to export.' });
      return;
    }
    const doc = new jsPDF();
    const tableColumn = ["Date", "Time", "Systolic (mmHg)", "Diastolic (mmHg)", "Body Position", "Medications"];
    const tableRows: any[][] = [];

    readings.forEach(reading => {
      const readingData = [
        format(new Date(reading.timestamp), 'yyyy-MM-dd'),
        format(new Date(reading.timestamp), 'HH:mm:ss'),
        reading.systolic,
        reading.diastolic,
        reading.bodyPosition,
        reading.medications || '-',
      ];
      tableRows.push(readingData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      didDrawPage: (data: any) => {
        doc.setFontSize(10);
        doc.text('Blood Pressure Readings - PressureTrack AI', data.settings.margin.left, 15);
      }
    });
    doc.save('blood_pressure_readings.pdf');
    toast({ title: 'Export Successful', description: 'Readings exported to PDF.' });
  };

  const shareViaEmail = () => {
    if (readings.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'No readings to share.' });
        return;
    }
    const subject = "My Blood Pressure Readings from PressureTrack AI";
    let body = "Here are my recent blood pressure readings:\n\n";
    const recentReadings = readings.slice(0, 10); // Share up to 10 recent readings
    recentReadings.forEach(r => {
        body += `${format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm')} - SYS: ${r.systolic}, DIA: ${r.diastolic}, Position: ${r.bodyPosition}\n`;
    });
    body += "\nGenerated by PressureTrack AI.\nNote: This is not medical advice. Consult a healthcare professional for any concerns.";
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
              <TableHead className="hidden lg:table-cell">Medications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((reading) => {
              const { category, colorClass, Icon: BPCategoryIcon } = getBpCategory(reading.systolic, reading.diastolic);
              const PositionIcon = getBodyPositionIcon(reading.bodyPosition);
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
                  <TableCell className="hidden lg:table-cell">
                    {reading.medications ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground" title={reading.medications}>
                        <Pill className="h-3 w-3 shrink-0"/> 
                        <span className="truncate max-w-[100px]">{reading.medications}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
           {readings.length > 5 && <TableCaption>Scroll for more readings.</TableCaption>}
        </Table>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={exportToCSV} disabled={readings.length === 0}>
            <FileText className="mr-2 h-4 w-4" /> Export to CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF} disabled={readings.length === 0}>
            <FileArchive className="mr-2 h-4 w-4" /> Export to PDF
          </Button>
          <Button variant="outline" onClick={shareViaEmail} disabled={readings.length === 0}>
            <Mail className="mr-2 h-4 w-4" /> Share via Email
          </Button>
          <Button variant="outline" disabled title="Secure shareable link (Coming Soon)">
            <Link2 className="mr-2 h-4 w-4" /> Secure Link (Soon)
          </Button>
        </CardFooter>
    </Card>
  );
}
