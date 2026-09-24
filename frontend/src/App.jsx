import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import SiteLayout from './layouts/SiteLayout';
import Home from './pages/Home';
import Games from './pages/Games';
import Stations from './pages/Stations';
import Pricing from './pages/Pricing';
import BookSession from './pages/BookSession';
import Events from './pages/Events';
import About from './pages/About';
import Contact from './pages/Contact';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import CustomerAccount from './pages/CustomerAccount';
import MyBookings from './pages/MyBookings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <CustomerAuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/book" element={<BookSession />} />
            <Route path="/events" element={<Events />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<CustomerLogin />} />
            <Route path="/register" element={<CustomerRegister />} />
            <Route path="/account" element={<CustomerAccount />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </CustomerAuthProvider>
    </BrowserRouter>
  );
}
