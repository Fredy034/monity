import { jsPDF } from 'jspdf';
import { useCallback } from 'react';

import { formatMoney } from '@/lib/finance/formatting';
import { generateFilename } from '@/lib/finance/pdf-export';

export interface DashboardExportOptions {
  data: {
    totals: {
      total_balance: number;
      month_income: number;
      month_expense: number;
      month_net: number;
    };
    accounts: Array<{ id: string; name: string; currency: string; current_balance: number }>;
    recent_transactions: Array<{
      id: string;
      account_id: string;
      category_id: string;
      type: 'income' | 'expense';
      amount: number;
      description: string | null;
      transaction_date: string;
    }>;
    spending_by_category: Array<{
      category_id: string;
      category_name: string;
      color: string;
      spent: number;
    }>;
    charts: {
      selected_year: number;
      selected_account_id: string | null;
      available_years: number[];
      monthly_cash_flow: Array<{
        month_index: number;
        month_key: string;
        income: number;
        expense: number;
        net: number;
        cumulative_balance: number;
      }>;
      spending_by_category: Array<{
        category_id: string;
        category_name: string;
        color: string;
        spent: number;
        percent: number;
      }>;
      expenses_by_account: Array<{
        account_id: string;
        account_name: string;
        spent: number;
      }>;
    };
    budgets: Array<{
      id: string;
      category_name: string;
      limit_amount: number;
      spent: number;
      utilization_percent: number;
      is_exceeded: boolean;
    }>;
  };
  locale: string;
  t: (key: string) => string;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [15, 23, 42] as const;
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const;
}

function setFill(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setFillColor(r, g, b);
}

function setStroke(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setDrawColor(r, g, b);
}

function setText(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setTextColor(r, g, b);
}

function ensureSpace(pdf: jsPDF, y: number, needed: number, margin: number) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    pdf.addPage();
    return margin;
  }

  return y;
}

function addSectionTitle(pdf: jsPDF, title: string, y: number, margin: number) {
  y = ensureSpace(pdf, y, 12, margin);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  setText(pdf, '#0f172a');
  pdf.text(title, margin, y);
  return y + 7;
}

function addSmallLabel(pdf: jsPDF, label: string, x: number, y: number) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  setText(pdf, '#64748b');
  pdf.text(label, x, y);
}

