import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import {
  getAllCentersGQL,
  getCenterInfoByIdGQL,
  deleteCenterGQL,
} from "../api/center_service/graphql/center.api.js";
import { getAllUsers } from "../../users/api/user_service/rest/user.api.js";
import LoadingSpinner from "../../../shared/ui/LoadingSpinner.jsx";
import { ROLES } from "../../../shared/constants/roles.js";
import {
  MdLocationOn,
  MdEdit,
  MdDelete,
  MdAdd,
  MdPerson,
  MdArrowBack,
} from "react-icons/md";
import CenterModal from "../ui/CenterModal.jsx"; // Đảm bảo import đúng đường dẫn

const CenterManagement = () => {
  const navigate = useNavigate();
  const { admin } = useContext(SessionContext);
  const [centers, setCenters] = useState([]);
  const [centerManagers, setCenterManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Helper: Lấy tên và trạng thái Manager
  const getManagerStatus = (managerId) => {
    if (!managerId)
      return { name: "Chưa phân công", isActive: true, isAssigned: false };
    const manager = centerManagers.find((m) => m.userId === managerId);
    if (!manager)
      return {
        name: "Manager không tồn tại",
        isActive: false,
        isAssigned: true,
      };
    return { name: manager.name, isActive: manager.isActive, isAssigned: true };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const usersRes = await getAllUsers({ role: "CENTER_MANAGER" });
      if (usersRes.success && Array.isArray(usersRes.data))
        setCenterManagers(usersRes.data);
      else setCenterManagers([]);

      const data = await getAllCentersGQL();
      setCenters(
        data.map((c) => ({
          ...c,
          coverImage: c.imageUrlList?.[0] || c.logoUrl,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const myCenters = useMemo(() => {
    if (!admin || !centers.length) return [];
    if (admin.role === ROLES.SUPER_ADMIN) return centers;
    const userId = admin.userId.replace("USER-", "");
    return centers.filter(
      (c) => (c.centerManagerId || "").replace("USER-", "") === userId,
    );
  }, [centers, admin]);

  const handleCreate = () => {
    setSelectedCenter(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEdit = async (e, centerSummary) => {
    e.stopPropagation();
    try {
      const detail = await getCenterInfoByIdGQL(centerSummary.centerId);
      setSelectedCenter(detail);
      setIsCreating(false);
      setIsModalOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa?")) {
      try {
        await deleteCenterGQL(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSave = async () => {
    loadData();
    alert("Lưu/Tạo Trung tâm thành công!");
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div style={{ padding: "30px", background: "#F9FAFB", minHeight: "100vh" }}>
      <CenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        center={selectedCenter}
        isCreating={isCreating}
        onSave={handleSave}
        centerManagers={centerManagers}
        allCenters={centers}
      />

      {/* HEADER CẢI TIẾN: Nút Back + Tiêu đề */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            color: "#555",
            transition: "all 0.2s",
          }}
          title="Quay lại"
        >
          <MdArrowBack size={24} />
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#111827" }}>
            Quản Lý Trung Tâm
          </h1>
          <p
            style={{
              color: "#6B7280",
              margin: "4px 0 0 0",
              fontSize: "0.9rem",
            }}
          >
            Danh sách các cơ sở cầu lông
          </p>
        </div>

        {admin?.role === ROLES.SUPER_ADMIN && (
          <button
            onClick={handleCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "#10B981",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
            }}
          >
            <MdAdd size={20} /> Thêm Mới
          </button>
        )}
      </div>

      {/* Grid Danh sách Center */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {myCenters.map((c) => {
          const managerStatus = getManagerStatus(c.centerManagerId);

          return (
            <div
              key={c.centerId}
              style={{
                background: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                position: "relative",
                border: "1px solid #f3f4f6",
                transition: "transform 0.2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  onClick={(e) => handleEdit(e, c)}
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    padding: "6px",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    color: "#2563EB",
                  }}
                  title="Chỉnh sửa"
                >
                  <MdEdit size={18} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, c.centerId)}
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    padding: "6px",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    color: "#DC2626",
                  }}
                  title="Xóa"
                >
                  <MdDelete size={18} />
                </button>
              </div>
              <img
                src={c.coverImage || "/default.png"}
                style={{ width: "100%", height: "180px", objectFit: "cover" }}
                alt=""
                onError={(e) => (e.target.src = "/default.png")}
              />
              <div style={{ padding: "15px" }}>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "1.1rem",
                    color: "#1F2937",
                  }}
                >
                  {c.name}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "start",
                    gap: "8px",
                    color: "#6B7280",
                    marginBottom: "12px",
                    fontSize: "0.9rem",
                    minHeight: "40px",
                  }}
                >
                  <MdLocationOn style={{ marginTop: "3px", flexShrink: 0 }} />
                  <span
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.address}
                  </span>
                </div>
                {admin?.role === ROLES.SUPER_ADMIN && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.85rem",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      marginTop: "10px",
                      background:
                        managerStatus.isAssigned && !managerStatus.isActive
                          ? "#FEF2F2"
                          : "#EFF6FF",
                      color:
                        managerStatus.isAssigned && !managerStatus.isActive
                          ? "#991B1B"
                          : "#1E40AF",
                      border:
                        managerStatus.isAssigned && !managerStatus.isActive
                          ? "1px solid #FECACA"
                          : "1px solid #DBEAFE",
                    }}
                  >
                    <MdPerson />
                    <span
                      style={{
                        fontWeight:
                          managerStatus.isAssigned && !managerStatus.isActive
                            ? "600"
                            : "500",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {managerStatus.name}
                    </span>
                    {managerStatus.isAssigned && !managerStatus.isActive && (
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          padding: "2px 6px",
                          background: "#DC2626",
                          color: "white",
                          borderRadius: "4px",
                        }}
                      >
                        KHÓA
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CenterManagement;
