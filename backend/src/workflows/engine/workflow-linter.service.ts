import { Injectable } from '@nestjs/common';

export interface LintIssue {
  nodeId?: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  autoFixAvailable: boolean;
}

@Injectable()
export class WorkflowLinterService {
  lintGraph(graph: { nodes: any[]; edges: any[] }): LintIssue[] {
    const issues: LintIssue[] = [];
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    // 1. Check trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      issues.push({
        type: 'error',
        message: 'Workflow has no start trigger node.',
        autoFixAvailable: true,
      });
    }

    // 2. Check disconnected nodes
    for (const node of nodes) {
      if (node.type === 'trigger') continue;
      const hasIncoming = edges.some(e => e.target === node.id);
      if (!hasIncoming) {
        issues.push({
          nodeId: node.id,
          type: 'warning',
          message: `Node '${node.data?.label || node.id}' is disconnected and cannot be reached.`,
          autoFixAvailable: true,
        });
      }
    }

    // 3. Check dead ends (non-terminal nodes with no outgoing edges)
    const terminalTypes = ['sendMessage', 'teamHandoff'];
    for (const node of nodes) {
      if (terminalTypes.includes(node.type)) continue;
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasOutgoing) {
        issues.push({
          nodeId: node.id,
          type: 'info',
          message: `Node '${node.data?.label || node.id}' has no outgoing connection. Workflow will terminate here.`,
          autoFixAvailable: false,
        });
      }
    }

    return issues;
  }
}
