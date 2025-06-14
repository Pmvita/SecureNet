import React, { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { BaseChart, secureNetTheme, securityColorSchemes } from './BaseChart';

interface DeviceData {
  id: string;
  label: string;
  value: number;
  status: 'online' | 'offline' | 'warning' | 'critical';
}

interface DeviceDistributionPieProps {
  data?: DeviceData[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
  hideTitle?: boolean;
}

// Mock data for demonstration
const mockDeviceData: DeviceData[] = [
  { id: 'workstations', label: 'Workstations', value: 45, status: 'online' },
  { id: 'servers', label: 'Servers', value: 12, status: 'warning' },
  { id: 'routers', label: 'Routers', value: 8, status: 'online' },
  { id: 'switches', label: 'Switches', value: 15, status: 'online' },
  { id: 'firewalls', label: 'Firewalls', value: 3, status: 'critical' },
  { id: 'printers', label: 'Printers', value: 18, status: 'offline' },
  { id: 'iot', label: 'IoT Devices', value: 23, status: 'warning' },
];

export const DeviceDistributionPie: React.FC<DeviceDistributionPieProps> = ({
  data = mockDeviceData,
  height = 400,
  className = '',
  loading = false,
  error,
  hideTitle = false
}) => {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: securityColorSchemes.categorical[index % securityColorSchemes.categorical.length]
    }));
  }, [data]);

  // If hideTitle is true, render the chart directly without BaseChart wrapper
  if (hideTitle) {
    if (loading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="text-red-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ height }}>
        <ResponsivePie
          data={chartData}
          theme={secureNetTheme}
          margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.2]]
          }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#d1d5db"
          arcLabelsRadiusOffset={0.4}
          arcLabelsSkipAngle={7}
          arcLabelsTextColor={{
            from: 'color',
            modifiers: [['darker', 2]]
          }}
          defs={[
            {
              id: 'dots',
              type: 'patternDots',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              size: 4,
              padding: 1,
              stagger: true
            },
            {
              id: 'lines',
              type: 'patternLines',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              rotation: -45,
              lineWidth: 2,
              spacing: 10
            }
          ]}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 56,
              itemsSpacing: 0,
              itemWidth: 100,
              itemHeight: 18,
              itemTextColor: '#9ca3af',
              itemDirection: 'left-to-right',
              itemOpacity: 1,
              symbolSize: 18,
              symbolShape: 'circle',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: '#e5e7eb'
                  }
                }
              ]
            }
          ]}
          tooltip={({ datum }) => (
            <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: datum.color }}
                />
                <span className="font-medium text-white">{datum.label}</span>
              </div>
              <div className="text-sm text-gray-300">
                Count: <span className="font-medium text-white">{datum.value}</span>
              </div>
              <div className="text-sm text-gray-300">
                Percentage: <span className="font-medium text-white">{datum.formattedValue}</span>
              </div>
              <div className={`text-xs mt-1 font-medium capitalize ${
                datum.data.status === 'online' ? 'text-green-400' :
                datum.data.status === 'warning' ? 'text-yellow-400' :
                datum.data.status === 'critical' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                Status: {datum.data.status}
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <BaseChart
      title={hideTitle ? undefined : "Device Distribution"}
      subtitle={hideTitle ? undefined : "Network device breakdown by type and status"}
      height={height}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsivePie
        data={chartData}
        theme={secureNetTheme}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]]
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#d1d5db"
        arcLabelColors={{
          from: 'color',
          modifiers: [['darker', 2]]
        }}
        arcLabelsRadiusOffset={0.4}
        arcLabelsSkipAngle={7}
        arcLabelsTextColor={{
          from: 'color',
          modifiers: [['darker', 2]]
        }}
        defs={[
          {
            id: 'dots',
            type: 'patternDots',
            background: 'inherit',
            color: 'rgba(255, 255, 255, 0.3)',
            size: 4,
            padding: 1,
            stagger: true
          },
          {
            id: 'lines',
            type: 'patternLines',
            background: 'inherit',
            color: 'rgba(255, 255, 255, 0.3)',
            rotation: -45,
            lineWidth: 2,
            spacing: 10
          }
        ]}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#9ca3af',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: 'circle',
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#e5e7eb'
                }
              }
            ]
          }
        ]}
        tooltip={({ datum }) => (
          <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: datum.color }}
              />
              <span className="font-medium text-white">{datum.label}</span>
            </div>
            <div className="text-sm text-gray-300">
              Count: <span className="font-medium text-white">{datum.value}</span>
            </div>
            <div className="text-sm text-gray-300">
              Percentage: <span className="font-medium text-white">{datum.formattedValue}</span>
            </div>
            <div className={`text-xs mt-1 font-medium capitalize ${
              datum.data.status === 'online' ? 'text-green-400' :
              datum.data.status === 'warning' ? 'text-yellow-400' :
              datum.data.status === 'critical' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              Status: {datum.data.status}
            </div>
          </div>
        )}
      />
    </BaseChart>
  );
};

export default DeviceDistributionPie; 