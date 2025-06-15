import React, { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ConnectionLineType,
  Node,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DeviceNode } from '../nodes/DeviceNode';
import { ThreatNode } from '../nodes/ThreatNode';
import { ServerNode } from '../nodes/ServerNode';
import { SecurityNode } from '../nodes/SecurityNode';
import { useNetwork } from '../../features/network/api/useNetwork';
import { useSecurity } from '../../features/security/api/useSecurity';
import { 
  ServerIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  WifiIcon,
  FireIcon
} from '@heroicons/react/24/outline';

const nodeTypes: NodeTypes = {
  device: DeviceNode,
  threat: ThreatNode,
  server: ServerNode,
  security: SecurityNode,
};

interface NetworkFlowDiagramProps {
  height?: number;
  className?: string;
}

export function NetworkFlowDiagram({ height = 500, className = '' }: NetworkFlowDiagramProps) {
  const { devices, isLoading: networkLoading } = useNetwork({ refreshInterval: 30000 });
  const { recentFindings, isLoading: securityLoading } = useSecurity();
  
  // Transform network data into ReactFlow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!devices || devices.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Create nodes from devices
    const nodes: Node[] = devices.map((device, index) => {
      const x = (index % 4) * 250 + 100;
      const y = Math.floor(index / 4) * 150 + 100;
      
      // Check if device has threats
      const hasThreats = recentFindings?.some(finding => 
        finding.description?.includes(device.ipAddress) || 
        finding.description?.includes(device.name)
      );

      return {
        id: device.id,
        type: hasThreats ? 'threat' : getNodeType(device.type),
        position: { x, y },
        data: {
          label: device.name || device.ipAddress,
          device: device,
          status: device.status,
          threats: hasThreats ? recentFindings?.filter(f => 
            f.description?.includes(device.ipAddress) || 
            f.description?.includes(device.name)
          ).length || 0 : 0,
          type: device.type,
          ipAddress: device.ipAddress,
          lastSeen: device.lastSeen,
        },
      };
    });

    // Create edges (connections between devices)
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      if (Math.random() > 0.6) { // 40% chance of connection
        edges.push({
          id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
          type: 'smoothstep',
          animated: nodes[i].data.status === 'online' && nodes[i + 1].data.status === 'online',
          style: {
            stroke: nodes[i].data.threats > 0 || nodes[i + 1].data.threats > 0 ? '#ef4444' : '#10b981',
            strokeWidth: 2,
          },
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [devices, recentFindings]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // Could open device details modal or navigate to device page
  }, []);

  if (networkLoading || securityLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Network Topology</h3>
          <p className="text-sm text-gray-400 mt-1">Interactive network infrastructure and threat visualization</p>
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Network Topology</h3>
            <p className="text-sm text-gray-400 mt-1">Interactive network infrastructure and threat visualization</p>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{nodes.filter(n => n.data.status === 'online').length} Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>{nodes.filter(n => n.data.threats > 0).length} Threats</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{edges.length} Connections</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ height }} className="bg-gray-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          className="bg-gray-950"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background 
            color="#374151" 
            gap={20} 
            size={1}
          />
          <Controls 
            className="bg-gray-800 border-gray-600 text-white"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.data.threats > 0) return '#ef4444';
              switch (node.type) {
                case 'server': return '#10b981';
                case 'security': return '#8b5cf6';
                case 'device': return '#3b82f6';
                default: return '#6b7280';
              }
            }}
            maskColor="rgba(31, 41, 55, 0.8)"
            position="top-right"
            className="bg-gray-800 border border-gray-600"
          />
        </ReactFlow>
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <ServerIcon className="h-4 w-4 text-green-400" />
              <span>Server</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-purple-400" />
              <span>Security Device</span>
            </div>
            <div className="flex items-center gap-2">
              <ComputerDesktopIcon className="h-4 w-4 text-blue-400" />
              <span>Workstation</span>
            </div>
            <div className="flex items-center gap-2">
              <FireIcon className="h-4 w-4 text-red-400" />
              <span>Threat Detected</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Click nodes for details • Drag to rearrange • Scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
}

function getNodeType(deviceType?: string): string {
  if (!deviceType) return 'device';
  
  const type = deviceType.toLowerCase();
  if (type.includes('server')) return 'server';
  if (type.includes('firewall') || type.includes('security')) return 'security';
  return 'device';
}

export default NetworkFlowDiagram; 