import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import betweenness from 'graphology-metrics/centrality/betweenness'
import pagerank from 'graphology-metrics/centrality/pagerank'
import type { Node, Edge } from '@xyflow/react'

export interface GraphAnalysis {
  clusters: Record<string, number>
  pageRank: Record<string, number>
  betweenness: Record<string, number>
  bridges: Set<string>
  clusterCount: number
}

// 8 visually distinct cluster colors — dark-mode friendly
export const CLUSTER_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

export function getClusterColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length]
}

export function analyzeGraph(nodes: Node[], edges: Edge[]): GraphAnalysis {
  if (nodes.length === 0) {
    return { clusters: {}, pageRank: {}, betweenness: {}, bridges: new Set(), clusterCount: 0 }
  }

  const graph = new Graph({ type: 'undirected', multi: false })

  nodes.forEach(n => {
    if (!graph.hasNode(n.id)) graph.addNode(n.id)
  })

  edges.forEach(e => {
    if (graph.hasNode(e.source) && graph.hasNode(e.target) && !graph.hasEdge(e.source, e.target)) {
      graph.addEdge(e.source, e.target)
    }
  })

  let clusters: Record<string, number> = {}
  let prResult: Record<string, number> = {}
  let btResult: Record<string, number> = {}

  if (graph.order > 1 && graph.size > 0) {
    clusters = louvain(graph)
    prResult = pagerank(graph)
    btResult = betweenness(graph)
  }

  const bridges = findBridgeEdges(graph, edges)
  const clusterCount = new Set(Object.values(clusters)).size

  return { clusters, pageRank: prResult, betweenness: btResult, bridges, clusterCount }
}

function findBridgeEdges(graph: Graph, rfEdges: Edge[]): Set<string> {
  const bridgeEdgeIds = new Set<string>()
  if (graph.order < 2) return bridgeEdgeIds

  const visited = new Set<string>()
  const disc = new Map<string, number>()
  const low = new Map<string, number>()
  const bridgePairs = new Set<string>()
  let time = 0

  function dfs(u: string, parent: string | null) {
    visited.add(u)
    disc.set(u, time)
    low.set(u, time)
    time++

    for (const v of graph.neighbors(u)) {
      if (!visited.has(v)) {
        dfs(v, u)
        low.set(u, Math.min(low.get(u)!, low.get(v)!))
        if (low.get(v)! > disc.get(u)!) {
          bridgePairs.add([u, v].sort().join('|||'))
        }
      } else if (v !== parent) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!))
      }
    }
  }

  for (const node of graph.nodes()) {
    if (!visited.has(node)) dfs(node, null)
  }

  for (const edge of rfEdges) {
    const key = [edge.source, edge.target].sort().join('|||')
    if (bridgePairs.has(key)) bridgeEdgeIds.add(edge.id)
  }

  return bridgeEdgeIds
}
