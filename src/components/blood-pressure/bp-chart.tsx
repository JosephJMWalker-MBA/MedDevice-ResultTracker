
'use client';

import type { BloodPressureReading } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Label } from 'recharts';
import { TrendingUp, HeartPulseIcon } from 'lucide-react';

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
  pulse: {
    label: 'Pulse (bpm)',
    color: 'hsl(var(--chart-3))',
    icon: HeartPulseIcon,
  },
  systolicTarget: {
      label: 'Systolic Target (Upper Normal)',
      color: 'hsla(var(--destructive), 0.5)',
  },
  diastolicTarget: {
      label: 'Diastolic Target (Upper Normal)',
      color: 'hsla(var(--destructive), 0.5)',
  },
  pulseUpperTarget: {
      label: 'Pulse Target (Upper Normal Resting)',
      color: 'hsla(var(--chart-3), 0.3)',
  },
  pulseLowerTarget: {
      label: 'Pulse Target (Lower Normal Resting)',
      color: 'hsla(var(--chart-3), 0.3)',
  }
};

export default function BpChart({ readings }: BpChartProps) {
  if (!readings || readings.length < 2) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
             <TrendingUp className="h-7 w-7 text-primary" />
            Blood Pressure & Pulse Chart
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
      timestamp: new Date(r.timestamp), 
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      bodyPosition: r.bodyPosition,
      exerciseContext: r.exerciseContext,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) 
    .map(r => ({
      date: format(r.timestamp, 'MMM d, yy'), 
      time: format(r.timestamp, 'p'),
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      bodyPosition: r.bodyPosition,
      exerciseContext: r.exerciseContext,
    }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
           <TrendingUp className="h-7 w-7 text-primary" />
          Blood Pressure & Pulse Trends
        </CardTitle>
        <CardDescription>Visualizing your systolic, diastolic pressure, and pulse over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full"> {/* Increased height for pulse */}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 20, // Adjusted for Y-axis label
                left: -10, 
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
                   if (chartData.length > 10 && index % Math.floor(chartData.length / 10) !== 0 && index !== chartData.length -1 && index !== 0) {
                       return '';
                   }
                   return value;
                }}
              />
              <YAxis 
                yAxisId="bp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['dataMin - 10', 'dataMax + 10']}
                stroke="hsl(var(--foreground))"
              >
                <Label value="mmHg" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--foreground))' }} />
              </YAxis>
              <YAxis 
                yAxisId="pulse"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['dataMin - 10', 'dataMax + 10']}
                stroke="hsl(var(--foreground))"
              >
                 <Label value="bpm" angle={-90} position="insideRight" style={{ textAnchor: 'middle', fill: 'hsl(var(--foreground))' }} />
              </YAxis>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    nameKey="name" // This might need adjustment if recharts doesn't pick it up automatically for multiple lines
                    labelKey="date"
                    formatter={(value, name, props) => {
                        if (name === 'systolic' || name === 'diastolic') {
                            return `${value} mmHg`;
                        }
                        if (name === 'pulse') {
                            return `${value} bpm`;
                        }
                        return value;
                    }}
                    // @ts-ignore
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
                yAxisId="bp"
                dataKey="systolic"
                type="monotone"
                stroke="var(--color-systolic)"
                strokeWidth={2}
                dot={{ fill: "var(--color-systolic)", r: 3 }}
                activeDot={{ r: 5 }}
                name="Systolic"
              />
              <Line
                yAxisId="bp"
                dataKey="diastolic"
                type="monotone"
                stroke="var(--color-diastolic)"
                strokeWidth={2}
                dot={{ fill: "var(--color-diastolic)", r: 3 }}
                activeDot={{ r: 5 }}
                name="Diastolic"
              />
              <Line
                yAxisId="pulse"
                dataKey="pulse"
                type="monotone"
                stroke="var(--color-pulse)"
                strokeWidth={2}
                dot={{ fill: "var(--color-pulse)", r: 3 }}
                activeDot={{ r: 5 }}
                name="Pulse"
                connectNulls // In case some older readings don't have pulse
              />
              <ReferenceLine yAxisId="bp" y={120} stroke="var(--color-systolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
              <ReferenceLine yAxisId="bp" y={80} stroke="var(--color-diastolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
              <ReferenceLine yAxisId="pulse" y={100} stroke="var(--color-pulseUpperTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
              <ReferenceLine yAxisId="pulse" y={60} stroke="var(--color-pulseLowerTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
               <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
