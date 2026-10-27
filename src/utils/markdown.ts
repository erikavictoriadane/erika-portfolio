export function resolveUrl(url?: string | null): string {
  if (!url) return '';
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/') && !url.startsWith(`${baseUrl}/`)) {
    return `${baseUrl}${url}`;
  }
  return url;
}

export function renderFormattedBody(markdown: string = ''): string {
  if (!markdown) return '';

  // Markdown Tables (| Header | ... \n |---|... \n | Row | ...)
  const tableRegex = /((?:^[ \t]*\|.+\|[ \t]*(?:\r?\n|$))+)/gm;
  const formatted = markdown.replace(tableRegex, (match) => {
    const lines = match.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;
    const isSeparator = /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1]);
    if (!isSeparator) return match;

    const parseRow = (line: string) => {
      const cells = line.split('|').map((c) => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    };

    const headerCells = parseRow(lines[0]);
    const headerHtml = `<thead><tr class="bg-[#f5f4f0] border-b border-[#dddedc] text-[#67645e] font-mono text-[11px] uppercase tracking-wider">${headerCells.map((c) => `<th class="py-2.5 px-3.5 font-bold text-left">${c}</th>`).join('')}</tr></thead>`;

    const bodyRows = lines.slice(2).map((rowLine) => {
      const cells = parseRow(rowLine);
      const rowCellsHtml = cells.map((c, i) => {
        const isFirst = i === 0;
        return `<td class="py-2.5 px-3.5 text-[#525252] text-xs ${isFirst ? 'font-semibold text-[#67645e]' : ''}">${c}</td>`;
      }).join('');
      return `<tr class="border-b border-[#dddedc]/60 last:border-b-0 hover:bg-[#faf8f5] transition-colors">${rowCellsHtml}</tr>`;
    }).join('');

    return `<div class="my-5 overflow-x-auto rounded-xl border border-[#dddedc] bg-white shadow-sm not-prose">
      <table class="w-full text-left border-collapse">
        ${headerHtml}
        <tbody class="divide-y divide-[#dddedc]/60">
          ${bodyRows}
        </tbody>
      </table>
    </div>`;
  });

  return formatted
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-4 border-[#dddedc]" />')
    // Markdown Images: ![alt](url)
    .replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
      const resolvedSrc = resolveUrl(src);
      const captionHtml = alt
        ? `<figcaption class="w-full py-2 px-4 text-center text-[11px] font-medium text-[#84827e] bg-white border-t border-[#dddedc] flex items-center justify-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#84827e] inline-block"></span>${alt}</figcaption>`
        : '';
      return `<figure class="my-4 rounded-xl overflow-hidden border border-[#dddedc] bg-white shadow-sm flex flex-col items-center">
        <img src="${resolvedSrc}" alt="${alt || 'Artifact collateral visual'}" class="max-w-full h-auto max-h-[580px] object-contain mx-auto block" loading="lazy" />
        ${captionHtml}
      </figure>`;
    })
    // Markdown Links: [text](url)
    .replace(/(?<!\!)\[(.*?)\]\((.*?)\)/g, (_match, text, href) => `<a href="${resolveUrl(href)}" target="_blank" rel="noopener noreferrer" class="text-[#67645e] underline underline-offset-2 font-bold hover:text-[#525252] transition-colors">${text}</a>`)
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="my-3 pl-4 border-l-2 border-[#67645e] text-[#525252] italic text-sm bg-white/70 py-2.5 px-4 rounded-r-lg">$1</blockquote>')
    // Headings (Rhode architectural sans)
    .replace(/^#### (.*$)/gim, '<h5 class="text-xs font-bold uppercase tracking-wider text-[#84827e] mt-4 mb-1.5">$1</h5>')
    .replace(/^### (.*$)/gim, '<h4 class="text-base sm:text-lg font-bold text-[#67645e] mt-5 first:mt-1 mb-2 tracking-tight">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-lg sm:text-xl font-bold text-[#67645e] mt-6 first:mt-1 mb-2 border-b border-[#dddedc] pb-1.5 tracking-tight">$1</h3>')
    // Typography
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#67645e]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-[#525252]">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white text-[#67645e] font-mono text-xs border border-[#dddedc]">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-[#525252] mb-1.5 leading-relaxed marker:text-[#84827e] font-normal">$1</li>')
    .replace(/^\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-[#525252] mb-1.5 leading-relaxed marker:text-[#84827e] font-normal">$1</li>')
    .replace(/\n\n/g, '<div class="h-2"></div>');
}
