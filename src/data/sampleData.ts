import { Transaction } from '../types/finance';

/**
 * Realistic Indian SME baseline transactions for "Apex Craft Digital & Retail LLP"
 * Dates are dynamically generated relative to today so charts always look active and current!
 */
export function generateInitialTransactions(): {
  initialBalance: number;
  minCashRequired: number;
  transactions: Transaction[];
} {
  const today = new Date();

  // Helper to get ISO date string offset by days from today
  const getDateOffset = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const transactions: Transaction[] = [
    {
      id: 'tx-01',
      date: getDateOffset(32),
      type: 'income',
      amount: 185000,
      category: 'Client Payment',
      note: 'Milestone 2 payment - Titan Infotech web platform',
      paymentMethod: 'NEFT / RTGS',
    },
    {
      id: 'tx-02',
      date: getDateOffset(30),
      type: 'expense',
      amount: 140000,
      category: 'Staff Salaries',
      note: 'Monthly team payroll - 4 full-time employees',
      paymentMethod: 'NEFT / RTGS',
      isRecurring: true,
    },
    {
      id: 'tx-03',
      date: getDateOffset(28),
      type: 'expense',
      amount: 45000,
      category: 'Office Rent',
      note: 'Indiranagar Commercial Co-working space rent',
      paymentMethod: 'NEFT / RTGS',
      isRecurring: true,
    },
    {
      id: 'tx-04',
      date: getDateOffset(27),
      type: 'income',
      amount: 62000,
      category: 'Product Sales',
      note: 'Online Shopify order settlements (Batch 44)',
      paymentMethod: 'UPI',
    },
    {
      id: 'tx-05',
      date: getDateOffset(25),
      type: 'expense',
      amount: 28500,
      category: 'Marketing & Ads',
      note: 'Meta & Google Ads campaigns lead generation',
      paymentMethod: 'Card',
    },
    {
      id: 'tx-06',
      date: getDateOffset(23),
      type: 'expense',
      amount: 14200,
      category: 'Utilities & Wifi',
      note: 'Electricity BESCOM bill + High-speed leased line fiber',
      paymentMethod: 'UPI',
      isRecurring: true,
    },
    {
      id: 'tx-07',
      date: getDateOffset(21),
      type: 'income',
      amount: 120000,
      category: 'Consulting / Services',
      note: 'Quarterly SEO & Brand strategy retainer - GreenRoot Organics',
      paymentMethod: 'NEFT / RTGS',
    },
    {
      id: 'tx-08',
      date: getDateOffset(19),
      type: 'expense',
      amount: 52000,
      category: 'Taxes & GST',
      note: 'GST Monthly GSTR-3B tax payment',
      paymentMethod: 'NEFT / RTGS',
      isRecurring: true,
    },
    {
      id: 'tx-09',
      date: getDateOffset(17),
      type: 'expense',
      amount: 38000,
      category: 'Vendor / Supplier',
      note: 'Packaging material raw stock - BoxKart Solutions',
      paymentMethod: 'UPI',
    },
    {
      id: 'tx-10',
      date: getDateOffset(15),
      type: 'income',
      amount: 95000,
      category: 'Client Payment',
      note: 'UI/UX Redesign project completion - CloudSpark',
      paymentMethod: 'NEFT / RTGS',
    },
    {
      id: 'tx-11',
      date: getDateOffset(13),
      type: 'expense',
      amount: 16500,
      category: 'Software & SaaS',
      note: 'Annual Notion + Slack + AWS Cloud hosting invoices',
      paymentMethod: 'Card',
    },
    {
      id: 'tx-12',
      date: getDateOffset(11),
      type: 'income',
      amount: 74000,
      category: 'Product Sales',
      note: 'Direct B2B wholesale order - 50 units dispatched',
      paymentMethod: 'Cheque',
    },
    {
      id: 'tx-13',
      date: getDateOffset(9),
      type: 'expense',
      amount: 22000,
      category: 'Logistics & Shipping',
      note: 'BlueDart and Delhivery bulk shipping charges',
      paymentMethod: 'UPI',
    },
    {
      id: 'tx-14',
      date: getDateOffset(7),
      type: 'income',
      amount: 145000,
      category: 'Client Payment',
      note: 'Mobile App sprint invoice - FinTech Labs Pune',
      paymentMethod: 'NEFT / RTGS',
    },
    {
      id: 'tx-15',
      date: getDateOffset(5),
      type: 'expense',
      amount: 18500,
      category: 'Marketing & Ads',
      note: 'Instagram influencer collaboration festival promo',
      paymentMethod: 'UPI',
    },
    {
      id: 'tx-16',
      date: getDateOffset(3),
      type: 'income',
      amount: 88000,
      category: 'Consulting / Services',
      note: 'Custom CRM setup advance - Metro Logistics',
      paymentMethod: 'NEFT / RTGS',
    },
    {
      id: 'tx-17',
      date: getDateOffset(2),
      type: 'expense',
      amount: 8500,
      category: 'Miscellaneous Expense',
      note: 'Pantry restocking, printer supplies, client meeting lunches',
      paymentMethod: 'UPI',
    },
    {
      id: 'tx-18',
      date: getDateOffset(1),
      type: 'income',
      amount: 55000,
      category: 'Product Sales',
      note: 'Weekend flash sale e-commerce receipts',
      paymentMethod: 'UPI',
    },
  ];

  // Base starting balance at 35 days ago was ₹3,50,000
  // With above transactions, current balance will be ~₹5,80,000+
  // Providing a healthy ~₹2,80,000 safe surplus over a ₹3,00,000 minimum reserve!
  const initialBalance = 350000;
  const minCashRequired = 300000;

  return {
    initialBalance,
    minCashRequired,
    transactions,
  };
}