export function useDashboardExport() {
  const exportDashboardToPDF = useCallback(async (options: DashboardExportOptions) => {
    const { data, locale, t } = options;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const defaultCurrency = data.accounts[0]?.currency ?? 'USD';
    const accountMap = new Map(data.accounts.map((account) => [account.id, account]));
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const generatedOn = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
    const selectedAccountLabel =
      data.charts.selected_account_id && data.charts.selected_account_id !== 'all'
        ? (accountMap.get(data.charts.selected_account_id)?.name ?? t('dashboard.allAccounts'))
        : t('dashboard.allAccounts');

    let y = margin;

    setText(pdf, '#0f172a');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(t('dashboard.exportTitle'), margin, y);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    setText(pdf, '#475569');
    pdf.text(
      `${t('dashboard.periodYear')}: ${data.charts.selected_year} · ${t('dashboard.accountScope')}: ${selectedAccountLabel} · ${generatedOn}`,
      margin,
      y,
    );
    y += 10;

    const metricCards = [
      {
        label: t('dashboard.totalBalance'),
        value: formatMoney(data.totals.total_balance, { locale, currency: defaultCurrency }),
        accent: '#10b981',
      },
      {
        label: t('dashboard.incomeMonth'),
        value: formatMoney(data.totals.month_income, { locale, currency: defaultCurrency }),
        accent: '#06b6d4',
      },
      {
        label: t('dashboard.expenseMonth'),
        value: formatMoney(data.totals.month_expense, { locale, currency: defaultCurrency }),
        accent: '#f43f5e',
      },
      {
        label: t('dashboard.netMonth'),
        value: formatMoney(data.totals.month_net, { locale, currency: defaultCurrency }),
        accent: data.totals.month_net >= 0 ? '#10b981' : '#f43f5e',
      },
    ];

    const cardGap = 4;
    const cardWidth = (contentWidth - cardGap) / 2;
    const cardHeight = 18;

    y = ensureSpace(pdf, y, cardHeight * 2 + 10, margin);
    metricCards.forEach((card, index) => {
      const row = Math.floor(index / 2);
      const column = index % 2;
      const x = margin + column * (cardWidth + cardGap);
      const cardY = y + row * (cardHeight + cardGap);

      setFill(pdf, '#f8fafc');
      setStroke(pdf, '#cbd5e1');
      pdf.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      setFill(pdf, card.accent);
      pdf.roundedRect(x, cardY, 1.8, cardHeight, 3, 3, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, '#64748b');
      pdf.text(card.label, x + 4, cardY + 6);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      setText(pdf, '#0f172a');
      pdf.text(card.value, x + 4, cardY + 13.5);
    });

    y += cardHeight * 2 + cardGap + 6;

    y = addSectionTitle(pdf, t('dashboard.incomeVsExpensesTitle'), y, margin);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(pdf, '#475569');
    pdf.text(t('dashboard.incomeVsExpensesSubtitle'), margin, y);
    y += 7;

    const monthlyRows = data.charts.monthly_cash_flow;
    if (monthlyRows.length === 0) {
      addSmallLabel(pdf, t('dashboard.noFlowData'), margin, y);
      y += 6;
    } else {
      const tableHeaderHeight = 7;
      const rowHeight = 6;
      y = ensureSpace(pdf, y, tableHeaderHeight + monthlyRows.length * rowHeight + 6, margin);

      setFill(pdf, '#e2e8f0');
      setStroke(pdf, '#cbd5e1');
      pdf.rect(margin, y, contentWidth, tableHeaderHeight, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, '#0f172a');
      pdf.text(t('dashboard.date'), margin + 2, y + 4.8);
      pdf.text(t('dashboard.income'), margin + contentWidth * 0.36, y + 4.8);
      pdf.text(t('dashboard.expense'), margin + contentWidth * 0.58, y + 4.8);
      pdf.text(t('dashboard.netMonth'), margin + contentWidth * 0.8, y + 4.8);
      y += tableHeaderHeight;

      monthlyRows.forEach((row, index) => {
        y = ensureSpace(pdf, y, rowHeight, margin);
        if (index % 2 === 0) {
          setFill(pdf, '#f8fafc');
          pdf.rect(margin, y, contentWidth, rowHeight, 'F');
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, '#0f172a');
        pdf.text(
          monthFormatter.format(new Date(Date.UTC(data.charts.selected_year, Math.max(row.month_index - 1, 0), 1))),
          margin + 2,
          y + 4.4,
        );
        pdf.text(formatMoney(row.income, { locale, currency: defaultCurrency }), margin + contentWidth * 0.36, y + 4.4);
        pdf.text(
          formatMoney(row.expense, { locale, currency: defaultCurrency }),
          margin + contentWidth * 0.58,
          y + 4.4,
        );
        pdf.text(formatMoney(row.net, { locale, currency: defaultCurrency }), margin + contentWidth * 0.8, y + 4.4);
        y += rowHeight;
      });
      y += 3;
    }

    y = addSectionTitle(pdf, t('dashboard.accountBalances'), y, margin);
    if (data.accounts.length === 0) {
      addSmallLabel(pdf, t('dashboard.noAccounts'), margin, y);
      y += 6;
    } else {
      data.accounts.forEach((account, index) => {
        y = ensureSpace(pdf, y, 7, margin);
        if (index % 2 === 0) {
          setFill(pdf, '#ffffff');
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        setText(pdf, '#0f172a');
        pdf.text(account.name, margin, y);
        pdf.text(formatMoney(account.current_balance, { locale, currency: account.currency }), pageWidth - margin, y, {
          align: 'right',
        });
        y += 6;
      });
      y += 2;
    }

    y = addSectionTitle(pdf, t('dashboard.budgetUsage'), y, margin);
    if (data.budgets.length === 0) {
      addSmallLabel(pdf, t('dashboard.noBudgets'), margin, y);
      y += 6;
    } else {
      data.budgets.forEach((budget) => {
        y = ensureSpace(pdf, y, 10, margin);
        setFill(pdf, budget.is_exceeded ? '#fef2f2' : '#ecfdf5');
        setStroke(pdf, budget.is_exceeded ? '#fecaca' : '#bbf7d0');
        pdf.roundedRect(margin, y - 1.2, contentWidth, 8.5, 2, 2, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, '#0f172a');
        pdf.text(budget.category_name, margin + 2, y + 3.8);
        pdf.text(
          `${formatMoney(budget.spent, { locale, currency: defaultCurrency })} / ${formatMoney(budget.limit_amount, {
            locale,
            currency: defaultCurrency,
          })}`,
          pageWidth - margin - 2,
          y + 3.8,
          { align: 'right' },
        );
        y += 9;
      });
      y += 2;
    }

    y = addSectionTitle(pdf, t('dashboard.spendingDistributionTitle'), y, margin);
    if (data.charts.spending_by_category.length === 0) {
      addSmallLabel(pdf, t('dashboard.noCategoryChartData'), margin, y);
      y += 6;
    } else {
      data.charts.spending_by_category.forEach((item) => {
        y = ensureSpace(pdf, y, 6, margin);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, '#0f172a');
        pdf.text(item.category_name, margin, y);
        pdf.text(`${item.percent.toFixed(1)}%`, pageWidth - margin - 44, y, { align: 'right' });
        pdf.text(formatMoney(item.spent, { locale, currency: defaultCurrency }), pageWidth - margin, y, {
          align: 'right',
        });
        y += 5.5;
      });
      y += 2;
    }

    y = addSectionTitle(pdf, t('dashboard.expensesByAccountTitle'), y, margin);
    if (data.charts.expenses_by_account.length === 0) {
      addSmallLabel(pdf, t('dashboard.noAccountExpenseChartData'), margin, y);
      y += 6;
    } else {
      data.charts.expenses_by_account.forEach((item) => {
        y = ensureSpace(pdf, y, 6, margin);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, '#0f172a');
        pdf.text(item.account_name, margin, y);
        pdf.text(formatMoney(item.spent, { locale, currency: defaultCurrency }), pageWidth - margin, y, {
          align: 'right',
        });
        y += 5.5;
      });
      y += 2;
    }

    y = addSectionTitle(pdf, t('dashboard.recentTransactions'), y, margin);
    if (data.recent_transactions.length === 0) {
      addSmallLabel(pdf, t('dashboard.noRecentTransactions'), margin, y);
      y += 6;
    } else {
      const titleWidth = contentWidth * 0.42;
      data.recent_transactions.forEach((transaction, index) => {
        const description = transaction.description || t('dashboard.noDescription');
        const accountCurrency = accountMap.get(transaction.account_id)?.currency ?? defaultCurrency;
        const amountText = `${transaction.type === 'income' ? '+' : '-'}${formatMoney(transaction.amount, {
          locale,
          currency: accountCurrency,
        })}`;
        const descriptionLines = pdf.splitTextToSize(description, titleWidth);
        const rowHeight = Math.max(descriptionLines.length * 4.2 + 3.5, 8);
        y = ensureSpace(pdf, y, rowHeight, margin);

        if (index % 2 === 0) {
          setFill(pdf, '#f8fafc');
          pdf.rect(margin, y - 1.2, contentWidth, rowHeight - 0.8, 'F');
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.3);
        setText(pdf, '#475569');
        pdf.text(dateFormatter.format(new Date(transaction.transaction_date)), margin, y + 3.4);
        setText(pdf, '#0f172a');
        pdf.text(descriptionLines, margin + 38, y + 3.4);
        pdf.text(amountText, pageWidth - margin, y + 3.4, {
          align: 'right',
        });
        y += rowHeight;
      });
    }

    const pageCount = pdf.getNumberOfPages();
    for (let index = 1; index <= pageCount; index += 1) {
      pdf.setPage(index);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, '#64748b');
      pdf.text(`Page ${index} of ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    }

    pdf.save(generateFilename('dashboard'));
  }, []);

  return { exportDashboardToPDF };
}
