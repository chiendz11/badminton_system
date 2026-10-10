import React, { useState, useEffect, useContext, useMemo } from "react";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { ROLES } from "../../../shared/constants/roles.js";
import {
  createCenterGQL,
  updateCenterGQL,
} from "../api/center_service/graphql/center.api.js";
import LoadingSpinner from "../../../shared/ui/LoadingSpinner.jsx";
import { MdClose, MdAutoFixHigh } from "react-icons/md";

// --- Helper: TimeSlot Row (Giữ nguyên) ---
const TimeSlotRow = ({ slot, onChange, onRemove }) => (
  <div
    style={{
      display: "flex",
      gap: "5px",
      marginBottom: "5px",
      alignItems: "center",
    }}
  >
    <input
      type="time"
      value={slot.startTime || ""}
      onChange={(e) => onChange("startTime", e.target.value)}
      style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ddd" }}
    />
    <span>-</span>
    <input
      type="time"
      value={slot.endTime || ""}
      onChange={(e) => onChange("endTime", e.target.value)}
      style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ddd" }}
    />
    <input
      type="number"
      placeholder="Giá"
      value={slot.price || ""}
      onChange={(e) => onChange("price", parseFloat(e.target.value))}
      style={{
        width: "80px",
        padding: "5px",
        borderRadius: "4px",
        border: "1px solid #ddd",
      }}
    />
    <button
      type="button"
      onClick={onRemove}
      style={{
        color: "red",
        border: "none",
        background: "none",
        cursor: "pointer",
      }}
    >
      X
    </button>
  </div>
);

// =================================================================================
// --- MAIN COMPONENT: CenterModal ---
// =================================================================================
const defaultPricing = { weekday: [], weekend: [] };

