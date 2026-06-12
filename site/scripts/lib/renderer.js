import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true
})

/**
 * 渲染 markdown 为 HTML，将 [[wiki-link]] 转为 <a> 标签
 */
export function renderToHtml(body) {
  const converted = body.replace(
    /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
    (match, path, display) => {
      const text = display || path.split('/').pop()
      const nodeId = path.split('/').pop()
      return `<a href="#/page/${encodeURIComponent(nodeId)}" class="wiki-link" data-target="${nodeId}">${text}</a>`
    }
  )
  return md.render(converted)
}
