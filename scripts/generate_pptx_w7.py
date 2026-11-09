#!/usr/bin/env python3
"""
Generate comprehensive, professional 15-slide PowerPoint report for Week 7
Badminton Manager V2 Project.
"""

import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# --- Color Palette ---
NAVY = RGBColor(15, 23, 42)          # #0f172a
NAVY_CARD = RGBColor(30, 41, 59)     # #1e293b
BLUE = RGBColor(37, 99, 235)         # #2563eb
BLUE_LIGHT = RGBColor(239, 246, 255) # #eff6ff
BLUE_BORDER = RGBColor(191, 219, 254)# #bfdbfe
GREEN = RGBColor(16, 185, 129)       # #10b981
GREEN_LIGHT = RGBColor(236, 253, 245)# #ecfdf5
GREEN_BORDER = RGBColor(167, 243, 208)
AMBER = RGBColor(245, 158, 11)       # #f59e0b
AMBER_LIGHT = RGBColor(254, 243, 199)
AMBER_BORDER = RGBColor(253, 230, 138)
RED = RGBColor(239, 68, 68)          # #ef4444
RED_LIGHT = RGBColor(254, 242, 242)
SLATE_BG = RGBColor(248, 250, 252)   # #f8fafc
WHITE = RGBColor(255, 255, 255)
BORDER_GRAY = RGBColor(226, 232, 240)# #e2e8f0
TEXT_DARK = RGBColor(15, 23, 42)
TEXT_MUTED = RGBColor(100, 116, 139) # #64748b
TEXT_LIGHT = RGBColor(241, 245, 249)

TOTAL_SLIDES = 15
FONT_HEADING = "Arial"
FONT_BODY = "Arial"

def set_slide_bg(slide, prs, color):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    return bg

def add_header(slide, prs, title, category="BÁO CÁO TIẾN ĐỘ TUẦN 7", slide_num=1):
    # Category badge
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8.0), Inches(0.35))
    tf_c = cat_box.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
    p_c = tf_c.paragraphs[0]
    p_c.text = category.upper()
    p_c.font.name = FONT_HEADING
    p_c.font.size = Pt(10)
    p_c.font.bold = True
    p_c.font.color.rgb = BLUE

    # Main Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.7), Inches(0.6))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(20)
    p_t.font.bold = True
    p_t.font.color.rgb = TEXT_DARK

    # Divider line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.35), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER_GRAY
    line.line.fill.background()

    # Footer
    foot_left = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(8.0), Inches(0.3))
    tf_fl = foot_left.text_frame
    tf_fl.margin_left = tf_fl.margin_top = tf_fl.margin_right = tf_fl.margin_bottom = 0
    p_fl = tf_fl.paragraphs[0]
    p_fl.text = "Badminton Manager V2 • Báo cáo Tuần 7 — Lát cắt Đặt sân & Xác thực"
    p_fl.font.name = FONT_BODY
    p_fl.font.size = Pt(9.5)
    p_fl.font.color.rgb = TEXT_MUTED

    foot_right = slide.shapes.add_textbox(Inches(9.5), Inches(7.05), Inches(3.0), Inches(0.3))
    tf_fr = foot_right.text_frame
    tf_fr.margin_left = tf_fr.margin_top = tf_fr.margin_right = tf_fr.margin_bottom = 0
    p_fr = tf_fr.paragraphs[0]
    p_fr.alignment = PP_ALIGN.RIGHT
    p_fr.text = f"Trang {slide_num} / {TOTAL_SLIDES}"
    p_fr.font.name = FONT_BODY
    p_fr.font.size = Pt(9.5)
    p_fr.font.color.rgb = TEXT_MUTED

def add_card(slide, left, top, width, height, bg_color=WHITE, border_color=BORDER_GRAY):
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
    else:
        card.line.fill.background()
    return card

