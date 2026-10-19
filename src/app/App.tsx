import { Route, Routes } from 'react-router-dom';
import { ActivityPage } from '../features/transactions/ActivityPage';
import { BudgetPage } from '../features/budget/BudgetPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DebtsPage } from '../features/debts/DebtsPage';
import { DataInfoPage } from '../features/more/DataInfoPage';
import { MorePage } from '../features/more/MorePage';
import { NotFoundPage } from '../features/more/NotFoundPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from './AppShell';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="more/settings" element={<SettingsPage />} />
        <Route path="more/data" element={<DataInfoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
