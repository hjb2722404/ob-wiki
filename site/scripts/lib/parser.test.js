import { describe, it, expect } from 'vitest'
import { parseMarkdownFile, extractWikiLinks } from './parser.js'

describe('extractWikiLinks', () => {
  it('extracts [[path]] links', () => {
    const text = '参考 [[concepts/辩证法]] 和 [[entities/黑格尔]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法' },
      { path: 'entities/黑格尔', display: '黑格尔' }
    ])
  })

  it('extracts [[path|display]] links', () => {
    const text = '见 [[concepts/辩证法|辩证法方法论]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法方法论' }
    ])
  })

  it('extracts [[sources/...|display]] links', () => {
    const text = '[[sources/精神现象学句读自我如何成为一个实体|精神现象学句读]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'sources/精神现象学句读自我如何成为一个实体', display: '精神现象学句读' }
    ])
  })

  it('returns empty array for no links', () => {
    expect(extractWikiLinks('no links here')).toEqual([])
  })
})

describe('parseMarkdownFile', () => {
  it('parses frontmatter and body', () => {
    const content = `---
type: entity
tags:
  - person
aliases:
  - Hegel
---
## Basic Information
Some text with [[concepts/辩证法]].`
    const result = parseMarkdownFile(content)
    expect(result.frontmatter.type).toBe('entity')
    expect(result.frontmatter.tags).toEqual(['person'])
    expect(result.links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法' }
    ])
  })

  it('extracts summary from first paragraph', () => {
    const content = `---
type: concept
---
## Title
This is the first paragraph with some content.`
    const result = parseMarkdownFile(content)
    expect(result.summary).toBe('This is the first paragraph with some content.')
  })

  it('strips wiki-link syntax from summary', () => {
    const content = `---
type: concept
---
Some text about [[concepts/逻辑|logic]] here.`
    const result = parseMarkdownFile(content)
    expect(result.summary).toContain('logic')
    expect(result.summary).not.toContain('[[')
  })
})
