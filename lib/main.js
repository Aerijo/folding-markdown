const {} = require("atom");

module.exports = {
  activate () {
    console.log("activating markdown folding");
  },

  provideFolding () {
    console.log("providing markdown folding");
    return {
      scope: ["source.gfm", "text.md"],
      isFoldableAtRow: isFoldableAtRow,
      getFoldableRangeContainingPoint: getFoldableRangeContainingPoint,
      getFoldableRangesAtIndentLevel: getFoldableRangesAtIndentLevel
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

function getFoldableRangeContainingPoint ({point, editor}) { // point is [row, Infinity]
  const scopes = editor.scopeDescriptorForBufferPosition(point).getScopesArray(); // gfm and lang-markdown both match at least to the end of the line
  let headerLevel = -1;
  for (let i = scopes.length; i > 0; i--) { // root scope is always in 0th index; no need to check
    const headerMatch = /heading\-(\d+)/.exec(scopes[i]);
    if (headerMatch) {
      console.log(headerMatch[1]);
      headerLevel = parseInt(headerMatch[1], 10);
      break;
    };
  }

  if (headerLevel < 0) return undefined;

  const endRow = editor.getLastBufferRow();

  for (let i = point.row + 1; i <= endRow; i++) {
    const scopes = editor.scopeDescriptorForBufferPosition(point).getScopesArray();
  }


}

function getFoldableRangesAtIndentLevel ({level, editor}) {
  return [];
}
