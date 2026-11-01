import { describe, it, expect } from "vitest";
import { RatingsService } from "../../src/ratings/ratings.service";
import { CreateRatingDto } from "../../src/ratings/dto/create-rating.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

describe("Ratings validation and logic", () => {
  it("rejects invalid MongoDB ObjectId in validateObjectId", () => {
    const service = new RatingsService(null as any);
    expect(() => (service as any).validateObjectId("invalid-id")).toThrow("Rating ID không hợp lệ");
    expect(() => (service as any).validateObjectId("12345")).toThrow();
    expect(() => (service as any).validateObjectId("60d5ec49f1b2c82d88c9f111")).not.toThrow();
  });

  it("validates score range between 1 and 5 in CreateRatingDto", async () => {
    const validDto = plainToInstance(CreateRatingDto, {
      centerId: "60d5ec49f1b2c82d88c9f111",
      score: 5,
      comment: "Great center!",
    });
    const errors = await validate(validDto);
    expect(errors.length).toBe(0);

    const invalidDto = plainToInstance(CreateRatingDto, {
      centerId: "60d5ec49f1b2c82d88c9f111",
      score: 6,
      comment: "Invalid score",
    });
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
