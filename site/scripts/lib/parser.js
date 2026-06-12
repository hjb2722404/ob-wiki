import matter from 'gray-matter'

/**
 * 从 markdown 文本中提取所有 [[wiki-link]]
 * 支持 [[path]] 和 [[path|display text]] 两种格式
 */
export function extractWikiLinks(text) {
  const regex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
  const links = []
  let match
  while ((match = regex.exec(text)) !== null) {
    links.push({
      path: match[1].trim(),
      display: (match[2] || match[1].split('/').pop()).trim()
    })
  }
  return links
}

/**
 * 解析单个 markdown 文件内容
 * 返回 frontmatter + 正文 + 双链列表 + 预览摘要
 */
export function parseMarkdownFile(content) {
  const { data: frontmatter, content: body } = matter(content)

  // 提取双链（从 frontmatter sources + 正文）
  const allText = [
    ...(frontmatter.sources || []),
    body
  ].join('\n')
  const links = extractWikiLinks(allText)

  // 提取预览摘要：第一段非空、非标题文本（去掉双链标记）
  const cleanBody = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, path, display) => display || path.split('/').pop())
  const lines = cleanBody.split('\n')
  let summary = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      summary = trimmed.substring(0, 120)
      break
    }
  }

  return {
    frontmatter,
    body,
    links,
    summary
  }
}
