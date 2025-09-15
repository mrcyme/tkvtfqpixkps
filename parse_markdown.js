'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Convert a small subset of Markdown to HTML while preserving embedded HTML blocks.
 * Specifically converts level-2 and level-3 headings and wraps plain text lines in <p>.
 * Lines beginning with '<' or '</' are treated as raw HTML and passed through.
 */
function convertMarkdownToHtml(markdownText) {
	const lines = markdownText.split(/\r?\n/);
	const htmlLines = [];

	for (const rawLine of lines) {
		const line = rawLine; // preserve as-is; no trimming to avoid altering embedded HTML

		if (/^\s*###\s+/.test(line)) {
			const content = line.replace(/^\s*###\s+/, '');
			htmlLines.push(`<h3>${renderInlineMarkdown(content)}</h3>`);
			continue;
		}

		if (/^\s*##\s+/.test(line)) {
			const content = line.replace(/^\s*##\s+/, '');
			htmlLines.push(`<h2>${renderInlineMarkdown(content)}</h2>`);
			continue;
		}

		if (line.trim().length === 0) {
			htmlLines.push('');
			continue;
		}

		if (/^\s*<\/?[a-zA-Z]/.test(line)) {
			// Likely part of an HTML block (table, img, video, etc.)
			htmlLines.push(line);
			continue;
		}

		// Fallback: wrap plain text in a paragraph
		htmlLines.push(`<p>${renderInlineMarkdown(line)}</p>`);
	}

	return htmlLines.join('\n');
}

/**
 * Escape inline HTML special characters for text nodes.
 * Does not alter already-embedded HTML blocks passed through.
 */
function escapeHtmlInline(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Render basic inline markdown: bold (**text** or __text__) and italics (*text* or _text_).
 * Escapes HTML first, then applies inline formatting.
 */
function renderInlineMarkdown(text) {
	const escaped = escapeHtmlInline(text);
	// Bold first to avoid conflicting with italic markers inside
	let rendered = escaped.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
	// Italic (single * or _), avoid matching inside <strong> tags by not crossing angle brackets
	rendered = rendered.replace(/(^|[^*_])([*_])([^*_]+?)\2(?![^<]*>)/g, (m, pre, _delim, inner) => `${pre}<em>${inner}</em>`);
	return rendered;
}

/**
 * Build a minimal HTML document skeleton with styles for media tables.
 */
function wrapInHtmlDocument(bodyHtml, titleText = 'Media Gallery') {
	const doc = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${titleText}</title>
	<style>
		:root { color-scheme: light dark; }
		body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; }
		h2 { margin: 24px 0 12px; }
		h3 { margin: 20px 0 10px; }
		table { width: 100%; border-collapse: collapse; margin: 8px 0 24px; }
		td { vertical-align: top; padding: 8px; }
		img, video { max-width: 100%; height: auto; border-radius: 6px; background: #0001; }
		/* Make videos clickable area a bit nicer */
		video { outline: none; }
	</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
	return doc;
}

/**
 * Extract a document title from the first <h2> occurrence, if present.
 */
function extractTitleFromHtml(html) {
	const match = html.match(/<h2>(.*?)<\/h2>/i);
	return match ? stripHtml(match[1]).trim() : 'Media Gallery';
}

function stripHtml(s) {
	return s.replace(/<[^>]*>/g, '');
}

function main() {
	const cwd = process.cwd();
	const inputArg = process.argv[2];
	const outputArg = process.argv[3];

	const defaultInput = path.resolve(cwd, 'GALLERY.md');
	const inputPath = inputArg ? path.resolve(cwd, inputArg) : defaultInput;
	const outputPath = outputArg ? path.resolve(cwd, outputArg) : path.resolve(path.dirname(inputPath), 'index.html');

	if (!fs.existsSync(inputPath)) {
		console.error(`Input markdown not found: ${inputPath}`);
		process.exit(1);
	}

	const markdown = fs.readFileSync(inputPath, 'utf8');
	const bodyHtml = convertMarkdownToHtml(markdown);
	const title = extractTitleFromHtml(bodyHtml);
	const fullHtml = wrapInHtmlDocument(bodyHtml, title);

	fs.writeFileSync(outputPath, fullHtml, 'utf8');
	console.log(`Wrote HTML: ${outputPath}`);
}

if (require.main === module) {
	main();
} 