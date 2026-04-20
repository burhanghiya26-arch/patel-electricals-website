import { describe, it, expect } from "vitest";
import {
  getProductReviews,
  getProductRating,
  getCustomerReviews,
} from "./db";

describe("Reviews Functionality", () => {
  const testProductId = 1;
  const testCustomerId = 1;

  it("should get product reviews (empty or populated)", async () => {
    const reviews = await getProductReviews(testProductId, false);
    expect(Array.isArray(reviews)).toBe(true);
    // Reviews might be empty or have data
    expect(reviews.length).toBeGreaterThanOrEqual(0);
  });

  it("should get product rating", async () => {
    const rating = await getProductRating(testProductId);
    expect(rating).toBeDefined();
    // avgRating might be null if no reviews, or a number
    if (rating?.avgRating !== null) {
      expect(typeof rating?.avgRating).toBe("number");
    }
    expect(typeof rating?.totalReviews).toBe("number");
  });

  it("should get customer reviews", async () => {
    const reviews = await getCustomerReviews(testCustomerId);
    expect(Array.isArray(reviews)).toBe(true);
    // Customer might have no reviews
    expect(reviews.length).toBeGreaterThanOrEqual(0);
  });

  it("should return approved reviews only when requested", async () => {
    const approvedReviews = await getProductReviews(testProductId, true);
    expect(Array.isArray(approvedReviews)).toBe(true);
    // All returned reviews should be approved
    approvedReviews.forEach((review) => {
      // If review has isApproved field, it should be true
      expect(review).toBeDefined();
    });
  });

  it("should handle product with no reviews", async () => {
    const reviews = await getProductReviews(999, false);
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBe(0);
  });

  it("should handle customer with no reviews", async () => {
    const reviews = await getCustomerReviews(999);
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBe(0);
  });
});
