export type KPICategory = 'Financial' | 'HR' | 'Operations' | 'Sales' | 'Customer' | 'Quality' | 'Growth';

export interface KPITemplate {
  id: string;
  name: string;
  category: KPICategory;
  unit: string;
  description: string;
  defaultTarget: number;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  higherIsBetter: boolean;
}

export const KPI_LIBRARY: KPITemplate[] = [
  // Financial
  { id: 'f1', name: 'Revenue Growth Rate', category: 'Financial', unit: '%', description: 'Month-over-month or year-over-year revenue growth percentage.', defaultTarget: 15, frequency: 'Monthly', higherIsBetter: true },
  { id: 'f2', name: 'Gross Profit Margin', category: 'Financial', unit: '%', description: 'Gross profit as a percentage of total revenue.', defaultTarget: 40, frequency: 'Monthly', higherIsBetter: true },
  { id: 'f3', name: 'Net Profit Margin', category: 'Financial', unit: '%', description: 'Net income as a percentage of total revenue.', defaultTarget: 15, frequency: 'Monthly', higherIsBetter: true },
  { id: 'f4', name: 'Operating Cash Flow', category: 'Financial', unit: '₹', description: 'Cash generated from core business operations.', defaultTarget: 500000, frequency: 'Monthly', higherIsBetter: true },
  { id: 'f5', name: 'Budget Variance', category: 'Financial', unit: '%', description: 'Deviation of actual spend from planned budget (lower = better).', defaultTarget: 5, frequency: 'Monthly', higherIsBetter: false },
  { id: 'f6', name: 'Return on Investment', category: 'Financial', unit: '%', description: 'Net profit relative to investment cost.', defaultTarget: 20, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'f7', name: 'Accounts Receivable Days', category: 'Financial', unit: 'Days', description: 'Average days to collect payment after invoice.', defaultTarget: 30, frequency: 'Monthly', higherIsBetter: false },
  // HR
  { id: 'h1', name: 'Employee Retention Rate', category: 'HR', unit: '%', description: 'Percentage of employees retained over the period.', defaultTarget: 90, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'h2', name: 'Attendance Rate', category: 'HR', unit: '%', description: 'Percentage of scheduled shifts with confirmed attendance.', defaultTarget: 95, frequency: 'Monthly', higherIsBetter: true },
  { id: 'h3', name: 'Training Completion Rate', category: 'HR', unit: '%', description: 'Employees completing mandatory training on time.', defaultTarget: 100, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'h4', name: 'Time to Fill', category: 'HR', unit: 'Days', description: 'Average days from job opening to offer accepted.', defaultTarget: 30, frequency: 'Monthly', higherIsBetter: false },
  { id: 'h5', name: 'Employee Satisfaction Score', category: 'HR', unit: 'Score', description: 'Average score from employee satisfaction surveys (out of 10).', defaultTarget: 8, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'h6', name: 'Absenteeism Rate', category: 'HR', unit: '%', description: 'Percentage of working days lost to unplanned absence.', defaultTarget: 3, frequency: 'Monthly', higherIsBetter: false },
  { id: 'h7', name: 'Performance Review Completion', category: 'HR', unit: '%', description: 'Percentage of staff with completed appraisals on schedule.', defaultTarget: 100, frequency: 'Quarterly', higherIsBetter: true },
  // Operations
  { id: 'o1', name: 'Task Completion Rate', category: 'Operations', unit: '%', description: 'Percentage of planned tasks completed on time.', defaultTarget: 90, frequency: 'Weekly', higherIsBetter: true },
  { id: 'o2', name: 'Project On-time Delivery Rate', category: 'Operations', unit: '%', description: 'Percentage of projects delivered by agreed deadline.', defaultTarget: 85, frequency: 'Monthly', higherIsBetter: true },
  { id: 'o3', name: 'Process Efficiency', category: 'Operations', unit: '%', description: 'Useful output vs total input (labour, materials, time).', defaultTarget: 80, frequency: 'Monthly', higherIsBetter: true },
  { id: 'o4', name: 'First Pass Yield', category: 'Operations', unit: '%', description: 'Percentage of units produced correctly without rework.', defaultTarget: 95, frequency: 'Monthly', higherIsBetter: true },
  { id: 'o5', name: 'Order Fulfillment Cycle Time', category: 'Operations', unit: 'Days', description: 'Average time from order received to order delivered.', defaultTarget: 5, frequency: 'Monthly', higherIsBetter: false },
  { id: 'o6', name: 'Downtime Hours', category: 'Operations', unit: 'Hours', description: 'Total unplanned operational downtime per period.', defaultTarget: 4, frequency: 'Monthly', higherIsBetter: false },
  // Sales
  { id: 's1', name: 'Total Revenue', category: 'Sales', unit: '₹', description: 'Gross revenue from all sales in the period.', defaultTarget: 1000000, frequency: 'Monthly', higherIsBetter: true },
  { id: 's2', name: 'Leads Generated', category: 'Sales', unit: 'Count', description: 'New qualified leads entering the pipeline.', defaultTarget: 50, frequency: 'Monthly', higherIsBetter: true },
  { id: 's3', name: 'Lead Conversion Rate', category: 'Sales', unit: '%', description: 'Percentage of leads converted to paying customers.', defaultTarget: 20, frequency: 'Monthly', higherIsBetter: true },
  { id: 's4', name: 'Average Deal Size', category: 'Sales', unit: '₹', description: 'Average revenue per closed deal.', defaultTarget: 50000, frequency: 'Monthly', higherIsBetter: true },
  { id: 's5', name: 'Sales Cycle Length', category: 'Sales', unit: 'Days', description: 'Average days from first contact to deal closed.', defaultTarget: 30, frequency: 'Monthly', higherIsBetter: false },
  { id: 's6', name: 'Customer Acquisition Cost', category: 'Sales', unit: '₹', description: 'Total sales & marketing spend divided by new customers.', defaultTarget: 5000, frequency: 'Monthly', higherIsBetter: false },
  { id: 's7', name: 'Pipeline Coverage', category: 'Sales', unit: 'x', description: 'Ratio of pipeline value to revenue target (ideally 3x).', defaultTarget: 3, frequency: 'Monthly', higherIsBetter: true },
  // Customer
  { id: 'c1', name: 'Customer Satisfaction Score', category: 'Customer', unit: 'Score', description: 'Average CSAT score from post-interaction surveys (out of 10).', defaultTarget: 8, frequency: 'Monthly', higherIsBetter: true },
  { id: 'c2', name: 'Net Promoter Score', category: 'Customer', unit: 'NPS', description: 'Likelihood customers would recommend (−100 to +100).', defaultTarget: 40, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'c3', name: 'Customer Retention Rate', category: 'Customer', unit: '%', description: 'Percentage of customers retained over the period.', defaultTarget: 85, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'c4', name: 'First Response Time', category: 'Customer', unit: 'Hours', description: 'Average time to first response on a customer support request.', defaultTarget: 2, frequency: 'Weekly', higherIsBetter: false },
  { id: 'c5', name: 'Resolution Rate', category: 'Customer', unit: '%', description: 'Percentage of support tickets resolved on first contact.', defaultTarget: 80, frequency: 'Monthly', higherIsBetter: true },
  { id: 'c6', name: 'Churn Rate', category: 'Customer', unit: '%', description: 'Percentage of customers lost in the period.', defaultTarget: 5, frequency: 'Monthly', higherIsBetter: false },
  // Quality
  { id: 'q1', name: 'Defect Rate', category: 'Quality', unit: '%', description: 'Percentage of outputs with defects requiring correction.', defaultTarget: 2, frequency: 'Monthly', higherIsBetter: false },
  { id: 'q2', name: 'Compliance Adherence Rate', category: 'Quality', unit: '%', description: 'Percentage of processes meeting regulatory & policy requirements.', defaultTarget: 100, frequency: 'Monthly', higherIsBetter: true },
  { id: 'q3', name: 'Audit Score', category: 'Quality', unit: 'Score', description: 'Score achieved in internal/external quality audits (out of 100).', defaultTarget: 90, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'q4', name: 'Customer Complaint Rate', category: 'Quality', unit: '%', description: 'Complaints received as a percentage of total transactions.', defaultTarget: 1, frequency: 'Monthly', higherIsBetter: false },
  { id: 'q5', name: 'Rework Cost', category: 'Quality', unit: '₹', description: 'Total cost incurred to correct defective outputs.', defaultTarget: 10000, frequency: 'Monthly', higherIsBetter: false },
  // Growth
  { id: 'g1', name: 'New Customers Acquired', category: 'Growth', unit: 'Count', description: 'Number of new paying customers added in the period.', defaultTarget: 20, frequency: 'Monthly', higherIsBetter: true },
  { id: 'g2', name: 'Market Share', category: 'Growth', unit: '%', description: 'Company revenue as percentage of total addressable market.', defaultTarget: 10, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'g3', name: 'Innovation Ideas Implemented', category: 'Growth', unit: 'Count', description: 'Number of improvement or innovation initiatives launched.', defaultTarget: 3, frequency: 'Quarterly', higherIsBetter: true },
  { id: 'g4', name: 'Expansion Revenue', category: 'Growth', unit: '₹', description: 'Revenue from new products, markets, or geographies.', defaultTarget: 200000, frequency: 'Quarterly', higherIsBetter: true },
];

export const CATEGORY_CONFIG: Record<KPICategory, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Financial: { label: 'Financial', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '₹' },
  HR:        { label: 'HR', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: '👥' },
  Operations:{ label: 'Operations', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚙️' },
  Sales:     { label: 'Sales', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: '📈' },
  Customer:  { label: 'Customer', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: '⭐' },
  Quality:   { label: 'Quality', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: '✓' },
  Growth:    { label: 'Growth', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '🚀' },
};
