import { ModuleNode } from './../types';

export const CONSULTANT_MODULES: ModuleNode[] = [
  {
    id: 'consultant_expenses',
    name: 'Expense Claims',
    description: 'Submit and track personal expense reimbursement claims.',
    iconName: 'ReceiptIndianRupee',
    defaultEnabled: true,
    children: [
      { id: 'consultant_expense_claims', name: 'Expense Claims', defaultEnabled: true },
      { id: 'consultant_travel_requests', name: 'Travel Requests', defaultEnabled: true },
      { id: 'consultant_travel_advances', name: 'Travel Advances', defaultEnabled: true },
      { id: 'consultant_mileage_claims', name: 'Mileage Claims', defaultEnabled: true },
    ],
  },
];
