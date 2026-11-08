import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "../features/identity/pages/Login.jsx";
import AdminLayout from "../shared/ui/AdminLayout.jsx";
import { ChatProvider } from "../shared/chat/ChatContext.jsx";
import AssistantDrawer from "../features/assistant/components/AssistantDrawer.tsx";
import LoginPromptModal from "../features/assistant/components/LoginPromptModal.jsx";
import LoginModal from "../features/assistant/components/LoginModal.jsx";

const Dashboard = lazy(
  () => import("../features/dashboard/pages/Dashboard.jsx"),
);
const BillManage = lazy(
  () => import("../features/booking/pages/BillManage.jsx"),
);
const CreateFixedBooking = lazy(
  () => import("../features/booking/pages/CreateFixedBooking.jsx"),
);
const CenterStatus = lazy(
  () => import("../features/booking/pages/CenterStatus.jsx"),
);
const CenterManagement = lazy(
  () => import("../features/centers/pages/CenterManagement.jsx"),
);

export default function App() {
  return (
    <ChatProvider>
      <Router>
        <AssistantDrawer />
        <LoginPromptModal />
        <LoginModal />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin-bill-list" element={<BillManage />} />
              <Route path="/center-status" element={<CenterStatus />} />
              <Route path="/center-management" element={<CenterManagement />} />
              <Route
                path="/create-fixed-booking"
                element={<CreateFixedBooking />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ChatProvider>
  );
}