const CenterModal = ({
  center,
  isOpen,
  onClose,
  onSave,
  isCreating,
  centerManagers,
  allCenters,
}) => {
  const { admin } = useContext(SessionContext);
  const [formData, setFormData] = useState({});

  const [isSaving, setIsSaving] = useState(false);

  // 1. Logic lọc Managers (Giữ nguyên)
  const availableManagers = useMemo(() => {
    if (!centerManagers || admin?.role !== ROLES.SUPER_ADMIN) return [];
    const currentCenterId = center?.centerId;
    const currentManagerId = center?.centerManagerId;
    const assignedToOthersIds = new Set(
      allCenters
        .filter((c) => c.centerId !== currentCenterId && c.centerManagerId)
        .map((c) => c.centerManagerId),
    );

    return centerManagers
      .map((m) => {
        const isCurrentlyAssigned = m.userId === currentManagerId;
        const isAssignedElsewhere =
          assignedToOthersIds.has(m.userId) && !isCurrentlyAssigned;
        let statusText = "";
        if (!m.isActive) statusText = " (BỊ KHÓA)";
        else if (isAssignedElsewhere) statusText = " (Đã gán cho nơi khác)";
        else statusText = " (Active)";

        return {
          ...m,
          isDisabled: isAssignedElsewhere,
          statusText: statusText,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [centerManagers, center, allCenters, admin]);

  // 2. Load dữ liệu trung tâm và bảng giá khi mở form
  useEffect(() => {
    if (isOpen) {
      if (center && !isCreating) {
        // Load thông tin text
        setFormData({
          ...center,
          pricing: center.pricing || defaultPricing,
          facilitiesString: center.facilities
            ? center.facilities.join(", ")
            : "",
          centerManagerId: center.centerManagerId || "",
        });
      } else {
        // Reset form khi tạo mới
        setFormData({
          name: "",
          address: "",
          phone: "",
          description: "",
          totalCourts: 0,
          googleMapUrl: "",
          isActive: true,
          centerManagerId: "",
          facilitiesString: "",
          pricing: defaultPricing,
        });
      }
    }
  }, [center, isOpen, isCreating]);

  // ... (Giữ nguyên logic UX đóng modal, Smart Embed, Handlers) ...
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleAutoGenerateMap = () => {
    if (!formData.address || formData.address.trim() === "") {
      alert("Vui lòng nhập ô 'Địa chỉ' ở trên trước!");
      return;
    }
    const encodedAddress = encodeURIComponent(formData.address);
    const autoUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    setFormData((prev) => ({ ...prev, googleMapUrl: autoUrl }));
  };

  const handleMapUrlChange = (e) => {
    let val = e.target.value;
    const iframeSrcRegex = /src="([^"]+)"/;
    const match = val.match(iframeSrcRegex);
    if (match && match[1]) val = match[1];
    setFormData((prev) => ({ ...prev, googleMapUrl: val }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePricingChange = (type, index, field, value) => {
    const newPricing = { ...formData.pricing };
    newPricing[type] = [...newPricing[type]];
    newPricing[type][index] = { ...newPricing[type][index], [field]: value };
    setFormData((prev) => ({ ...prev, pricing: newPricing }));
  };
  const addTimeSlot = (type) => {
    const newPricing = { ...formData.pricing };
    newPricing[type] = [
      ...(newPricing[type] || []),
      { startTime: "08:00", endTime: "09:00", price: 50000 },
    ];
    setFormData((prev) => ({ ...prev, pricing: newPricing }));
  };
  const removeTimeSlot = (type, index) => {
    const newPricing = { ...formData.pricing };
    newPricing[type] = newPricing[type].filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, pricing: newPricing }));
  };

  // 6. Submit Logic
  const sanitizeData = (data, isCreation = false) => {
    const submit = {
      ...data,
      totalCourts: parseInt(data.totalCourts || 0),
      facilities: data.facilitiesString
        ? data.facilitiesString
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f !== "")
        : [],
      centerManagerId:
        data.centerManagerId === "" ? null : data.centerManagerId,
    };

    // Clean data rác
    delete submit.facilitiesString;
    delete submit.logoUrl;
    delete submit.imageUrlList;
    delete submit.coverImage;
    delete submit._id;

    // Không sửa metadata ảnh khi Storage không thuộc phạm vi hiện tại.
    delete submit.logo_file_id;
    delete submit.logoFileId;
    delete submit.image_file_ids;
    delete submit.imageFileIds;

    delete submit.bookingCount;
    delete submit.avgRating;
    delete submit.courts;
    if (!isCreation) delete submit.centerId;

    if (submit.pricing) {
      const cleanSlots = (slots) =>
        slots?.map(({ startTime, endTime, price }) => ({
          startTime,
          endTime,
          price: parseFloat(price),
        })) || [];
      submit.pricing = {
        weekday: cleanSlots(submit.pricing.weekday),
        weekend: cleanSlots(submit.pricing.weekend),
      };
    }
    return submit;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = sanitizeData(formData, isCreating);
      if (isCreating) await createCenterGQL(data);
      else {
        if (!center?.centerId)
          throw new Error("Không tìm thấy Center ID để cập nhật.");
        await updateCenterGQL(center.centerId, data);
      }
      await onSave();
      onClose();
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "12px",
          width: "900px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fff",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
            {isCreating ? "Thêm Mới" : "Cập Nhật"} Trung Tâm
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              cursor: "pointer",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdClose size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* BODY */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {/* 2. CÁC INPUT TEXT CƠ BẢN */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  Tên *
                </label>
                <input
                  required
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  SĐT *
                </label>
                <input
                  required
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                Địa chỉ *
              </label>
              <input
                required
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            {/* 3. CENTER MANAGER (Chỉ Admin thấy) */}
            {admin?.role === ROLES.SUPER_ADMIN && (
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  Center Manager
                </label>
                <select
                  name="centerManagerId"
                  value={formData.centerManagerId || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">-- Chọn Manager (Chưa phân công) --</option>
                  {availableManagers.map((manager) => (
                    <option
                      key={manager.userId}
                      value={manager.userId}
                      disabled={manager.isDisabled}
                    >
                      {manager.name} {manager.statusText}
                    </option>
                  ))}
                </select>
                {!isCreating &&
                  formData.centerManagerId &&
                  centerManagers.find(
                    (m) => m.userId === formData.centerManagerId && !m.isActive,
                  ) && (
                    <p
                      style={{
                        color: "#DC2626",
                        marginTop: "5px",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                      }}
                    >
                      ⚠️ Quản lý này đang bị KHÓA. Hãy phân công lại.
                    </p>
                  )}
              </div>
            )}

            {/* 4. SỐ SÂN & MAP */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "15px",
              }}
            >
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  Số sân
                </label>
                <input
                  type="number"
                  name="totalCourts"
                  value={formData.totalCourts || 0}
                  onChange={handleChange}
                  disabled={!isCreating}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: !isCreating ? "#f0f0f0" : "white",
                    cursor: !isCreating ? "not-allowed" : "text",
                  }}
                />
                {!isCreating && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#6B7280",
                      marginTop: "4px",
                    }}
                  >
                    *Chỉ được thiết lập khi tạo mới.
                  </p>
                )}
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "5px",
                  }}
                >
                  <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                    Google Map URL
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateMap}
                    style={{
                      fontSize: "0.75rem",
                      background: "#E0F2FE",
                      color: "#0369A1",
                      border: "none",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: "600",
                    }}
                  >
                    <MdAutoFixHigh /> Tự động tạo
                  </button>
                </div>
                <input
                  name="googleMapUrl"
                  value={formData.googleMapUrl || ""}
                  onChange={handleMapUrlChange}
                  placeholder="Dán link hoặc mã nhúng iframe..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {formData.googleMapUrl && (
                  <div
                    style={{
                      marginTop: "8px",
                      height: "150px",
                      border: "1px solid #eee",
                      borderRadius: "6px",
                      overflow: "hidden",
                      background: "#f9f9f9",
                      position: "relative",
                    }}
                  >
                    <iframe
                      src={formData.googleMapUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      title="Map Preview"
                    ></iframe>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                Mô tả
              </label>
              <textarea
                name="description"
                rows="3"
                value={formData.description || ""}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                Tiện ích (phân cách phẩy)
              </label>
              <input
                name="facilitiesString"
                value={formData.facilitiesString || ""}
                onChange={handleChange}
                placeholder="Wifi, Điều hòa..."
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            {/* 5. PRICING */}
            <div style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Bảng giá</h4>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <label style={{ fontWeight: "600" }}>Ngày thường</label>
                    <button
                      type="button"
                      onClick={() => addTimeSlot("weekday")}
                      style={{
                        fontSize: "0.8rem",
                        background: "#E5E7EB",
                        border: "none",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      + Thêm
                    </button>
                  </div>
                  {formData.pricing?.weekday?.map((slot, idx) => (
                    <TimeSlotRow
                      key={idx}
                      slot={slot}
                      onChange={(f, v) =>
                        handlePricingChange("weekday", idx, f, v)
                      }
                      onRemove={() => removeTimeSlot("weekday", idx)}
                    />
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <label style={{ fontWeight: "600" }}>Cuối tuần</label>
                    <button
                      type="button"
                      onClick={() => addTimeSlot("weekend")}
                      style={{
                        fontSize: "0.8rem",
                        background: "#E5E7EB",
                        border: "none",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      + Thêm
                    </button>
                  </div>
                  {formData.pricing?.weekend?.map((slot, idx) => (
                    <TimeSlotRow
                      key={idx}
                      slot={slot}
                      onChange={(f, v) =>
                        handlePricingChange("weekend", idx, f, v)
                      }
                      onRemove={() => removeTimeSlot("weekend", idx)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {!isCreating && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive || false}
                    onChange={handleChange}
                  />{" "}
                  Đang hoạt động
                </label>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: "15px 20px",
              borderTop: "1px solid #eee",
              background: "#f9f9f9",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              borderRadius: "0 0 12px 12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: "10px 20px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "10px 20px",
                background: isSaving ? "#86EFAC" : "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                minWidth: "120px",
              }}
            >
              {isSaving ? (
                <LoadingSpinner size="small" color="white" />
              ) : isCreating ? (
                "Tạo Mới"
              ) : (
                "Lưu Lại"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CenterModal;
