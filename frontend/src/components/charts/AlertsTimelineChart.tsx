import React, { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { BaseChart, secureNetTheme, securityColorSchemes } from './BaseChart';

interface AlertData {
  time: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
}

interface AlertsTimelineChartProps {
  data?: AlertData[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

// Mock data for demonstration
const mockAlertData: AlertData[] = [
  { time: '00:00', critical: 2, high: 5, medium: 8, low: 12, resolved: 15 },
  { time: '04:00', critical: 1, high: 3, medium: 6, low: 10, resolved: 18 },
  { time: '08:00', critical: 4, high: 8, medium: 12, low: 15, resolved: 22 },
  { time: '12:00', critical: 3, high: 6, medium: 10, low: 14, resolved: 25 },
  { time: '16:00', critical: 5, high: 10, medium: 15, low: 18, resolved: 20 },
  { time: '20:00', critical: 2, high: 4, medium: 7, low: 11, resolved: 23 },
];

export const AlertsTimelineChart: React.FC<AlertsTimelineChartProps> = ({
  data = mockAlertData,
  height = 400,
  className = '',
  loading = false,
  error
}) => {
  const keys = ['critical', 'high', 'medium', 'low', 'resolved'];
  
  const colors = {
    critical: securityColorSchemes.severity[0],
    high: securityColorSchemes.severity[1],
    medium: securityColorSchemes.severity[2],
    low: securityColorSchemes.severity[3],
    resolved: securityColorSchemes.status[0]
  };

  return (
    <BaseChart
      title="Security Alerts Timeline"
      subtitle="Real-time security incident tracking and resolution status"
      height={height}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy="time"
        theme={secureNetTheme}
        margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={(bar) => colors[bar.id as keyof typeof colors]}
        defs={[
          {
            id: 'dots',
            type: 'patternDots',
            background: 'inherit',
            color: '#38bcb2',
            size: 4,
            padding: 1,
            stagger: true
          },
          {
            id: 'lines',
            type: 'patternLines',
            background: 'inherit',
            color: '#eed312',
            rotation: -45,
            lineWidth: 2,
            spacing: 10
          }
        ]}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 1.6]]
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Time',
          legendPosition: 'middle',
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Alert Count',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1.6]]
        }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        role="application"
        ariaLabel="Security alerts timeline chart"
        barAriaLabel={(e) => `${e.id}: ${e.formattedValue} alerts at ${e.indexValue}`}
      />
    </BaseChart>
  );
};

export default AlertsTimelineChart; 