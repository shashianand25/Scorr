const ts = require('./mobile/node_modules/typescript');
const fs = require('fs');

const code = fs.readFileSync('mobile/src/app/index.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('index.tsx', code, ts.ScriptTarget.Latest, true);

function visit(node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text.startsWith('set')) {
    let p = node.parent;
    let inRenderItem = false;
    while (p) {
      if (ts.isJsxAttribute(p) && p.name && (p.name.text === 'renderItem' || p.name.text === 'ListEmptyComponent' || p.name.text === 'ListHeaderComponent')) {
        inRenderItem = true;
        break;
      }
      p = p.parent;
    }
    if (inRenderItem) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      console.log(`Setter called in FlatList component at line ${line + 1}: ${node.expression.text}`);
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
