import { Route, Routes } from 'react-router-dom';
import { AccountEditPage } from '../features/accounts/AccountEditPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { ActivityPage } from '../features/transactions/ActivityPage';
import { BudgetPage } from '../features/budget/BudgetPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DebtPage } from '../features/debts/DebtPage';
import { DebtsPage } from '../features/debts/DebtsPage';
import { GoalEditPage } from '../features/goals/GoalEditPage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { PlannedEditPage } from '../features/planned/PlannedEditPage';
import { PlannedPage } from '../features/planned/PlannedPage';
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
        <Route path="debts/new" element={<DebtPage mode="new" />} />
        <Route path="debts/:id" element={<DebtPage mode="detail" />} />
        <Route path="debts/:id/edit" element={<DebtPage mode="edit" />} />
        <Route path="more" element={<MorePage />} />
        <Route path="more/accounts" element={<AccountsPage />} />
        <Route path="more/accounts/new" element={<AccountEditPage />} />
        <Route path="more/accounts/:id" element={<AccountEditPage />} />
        <Route path="more/categories" element={<CategoriesPage />} />
        <Route path="more/planned" element={<PlannedPage />} />
        <Route path="more/planned/new" element={<PlannedEditPage />} />
        <Route path="more/planned/:id" element={<PlannedEditPage />} />
        <Route path="more/goals" element={<GoalsPage />} />
        <Route path="more/goals/new" element={<GoalEditPage />} />
        <Route path="more/goals/:id" element={<GoalEditPage />} />
        <Route path="more/settings" element={<SettingsPage />} />
        <Route path="more/data" element={<DataInfoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
