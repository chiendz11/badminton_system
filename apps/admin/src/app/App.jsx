import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLayout from "../shared/ui/AdminLayout.jsx";

// import CenterManagerRoute from './components/CenterManagerRoute.jsx'; // Không cần import nếu không dùng

// Import Pages
const Dashboard = lazy(
  () => import("../features/dashboard/pages/Dashboard.jsx"),
);

const News = lazy(() => import("../features/news/pages/news.jsx"));
const Rating = lazy(
  () => import("../features/ratings/pages/ratingManagement.jsx"),
);
const Account = lazy(() => import("../features/account/pages/Account.jsx"));
const Shop = lazy(() => import("../features/inventory/pages/shop.jsx")); // Trang bán hàng
const Stock = lazy(
  () => import("../features/inventory/pages/stockManagement.jsx"),
);
const Report = lazy(() => import("../features/reports/pages/Report.jsx"));
const UserManage = lazy(() => import("../features/users/pages/UserManage.jsx"));
const AdminBillList = lazy(
  () => import("../features/booking/pages/BillManage.jsx"),
);
const CreateFixedBooking = lazy(
  () => import("../features/booking/pages/CreateFixedBooking.jsx"),
);
const CourtStatusPage = lazy(
  () => import("../features/booking/pages/CenterStatus.jsx"),
);
const CenterManagerManagement = lazy(
  () => import("../features/users/pages/CenterManagerManagement.jsx"),
);
const CenterManagement = lazy(
  () => import("../features/centers/pages/CenterManagement.jsx"),
);

function App() {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to={"/dashboard"} replace />} />

          {/* GUARD CẤP 1: ADMIN LAYOUT (ÁP DỤNG CHO CẢ SUPER_ADMIN VÀ CENTER_MANAGER) */}
          <Route element={<AdminLayout />}>
            {/* 1. CÁC ROUTE CHUNG (CẢ 2 VAI TRÒ ĐỀU THẤY) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin-bill-list" element={<AdminBillList />} />
            <Route path="/center-status" element={<CourtStatusPage />} />

            {/* QUẢN LÝ TRUNG TÂM (Đã có logic tự lọc quyền) */}
            <Route path="/center-management" element={<CenterManagement />} />

            {/* 💡 SỬA: ĐƯA SHOP RA ĐÂY ĐỂ CẢ 2 CÙNG XEM ĐƯỢC */}
            <Route path="/shop" element={<Shop />} />

            {/* 2. ROUTE CHỈ DÀNH CHO SUPER ADMIN (BẢO VỆ CẤP CAO) */}

            <Route path="/report" element={<Report />} />

            <Route path="/stock" element={<Stock />} />

            <Route
              path="/create-fixed-booking"
              element={<CreateFixedBooking />}
            />

            <Route path="/users-manage" element={<UserManage />} />

            <Route path="/ratings" element={<Rating />} />

            <Route path="/news" element={<News />} />

            <Route
              path="/center-manager-management"
              element={<CenterManagerManagement />}
            />

            {/* Route lỗi 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to={"/dashboard"} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
