
'use client';

import type { BloodPressureReading, BodyPosition, ExerciseContext } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Label } from 'recharts';
import { TrendingUp, HeartPulseIcon } from 'lucide-react';

interface BpChartProps {
  readings: BloodPressureReading[];
  bodyPositionFilter?: BodyPosition | 'All';
  exerciseContextFilter?: ExerciseContext | 'All';
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

export default function BpChart({ readings, bodyPositionFilter = 'All', exerciseContextFilter = 'All' }: BpChartProps) {
  
  let filteredReadings = readings;

  if (bodyPositionFilter && bodyPositionFilter !== 'All') {
    filteredReadings = filteredReadings.filter(r => r.bodyPosition === bodyPositionFilter);
  }
  if (exerciseContextFilter && exerciseContextFilter !== 'All') {
    filteredReadings = filteredReadings.filter(r => r.exerciseContext === exerciseContextFilter);
  }

  const chartData = filteredReadings
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

  let descriptionText = "Visualizing your systolic, diastolic pressure, and pulse over time.";
  if (bodyPositionFilter !== 'All' || exerciseContextFilter !== 'All') {
    const filtersApplied = [];
    if (bodyPositionFilter !== 'All') filtersApplied.push(`Position: ${bodyPositionFilter}`);
    if (exerciseContextFilter !== 'All') filtersApplied.push(`Context: ${exerciseContextFilter}`);
    descriptionText = `Trends (${filtersApplied.join(', ')}).`;
  }
  
  if (!filteredReadings || filteredReadings.length === 0) {
    return (
        <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground p-4 text-center">
            <p>No readings match the selected filters. <br/>Try adjusting filters or add more readings.</p>
        </div>
    );
  }
  
  if (chartData.length < 2) {
     return (
        <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground p-4 text-center">
            <p>Not enough data to display a trend for the selected filters. Please add at least two matching readings.</p>
        </div>
    );
  }


  return (
    // Card component is now managed by HomePage for filter integration
    // No top-level Card here, it's rendered directly by HomePage's CardContent
    <>
      {/* CardDescription is updated via prop or context in HomePage */}
      <ChartContainer config={chartConfig} className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 20,
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
                  nameKey="name"
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
              connectNulls 
            />
            <ReferenceLine yAxisId="bp" y={120} stroke="var(--color-systolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
            <ReferenceLine yAxisId="bp" y={80} stroke="var(--color-diastolicTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
            <ReferenceLine yAxisId="pulse" y={100} stroke="var(--color-pulseUpperTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
            <ReferenceLine yAxisId="pulse" y={60} stroke="var(--color-pulseLowerTarget)" strokeDasharray="3 3" ifOverflow="extendDomain" />
             <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </>
  );
}