def add_image_fit(slide, img_path, left, top, max_width, max_height, border_color=BORDER_GRAY):
    if not os.path.exists(img_path):
        print(f"Warning: image {img_path} not found!")
        return
    im = Image.open(img_path)
    orig_w, orig_h = im.size
    
    scale = min(max_width / orig_w, max_height / orig_h)
    target_w = orig_w * scale
    target_h = orig_h * scale
    
    offset_x = left + (max_width - target_w) / 2
    offset_y = top + (max_height - target_h) / 2
    
    pic = slide.shapes.add_picture(img_path, offset_x, offset_y, target_w, target_h)
    if border_color:
        pic.line.color.rgb = border_color
        pic.line.width = Pt(1)
    return pic

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]
    
    sc_dir = "docs/reports/screenshots"

    # =========================================================================
    # SLIDE 1: COVER SLIDE (DARK THEME)
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide1, prs, NAVY)
    
    # Tag badge
    badge = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.1), Inches(4.8), Inches(0.42))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(30, 58, 138)
    badge.line.fill.background()
    tf_b = badge.text_frame
    p_b = tf_b.paragraphs[0]
    p_b.text = "DỰ ÁN HỆ THỐNG QUẢN LÝ SÂN CẦU LÔNG V2"
    p_b.alignment = PP_ALIGN.CENTER
    p_b.font.name = FONT_HEADING
    p_b.font.size = Pt(11)
    p_b.font.bold = True
    p_b.font.color.rgb = RGBColor(191, 219, 254)

    # Title
    t_box = slide1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(1.8))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    p1 = tf_t.paragraphs[0]
    p1.text = "BÁO CÁO TIẾN ĐỘ TUẦN 7"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    
    p2 = tf_t.add_paragraph()
    p2.text = "Lát Cắt Đặt Sân (Booking Vertical Slice) & Đồng Bộ Trải Nghiệm Người Dùng"
    p2.font.name = FONT_HEADING
    p2.font.size = Pt(21)
    p2.font.color.rgb = RGBColor(147, 197, 253)
    p2.space_before = Pt(8)

    # Weekly gate status banner
    status_card = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(3.9), Inches(11.333), Inches(1.1))
    status_card.fill.solid()
    status_card.fill.fore_color.rgb = NAVY_CARD
    status_card.line.color.rgb = GREEN
    status_card.line.width = Pt(1.5)
    tf_s = status_card.text_frame
    tf_s.word_wrap = True
    p_s1 = tf_s.paragraphs[0]
    p_s1.text = "🏆 NGHIỆM THU WEEKLY GATE TUẦN 7: ĐẠT 100% TIÊU CHÍ (OFFICIALLY PASSED)"
    p_s1.font.name = FONT_HEADING
    p_s1.font.size = Pt(15)
    p_s1.font.bold = True
    p_s1.font.color.rgb = RGBColor(52, 211, 153)
    
    p_s2 = tf_s.add_paragraph()
    p_s2.text = "✓ 2 User giữ cùng 1 slot: Đúng 1 thành công (ACID Exclusion Constraint)  |  ✓ Web kết nối API backend thật  |  ✓ Access Rules & RBAC phân quyền bảo đảm an toàn"
    p_s2.font.name = FONT_BODY
    p_s2.font.size = Pt(11.5)
    p_s2.font.color.rgb = TEXT_LIGHT
    p_s2.space_before = Pt(5)

    # Info grid at bottom
    info_box = slide1.shapes.add_textbox(Inches(1.0), Inches(5.35), Inches(11.333), Inches(1.4))
    tf_i = info_box.text_frame
    tf_i.word_wrap = True
    
    p_i1 = tf_i.paragraphs[0]
    p_i1.text = "Nhóm phát triển: 5 thành viên phụ trách 5 dịch vụ lõi (W07-N1 → W07-N5)"
    p_i1.font.name = FONT_BODY
    p_i1.font.size = Pt(12.5)
    p_i1.font.bold = True
    p_i1.font.color.rgb = WHITE
    
    p_i2 = tf_i.add_paragraph()
    p_i2.text = "• Người 1 (Booking Core ACID)    • Người 2 (Web UI & Integration)    • Người 3 (Social & Realtime)    • Người 4 (Identity MVP & RBAC)    • Người 5 (AI Assistant & Platform K8s)"
    p_i2.font.name = FONT_BODY
    p_i2.font.size = Pt(11)
    p_i2.font.color.rgb = RGBColor(203, 213, 225)
    p_i2.space_before = Pt(4)

    p_i3 = tf_i.add_paragraph()
    p_i3.text = "Môi trường nghiệm thu: Cụm K3d Kubernetes Local (16/16 Pods Running) & CI/CD Pipeline (23/23 Checks Green) | Ngày: 09/11/2026"
    p_i3.font.name = FONT_BODY
    p_i3.font.size = Pt(10.5)
    p_i3.font.color.rgb = TEXT_MUTED
    p_i3.space_before = Pt(6)

    # =========================================================================
    # SLIDE 2: MỤC TIÊU TUẦN 7 & NGHIỆM THU WEEKLY GATE
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide2, prs, SLATE_BG)
    add_header(slide2, prs, "Mục Tiêu Trọng Tâm Tuần 7 & Nghiệm Thu Weekly Gate", "TỔNG QUAN & ĐỐI CHIẾU TIÊU CHÍ", 2)

    # Left Column: Kế hoạch Baseline
    card_l = add_card(slide2, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    tb_l = slide2.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf_l = tb_l.text_frame
    tf_l.word_wrap = True
    
    p = tf_l.paragraphs[0]
    p.text = "🎯 Mục tiêu Kế hoạch Baseline Tuần 7"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    bullets_l = [
        ("Lát cắt nghiệp vụ cốt lõi (Vertical Slice):", "Xây dựng luồng xuyên suốt từ Tìm kiếm sân trống → Giữ chỗ tạm thời (Hold 10 phút) → Tạo Đặt sân thật."),
        ("Bảo toàn tính toàn vẹn dữ liệu (ACID):", "Ngăn chặn triệt để rủi ro Double-booking (đặt trùng slot) khi nhiều người dùng cùng tranh chấp 1 khung giờ."),
        ("Đưa Web Frontend thoát ly Mock Data:", "Giao diện Web gọi trực tiếp API thật của Booking Core và Identity Service, phản ánh trạng thái sân thời gian thực."),
        ("Định danh & Phân quyền chuẩn mực:", "Hoàn thiện Identity MVP (Đăng ký/Đăng nhập JWT) và thiết lập hàng rào bảo vệ tài nguyên RBAC (Customer, Manager, Super Admin)."),
        ("Trợ lý AI & Bộ tri thức FAQ:", "Xây dựng AI FAQ giải đáp quy chế sân bãi, đồng thời vận hành cụm K8s local đồng bộ 100% microservices.")
    ]
    for title, desc in bullets_l:
        p_t = tf_l.add_paragraph()
        p_t.text = f"• {title} "
        p_t.font.name = FONT_BODY
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = BLUE
        p_t.space_before = Pt(8)
        
        # Add normal text inline
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_DARK

    # Right Column: 3 Tiêu chí Weekly Gate
    card_r = add_card(slide2, Inches(6.7), Inches(1.6), Inches(5.8), Inches(5.2))
    tb_r = slide2.shapes.add_textbox(Inches(6.9), Inches(1.8), Inches(5.4), Inches(4.8))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True

    p = tf_r.paragraphs[0]
    p.text = "✅ Nghiệm Thu 3 Tiêu Chí Weekly Gate Tuần 7"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = GREEN

    gates = [
        ("Tiêu chí 1: Concurrency Control (ACID)", "2 user cùng giữ 1 slot: Tối đa 1 người thành công", 
         "ĐẠT 100% - PASSED", GREEN,
         "Áp dụng PostgreSQL GiST Exclusion Constraint trên trường thời gian (tsrange). Kiểm thử tự động chạy giả lập 20 luồng đồng thời: Đúng 1 luồng giành slot (201 Created), 19 luồng nhận 409 Conflict."),
        
        ("Tiêu chí 2: Web Frontend Integration", "Web gọi API thật thay vì dùng Stub/Mock", 
         "ĐẠT 100% - PASSED", GREEN,
         "Frontend (apps/web) gọi trực tiếp endpoint /availability và /reservations. Lưới sân hiển thị đúng dữ liệu thực tế từ cơ sở dữ liệu PostgreSQL qua API Gateway."),
        
        ("Tiêu chí 3: Access Rules & Identity", "Access rule cơ bản pass, phân quyền chính xác", 
         "ĐẠT 100% - PASSED", GREEN,
         "Identity MVP hoàn thành đầy đủ cơ chế mã hóa JWT và NestJS Auth Guards. Người dùng thông thường không thể truy cập Admin Portal, API được bảo vệ nghiêm ngặt.")
    ]

    for title, rule, status, stat_color, detail in gates:
        p_g = tf_r.add_paragraph()
        p_g.text = f"{title}"
        p_g.font.name = FONT_HEADING
        p_g.font.size = Pt(12)
        p_g.font.bold = True
        p_g.font.color.rgb = TEXT_DARK
        p_g.space_before = Pt(10)

        p_sub = tf_r.add_paragraph()
        p_sub.text = f"Yêu cầu: {rule} → "
        p_sub.font.name = FONT_BODY
        p_sub.font.size = Pt(10)
        p_sub.font.color.rgb = TEXT_MUTED
        run_st = p_sub.add_run()
        run_st.text = status
        run_st.font.bold = True
        run_st.font.color.rgb = stat_color

        p_det = tf_r.add_paragraph()
        p_det.text = detail
        p_det.font.name = FONT_BODY
        p_det.font.size = Pt(10)
        p_det.font.color.rgb = TEXT_DARK
        p_det.space_before = Pt(2)

    # =========================================================================
    # SLIDE 3: KIẾN TRÚC HẠ TẦNG KÉP & GITOPS K3S
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide3, prs, SLATE_BG)
    add_header(slide3, prs, "Toàn Cảnh Kiến Trúc Hạ Tầng Kép & Trạng Thái Cụm K3s", "HẠ TẦNG KỸ THUẬT & GITOPS", 3)

    # Left column: Description
    card_s3 = add_card(slide3, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s3 = slide3.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s3 = tb_s3.text_frame
    tf_s3.word_wrap = True

    p = tf_s3.paragraphs[0]
    p.text = "Vận Hành Hạ Tầng Kép (Dual-Runtime)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s3 = [
        ("Mô hình song hành Local:", "Hệ thống hỗ trợ 2 môi trường: Docker Compose (cho phát triển nhanh, debug cục bộ) và K3d Kubernetes (mô phỏng chuẩn Production, ingress routing, GitOps)."),
        ("Trạng thái 16/16 Pods Running:", "Toàn bộ cụm K8s bao gồm 7 Microservices (Booking, Identity, Content, Social, AI, Gateway, Web/Admin) và 4 Cụm dữ liệu (Postgres, Mongo, Redis, RabbitMQ) đều ở trạng thái 1/1 Running."),
        ("GitOps với Argo CD:", "Hai ứng dụng Argo CD ('badminton-local-platform' và 'badminton-local-apps') tự động đối soát Declarative manifests, bảo đảm không có cấu hình trôi dạt (Configuration Drift)."),
        ("Điều phối lưu lượng Ingress:", "Traefik/Nginx Ingress lắng nghe tại cổng 18081, phân phối chuẩn xác request tới từng dịch vụ tương ứng qua DNS local.")
    ]
    for b_title, b_desc in bullets_s3:
        p_b = tf_s3.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    # Right column: Screenshot
    card_img3 = add_card(slide3, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img3_path = os.path.join(sc_dir, "06_k3d_cluster_cli.png")
    add_image_fit(slide3, img3_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap3 = slide3.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap3 = cap3.text_frame
    p_cap3 = tf_cap3.paragraphs[0]
    p_cap3.alignment = PP_ALIGN.CENTER
    p_cap3.text = "Minh chứng thực tế: Cụm K3d với 16/16 Pods Running & Argo CD Healthy"
    p_cap3.font.name = FONT_BODY
    p_cap3.font.size = Pt(9.5)
    p_cap3.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 4: W07-N1 (BOOKING CORE ACID)
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide4, prs, SLATE_BG)
    add_header(slide4, prs, "W07-N1 (Người 1): Booking Core & Giải Thuật Khóa Giữ Chỗ ACID", "CHI TIẾT NHIỆM VỤ THÀNH VIÊN", 4)

    card_s4 = add_card(slide4, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s4 = slide4.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s4 = tb_s4.text_frame
    tf_s4.word_wrap = True

    p = tf_s4.paragraphs[0]
    p.text = "Kiến Trúc Concurrency & Phòng Chống Double-Booking"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s4 = [
        ("Bộ API Lõi Hoàn Chỉnh:", "Triển khai đầy đủ các endpoint: tra cứu sân trống (/availability), giữ chỗ tạm thời (/reservations), và tạo đặt sân (/bookings) trên NestJS + Prisma ORM."),
        ("Cơ Chế Giữ Chỗ Tạm Thời 10 Phút:", "Khi người dùng chọn sân, hệ thống cấp khóa tạm (Hold 10 phút) có cơ chế đếm ngược. Scheduler nền quét và giải phóng slot ngay khi hết hạn."),
        ("PostgreSQL GiST Exclusion Constraint:", "Áp dụng ràng buộc loại trừ độc quyền ở tầng cơ sở dữ liệu trên trường tsrange và court_id. Triệt tiêu hoàn toàn race condition ở tầng ứng dụng."),
        ("Quy Tắc Hủy Nghiêm Ngặt:", "Slot đã thanh toán KHÔNG được hủy (tránh spam bot giữ/hủy trục lợi, phải thông qua chợ pass sân). Reservation tự hủy khi hết 10 phút hoặc quá giờ bắt đầu slot."),
        ("Kiểm Thử Tải Concurrency:", "Chạy 19 integration tests mô phỏng 20 tiến trình cùng tranh chấp 1 slot: kết quả chỉ đúng 1 tiến trình thành công, 19 tiến trình nhận lỗi 409.")
    ]
    for b_title, b_desc in bullets_s4:
        p_b = tf_s4.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(5)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    card_img4 = add_card(slide4, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img4_path = os.path.join(sc_dir, "07_booking_acid_tests.png")
    add_image_fit(slide4, img4_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap4 = slide4.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap4 = cap4.text_frame
    p_cap4 = tf_cap4.paragraphs[0]
    p_cap4.alignment = PP_ALIGN.CENTER
    p_cap4.text = "Minh chứng thực tế: 19/19 Integration Tests Booking Core pass 100% (ACID Safe)"
    p_cap4.font.name = FONT_BODY
    p_cap4.font.size = Pt(9.5)
    p_cap4.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 5: W07-N2 (WEB UI & INTEGRATION)
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide5, prs, SLATE_BG)
    add_header(slide5, prs, "W07-N2 (Người 2): Giao Diện Đặt Sân & Trải Nghiệm Người Dùng", "CHI TIẾT NHIỆM VỤ THÀNH VIÊN", 5)

    card_s5 = add_card(slide5, Inches(0.8), Inches(1.6), Inches(5.2), Inches(5.2))
    tb_s5 = slide5.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(4.8), Inches(4.8))
    tf_s5 = tb_s5.text_frame
    tf_s5.word_wrap = True

    p = tf_s5.paragraphs[0]
    p.text = "Hiện Đại Hóa Giao Diện Đặt Sân (Web UI)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s5 = [
        ("Nối 100% API Backend Thật:", "Loại bỏ hoàn toàn stub/mock data. Ứng dụng apps/web tải danh sách cụm sân, bảng giá, trạng thái slot trực tiếp từ Booking Core qua Gateway."),
        ("Lưới Chọn Slot Trực Quan (/booking):", "Giao diện ma trận sân × khung giờ (1 giờ/slot). Màu sắc phân định rõ: Trống (Xanh), Đang giữ (Vàng), Đã đặt (Đỏ/Khóa), Quá giờ (Xám)."),
        ("Tối Ưu Trải Nghiệm Người Dùng (UX):", "Hiển thị bộ đếm ngược 10 phút giữ chỗ, tự động tính tổng tiền theo giờ Peak / Off-peak, thông báo lỗi xung đột (409) lịch sự, rõ ràng."),
        ("Lịch Sử Đặt Chỗ Cá Nhân (/history):", "Giao diện danh sách các booking của người dùng kèm mã định danh, trạng thái thanh toán và nút liên kết sang luồng pass sân.")
    ]
    for b_title, b_desc in bullets_s5:
        p_b = tf_s5.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    # Right column: 2 screenshots stacked
    card_img5a = add_card(slide5, Inches(6.3), Inches(1.6), Inches(6.2), Inches(2.55))
    img5a_path = os.path.join(sc_dir, "01_web_homepage.png")
    add_image_fit(slide5, img5a_path, Inches(6.4), Inches(1.7), Inches(6.0), Inches(2.35))

    card_img5b = add_card(slide5, Inches(6.3), Inches(4.25), Inches(6.2), Inches(2.55))
    img5b_path = os.path.join(sc_dir, "04_web_booking_grid.png")
    add_image_fit(slide5, img5b_path, Inches(6.4), Inches(4.35), Inches(6.0), Inches(2.35))

    # =========================================================================
    # SLIDE 6: W07-N4 (IDENTITY SERVICE MVP)
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide6, prs, SLATE_BG)
    add_header(slide6, prs, "W07-N4 (Người 4): Dịch Vụ Định Danh (Identity MVP) & Auth Flow", "CHI TIẾT NHIỆM VỤ THÀNH VIÊN", 6)

    card_s6 = add_card(slide6, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s6 = slide6.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s6 = tb_s6.text_frame
    tf_s6.word_wrap = True

    p = tf_s6.paragraphs[0]
    p.text = "Xây Dựng Identity Service & Tích Hợp Web (PR #15)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s6 = [
        ("Kiến Trúc Xác Thực JWT Hoàn Chỉnh:", "Viết các endpoint: Đăng ký (/auth/register), Đăng nhập (/auth/login), Hồ sơ cá nhân (/auth/profile) với JWT Secret mã hóa an toàn."),
        ("Phân Quyền Theo Vai Trò (RBAC):", "Thiết lập 3 vai trò người dùng chuẩn mực: Khách hàng (customer), Quản lý sân (center_manager), Quản trị tối cao (super_admin)."),
        ("Tích Hợp Modal Đăng Nhập Trên Web:", "Thiết kế Modal xác thực 2 cột hiện đại: hiển thị logo thương hiệu, form nhập liệu mượt mà, hỗ trợ ghi nhớ tài khoản và chuyển đổi Đăng ký/Đăng nhập."),
        ("Bảo Vệ API Đầu Cuối (Guards):", "Header Authorization Bearer token được tự động gán vào mọi request backend. Chặn đứng các truy cập trái phép vào trang quản trị Admin."),
        ("Kiểm Định Bảo Mật:", "Hợp nhất hoàn chỉnh qua PR #15 và branch fix/identity-public_entry-merge, kiểm thử end-to-end với Playwright.")
    ]
    for b_title, b_desc in bullets_s6:
        p_b = tf_s6.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(5)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    card_img6 = add_card(slide6, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img6_path = os.path.join(sc_dir, "02_web_login_modal.png")
    add_image_fit(slide6, img6_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap6 = slide6.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap6 = cap6.text_frame
    p_cap6 = tf_cap6.paragraphs[0]
    p_cap6.alignment = PP_ALIGN.CENTER
    p_cap6.text = "Minh chứng thực tế: Modal Đăng nhập / Đăng ký Identity MVP trên Web Frontend"
    p_cap6.font.name = FONT_BODY
    p_cap6.font.size = Pt(9.5)
    p_cap6.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 7: W07-N5 (AI SERVICE & FAQ DRAWER)
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide7, prs, SLATE_BG)
    add_header(slide7, prs, "W07-N5 (Người 5): Trợ Lý AI Amazon Q Style & Bộ Tri Thức FAQ", "CHI TIẾT NHIỆM VỤ THÀNH VIÊN", 7)

    card_s7 = add_card(slide7, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s7 = slide7.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s7 = tb_s7.text_frame
    tf_s7.word_wrap = True

    p = tf_s7.paragraphs[0]
    p.text = "Trợ Lý AI Thông Minh Hỗ Trợ Đặt Sân & FAQ"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s7 = [
        ("AI Drawer Phong Cách Amazon Q:", "Nút kích hoạt nhanh trên Header Web mở bảng trượt (Slide-over Drawer) từ cạnh phải màn hình, mang lại trải nghiệm hỗ trợ liền mạch."),
        ("Chuẩn Hóa Bộ Tri Thức (knowledge.json):", "Cập nhật chính xác quy định nghiệp vụ: slot đã thanh toán không được hủy (tránh spam); slot giữ 10 phút tự hủy nếu quá hạn; cơ chế pass sân giữa các người chơi."),
        ("Phân Biệt FAQ & Tool-Calling:", "FAQ đóng vai trò giải đáp quy chế, điều khoản tức thì; trong khi LangChain/LangGraph xử lý bóc tách ràng buộc (thời gian, địa điểm, mức giá) khi tìm sân."),
        ("Golden Dataset Evaluation:", "Duy trì bộ kịch bản kiểm thử mẫu và script đo lường độ chính xác trả lời tự động, bảo đảm tỷ lệ phản hồi chính xác 100% trong CI.")
    ]
    for b_title, b_desc in bullets_s7:
        p_b = tf_s7.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    card_img7 = add_card(slide7, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img7_path = os.path.join(sc_dir, "03_web_ai_drawer.png")
    add_image_fit(slide7, img7_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap7 = slide7.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap7 = cap7.text_frame
    p_cap7 = tf_cap7.paragraphs[0]
    p_cap7.alignment = PP_ALIGN.CENTER
    p_cap7.text = "Minh chứng thực tế: AI Assistant Drawer (Amazon Q Style) tương tác trực tiếp trên Web"
    p_cap7.font.name = FONT_BODY
    p_cap7.font.size = Pt(9.5)
    p_cap7.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 8: CỔNG QUẢN TRỊ ADMIN PORTAL
    # =========================================================================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide8, prs, SLATE_BG)
    add_header(slide8, prs, "Cổng Quản Trị Trung Tâm (Admin Portal MVP) & Phân Quyền RBAC", "GIAO DIỆN QUẢN TRỊ VIÊN", 8)

    card_s8 = add_card(slide8, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s8 = slide8.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s8 = tb_s8.text_frame
    tf_s8.word_wrap = True

    p = tf_s8.paragraphs[0]
    p.text = "Cổng Quản Trị Hệ Thống Dành Cho Chủ Sân & Admin"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s8 = [
        ("Ứng Dụng Quản Trị Độc Lập (apps/admin):", "Xây dựng bằng React 18, Vite và Tailwind CSS, phục vụ trực tiếp 2 nhóm người dùng có thẩm quyền: Quản lý sân và Quản trị viên hệ thống."),
        ("Hàng Rào Bảo Vệ Truy Cập (Route Guards):", "Chỉ tài khoản sở hữu vai trò 'center_manager' hoặc 'super_admin' mới có thể đăng nhập. Tài khoản khách hàng thông thường bị chặn tuyệt đối."),
        ("Quản Lý Danh Mục & Khung Giờ:", "Cho phép chủ sân cấu hình bảng giá linh hoạt theo từng khung giờ (giờ bình thường vs giờ cao điểm), kiểm soát lịch bảo trì sân."),
        ("Tích Hợp Quản Lý Tin Tức & Đánh Giá:", "Kết nối trực tiếp dịch vụ content-service để phê duyệt bài viết, kiểm duyệt đánh giá của người dùng và theo dõi báo cáo doanh thu."),
        ("Vận Hành K8s GitOps:", "Pod admin được deploy đồng bộ trong cụm K3d local, truy cập dễ dàng qua Ingress routing.")
    ]
    for b_title, b_desc in bullets_s8:
        p_b = tf_s8.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(5)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    card_img8 = add_card(slide8, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img8_path = os.path.join(sc_dir, "05_admin_portal.png")
    add_image_fit(slide8, img8_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap8 = slide8.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap8 = cap8.text_frame
    p_cap8 = tf_cap8.paragraphs[0]
    p_cap8.alignment = PP_ALIGN.CENTER
    p_cap8.text = "Minh chứng thực tế: Cổng Quản trị Admin Portal (apps/admin) kiểm soát quyền RBAC"
    p_cap8.font.name = FONT_BODY
    p_cap8.font.size = Pt(9.5)
    p_cap8.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 9: W07-N3 (CHẬM TIẾN ĐỘ & KẾ HOẠCH BÙ)
    # =========================================================================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide9, prs, SLATE_BG)
    add_header(slide9, prs, "W07-N3 (Người 3): Đánh Giá Chậm Tiến Độ Social & Kế Hoạch Bù", "KIỂM SOÁT TIẾN ĐỘ & RỦI RO", 9)

    # Card 1: Hiện trạng & Nguyên nhân
    card_c1 = add_card(slide9, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2), bg_color=WHITE, border_color=AMBER_BORDER)
    tb_c1 = slide9.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True

    p = tf_c1.paragraphs[0]
    p.text = "⚠️ Hiện Trạng Module Social/Realtime (Người 3)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = AMBER

    bullets_c1 = [
        ("Mức độ hoàn thành:", "Mới đạt khoảng 15-20% so với cam kết kế hoạch Tuần 7. Dịch vụ dừng ở mức kết nối WebSocket cơ bản từ Tuần 6."),
        ("Nhiệm vụ bị chậm:", "Chưa hoàn thiện xác thực JWT qua Socket handshake, chưa hoàn thành schema lưu trữ tin nhắn riêng tư 1-1 trên MongoDB."),
        ("Nguyên nhân khách quan & chủ quan:", "Thành viên gặp khó khăn trong việc thiết lập Socket.io Guard tích hợp Passport JWT từ NestJS, mất thời gian nghiên cứu cơ chế Join Room động."),
        ("Mức độ ảnh hưởng luồng chung:", "Chưa gây ảnh hưởng nghiêm trọng đến Weekly Gate Tuần 7 (vì Gate tập trung vào Booking ACID), nhưng sẽ là nút thắt (Blocker) cho Tuần 8 khi Người B cần chat đàm phán với Người A để pass sân.")
    ]
    for b_title, b_desc in bullets_c1:
        p_b = tf_c1.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = AMBER
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    # Card 2: Kế hoạch bù tiến độ (Catch-up Plan)
    card_c2 = add_card(slide9, Inches(6.7), Inches(1.6), Inches(5.8), Inches(5.2), bg_color=WHITE, border_color=GREEN_BORDER)
    tb_c2 = slide9.shapes.add_textbox(Inches(6.9), Inches(1.8), Inches(5.4), Inches(4.8))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True

    p = tf_c2.paragraphs[0]
    p.text = "🚀 Kế Hoạch Bù Tiến Độ (Catch-Up Plan Tuần 8)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = GREEN

    bullets_c2 = [
        ("Hỗ Trợ Kỹ Thuật Chéo (Cross-Pairing):", "Người 1 (Booking Core Lead) và Người 4 (Identity Lead) trực tiếp hỗ trợ Người 3 tái sử dụng JWT Strategy sang WsGuard trong 2 ngày đầu Tuần 8."),
        ("Rút Ngắn Phạm Vi Chỉ Cho Pass Sân:", "Tạm hoãn các tính năng chat nhóm hoặc reaction nâng cao; tập trung 100% tài nguyên cho luồng đàm phán pass sân 1-1 gắn với PassPost ID."),
        ("Bổ Sung Test Chống Đọc Trộm Tin Nhắn:", "Viết kịch bản test tự động giả lập User C cố tình join room của User A & B: WebSocket Gateway bắt buộc từ chối và trả mã lỗi 403 Forbidden."),
        ("Cam Kết Mốc Nghiệm Thu (Deadline):", "Hoàn thành toàn bộ API và Socket Chat 1-1 trước Thứ 4 của Tuần 8 để kịp tiến độ tích hợp giao diện Chợ Pass Sân.")
    ]
    for b_title, b_desc in bullets_c2:
        p_b = tf_c2.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = GREEN
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    # =========================================================================
    # SLIDE 10: QUY TRÌNH CI/CD & QUALITY GATES
    # =========================================================================
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide10, prs, SLATE_BG)
    add_header(slide10, prs, "Quy Trình Tự Động Hóa CI/CD & Hàng Rào Chất Lượng", "CHẤT LƯỢNG MÃ NGUỒN & TỰ ĐỘNG HÓA", 10)

    card_s10 = add_card(slide10, Inches(0.8), Inches(1.6), Inches(5.4), Inches(5.2))
    tb_s10 = slide10.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.0), Inches(4.8))
    tf_s10 = tb_s10.text_frame
    tf_s10.word_wrap = True

    p = tf_s10.paragraphs[0]
    p.text = "Hàng Rào Kiểm Định Tự Động 23/23 Checks Xanh"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    bullets_s10 = [
        ("Nguyên Tắc Bất Di Bất Dịch:", "Không có mã nguồn nào được hợp nhất (merge) vào nhánh main nếu chưa vượt qua 100% các bài kiểm tra tự động của GitHub Actions."),
        ("Kiểm Định Toàn Diện 5 Tầng:", 
         "1. Code Quality: ESLint & TypeScript Typecheck nghiêm ngặt\n"
         "2. Test Tự Động: Vitest Unit, Contract và Integration tests\n"
         "3. Bảo Mật Container: Trivy Scanner kiểm tra 0 CVE\n"
         "4. Kubernetes Manifests: Helm lint & K8s dry-run validation\n"
         "5. AI Golden Evaluation: Đo lường chất lượng câu trả lời FAQ"),
        ("Kiểm Thử PR #15 & PR #16:", "Các PR tích hợp tính năng Tuần 7 đều đạt trạng thái 23/23 checks xanh hoàn hảo trước khi tạo bản build chính thức.")
    ]
    for b_title, b_desc in bullets_s10:
        p_b = tf_s10.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(5)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    card_img10 = add_card(slide10, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.2))
    img10_path = os.path.join(sc_dir, "08_ci_cd_23_checks_green.png")
    add_image_fit(slide10, img10_path, Inches(6.6), Inches(1.8), Inches(5.8), Inches(4.3))

    cap10 = slide10.shapes.add_textbox(Inches(6.6), Inches(6.2), Inches(5.8), Inches(0.5))
    tf_cap10 = cap10.text_frame
    p_cap10 = tf_cap10.paragraphs[0]
    p_cap10.alignment = PP_ALIGN.CENTER
    p_cap10.text = "Minh chứng thực tế: GitHub Actions Pipeline đạt 23/23 Checks Xanh 100%"
    p_cap10.font.name = FONT_BODY
    p_cap10.font.size = Pt(9.5)
    p_cap10.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 11: BẢNG CHỈ SỐ KỸ THUẬT & ĐO LƯỜNG
    # =========================================================================
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide11, prs, SLATE_BG)
    add_header(slide11, prs, "Bảng Chỉ Số Kỹ Thuật & Đo Lường Chất Lượng Tuần 7", "ĐO LƯỜNG ĐỊNH LƯỢNG", 11)

    # Top: 4 Stat Cards
    stats = [
        ("16 / 16 Pods", "Cụm K3d K8s Local Running 100%", GREEN),
        ("19 / 19 Tests", "Booking Core ACID Pass 100%", BLUE),
        ("23 / 23 Checks", "GitHub Actions Pipeline Xanh", GREEN),
        ("0 CVEs", "An ninh Container Trivy Scan", NAVY)
    ]
    card_w = Inches(2.78)
    card_h = Inches(1.2)
    start_x = Inches(0.8)
    top_y = Inches(1.6)

    for i, (val, label, color) in enumerate(stats):
        cx = start_x + i * Inches(2.98)
        c = add_card(slide11, cx, top_y, card_w, card_h)
        tb = slide11.shapes.add_textbox(cx + Inches(0.1), top_y + Inches(0.12), card_w - Inches(0.2), card_h - Inches(0.2))
        tf = tb.text_frame
        p_val = tf.paragraphs[0]
        p_val.alignment = PP_ALIGN.CENTER
        p_val.text = val
        p_val.font.name = FONT_HEADING
        p_val.font.size = Pt(22)
        p_val.font.bold = True
        p_val.font.color.rgb = color

        p_lbl = tf.add_paragraph()
        p_lbl.alignment = PP_ALIGN.CENTER
        p_lbl.text = label
        p_lbl.font.name = FONT_BODY
        p_lbl.font.size = Pt(10)
        p_lbl.font.color.rgb = TEXT_MUTED
        p_lbl.space_before = Pt(3)

    # Bottom: Detailed Table of 5 Roles
    card_tbl = add_card(slide11, Inches(0.8), Inches(3.1), Inches(11.733), Inches(3.7))
    tb_tbl = slide11.shapes.add_textbox(Inches(1.0), Inches(3.2), Inches(11.333), Inches(3.5))
    tf_tbl = tb_tbl.text_frame
    tf_tbl.word_wrap = True

    p = tf_tbl.paragraphs[0]
    p.text = "📊 Bảng Theo Dõi Khối Lượng Công Việc & Trạng Thái Nghiệm Thu 5 Thành Viên"
    p.font.name = FONT_HEADING
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    roles_data = [
        ("W07-N1", "Người 1", "Booking Core ACID & Concurrency", "100%", "ĐẠT (PASSED)", GREEN, "Hoàn tất API /availability, /reservations, khóa 10 phút, GiST constraint, 19/19 test pass."),
        ("W07-N2", "Người 2", "Frontend Web Booking & History", "85%", "ĐẠT (PASSED)", GREEN, "Nối API thật thành công, ma trận slot trực quan, modal auth; chờ API pass sân Tuần 8."),
        ("W07-N3", "Người 3", "Social Service & Private Chat", "20%", "CẢNH BÁO (LAG)", AMBER, "Chậm tiến độ; mới có khung WebSocket, đã thiết lập kế hoạch bù 2 ngày đầu Tuần 8."),
        ("W07-N4", "Người 4", "Identity Service MVP & Auth Flow", "75%", "ĐẠT (PASSED)", GREEN, "Hoàn thành Đăng ký/Đăng nhập JWT, RBAC guards, Modal Web (PR #15); POS dịch vụ dời Tuần 8."),
        ("W07-N5", "Người 5", "AI Assistant FAQ & K3d GitOps", "100%", "ĐẠT (PASSED)", GREEN, "AI Drawer Amazon Q style, chuẩn hóa knowledge.json, Golden eval pass, K3d 16 pods running.")
    ]

    for code, role, name, pct, status, st_col, note in roles_data:
        p_r = tf_tbl.add_paragraph()
        p_r.text = f"• [{code}] {role} — {name}: "
        p_r.font.name = FONT_BODY
        p_r.font.size = Pt(10)
        p_r.font.bold = True
        p_r.font.color.rgb = TEXT_DARK
        p_r.space_before = Pt(4)

        r_pct = p_r.add_run()
        r_pct.text = f"{pct} ({status}) — "
        r_pct.font.bold = True
        r_pct.font.color.rgb = st_col

        r_note = p_r.add_run()
        r_note.text = note
        r_note.font.bold = False
        r_note.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 12: XỬ LÝ SỰ CỐ KỸ THUẬT TIÊU BIỂU
    # =========================================================================
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide12, prs, SLATE_BG)
    add_header(slide12, prs, "Xử Lý Sự Cố Kỹ Thuật Tiêu Biểu & Bài Học Kinh Nghiệm", "PHÂN TÍCH NGUYÊN NHÂN GỐC (RCA)", 12)

    boxes = [
        ("SỰ CỐ 1: K3D NODE DISKPRESSURE TAINT",
         "Hiện tượng: Node k3d-badminton-local-server-0 bị gán taint 'node.kubernetes.io/disk-pressure:NoSchedule', hàng loạt pod rơi vào trạng thái Pending không thể khởi chạy.\n\n"
         "Nguyên nhân gốc (RCA): Ổ đĩa máy chủ đạt ngưỡng 93% dung lượng do Docker cache build các tầng image tích tụ qua nhiều lần kiểm thử CI local.\n\n"
         "Biện pháp xử lý: Thực thi docker builder prune và docker image prune giải phóng hơn 58GB dung lượng lưu trữ; khởi động lại cụm k3d, toàn bộ 16/16 Pods hồi phục Running.",
         AMBER),
        
        ("SỰ CỐ 2: RATE-LIMIT PULL IMAGE TỪ DOCKER HUB",
         "Hiện tượng: Hai pod hạ tầng quan trọng là mongo:8 và rabbitmq:3-alpine gặp lỗi ImagePullBackOff kéo dài khi cluster khởi động lại.\n\n"
         "Nguyên nhân gốc (RCA): Docker daemon của K3d bên trong container bị chạm hạn mức (rate-limit) kéo image nặc danh từ Docker Hub.\n\n"
         "Biện pháp xử lý: Tải image trực tiếp trên máy chủ bằng Docker daemon bên ngoài, sau đó nạp trực tiếp vào cụm qua lệnh 'k3d image import'. Cụm hoàn toàn tự chủ mà không phụ thuộc mạng ngoài.",
         BLUE),

        ("SỰ CỐ 3: XUNG ĐỘT ESLINT BOUNDARY & MERGE PR #15",
         "Hiện tượng: Nhánh tính năng Identity PR #15 bị lỗi kiểm tra kiểu dữ liệu (TypeScript typecheck) trên frontend do thay đổi giao diện Header và Modal.\n\n"
         "Nguyên nhân gốc (RCA): Lệch phiên bản định nghĩa types giữa module UI và API response của Identity Service.\n\n"
         "Biện pháp xử lý: Lead dự án tạo branch hiệu chỉnh độc lập 'fix/identity-public_entry-merge', chuẩn hóa types, chạy Playwright kiểm thử thực tế và hợp nhất thành công với 23 checks xanh.",
         GREEN)
    ]

    card_bw = Inches(3.75)
    card_bh = Inches(5.2)
    for i, (title, content, border_col) in enumerate(boxes):
        bx = Inches(0.8) + i * Inches(3.99)
        c = add_card(slide12, bx, Inches(1.6), card_bw, card_bh, bg_color=WHITE, border_color=border_col)
        tb = slide12.shapes.add_textbox(bx + Inches(0.15), Inches(1.8), card_bw - Inches(0.3), card_bh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = border_col

        p_c = tf.add_paragraph()
        p_c.text = content
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = TEXT_DARK
        p_c.space_before = Pt(8)

    # =========================================================================
    # SLIDE 13: KẾ HOẠCH TRỌNG TÂM TUẦN 8
    # =========================================================================
    slide13 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide13, prs, SLATE_BG)
    add_header(slide13, prs, "Kế Hoạch Trọng Tâm Tuần 8 — Hoàn Tất Đặt Sân & Chợ Pass Sân", "KẾ HOẠCH BƯỚC TIẾP THEO", 13)

    # Left: Weekly Gate Tuần 8
    card_g8 = add_card(slide13, Inches(0.8), Inches(1.6), Inches(4.5), Inches(5.2), bg_color=NAVY_CARD, border_color=BLUE)
    tb_g8 = slide13.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(4.1), Inches(4.8))
    tf_g8 = tb_g8.text_frame
    tf_g8.word_wrap = True

    p = tf_g8.paragraphs[0]
    p.text = "🎯 Mục Tiêu Weekly Gate Tuần 8"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = RGBColor(147, 197, 253)

    bullets_g8 = [
        ("Nghiệm Thu Khép Kín Luồng Pass Sân:", "Người dùng A đặt và thanh toán thành công (PAID) → Đăng bài nhượng sân (PassPost) lên Chợ → Người dùng B nhìn thấy bài đăng và bấm mở khung chat."),
        ("Bảo Mật Tin Nhắn Đàm Phán:", "Hệ thống mở đúng phòng chat riêng biệt gắn với mã bài pass; chặn đứng mọi hành vi giả mạo ID người gửi (Anti-spoofing)."),
        ("Tích Hợp Cổng Thanh Toán Thật:", "Tích hợp PayOS Sandbox tự động sinh mã VietQR động, lắng nghe Webhook xác nhận giao dịch thanh toán thành công."),
        ("Cơ Chế Khóa Tránh Bán Hai Lần:", "Khi Người A đồng ý nhượng cho Người B, slot được chuyển giao tức thì và bài pass chuyển trạng thái SOLD.")
    ]
    for b_title, b_desc in bullets_g8:
        p_b = tf_g8.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = RGBColor(96, 165, 250)
        p_b.space_before = Pt(8)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = WHITE

    # Right: Phân công nhiệm vụ chi tiết 5 thành viên
    card_t8 = add_card(slide13, Inches(5.6), Inches(1.6), Inches(6.9), Inches(5.2))
    tb_t8 = slide13.shapes.add_textbox(Inches(5.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf_t8 = tb_t8.text_frame
    tf_t8.word_wrap = True

    p = tf_t8.paragraphs[0]
    p.text = "📋 Phân Công Chi Tiết 5 Thành Viên Tuần 8"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    tasks_w8 = [
        ("W08-N1 (Người 1 - Booking Core):", "Tích hợp PayOS Sandbox API, sinh mã VietQR thanh toán tự động, xử lý Webhook cập nhật trạng thái PAID, sinh sự kiện Outbox chuẩn bị chuyển nhượng."),
        ("W08-N2 (Người 2 - Frontend Web):", "Xây dựng màn hình Chợ Pass Sân (/pass-market), form tạo bài đăng nhượng sân từ lịch sử booking, nút bấm mở phòng chat thương lượng trực tiếp."),
        ("W08-N3 (Người 3 - Social/Realtime):", "Hoàn thành WsJwtGuard cho Socket.io, lập trình lưu trữ tin nhắn MongoDB, chặn truy cập trái phép 403, đáp ứng Weekly Gate Tuần 8."),
        ("W08-N4 (Người 4 - Identity & Commerce):", "Triển khai tính năng POS bán dịch vụ đi kèm (nước giải khát, thuê vợt, cầu lông) gắn với đơn đặt sân và hoàn thiện hồ sơ tài khoản."),
        ("W08-N5 (Người 5 - AI & Platform):", "Nâng cấp AI Service với Tool-calling trích xuất ràng buộc tự nhiên (thời gian, địa điểm) để tìm kiếm sân thông minh; duy trì độ sẵn sàng K8s.")
    ]
    for b_title, b_desc in tasks_w8:
        p_b = tf_t8.add_paragraph()
        p_b.text = f"• {b_title} "
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE
        p_b.space_before = Pt(6)
        r = p_b.add_run()
        r.text = b_desc
        r.font.bold = False
        r.font.color.rgb = TEXT_DARK

    # =========================================================================
    # SLIDE 14: TỔNG KẾT & KHUYẾN NGHỊ
    # =========================================================================
    slide14 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide14, prs, SLATE_BG)
    add_header(slide14, prs, "Tổng Kết Đánh Giá Dự Án & Đề Xuất Quản Trị", "ĐÁNH GIÁ TỔNG THỂ", 14)

    # 3 Summary Cards
    cards_data14 = [
        ("KẾT QUẢ ĐẠT ĐƯỢC", 
         [("Vượt qua cột mốc Weekly Gate:", "Hệ thống chứng minh năng lực xử lý concurrency ACID hoàn hảo, không còn nguy cơ double-booking."),
          ("Trải nghiệm người dùng thực chất:", "Giao diện Web mượt mà, kết nối dữ liệu thật, tích hợp Trợ lý AI và Modal Đăng nhập hiện đại."),
          ("Chất lượng kỹ thuật vượt trội:", "16/16 Pods K8s sẵn sàng, 23 checks CI/CD tự động xanh 100%, 0 lỗ hổng bảo mật container.")],
         GREEN),

        ("RỦI RO TIỀM ẨN CẦN KIỂM SOÁT",
         [("Nút thắt Social Chat (Người 3):", "Cần giám sát chặt chẽ kế hoạch bù tiến độ trong 2 ngày đầu Tuần 8 để không làm chậm luồng Pass Sân."),
          ("Xác thực Webhook PayOS:", "Cần cơ chế kiểm tra chữ ký số (Checksum/HMAC) nghiêm ngặt để chống giả mạo thanh toán từ bên ngoài."),
          ("Dung lượng đĩa môi trường Dev:", "Duy trì lệnh tự động dọn dẹp Docker cache định kỳ tránh lặp lại lỗi DiskPressure.")],
         AMBER),

        ("KIẾN NGHỊ HÀNH ĐỘNG",
         [("Duy trì ghép cặp hỗ trợ (Pairing):", "Khuyến khích các thành viên hoàn thành sớm (Người 1, Người 5) hỗ trợ chéo các thành viên gặp vướng mắc."),
          ("Tiếp tục chuẩn hóa GitOps:", "Đảm bảo mọi thay đổi cấu hình hạ tầng đều được commit qua GitOps manifests thay vì chỉnh sửa thủ công."),
          ("Sẵn sàng cho cột mốc Tuần 8:", "Tập trung cao độ cho bài nghiệm thu Weekly Gate luồng Pass Sân và Thanh toán QR.")],
         BLUE)
    ]

    for i, (title, items, border_col) in enumerate(cards_data14):
        bx = Inches(0.8) + i * Inches(3.99)
        c = add_card(slide14, bx, Inches(1.6), Inches(3.75), Inches(5.2), bg_color=WHITE, border_color=border_col)
        tb = slide14.shapes.add_textbox(bx + Inches(0.15), Inches(1.8), Inches(3.45), Inches(4.8))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = border_col

        for it_title, it_desc in items:
            p_i = tf.add_paragraph()
            p_i.text = f"• {it_title} "
            p_i.font.name = FONT_BODY
            p_i.font.size = Pt(9.5)
            p_i.font.bold = True
            p_i.font.color.rgb = TEXT_DARK
            p_i.space_before = Pt(6)
            r = p_i.add_run()
            r.text = it_desc
            r.font.bold = False
            r.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 15: KẾT THÚC & Q&A (DARK THEME)
    # =========================================================================
    slide15 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide15, prs, NAVY)

    # Center Box
    tb_end = slide15.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.333), Inches(3.8))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True

    p = tf_end.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "CẢM ƠN THẦY VÀ CÁC BẠN ĐÃ LẮNG NGHE!"
    p.font.name = FONT_HEADING
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p_sub = tf_end.add_paragraph()
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.text = "DỰ ÁN HỆ THỐNG QUẢN LÝ SÂN CẦU LÔNG V2 (BADMINTON MANAGER)"
    p_sub.font.name = FONT_HEADING
    p_sub.font.size = Pt(16)
    p_sub.font.bold = True
    p_sub.font.color.rgb = RGBColor(147, 197, 253)
    p_sub.space_before = Pt(12)

    p_qa = tf_end.add_paragraph()
    p_qa.alignment = PP_ALIGN.CENTER
    p_qa.text = "PHIÊN HỎI ĐÁP & ĐÓNG GÓP Ý KIẾN (Q&A)"
    p_qa.font.name = FONT_HEADING
    p_qa.font.size = Pt(20)
    p_qa.font.bold = True
    p_qa.font.color.rgb = GREEN
    p_qa.space_before = Pt(24)

    p_desc = tf_end.add_paragraph()
    p_desc.alignment = PP_ALIGN.CENTER
    p_desc.text = "Nhóm sẵn sàng giải đáp các câu hỏi liên quan đến Giải thuật ACID Concurrency, Kiến trúc GitOps K8s, Tích hợp Trợ lý AI và Lộ trình Tuần 8."
    p_desc.font.name = FONT_BODY
    p_desc.font.size = Pt(12)
    p_desc.font.color.rgb = RGBColor(203, 213, 225)
    p_desc.space_before = Pt(10)

    # Save presentation
    for target_dir in ["docs/week-7", "docs/reports"]:
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, "Bao_Cao_Tuan_7_Badminton_Manager.pptx")
        prs.save(target_path)
        print(f"Successfully generated PowerPoint presentation at: {target_path}")
    return os.path.join("docs/week-7", "Bao_Cao_Tuan_7_Badminton_Manager.pptx")

if __name__ == "__main__":
    create_presentation()
