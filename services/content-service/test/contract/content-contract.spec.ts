import { describe, it, expect } from "vitest";
import { CreateNewsDto } from "../../src/news/dto/create-news.dto";
import { CreateRatingDto } from "../../src/ratings/dto/create-rating.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

describe("Content Service Contract Verification", () => {
  it("enforces CreateNewsDto structure with title, summary, url", async () => {
    const dto = plainToInstance(CreateNewsDto, {
      title: "Giải Cầu Lông Mở Rộng 2026",
      summary: "Thông báo tổ chức giải đấu",
      url: "https://badminton.example.com/news/1",
      category: "tournament",
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("enforces CreateRatingDto required fields", async () => {
    const dto = plainToInstance(CreateRatingDto, {
      centerId: "60d5ec49f1b2c82d88c9f111",
      score: 4,
      comment: "Sân thoáng mát, sàn đẹp",
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
