"""Grounded Vietnamese templates. No extra LLM call or authority to mutate state."""


def violation_text(violation):
    if violation.field == "max_total_price_vnd":
        return f"cao hơn ngân sách {violation.delta:,}đ"
    if violation.field == "area":
        return f"ở khu vực lân cận được cấu hình: {violation.actual}"
    delta = violation.delta or 0
    return f"{'muộn' if delta > 0 else 'sớm'} hơn {abs(delta)} phút"


def alternatives_message(proposals):
    facts = []
    for index, proposal in enumerate(proposals, 1):
        facts.append(
            f"Đề xuất {index}: {proposal.court_name} tại {proposal.center_name}, "
            f"{proposal.start[11:16]}–{proposal.end[11:16]}, {proposal.total_price_vnd:,}đ; "
            f"{violation_text(proposal.violations[0])}."
        )
    return (
        "Trong phạm vi đã kiểm tra, chưa có sân đáp ứng tất cả điều kiện. "
        + " ".join(facts)
        + " Bạn có muốn thay đổi điều kiện theo một đề xuất không? Đồng ý đổi điều kiện chưa phải đặt sân."
    )


ASK_CHANGE = "Trong phạm vi đã kiểm tra chưa có phương án phù hợp hoặc đủ gần. Bạn muốn đổi giờ, ngày, ngân sách hoặc khu vực? Mình chưa tự nới điều kiện."
