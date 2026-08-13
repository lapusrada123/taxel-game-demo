// domain/tax/TaxEngine.js
// คำนวณภาษีเงินได้บุคคลธรรมดาแบบง่าย (pure JS ไม่พึ่ง Phaser)
// อิงโครงสร้างจริง: หักค่าใช้จ่าย -> หักค่าลดหย่อน -> คำนวณภาษีแบบขั้นบันได
// ทำให้ง่ายลงเพื่อการเรียนรู้ (ไม่ครอบคลุมทุกกรณีตามกฎหมายจริง)

export const EXPENSE_DEDUCTION_RATE = 0.5;
export const EXPENSE_DEDUCTION_CAP = 100000;
export const PERSONAL_ALLOWANCE = 60000;

export const TAX_BRACKETS = [
  { min: 0, max: 150000, rate: 0 },
  { min: 150000, max: 300000, rate: 0.05 },
  { min: 300000, max: 500000, rate: 0.10 },
  { min: 500000, max: 750000, rate: 0.15 },
  { min: 750000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: 2000000, rate: 0.25 },
  { min: 2000000, max: 5000000, rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 },
];

// ค่าลดหย่อนที่รับจากไอเทมที่เก็บในเกม: { type, amount }
// donation ไม่มี cap ตายตัว เพราะกฎหมายจริงจำกัดที่ 10% ของเงินได้หลังหักรายการอื่น
// จึงคำนวณแยกไว้ท้ายสุดใน calculateDeductions
export const DEDUCTION_RULES = {
  spouse: { label: 'คู่สมรส (ไม่มีเงินได้)', cap: 60000 },
  child: { label: 'บุตร', cap: 30000 },
  parent: { label: 'อุปการะบิดามารดา', cap: 30000 },
  life_insurance: { label: 'ประกันชีวิต', cap: 100000 },
  health_insurance: { label: 'ประกันสุขภาพ', cap: 25000 },
  provident_fund: { label: 'กองทุนสำรองเลี้ยงชีพ/RMF/SSF', cap: 500000 },
  donation: { label: 'เงินบริจาค', cap: Infinity },
};

export function calculateExpenseDeduction(income) {
  return Math.min(Math.max(income, 0) * EXPENSE_DEDUCTION_RATE, EXPENSE_DEDUCTION_CAP);
}

export function calculateDeductions(income, deductionItems = []) {
  const expenseDeduction = calculateExpenseDeduction(income);

  const grouped = {};
  for (const item of deductionItems) {
    if (!DEDUCTION_RULES[item.type]) continue;
    grouped[item.type] = (grouped[item.type] || 0) + item.amount;
  }

  const breakdown = [{ type: 'personal', label: 'ลดหย่อนส่วนตัว', amount: PERSONAL_ALLOWANCE }];
  let nonDonationTotal = PERSONAL_ALLOWANCE;

  for (const [type, rawAmount] of Object.entries(grouped)) {
    if (type === 'donation') continue;
    const capped = Math.min(rawAmount, DEDUCTION_RULES[type].cap);
    breakdown.push({ type, label: DEDUCTION_RULES[type].label, amount: capped });
    nonDonationTotal += capped;
  }

  if (grouped.donation) {
    const donationCap = Math.max(0, income - expenseDeduction - nonDonationTotal) * 0.1;
    const capped = Math.min(grouped.donation, donationCap);
    breakdown.push({ type: 'donation', label: DEDUCTION_RULES.donation.label, amount: capped });
  }

  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);
  return { expenseDeduction, breakdown, total };
}

export function calculateProgressiveTax(taxableIncome) {
  let tax = 0;
  const breakdown = [];
  for (const bracket of TAX_BRACKETS) {
    const taxableInBracket = Math.max(0, Math.min(taxableIncome, bracket.max) - bracket.min);
    if (taxableInBracket <= 0) continue;
    const taxInBracket = taxableInBracket * bracket.rate;
    tax += taxInBracket;
    breakdown.push({ min: bracket.min, max: bracket.max, rate: bracket.rate, taxableAmount: taxableInBracket, tax: taxInBracket });
  }
  return { tax, breakdown };
}

export function calculateFullTax(income, deductionItems = []) {
  const { expenseDeduction, breakdown: deductionBreakdown, total: totalDeductions } =
    calculateDeductions(income, deductionItems);
  const taxableIncome = Math.max(0, income - expenseDeduction - totalDeductions);
  const { tax, breakdown: taxBreakdown } = calculateProgressiveTax(taxableIncome);

  return {
    income,
    expenseDeduction,
    deductionBreakdown,
    totalDeductions,
    taxableIncome,
    tax,
    effectiveRate: income > 0 ? tax / income : 0,
    taxBreakdown,
  };
}
