import { Route, Routes } from 'react-router-dom';
import { AccountEditPage } from '../features/accounts/AccountEditPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { ActivityPage } from '../features/transactions/ActivityPage';
import { BudgetPage } from '../features/budget/BudgetPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DebtsPage } from '../features/debts/DebtsPage';
import { DataInfoPage } from '../features/more/DataInfoPage';
import { MorePage } from '../features/more/MorePage';
import { NotFoundPage } from '../features/more/NotFoundPage';
import { Onboarding } from '../features/onboarding/OnboardingPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TransactionPage } from '../features/transactions/TransactionPage';
import { AppShell } from './AppShell';
import { useData } from './data';

export function App() {
  const { preferences } = useData();

  // Tant que le premier lancement n'est pas terminé, il remplace toute l'application (§4.1).
  if (!preferences.onboardingCompletedAt) return <Onboarding />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="activity/new" element={<TransactionPage />} />
        <Route path="activity/:id" element={<TransactionPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="more/accounts" element={<AccountsPage />} />
        <Route path="more/accounts/new" element={<AccountEditPage />} />
        <Route path="more/accounts/:id" element={<AccountEditPage />} />
        <Route path="more/categories" element={<CategoriesPage />} />
        <Route path="more/settings" element={<SettingsPage />} />
        <Route path="more/data" element={<DataInfoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
