const ts = require('./mobile/node_modules/typescript');
const fs = require('fs');

const code = fs.readFileSync('mobile/src/components/modals/AppModals.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('AppModals.tsx', code, ts.ScriptTarget.Latest, true);

function isInsideCallback(node) {
  let curr = node.parent;
  while (curr) {
    if (ts.isArrowFunction(curr) || ts.isFunctionExpression(curr) || (ts.isFunctionDeclaration(curr) && curr.name && !['AppModals'].includes(curr.name.text))) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function visit(node) {
  if (ts.isCallExpression(node)) {
    if (!isInsideCallback(node)) {
      let name = '';
      if (ts.isIdentifier(node.expression)) {
        name = node.expression.text;
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        name = node.expression.name.text;
      }
      if (name) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        console.log(`Call at line ${line + 1}: ${name}`);
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
