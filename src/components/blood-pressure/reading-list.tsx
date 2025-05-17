import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type BloodPressureReading } from '@/lib/types';
import { History, TrendingDown, TrendingUp, Activity, ThermometerSnowflake, ThermometerSun, Pill } from 'lucide-react';
import { format } from 'date-fns';

interface ReadingListProps {
  readings: BloodPressureReading[];
}

// Function to categorize BP readings
const getBpCategory = (systolic: number, diastolic: number): { category: string; colorClass: string; Icon: React.ElementType } => {
  if (systolic < 90 || diastolic < 60) return { category: 'Low', colorClass: 'text-blue-500', Icon: ThermometerSnowflake };
  if (systolic < 120 && diastolic < 80) return { category: 'Normal', colorClass: 'text-green-500', Icon: Activity };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { category: 'Elevated', colorClass: 'text-yellow-500', Icon: TrendingUp };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { category: 'Hypertension Stage 1', colorClass: 'text-orange-500', Icon: TrendingUp };
  if (systolic >= 140 || diastolic >= 90) return { category: 'Hypertension Stage 2', colorClass: 'text-red-500', Icon: TrendingUp };
  if (systolic > 180 || diastolic > 120) return { category: 'Hypertensive Crisis', colorClass: 'text-red-700 font-bold', Icon: ThermometerSun };
  return { category: 'N/A', colorClass: 'text-muted-foreground', Icon: Activity };
};


export default function ReadingList({ readings }: ReadingListProps) {
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
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <History className="h-7 w-7 text-primary" />
          Readings History
        </CardTitle>
        <CardDescription>A log of your past blood pressure measurements.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date & Time</TableHead>
              <TableHead>Systolic (mmHg)</TableHead>
              <TableHead>Diastolic (mmHg)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden md:table-cell">Age</TableHead>
              <TableHead className="hidden md:table-cell">Weight (lbs)</TableHead>
              <TableHead className="hidden lg:table-cell">Medications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((reading) => {
              const { category, colorClass, Icon } = getBpCategory(reading.systolic, reading.diastolic);
              return (
                <TableRow key={reading.id}>
                  <TableCell>
                    <div>{format(new Date(reading.timestamp), 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(reading.timestamp), 'p')}</div>
                  </TableCell>
                  <TableCell className="font-medium">{reading.systolic}</TableCell>
                  <TableCell className="font-medium">{reading.diastolic}</TableCell>
                  <TableCell className={`${colorClass} font-medium flex items-center gap-1`}>
                    <Icon className="h-4 w-4"/> {category}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{reading.age}</TableCell>
                  <TableCell className="hidden md:table-cell">{reading.weight}</TableCell>
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
    </Card>
  );
}
