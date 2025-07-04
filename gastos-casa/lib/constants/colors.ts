// Color palette for the application
export const COLORS = {
  // Income colors (green tones)
  income: {
    primary: '#22c55e',    // green-500
    secondary: '#16a34a',  // green-600
    light: '#86efac',      // green-300
    dark: '#15803d',       // green-700
    background: '#f0fdf4', // green-50
  },
  
  // Expense colors (red/orange tones)
  expense: {
    primary: '#ef4444',    // red-500
    secondary: '#dc2626',  // red-600
    light: '#fca5a5',      // red-300
    dark: '#b91c1c',       // red-700
    background: '#fef2f2', // red-50
  },
  
  // Balance colors
  balance: {
    positive: '#22c55e',   // green-500
    negative: '#ef4444',   // red-500
    neutral: '#6b7280',    // gray-500
  },
  
  // Chart colors for categories (consistent palette)
  chart: [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#6b7280', // gray-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
    '#f472b6', // pink-400
    '#a855f7', // purple-500
    '#06b6d4', // cyan-500
  ],
  
  // UI colors
  ui: {
    primary: '#3b82f6',    // blue-500
    secondary: '#6b7280',  // gray-500
    success: '#22c55e',    // green-500
    warning: '#f59e0b',    // amber-500
    error: '#ef4444',      // red-500
    info: '#06b6d4',       // cyan-500
  }
}

// Helper functions for color usage
export const getIncomeColor = (type: 'primary' | 'secondary' | 'light' | 'dark' | 'background' = 'primary') => {
  return COLORS.income[type]
}

export const getExpenseColor = (type: 'primary' | 'secondary' | 'light' | 'dark' | 'background' = 'primary') => {
  return COLORS.expense[type]
}

export const getBalanceColor = (balance: number): string => {
  if (balance > 0) return COLORS.balance.positive
  if (balance < 0) return COLORS.balance.negative
  return COLORS.balance.neutral
}

export const getChartColor = (index: number): string => {
  return COLORS.chart[index % COLORS.chart.length]
}

// CSS custom properties for consistent theming
export const getCSSVariables = () => {
  return {
    '--color-income': COLORS.income.primary,
    '--color-expense': COLORS.expense.primary,
    '--color-balance-positive': COLORS.balance.positive,
    '--color-balance-negative': COLORS.balance.negative,
    '--color-balance-neutral': COLORS.balance.neutral,
  }
}