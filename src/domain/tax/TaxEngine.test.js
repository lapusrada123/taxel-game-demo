// domain/tax/TaxEngine.test.js
// เทสแบบ zero-dependency (ไม่ใช้ test runner ใด ๆ) เพื่อให้รันได้แบบ no-build
// เปิดผ่าน test.html (ต้องรันผ่าน web server เหมือน index.html)
import {
  calculateExpenseDeduction,
  calculateDeductions,
  calculateProgressiveTax,
  calculateFullTax,
} from './TaxEngine.js';

const results = [];

function approxEqual(a, b, epsilon = 0.01) {
  return Math.abs(a - b) < epsilon;
}

function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
  }
}

function assertEqual(actual, expected, label) {
  if (!approxEqual(actual, expected)) {
    throw new Error(`${label}: ได้ ${actual} แต่คาดว่า ${expected}`);
  }
}

test('calculateExpenseDeduction: ต่ำกว่า cap คิด 50%', () => {
  assertEqual(calculateExpenseDeduction(100000), 50000, 'expenseDeduction(100000)');
});

test('calculateExpenseDeduction: เกิน cap ให้ตัดที่ 100000', () => {
  assertEqual(calculateExpenseDeduction(300000), 100000, 'expenseDeduction(300000)');
});

test('calculateExpenseDeduction: รายได้ 0', () => {
  assertEqual(calculateExpenseDeduction(0), 0, 'expenseDeduction(0)');
});

test('calculateProgressiveTax: อยู่ในขั้นยกเว้นทั้งหมด', () => {
  const { tax } = calculateProgressiveTax(100000);
  assertEqual(tax, 0, 'tax(100000)');
});

test('calculateProgressiveTax: taxable 500,000 = 27,500', () => {
  const { tax } = calculateProgressiveTax(500000);
  assertEqual(tax, 27500, 'tax(500000)');
});

test('calculateProgressiveTax: taxable 1,000,000 = 115,000', () => {
  const { tax } = calculateProgressiveTax(1000000);
  assertEqual(tax, 115000, 'tax(1000000)');
});

test('calculateDeductions: บวกค่าลดหย่อนส่วนตัวเสมอแม้ไม่มีไอเทม', () => {
  const { total } = calculateDeductions(300000, []);
  assertEqual(total, 60000, 'total deductions ไม่มีไอเทม');
});

test('calculateDeductions: ประกันชีวิตรวมหลายรายการแล้วค่อยตัด cap', () => {
  const { total, breakdown } = calculateDeductions(500000, [
    { type: 'life_insurance', amount: 60000 },
    { type: 'life_insurance', amount: 60000 },
  ]);
  const insurance = breakdown.find((b) => b.type === 'life_insurance');
  assertEqual(insurance.amount, 100000, 'life_insurance ถูก cap ที่ 100000');
  assertEqual(total, 160000, 'total = personal 60000 + insurance 100000');
});

test('calculateDeductions: เงินบริจาคถูกจำกัดที่ 10% ของเงินได้หลังหักรายการอื่น', () => {
  const { breakdown } = calculateDeductions(500000, [
    { type: 'donation', amount: 100000 },
  ]);
  // expense = min(250000, 100000) = 100000, nonDonationTotal = personal 60000
  // donationCap = (500000 - 100000 - 60000) * 0.1 = 34000
  const donation = breakdown.find((b) => b.type === 'donation');
  assertEqual(donation.amount, 34000, 'donation ถูกจำกัดที่ 34000');
});

test('calculateFullTax: ตัวอย่างเงินเดือนรวม ไม่มีลดหย่อนเพิ่ม', () => {
  // income 500,000: expense=100,000, personal=60,000 -> taxable=340,000
  // tax = 150000*0 + 150000*0.05 + 40000*0.10 = 0 + 7500 + 4000 = 11500
  const result = calculateFullTax(500000, []);
  assertEqual(result.taxableIncome, 340000, 'taxableIncome');
  assertEqual(result.tax, 11500, 'tax');
});

test('calculateFullTax: รายได้ 0 ไม่ error และภาษี/taxable ต้องเป็น 0', () => {
  const result = calculateFullTax(0, []);
  assertEqual(result.taxableIncome, 0, 'taxableIncome(0)');
  assertEqual(result.tax, 0, 'tax(0)');
});

export function runTaxEngineTests() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  return { passed, failed, total: results.length, results };
}
