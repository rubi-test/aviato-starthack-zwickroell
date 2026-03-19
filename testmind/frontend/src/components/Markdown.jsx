/**
 * Lightweight Markdown renderer — no external deps.
 * Supports: **bold**, *italic*, `code`, ### headings, - bullet lists,
 * 1. numbered lists, | tables |, --- horizontal rules, > blockquotes, line breaks.
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
    else if (match[4]) parts.push(<code key={match.index} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[11px] font-mono">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function isTableRow(line) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isSeparatorRow(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableRow(line) {
  return line.trim().slice(1, -1).split("|").map(cell => cell.trim());
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

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-3 border-gray-200" />);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-3 border-blue-300 pl-3 my-2 text-gray-600 italic text-sm">
          {quoteLines.map((ql, qi) => <p key={qi}>{parseLine(ql)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Table — gather consecutive | rows
    if (isTableRow(line)) {
      const tableRows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableRows.push(lines[i]);
        i++;
      }
      if (tableRows.length >= 2) {
        const headerCells = parseTableRow(tableRows[0]);
        const startRow = isSeparatorRow(tableRows[1]) ? 2 : 1;
        const bodyRows = tableRows.slice(startRow).map(parseTableRow);

        elements.push(
          <div key={`table-${i}`} className="overflow-auto my-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {headerCells.map((cell, ci) => (
                    <th key={ci} className="text-left px-3 py-1.5 text-xs font-semibold text-gray-600 border-b border-gray-200">
                      {parseLine(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-gray-700 border-b border-gray-100">
                        {parseLine(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
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
    elements.push(<p key={i} className="my-1 text-gray-800 leading-relaxed">{parseLine(line)}</p>);
    i++;
  }

  return <div className={`text-sm ${className}`}>{elements}</div>;
}
