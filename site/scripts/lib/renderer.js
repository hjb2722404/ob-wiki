import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true
})

/**
 * 渲染 markdown 为 HTML，将 [[wiki-link]] 转为 <a> 标签
 */
export function renderToHtml(body) {
  // Step 1: 将 [[wiki-link]] 转为 HTML <a> 标签
  const converted = body.replace(
    /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
    (match, path, display) => {
      const text = display || path.split('/').pop()
      const nodeId = path.split('/').pop()
      return `<a href="#/page/${encodeURIComponent(nodeId)}" class="wiki-link" data-target="${nodeId}">${text}</a>`
    }
  )

  // Step 2: markdown 渲染（html: true 保留 HTML 标签）
  return md.render(converted)
}
