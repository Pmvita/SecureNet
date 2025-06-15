import React, { useMemo } from 'react';
import { ResponsiveNetwork } from '@nivo/network';
import { BaseChart, secureNetTheme, securityColorSchemes } from './BaseChart';

interface NetworkNode {
  id: string;
  name: string;
  type: 'router' | 'switch' | 'server' | 'workstation' | 'firewall' | 'unknown';
  status: 'online' | 'offline' | 'warning' | 'critical';
  threats: number;
}

interface NetworkLink {
  source: string;
  target: string;
  bandwidth: number;
  status: 'active' | 'inactive' | 'congested';
}

interface NetworkTopologyChartProps {
  nodes?: NetworkNode[];
  links?: NetworkLink[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

// Mock data for demonstration
const mockNetworkData = {
  nodes: [
    { id: 'router-1', name: 'Main Router', type: 'router', status: 'online', threats: 0 },
    { id: 'switch-1', name: 'Core Switch', type: 'switch', status: 'online', threats: 2 },
    { id: 'switch-2', name: 'Access Switch 1', type: 'switch', status: 'warning', threats: 1 },
    { id: 'switch-3', name: 'Access Switch 2', type: 'switch', status: 'online', threats: 0 },
    { id: 'server-1', name: 'Web Server', type: 'server', status: 'online', threats: 3 },
    { id: 'server-2', name: 'Database Server', type: 'server', status: 'critical', threats: 5 },
    { id: 'firewall-1', name: 'Perimeter Firewall', type: 'firewall', status: 'online', threats: 0 },
    { id: 'ws-1', name: 'Admin Workstation', type: 'workstation', status: 'online', threats: 1 },
    { id: 'ws-2', name: 'User Workstation 1', type: 'workstation', status: 'offline', threats: 0 },
    { id: 'ws-3', name: 'User Workstation 2', type: 'workstation', status: 'online', threats: 0 },
  ] as NetworkNode[],
  links: [
    { source: 'firewall-1', target: 'router-1', bandwidth: 1000, status: 'active' },
    { source: 'router-1', target: 'switch-1', bandwidth: 1000, status: 'active' },
    { source: 'switch-1', target: 'switch-2', bandwidth: 100, status: 'congested' },
    { source: 'switch-1', target: 'switch-3', bandwidth: 100, status: 'active' },
    { source: 'switch-1', target: 'server-1', bandwidth: 1000, status: 'active' },
    { source: 'switch-1', target: 'server-2', bandwidth: 1000, status: 'active' },
    { source: 'switch-2', target: 'ws-1', bandwidth: 100, status: 'active' },
    { source: 'switch-2', target: 'ws-2', bandwidth: 100, status: 'inactive' },
    { source: 'switch-3', target: 'ws-3', bandwidth: 100, status: 'active' },
  ] as NetworkLink[]
};

export const NetworkTopologyChart: React.FC<NetworkTopologyChartProps> = ({
  nodes = mockNetworkData.nodes,
  links = mockNetworkData.links,
  height = 500,
  className = '',
  loading = false,
  error
}) => {
  const chartData = useMemo(() => {
    const getNodeColor = (node: NetworkNode) => {
      if (node.threats > 3) return securityColorSchemes.severity[0]; // Critical
      if (node.threats > 1) return securityColorSchemes.severity[1]; // High
      if (node.threats > 0) return securityColorSchemes.severity[2]; // Medium
      if (node.status === 'offline') return '#9ca3af'; // Gray
      if (node.status === 'warning') return securityColorSchemes.status[1]; // Warning
      if (node.status === 'critical') return securityColorSchemes.status[2]; // Critical
      return securityColorSchemes.status[0]; // Online/Good
    };

    const getLinkColor = (link: NetworkLink) => {
      if (link.status === 'inactive') return '#d1d5db';
      if (link.status === 'congested') return securityColorSchemes.severity[2];
      return securityColorSchemes.categorical[0];
    };

    return {
      nodes: nodes.map(node => ({
        id: node.id,
        height: node.threats > 0 ? 16 : 12,
        size: node.threats > 0 ? 20 : 16,
        color: getNodeColor(node),
        data: node
      })),
      links: links.map(link => ({
        source: link.source,
        target: link.target,
        distance: 100,
        color: getLinkColor(link),
        thickness: Math.max(1, Math.log(link.bandwidth / 10)),
        data: link
      }))
    };
  }, [nodes, links]);

  return (
    <BaseChart
      title="Network Topology"
      subtitle="Interactive network infrastructure and threat visualization"
      height={height}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveNetwork
        data={chartData}
        theme={secureNetTheme}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        linkDistance={100}
        centeringStrength={0.3}
        repulsivity={6}
        nodeSize={(n) => (n as any).size}
        activeNodeSize={(n) => 1.5 * (n as any).size}
        nodeColor={(n) => (n as any).color}
        nodeBorderWidth={1}
        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
        linkThickness={(n) => (n as any).thickness}
        linkColor={(n) => (n as any).color}
        animate={true}
        motionConfig="gentle"
      />
    </BaseChart>
  );
};

export default NetworkTopologyChart; 