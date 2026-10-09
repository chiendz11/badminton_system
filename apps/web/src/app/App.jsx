import React, { lazy, Suspense } from "react";
import "../shared/styles/App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "../shared/ui/Header.jsx";
import Footer from "../shared/ui/Footer.jsx";
const Home = lazy(() => import("../features/home/pages/Home.jsx"));
import "../shared/styles/global.css";
const BookingSchedule = lazy(
  () => import("../features/booking/pages/Booking.jsx"),
);
const BookingAssistant = lazy(
  () => import("../features/assistant/pages/BookingAssistant.tsx"),
);
const News = lazy(() => import("../features/news/pages/News.jsx"));

const Centers = lazy(() => import("../features/centers/pages/Centers.jsx"));
const Policy = lazy(() => import("../features/information/pages/Policy.jsx"));
const Contact = lazy(() => import("../features/contact/pages/Contact.jsx"));
const Competition = lazy(
  () => import("../features/competition/pages/Competition.jsx"),
);
const UserProfile = lazy(
  () => import("../features/profile/pages/UserProfile.jsx"),
);
const Service = lazy(() => import("../features/information/pages/Service.jsx"));

import WeatherDisplay from "../shared/ui/WeatherDisplay.jsx";
import Scroll from "../shared/ui/Scroll.jsx";

// 💡 IMPORT TRANG NOTIFICATIONS MỚI
const Notifications = lazy(
  () => import("../features/notifications/pages/Notifications.jsx"),
);

function App() {
  return (
    <Router>
      <Scroll />
      <Suspense fallback={null}>
        <Routes>
          {/* 1. CÁC ROUTE CÔNG KHAI */}
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
          <Route path="/service" element={<Service />} />
          <Route path="/competition" element={<Competition />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/centers" element={<Centers />} />
          <Route path="/news" element={<News />} />

          {/* 2. CÁC ROUTE CÁ NHÂN (CẦN BẢO VỆ) */}

          <Route path="/profile" element={<UserProfile />} />

          <Route path="/booking" element={<BookingSchedule />} />
          <Route path="/booking-assistant" element={<BookingAssistant />} />

          {/* 💡 THÊM ROUTE NÀY VÀO ĐÂY */}

          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Suspense>
      <WeatherDisplay />
    </Router>
  );
}

export default App;
