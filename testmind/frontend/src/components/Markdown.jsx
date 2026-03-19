/**
 * Lightweight Markdown renderer — no external deps.
 * Supports: **bold**, *italic*, `code`, ### headings, - bullet lists, 1. numbered lists, line breaks.
 */

function parseLine(text) {
  if (!text) return text;
  const parts = [];
  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export default function Markdown({ children, className = "" }) {
  if (!children || typeof children !== "string") return null;

  const lines = children.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-1">{parseLine(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-bold text-gray-900 mt-3 mb-1">{parseLine(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold text-gray-900 mt-3 mb-1">{parseLine(line.slice(2))}</h1>);
      i++; continue;
    }

    // Bullet list — gather consecutive lines
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i} className="ml-4 list-disc text-gray-800">{parseLine(lines[i].replace(/^[-*]\s/, ""))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="my-1 space-y-0.5">{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} className="ml-4 list-decimal text-gray-800">{parseLine(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="my-1 space-y-0.5">{items}</ol>);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++; continue;
    }

    // Regular paragraph
    elements.push(<p key={i} className="my-1 text-gray-800">{parseLine(line)}</p>);
    i++;
  }

  return <div className={className}>{elements}</div>;
}
