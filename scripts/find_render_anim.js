const ts = require('./mobile/node_modules/typescript');
const fs = require('fs');

const code = fs.readFileSync('mobile/src/app/index.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('index.tsx', code, ts.ScriptTarget.Latest, true);

function isInsideCallback(node) {
  let curr = node.parent;
  while (curr) {
    if (ts.isArrowFunction(curr) || ts.isFunctionExpression(curr) || (ts.isFunctionDeclaration(curr) && curr.name && !['App', 'AIGeneratingScreen', 'SmallBgGenIndicator'].includes(curr.name.text))) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function visit(node) {
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.text === 'start') {
        if (!isInsideCallback(node)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          console.log(`Animated start in render at line ${line + 1}`);
        }
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
