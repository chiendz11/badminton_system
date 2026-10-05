import React, { useEffect, useState } from "react";
import "../styles/weather.css";

const WeatherDisplay = () => {
  const [weatherType, setWeatherType] = useState("sun"); // Mặc định là nắng
  const [showWeather, setShowWeather] = useState(true); // Mặc định hiển thị thời tiết

  useEffect(() => {
    // Gọi API thời tiết khi component được mount
    if (import.meta.env.VITE_OPENWEATHER_API_KEY) fetchWeatherData();
  }, []);

  const [temperature, setTemperature] = useState("");

  const fetchWeatherData = () => {
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Hanoi&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`,
    )
      .then((response) => response.json())
      .then((data) => {
        // Lấy thông tin mô tả và chính từ dữ liệu trả về
        let description = data.weather[0].description.toLowerCase(); // Mô tả thời tiết
        let main = data.weather[0].main.toLowerCase(); // Chính của thời tiết

        // Lấy nhiệt độ max và làm tròn
        const temp = Math.round(data.main.temp_max);

        // Tạo chuỗi hiển thị nhiệt độ
        setTemperature(`${temp}°C`);

        // Kiểm tra nếu có từ "rain" trong main hoặc description thì hiển thị mưa
        if (main.includes("rain") || description.includes("rain")) {
          setWeatherType("rain");
        } else {
          setWeatherType("sun");
        }
      })
      .catch((error) => {
        console.error("Lỗi khi gọi API thời tiết:", error);
        // Nếu có lỗi, mặc định hiển thị thời tiết nắng
        setWeatherType("sun");
      });
  };

  const toggleWeatherDisplay = () => {
    setShowWeather(!showWeather);
  };

  if (!showWeather) {
    return (
      <div className="weather-toggle">
        <button onClick={toggleWeatherDisplay} className="toggle-weather-btn">
          <i className="fas fa-eye"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="weather-container">
      {weatherType === "rain" ? (
        // Hiệu ứng mưa
        <div className="rain-container">
          <div className="loader">
            <div className="snow">
              {Array.from({ length: 22 }).map((_, index) => {
                const animationDuration = `${15 / (10 + (index % 10))}s`;
                return <span key={index} style={{ animationDuration }}></span>;
              })}
            </div>
          </div>
          <div className="weather-label">Hà Nội: Mưa - {temperature}</div>
          <button onClick={toggleWeatherDisplay} className="toggle-weather-btn">
            <i className="fas fa-eye-slash"></i>
          </button>
        </div>
      ) : (
        // Hiệu ứng nắng
        <div className="sun-container">
          <div className="weather-sun-container">
            <div className="cloud front">
              <span className="left-front"></span>
              <span className="right-front"></span>
            </div>
            <span className="sun sunshine"></span>
            <span className="sun"></span>
            <div className="cloud back">
              <span className="left-back"></span>
              <span className="right-back"></span>
            </div>
          </div>
          <div className="weather-label">Hà Nội: Nắng - {temperature}</div>
          <button onClick={toggleWeatherDisplay} className="toggle-weather-btn">
            <i className="fas fa-eye-slash"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default WeatherDisplay;
