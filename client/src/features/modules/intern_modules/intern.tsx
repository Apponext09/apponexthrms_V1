import { ModuleNode } from './../types';

export const INTERN_MODULES: ModuleNode[] = [
  {
    id: 'intern_expenses',
    name: 'Expense Claims',
    description: 'Submit and track personal expense reimbursement claims.',
    iconName: 'ReceiptIndianRupee',
    defaultEnabled: true,
    children: [
      { id: 'intern_expense_claims', name: 'Expense Claims', defaultEnabled: true },
      { id: 'intern_travel_requests', name: 'Travel Requests', defaultEnabled: true },
      { id: 'intern_travel_advances', name: 'Travel Advances', defaultEnabled: true },
      { id: 'intern_mileage_claims', name: 'Mileage Claims', defaultEnabled: true },
    ],
  },
];
