import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { BaseChart, secureNetTheme, securityColorSchemes } from './BaseChart';

interface ThreatData {
  date: string;
  threats: number;
  blocked: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ThreatAnalyticsChartProps {
  data?: ThreatData[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

// Mock data for demonstration
const mockThreatData: ThreatData[] = [
  { date: '2024-01-01', threats: 45, blocked: 38, critical: 2, high: 8, medium: 20, low: 15 },
  { date: '2024-01-02', threats: 52, blocked: 45, critical: 3, high: 12, medium: 22, low: 15 },
  { date: '2024-01-03', threats: 38, blocked: 32, critical: 1, high: 6, medium: 18, low: 13 },
  { date: '2024-01-04', threats: 67, blocked: 58, critical: 4, high: 15, medium: 28, low: 20 },
  { date: '2024-01-05', threats: 43, blocked: 39, critical: 2, high: 9, medium: 19, low: 13 },
  { date: '2024-01-06', threats: 58, blocked: 51, critical: 3, high: 13, medium: 24, low: 18 },
  { date: '2024-01-07', threats: 49, blocked: 42, critical: 2, high: 11, medium: 21, low: 15 },
];

export const ThreatAnalyticsChart: React.FC<ThreatAnalyticsChartProps> = ({
  data = mockThreatData,
  height = 400,
  className = '',
  loading = false,
  error
}) => {
  const chartData = useMemo(() => [
    {
      id: 'Total Threats',
      color: securityColorSchemes.categorical[0],
      data: data.map(d => ({ x: d.date, y: d.threats }))
    },
    {
      id: 'Blocked',
      color: securityColorSchemes.status[0],
      data: data.map(d => ({ x: d.date, y: d.blocked }))
    },
    {
      id: 'Critical',
      color: securityColorSchemes.severity[0],
      data: data.map(d => ({ x: d.date, y: d.critical }))
    },
    {
      id: 'High',
      color: securityColorSchemes.severity[1],
      data: data.map(d => ({ x: d.date, y: d.high }))
    }
  ], [data]);

  return (
    <BaseChart
      title="Threat Analytics"
      subtitle="Real-time threat detection and blocking trends"
      height={height}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveLine
        data={chartData}
        theme={secureNetTheme}
        margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false
        }}
        yFormat=" >-.2f"
        curve="cardinal"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Date',
          legendOffset: 45,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Threat Count',
          legendOffset: -50,
          legendPosition: 'middle'
        }}
        pointSize={6}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableArea={false}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        tooltip={({ point }) => (
          <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: point.color }}
              />
              <span className="font-medium text-white">{point.id}</span>
            </div>
            <div className="text-sm text-gray-300">
              Date: {point.data.xFormatted}
            </div>
            <div className="text-sm font-medium text-white">
              Count: {point.data.yFormatted}
            </div>
          </div>
        )}
      />
    </BaseChart>
  );
};

export default ThreatAnalyticsChart; 