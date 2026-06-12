import { describe, it, expect } from 'vitest'
import { buildClusters } from './clusterer.js'

describe('buildClusters', () => {
  it('clusters nodes by tags + link density', () => {
    const nodes = [
      { id: '黑格尔', type: 'entity', tags: ['person'], links: ['concepts/辩证法', 'concepts/绝对精神'] },
      { id: '康德', type: 'entity', tags: ['person'], links: ['concepts/辩证法'] },
      { id: '辩证法', type: 'concept', tags: ['theory'], links: ['entities/黑格尔', 'entities/康德'] },
      { id: '绝对精神', type: 'concept', tags: ['theory'], links: ['entities/黑格尔'] },
      { id: '产品定位', type: 'concept', tags: ['method'], links: ['concepts/需求分析'] },
      { id: '需求分析', type: 'concept', tags: ['method'], links: ['concepts/产品定位'] }
    ]
    const result = buildClusters(nodes)
    expect(result.clusters.length).toBeGreaterThanOrEqual(2)
    expect(result.nodes.length).toBe(nodes.length)
    result.nodes.forEach(n => {
      expect(n.cluster).toBeDefined()
    })
  })

  it('handles single-node clusters', () => {
    const nodes = [
      { id: '孤独概念', type: 'concept', tags: ['term'], links: [] }
    ]
    const result = buildClusters(nodes)
    expect(result.clusters.length).toBe(1)
    expect(result.nodes[0].cluster).toBeDefined()
  })

  it('generates cluster labels from top tags', () => {
    const nodes = [
      { id: 'a', type: 'concept', tags: ['theory'], links: ['b'] },
      { id: 'b', type: 'concept', tags: ['theory'], links: ['a'] }
    ]
    const result = buildClusters(nodes)
    expect(result.clusters[0].label).toContain('theory')
  })
})
