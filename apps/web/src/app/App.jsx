import React, { lazy, Suspense } from "react";
import "../shared/styles/App.css";
import "../shared/styles/global.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Header from "../shared/ui/Header.jsx";
import Footer from "../shared/ui/Footer.jsx";
import Scroll from "../shared/ui/Scroll.jsx";
import { ChatProvider } from "../shared/chat/ChatContext.jsx";
import AssistantDrawer from "../features/assistant/components/AssistantDrawer.tsx";
import LoginPromptModal from "../features/assistant/components/LoginPromptModal.jsx";
import LoginModal from "../features/assistant/components/LoginModal.jsx";

const Home = lazy(() => import("../features/home/pages/Home.jsx"));
const Centers = lazy(() => import("../features/centers/pages/Centers.jsx"));
const Booking = lazy(() => import("../features/booking/pages/Booking.jsx"));
const MyBookings = lazy(
  () => import("../features/booking/pages/MyBookings.jsx"),
);
const BookingAssistant = lazy(
  () => import("../features/assistant/pages/BookingAssistant.tsx"),
);

export default function App() {
  return (
    <ChatProvider>
      <Router>
        <Scroll />
        <AssistantDrawer />
        <LoginPromptModal />
        <LoginModal />
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Header />
                  <Home />
                  <Footer />
                </>
              }
            />
            <Route path="/centers" element={<Centers />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route
              path="/profile"
              element={<Navigate to="/my-bookings" replace />}
            />
            <Route path="/booking-assistant" element={<BookingAssistant />} />
            <Route path="*" element={<Navigate to="/centers" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ChatProvider>
  );
}
