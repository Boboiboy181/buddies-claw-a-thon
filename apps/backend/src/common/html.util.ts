/**
 * Strips HTML to plain text for feeding rich-text content (e.g. a job
 * description authored in the Tiptap editor) into LLM prompts. Block-level tags
 * become line breaks, list items get a leading bullet, and common entities are
 * decoded. Plain-text input (legacy JDs with no tags) passes through unchanged.
 */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return '';
  let text = input;

  // List items → "- " bullets before tags are stripped.
  text = text.replace(/<li[^>]*>/gi, '\n- ');

  // Block-level closes / breaks → newlines.
  text = text.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Drop all remaining tags.
  text = text.replace(/<[^>]+>/g, '');

  // Decode the handful of entities Tiptap emits.
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse the runaway whitespace the substitutions leave behind.
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}
