import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import LiveSessions from './pages/LiveSessions';
import Customers from './pages/Customers';
import Bookings from './pages/Bookings';
import WaitingList from './pages/WaitingList';
import Pricing from './pages/Pricing';
import Discounts from './pages/Discounts';
import Revenue from './pages/Revenue';
import Expenses from './pages/Expenses';
import Inventory from './pages/Inventory';
import Events from './pages/Events';
import StaffPage from './pages/Staff';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div id="modalRoot" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/sessions" element={<LiveSessions />} />
                <Route path="/customers" element={<Customers />} />
                <Route element={<ProtectedRoute minRole="Manager" />}>
                  <Route path="/bookings" element={<Bookings source="all" />} />
                  <Route path="/bookings/web" element={<Bookings source="web" />} />
                  <Route path="/waiting" element={<WaitingList />} />
                </Route>
                <Route element={<ProtectedRoute minRole="Admin" />}>
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/discounts" element={<Discounts />} />
                  <Route path="/revenue" element={<Revenue />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route element={<ProtectedRoute minRole="Owner" />}>
                  <Route path="/staff" element={<StaffPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
