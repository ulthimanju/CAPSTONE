import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserHtml from 'prettier/plugins/html';
import parserPostcss from 'prettier/plugins/postcss';
import parserMarkdown from 'prettier/plugins/markdown';
import parserTypescript from 'prettier/plugins/typescript';
import jsBeautify from 'js-beautify';

/**
 * Custom Indentation & Syntax Formatter for C/C++/Java/C# (ClangFormat / Pretty Diff style)
 */
function formatClangStyle(code, indentSize = 4) {
  if (!code) return code;
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      formattedLines.push('');
      continue;
    }

    if (line.startsWith('}') || line.startsWith(');')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = ' '.repeat(indentLevel * indentSize);

    line = line
      .replace(/\s*\{\s*/g, ' {')
      .replace(/\s*;\s*/g, '; ')
      .replace(/\s+;/g, ';')
      .replace(/\s+/g, ' ')
      .trim();

    formattedLines.push(indent + line);

    if (line.endsWith('{') || (line.includes('{') && !line.includes('}'))) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n').trim();
}

/**
 * Custom Formatter for Python (Black / PEP 8 style)
 */
function formatPythonBlackStyle(code) {
  if (!code) return code;
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      formattedLines.push('');
      continue;
    }

    if (
      line.startsWith('elif ') ||
      line.startsWith('else:') ||
      line.startsWith('except ') ||
      line.startsWith('finally:') ||
      line.startsWith(']') ||
      line.startsWith('}') ||
      line.startsWith(')')
    ) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = '    '.repeat(indentLevel);

    line = line
      .replace(/\s*=\s*/g, ' = ')
      .replace(/\s*==\s*/g, ' == ')
      .replace(/\s*\+=\s*/g, ' += ')
      .replace(/\s*:=\s*/g, ' := ')
      .replace(/\s+,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    formattedLines.push(indent + line);

    if (line.endsWith(':') || line.endsWith('(') || line.endsWith('[') || line.endsWith('{')) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n').trim();
}

/**
 * Custom Formatter for Go (gofmt style)
 */
function formatGofmtStyle(code) {
  if (!code) return code;
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      formattedLines.push('');
      continue;
    }

    if (line.startsWith('}') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = '\t'.repeat(indentLevel);

    line = line
      .replace(/\s*:=\s*/g, ' := ')
      .replace(/\s*=\s*/g, ' = ')
      .replace(/\s+,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    formattedLines.push(indent + line);

    if (line.endsWith('{') || line.endsWith('(')) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n').trim();
}

/**
 * Custom Formatter for PHP (PHP-CS-Fixer / PSR-12 style)
 */
function formatPHPCSFixerStyle(code) {
  if (!code) return code;
  let cleaned = code.trim();
  return formatClangStyle(cleaned, 4);
}

/**
 * Custom Formatter for Haskell (Brittany style)
 */
function formatHaskellBrittanyStyle(code) {
  if (!code) return code;
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      formattedLines.push('');
      continue;
    }

    if (line.startsWith('in ') || line.startsWith('where')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = '  '.repeat(indentLevel);

    line = line
      .replace(/\s*::\s*/g, ' :: ')
      .replace(/\s*->\s*/g, ' -> ')
      .replace(/\s*=>\s*/g, ' => ')
      .replace(/\s*=\s*/g, ' = ')
      .replace(/\s+/g, ' ')
      .trim();

    formattedLines.push(indent + line);

    if (line.endsWith('do') || line.endsWith('=') || line.endsWith('where') || line.endsWith('let')) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n').trim();
}

/**
 * Master Code Formatter Engine
 * Matches language to appropriate formatter according to requested configuration matrix:
 * - JavaScript: Prettier / ESLint / JS-Beautify
 * - TypeScript: Prettier
 * - JSX / TSX: Prettier
 * - Java: ClangFormat / Pretty Diff
 * - C/C++: ClangFormat
 * - C#: Pretty Diff / ClangFormat
 * - Python: Black / PEP 8
 * - Go: gofmt
 * - PHP: PHP-CS-Fixer
 * - HTML: JS-Beautify / Prettier
 * - CSS: Prettier / CSScomb / JS-Beautify
 * - JSON: Prettier / JS-Beautify
 * - Markdown: Prettier
 * - Haskell: Brittany
 */
export const formatCodeWithLanguageFormatter = async (code, lang) => {
  if (!code || !code.trim()) return code;
  const l = (lang || '').toLowerCase().trim();

  // 1. JavaScript / JSX (Prettier / ESLint / JS-Beautify)
  if (['js', 'javascript', 'node', 'jsx', 'react'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'babel',
        plugins: [parserBabel, parserEstree],
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      return jsBeautify.js(code, { indent_size: 2, space_in_empty_paren: true });
    }
  }

  // 2. TypeScript / TSX (Prettier)
  if (['ts', 'tsx', 'typescript'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'typescript',
        plugins: [parserTypescript, parserEstree],
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      return code;
    }
  }

  // 3. HTML / SVG / XML (JS-Beautify / Prettier)
  if (['html', 'htm', 'xhtml', 'svg', 'xml'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'html',
        plugins: [parserHtml],
        printWidth: 80,
        tabWidth: 2,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      return jsBeautify.html(code, { indent_size: 2, extra_liners: [] });
    }
  }

  // 4. CSS / SCSS / LESS (Prettier / CSScomb / JS-Beautify)
  if (['css', 'scss', 'less'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'css',
        plugins: [parserPostcss],
        printWidth: 80,
        tabWidth: 2,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      return jsBeautify.css(code, { indent_size: 2 });
    }
  }

  // 5. JSON (Prettier / JS-Beautify)
  if (['json', 'jsonc', 'geojson'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'json',
        plugins: [parserBabel, parserEstree],
        printWidth: 80,
        tabWidth: 2,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      try {
        return JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        return jsBeautify.js(code, { indent_size: 2 });
      }
    }
  }

  // 6. Markdown (Prettier)
  if (['markdown', 'md'].includes(l)) {
    try {
      const formatted = await prettier.format(code, {
        parser: 'markdown',
        plugins: [parserMarkdown],
        printWidth: 80,
      });
      return formatted.replace(/\n$/, '');
    } catch {
      return code;
    }
  }

  // 7. Java (ClangFormat / Pretty Diff)
  if (['java'].includes(l)) {
    try {
      return formatClangStyle(code, 4);
    } catch {
      return jsBeautify.js(code, { indent_size: 4 });
    }
  }

  // 8. C / C++ (ClangFormat)
  if (['c', 'cpp', 'c++', 'h', 'hpp', 'cc'].includes(l)) {
    try {
      return formatClangStyle(code, 2);
    } catch {
      return jsBeautify.js(code, { indent_size: 2 });
    }
  }

  // 9. C# (Pretty Diff / ClangFormat)
  if (['csharp', 'cs', 'c#'].includes(l)) {
    try {
      return formatClangStyle(code, 4);
    } catch {
      return jsBeautify.js(code, { indent_size: 4 });
    }
  }

  // 10. Python (Black / PEP 8)
  if (['python', 'py'].includes(l)) {
    try {
      return formatPythonBlackStyle(code);
    } catch {
      return code;
    }
  }

  // 11. Go (gofmt)
  if (['go', 'golang'].includes(l)) {
    try {
      return formatGofmtStyle(code);
    } catch {
      return code;
    }
  }

  // 12. PHP (PHP-CS-Fixer)
  if (['php'].includes(l)) {
    try {
      return formatPHPCSFixerStyle(code);
    } catch {
      return code;
    }
  }

  // 13. Haskell (Brittany)
  if (['haskell', 'hs'].includes(l)) {
    try {
      return formatHaskellBrittanyStyle(code);
    } catch {
      return code;
    }
  }

  // Fallback for unlisted languages
  return code;
};
