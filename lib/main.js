const {Point, Range} = require("atom");

module.exports = {
  activate () {
    if (!atom.packages.isPackageLoaded("atom-folding")) {
      require("atom-package-deps").install("folding-markdown");
    }
  },

  provideFolding () {
    return {
      scope: ["source.gfm", "text.md"],
      allowDefaultFolds: true,
      isFoldableAtRow: isFoldableAtRow,
      getFoldableRangeContainingPoint: getFoldableRangeContainingPoint,
      getFoldableRangesAtIndentLevel: getFoldableRangesAtHeaderLevel // indent is poor wording in hindsight
    };
  }
};

const HEADING_POSITIONS = /^[ \t]*#/;

function isFoldableAtRow ({row, editor}) {
  const line = editor.lineTextForBufferRow(row);
  const match = HEADING_POSITIONS.exec(line);
  if (match === null) return false;

  const scopes = editor.scopeDescriptorForBufferPosition([row, match[0].length - 1]).getScopesArray();
  return scopes.some(s => /(?:markup\.)?heading/.test(s));
}

function getHeaderLevelFromScopes (scopes) {
  for (let i = scopes.length; i > 0; i--) { // root scope is always in 0th index; no need to check
    const headerMatch = /heading\-(\d+)/.exec(scopes[i]); // TODO: Inspect the tokens directly
    if (headerMatch) {
      return parseInt(headerMatch[1], 10);
    };
  }
  return undefined;
}

function getFoldableRangeContainingPoint ({point, editor}) { // point is [row, Infinity]
  const startScopes = editor.scopeDescriptorForBufferPosition(point).getScopesArray(); // gfm and lang-markdown both match at least to the end of the line
  const headerLevel = getHeaderLevelFromScopes(startScopes);
  if (headerLevel === undefined) return undefined;

  const endRow = editor.getLastBufferRow();

  return getFoldableRangeForLevelAndPoint(editor, point, headerLevel, endRow);
}

function getFoldableRangeForLevelAndPoint (editor, startPoint, level, endRow) {
  let sectionEndRow = endRow;

  for (let i = startPoint.row + 1; i <= endRow; i++) {
    const scopes = editor.scopeDescriptorForBufferPosition([i, 0]).getScopesArray();
    const headerLevel = getHeaderLevelFromScopes(scopes);
    if (headerLevel !== undefined && headerLevel <= level) {
      sectionEndRow = i - 1;
      break;
    }
  }

  const sectionRange = new Range(startPoint, [sectionEndRow, Infinity]);

  if (!atom.config.get("folding-markdown.foldTrailingSectionWhitespace")) {
    translateEndRowToLastNonWhitespaceLine(sectionRange, editor);
  }

  return sectionRange.start.row >= sectionRange.end.row ? undefined : sectionRange;
}

function getFoldableRangesAtHeaderLevel ({level, editor}) {
  level = level + 1; // Levels are 1-indexed, but the provided param is 0-indexed
  const folds = [];
  const endRow = editor.getLastBufferRow();

  for (let i = 0; i < endRow; i++) {
    const scopes = editor.scopeDescriptorForBufferPosition([i, 0]).getScopesArray();
    const headerLevel = getHeaderLevelFromScopes(scopes);
    if (headerLevel === level) {
      const foldRange = getFoldableRangeForLevelAndPoint(editor, new Point(i, Infinity), headerLevel, endRow);
      folds.push(foldRange);
      i = foldRange.end.row;
    }
  }

  return folds;
}

function translateEndRowToLastNonWhitespaceLine (range, editor) {
  for (let i = range.end.row; i > range.start.row; i--) {
    const line = editor.lineTextForBufferRow(i);
    if (/\S/.test(line)) {
      range.end.row = i;
      return;
    };
  }

  range.end = range.start; // makes it invalid as a fold
}
