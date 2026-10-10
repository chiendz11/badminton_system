import React from "react";

const HowItWorks = () => {
  const steps = [
    {
      icon: "fas fa-search",
      title: "Tìm Sân",
      description:
        "Tìm kiếm sân cầu ưng ý theo địa điểm, thời gian và loại sân",
    },
    {
      icon: "fas fa-calendar-check",
      title: "Đặt Sân",
      description: "Chọn thời gian và đặt sân chỉ với vài bước đơn giản",
    },
    {
      icon: "fas fa-shuttle-van",
      title: "Trải Nghiệm",
      description: "Đến sân và tận hưởng trận đấu của bạn",
    },
  ];

  return (
    <section className="how-it-works">
      <div className="container">
        <h2 className="section-title">Cách Thức Hoạt Động</h2>
        <div className="steps">
          {steps.map((step, index) => (
            <div className="step" key={index}>
              <div className="step-icon">
                <i className={step.icon}></i>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
