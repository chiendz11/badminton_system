import React, { useState, useEffect, useContext, useMemo } from "react";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { ROLES } from "../../../shared/constants/roles.js";
import {
  createCenterGQL,
  updateCenterGQL,
} from "../api/center_service/graphql/center.api.js";
import { uploadImageREST } from "../api/center_service/rest/center.api.js";
import LoadingSpinner from "../../../shared/ui/LoadingSpinner.jsx";
import { MdClose, MdCloudUpload, MdAutoFixHigh } from "react-icons/md";

// --- Helper: Image Upload Box ---
const ImageUploadBox = ({
  label,
  images,
  onAdd,
  onRemove,
  isMultiple = false,
}) => (
  <div style={{ marginBottom: "15px" }}>
    <label style={{ fontWeight: "600", display: "block", marginBottom: "8px" }}>
      {label}
    </label>
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {images.map((img, idx) => (
        <div
          key={idx}
          style={{ position: "relative", width: "100px", height: "100px" }}
        >
          <img
            src={img.preview || img.url}
            alt="Preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
          <button
            type="button"
            onClick={() => onRemove(idx)}
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "red",
              color: "white",
              borderRadius: "50%",
              border: "none",
              width: "20px",
              height: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      ))}

      {(isMultiple || images.length === 0) && (
        <label
          style={{
            width: "100px",
            height: "100px",
            border: "2px dashed #ccc",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#666",
            background: "#FAFAFA",
          }}
        >
          <MdCloudUpload size={24} />
          <span style={{ fontSize: "0.7rem", marginTop: "4px" }}>
            {isMultiple ? "Thêm ảnh" : "Chọn ảnh"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple={isMultiple}
            onChange={(e) => onAdd(e.target.files)}
            style={{ display: "none" }}
          />
        </label>
      )}
    </div>
  </div>
);

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

  // State quản lý ảnh: Mỗi item có dạng { file: File|null, preview: string, id: string|null, url: string|null }
  const [logoImage, setLogoImage] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);

  const [isUploading, setIsUploading] = useState(false);

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

  // 2. Effect Load Data (ĐÃ FIX ĐỂ HIỂN THỊ ẢNH)
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

        // -----------------------------------------------------------
        // FIX LOGIC HIỂN THỊ ẢNH
        // Cần map đúng Url và FileId từ API trả về
        // -----------------------------------------------------------

        // 1. Load Logo
        if (center.logoUrl && center.logoFileId) {
          // Lưu ý: center.logoFileId lấy từ GraphQL (resolver đã map từ logo_file_id)
          setLogoImage([
            {
              url: center.logoUrl,
              id: center.logoFileId, // ID ảnh cũ
              file: null, // Không có file vật lý mới
              preview: center.logoUrl, // Dùng URL làm preview
            },
          ]);
        } else {
          setLogoImage([]);
        }

        // 2. Load Gallery
        // GraphQL trả về: imageUrlList (mảng url) và imageFileIds (mảng id)
        // Hai mảng này phải có độ dài bằng nhau và thứ tự tương ứng
        if (
          center.imageUrlList &&
          center.imageFileIds &&
          center.imageUrlList.length > 0
        ) {
          const mappedImages = center.imageUrlList.map((url, index) => ({
            url: url,
            id: center.imageFileIds[index], // Lấy ID tương ứng ở vị trí index
            file: null,
            preview: url,
          }));
          // Lọc bỏ những item bị lỗi (không có id hoặc url)
          setGalleryImages(mappedImages.filter((img) => img.id && img.url));
        } else {
          setGalleryImages([]);
        }
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
        setLogoImage([]);
        setGalleryImages([]);
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

  // UI Handlers cho Ảnh
  const handleAddImages = (files, type) => {
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file), // Tạo link blob để preview ảnh mới chọn
      id: null,
      url: null,
    }));
    if (type === "logo") setLogoImage(newImages.slice(0, 1));
    else setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index, type) => {
    if (type === "logo") setLogoImage([]);
    else setGalleryImages((prev) => prev.filter((_, i) => i !== index));
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

    // Xóa các field ID ảnh trong base data vì ta sẽ gán lại ID chính xác bên dưới
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
    setIsUploading(true);
    let currentCenterId = center?.centerId;

    try {
      const baseData = sanitizeData(formData, isCreating);
      let finalLogoId = null;

      // --- BƯỚC 1: Lấy ID Center (Nếu tạo mới) ---
      if (isCreating) {
        const createResult = await createCenterGQL({
          ...baseData,
          logoFileId: null,
          imageFileIds: [],
        });
        currentCenterId = createResult.centerId;
        if (!currentCenterId)
          throw new Error("Không lấy được ID trung tâm sau khi tạo.");
      } else {
        if (!currentCenterId)
          throw new Error("Không tìm thấy Center ID để cập nhật.");
      }

      // --- BƯỚC 2: Xử lý Logo ---
      // Ưu tiên: File mới upload > ID ảnh cũ > Null (nếu xóa hết)
      if (logoImage.length > 0) {
        if (logoImage[0].file) {
          // Case: Có upload ảnh mới
          const res = await uploadImageREST(
            currentCenterId,
            logoImage[0].file,
            "logo",
          );
          finalLogoId = res.fileId;
        } else if (logoImage[0].id) {
          // Case: Giữ nguyên ảnh cũ
          finalLogoId = logoImage[0].id;
        }
      }
      // Nếu logoImage rỗng -> finalLogoId = null

      // --- BƯỚC 3: Xử lý Gallery ---
      const finalGalleryIds = [];

      // Dùng for...of để chạy async await tuần tự (hoặc Promise.all nếu muốn nhanh)
      for (const img of galleryImages) {
        if (img.file) {
          // Ảnh mới -> Upload lấy ID mới
          const res = await uploadImageREST(
            currentCenterId,
            img.file,
            "gallery",
          );
          finalGalleryIds.push(res.fileId);
        } else if (img.id) {
          // Ảnh cũ -> Giữ lại ID cũ
          finalGalleryIds.push(img.id);
        }
      }

      // --- BƯỚC 4: Gọi API Update cuối cùng ---
      // Điều kiện: Nếu là Create và không có ảnh nào -> Không cần update
      // Nếu là Update -> Luôn gọi để cập nhật thông tin text hoặc ảnh xóa
      const isJustCreatedWithoutImages =
        isCreating && !finalLogoId && finalGalleryIds.length === 0;

      if (!isJustCreatedWithoutImages) {
        const updatePayload = {
          ...baseData,
          logoFileId: finalLogoId, // Gửi đúng camelCase theo API mới sửa
          imageFileIds: finalGalleryIds, // Gửi list ID đầy đủ (cũ + mới)
        };

        await updateCenterGQL(currentCenterId, updatePayload);
      }

      await onSave();
      onClose();
    } catch (error) {
      console.error("Submit Error:", error);
      const msg = error.message.includes("logo_file_id")
        ? "Lỗi hệ thống: Backend yêu cầu Logo nhưng chưa có cơ chế Default."
        : error.message;
      alert("Lỗi khi xử lý: " + msg);
    } finally {
      setIsUploading(false);
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
            {/* 1. KHU VỰC ẢNH */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "20px",
              }}
            >
              <ImageUploadBox
                label="Logo (1 ảnh)"
                images={logoImage}
                onAdd={(f) => handleAddImages(f, "logo")}
                onRemove={(i) => handleRemoveImage(i, "logo")}
              />
              <ImageUploadBox
                label="Gallery (Nhiều ảnh)"
                images={galleryImages}
                onAdd={(f) => handleAddImages(f, "gallery")}
                onRemove={(i) => handleRemoveImage(i, "gallery")}
                isMultiple={true}
              />
            </div>

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
              disabled={isUploading}
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
              disabled={isUploading}
              style={{
                padding: "10px 20px",
                background: isUploading ? "#86EFAC" : "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                minWidth: "120px",
              }}
            >
              {isUploading ? (
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
