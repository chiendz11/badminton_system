import React, { useState, useEffect } from "react";
import "../../../shared/styles/news.css";
import Header from "../../../shared/ui/Header.jsx";
import Footer from "../../../shared/ui/Footer.jsx";
import { getNews } from "../api/news_service/rest/news.api.js";

const News = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu tin tức từ API khi component mount
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews();
        if (data.success) {
          setNewsData(data.news);
        } else {
          console.error("Error fetching news:", data.message);
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Lấy danh sách category duy nhất từ newsData
  const categories = [
    "all",
    ...Array.from(new Set(newsData.map((item) => item.category))),
  ];

  const filterNewsByCategory = (category) => {
    setActiveCategory(category);
  };

  const filteredNews =
    activeCategory === "all"
      ? newsData
      : newsData.filter((item) => item.category === activeCategory);

  const getCategoryName = (category) => {
    switch (category) {
      case "tournaments":
        return "Giải đấu";
      case "venues":
        return "Sân cầu lông";
      case "tips":
        return "Kỹ thuật";
      case "equipment":
        return "Dụng cụ";
      case "health":
        return "Sức khỏe";
      case "app":
        return "Ứng dụng";
      default:
        return "Tin tức";
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="news-page">
          <div className="container">Loading news...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="news-page">
        <div className="news-content container">
          <div className="news-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? "active" : ""}
                onClick={() => filterNewsByCategory(cat)}
                data-category={cat}
              >
                {cat === "all" ? "Tất cả" : getCategoryName(cat)}
              </button>
            ))}
          </div>

          <div className="news-list">
            {filteredNews.map((item) => (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-item"
                key={item._id} // Sử dụng _id từ DB
              >
                <div className="news-item-image">
                  <img src={item.image} alt={item.title} />
                  <div className="news-source">{item.source}</div>
                </div>
                <div className="news-item-content">
                  <h3 className="news-title">{item.title}</h3>
                  <p className="news-summary">{item.summary}</p>
                  <div className="news-meta">
                    <span className="news-category">
                      {getCategoryName(item.category)}
                    </span>
                    <span className="news-date">{item.date}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default News;
