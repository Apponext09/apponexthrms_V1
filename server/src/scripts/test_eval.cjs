const evaluateFormula = (formulaStr, ctx) => {
  if (!formulaStr || !formulaStr.trim()) return 0;
  let expr = formulaStr.toLowerCase().trim();

  // 1. Handle inline conditionals
  if (expr.includes('if')) {
    const ifMatch = expr.match(/\(?\s*if\s+([a-z_]+)\s*(<=|>=|<|>|==|=)\s*([0-9.]+)\s*\)?/i);
    if (ifMatch) {
      const varName = ifMatch[1].toLowerCase();
      const op = ifMatch[2];
      const threshold = Number(ifMatch[3]);
      const varVal = ctx[varName] ?? ctx['gross'] ?? 0;
      let condPassed = false;
      if (op === '<=') condPassed = varVal <= threshold;
      else if (op === '>=') condPassed = varVal >= threshold;
      else if (op === '<') condPassed = varVal < threshold;
      else if (op === '>') condPassed = varVal > threshold;
      else if (op === '=' || op === '==') condPassed = varVal === threshold;

      if (!condPassed) return 0;
      expr = expr.replace(ifMatch[0], '').trim();
    }
  }

  // 2. Handle descriptive English formulas
  if (expr.includes('income tax') || expr.includes('tax slab') || expr.includes('projection')) {
    const annualGross = (ctx.gross || 0) * 12;
    return annualGross > 700000 ? Math.round((annualGross - 700000) * 0.05 / 12) : 0;
  }
  if (expr.includes('residual') || expr.includes('balance') || expr.includes('ctc -') || expr.includes('gross -')) {
    const monthlyGross = ctx.gross || ctx.ctc || 0;
    const basic = ctx.basic || 0;
    const hra = ctx.hra || 0;
    const other = ctx.other || ctx.others || 0;
    return Math.max(0, monthlyGross - (basic + hra + other));
  }

  // 3. Normalize percentage expressions: e.g. "80% of gross" -> "(gross * (80 / 100))"
  expr = expr.replace(/([0-9.]+)\s*%\s*(?:of\s*)?([a-z_]+)/gi, '($2 * ($1 / 100))');
  expr = expr.replace(/([0-9.]+)\s*%/g, '($1 / 100)');
  expr = expr.replace(/\bof\b/gi, '*');

  // 4. Bind Math functions
  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(');
  expr = expr.replace(/\bmax\s*\(/gi, 'Math.max(');
  expr = expr.replace(/\bround\s*\(/gi, 'Math.round(');
  expr = expr.replace(/\bceil\s*\(/gi, 'Math.ceil(');
  expr = expr.replace(/\bfloor\s*\(/gi, 'Math.floor(');

  // 5. Replace mapped variable keys
  const sortedKeys = Object.keys(ctx).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (!k) continue;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    expr = expr.replace(regex, String(ctx[k] ?? 0));
  }

  try {
    const res = Function('Math', `'use strict'; return (${expr});`)(Math);
    return isNaN(res) || !isFinite(res) ? 0 : Math.round(res);
  } catch (e) {
    return 'ERR: ' + e.message;
  }
};

console.log('Basic (80% of Gross):', evaluateFormula('80% of Gross', { gross: 33333 }));
console.log('HRA (40% of Basic):', evaluateFormula('40% of Basic', { basic: 26666, gross: 33333 }));
