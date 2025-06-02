
'use client';

import type { BloodPressureReading } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface BpChartProps {
  readings: BloodPressureReading[];
}

const chartConfig = {
  systolic: {
    label: 'Systolic (mmHg)',
    color: 'hsl(var(--chart-1))',
  },
  diastolic: {
    label: 'Diastolic (mmHg)',
    color: 'hsl(var(--chart-2))',
  },
  systolicTarget: {
      label: 'Systolic Target (Upper Normal)',
      color: 'hsla(var(--destructive), 0.5)',
  },
  diastolicTarget: {
      label: 'Diastolic Target (Upper Normal)',
      color: 'hsla(var(--destructive), 0.5)',
  }
};

export default function BpChart({ readings }: BpChartProps) {
  if (!readings || readings.length < 2) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
             <TrendingUp className="h-7 w-7 text-primary" />
            Blood Pressure Chart
          </CardTitle>
          <CardDescription>Not enough data to display a trend chart. Please add at least two readings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Add more readings to see your trends.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = readings
    .map(r => ({
      timestamp: new Date(r.timestamp), // Keep as Date object for sorting
      systolic: r.systolic,
      diastolic: r.diastolic,
      bodyPosition: r.bodyPosition,
      exerciseContext: r.exerciseContext,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Sort by date ascending
    .map(r => ({
      date: format(r.timestamp, 'MMM d, yy'), // Format for display after sorting
      time: format(r.timestamp, 'p'),
      systolic: r.systolic,
      diastolic: r.diastolic,
      bodyPosition: r.bodyPosition,
      exerciseContext: r.exerciseContext,
    }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
           <TrendingUp className="h-7 w-7 text-primary" />
          Blood Pressure Trends
        </CardTitle>
        <CardDescription>Visualizing your systolic and diastolic pressure over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: -20, // Adjust to make Y-axis labels more visible
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value, index) => {
                   // Show fewer ticks if many data points
                   if (chartData.length > 10 && index % Math.floor(chartData.length / 10) !== 0 && index !== chartData.length -1 && index !== 0) {
                       return '';
                   }
                   return value;
                }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    nameKey="name"
                    labelKey="date"
                    formatter={(value, name, props) => {
                        if (name === 'systolic' || name === 'diastolic') {
                            return `${value} mmHg`;
                        }
                        return value;
                    }}
                    // @ts-ignore payload can be an array
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0 && payload[0].payload) {
                        const p = payload[0].payload;
                        return `${label} - ${p.time} (Pos: ${p.bodyPosition}, Ex: ${p.exerciseContext})`;
                      }
                      return label;
                    }}
                  />
                }
              />
              <Line
                dataKey="systolic"
                type="monotone"
                stroke="var(--color-systolic)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-systolic)",
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
              />
              <Line
                dataKey="diastolic"
                type="monotone"
                stroke="var(--color-diastolic)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-diastolic)",
                  r: 3
                }}
                activeDot={{
                  r: 5,
                }}
              />
              <ReferenceLine y={120} stroke="var(--color-systolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain">
                 {/* <Label value="Systolic Target (120)" position="insideTopRight" fill="var(--color-systolicTarget)" fontSize={10}/> */}
              </ReferenceLine>
              <ReferenceLine y={80} stroke="var(--color-diastolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain">
                 {/* <Label value="Diastolic Target (80)" position="insideTopRight" fill="var(--color-diastolicTarget)" fontSize={10} /> */}
              </ReferenceLine>
               <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
