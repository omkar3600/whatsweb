import { Injectable, BadRequestException } from '@nestjs/common';
import { NodeExecutorRegistry } from './registries/node-executor.registry';

@Injectable()
export class WorkflowPublishingService {
  constructor(private readonly nodeRegistry: NodeExecutorRegistry) {}

  validateGraph(graph: any) {
    if (!graph || !graph.nodes || !graph.nodes.length) {
      throw new BadRequestException('Workflow must have at least one node');
    }

    const triggerNodes = graph.nodes.filter((n: any) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      throw new BadRequestException('Workflow must have a trigger node');
    }
    if (triggerNodes.length > 1) {
      throw new BadRequestException('Workflow can only have one trigger node');
    }

    // Validate individual node configurations using their schema
    for (const node of graph.nodes) {
      const executor = this.nodeRegistry.get(node.type);
      if (!executor) {
        throw new BadRequestException(`Unknown node type: ${node.type}`);
      }
      try {
        executor.schema.validate(node.data || {});
      } catch (err: any) {
        throw new BadRequestException(`Invalid configuration in node "${node.data?.label || node.id}": ${err.message}`);
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(graph)) {
      throw new BadRequestException('Workflow contains circular dependencies (infinite loops)');
    }

    // Check for unreachable nodes
    if (this.hasUnreachableNodes(graph)) {
      throw new BadRequestException('Workflow contains unreachable nodes');
    }

    return true;
  }

  private hasCircularDependencies(graph: any): boolean {
    const adjList = new Map<string, string[]>();
    for (const node of graph.nodes) {
      adjList.set(node.id, []);
    }
    for (const edge of graph.edges || []) {
      if (adjList.has(edge.source)) {
        adjList.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        const neighbors = adjList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && dfs(neighbor)) {
            return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (dfs(node.id)) {
        return true;
      }
    }
    return false;
  }

  private hasUnreachableNodes(graph: any): boolean {
    const triggerNode = graph.nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return false; // Handled elsewhere

    const visited = new Set<string>();
    const queue = [triggerNode.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const outEdges = (graph.edges || []).filter((e: any) => e.source === currentId);
        for (const edge of outEdges) {
          queue.push(edge.target);
        }
      }
    }

    // If there are nodes that were not visited, they are unreachable
    return visited.size < graph.nodes.length;
  }
}
