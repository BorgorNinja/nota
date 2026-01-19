// Minimal, safe markdown-ish renderer.
// Intentionally conservative: escapes HTML and supports only a subset.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMarkdown(src) {
  let text = escapeHtml(src || '');

  // Code blocks ```
  text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre><code>${code}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  text = text
    .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // Bold / italic (basic)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Unordered lists
  text = text.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
  // Wrap consecutive li blocks
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, (block) => block);
  text = text.replace(/(?:^|\n)(<li>[\s\S]*?<\/li>)(?:\n(?!(<li>))|$)/g, (m) => m);
  // Simple wrap: if there are any li elements, group them
  text = text.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraph / line breaks
  text = text
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Ensure root paragraph wrapper unless already starts with block element
  const startsWithBlock = /^\s*<(h\d|ul|pre|p)/i.test(text);
  if (!startsWithBlock) {
    text = `<p>${text}</p>`;
  }

  return text;
}
