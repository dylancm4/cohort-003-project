import { eq, and, avg, count } from "drizzle-orm";
import { db } from "~/db";
import { courseReviews } from "~/db/schema";

export function submitReview(userId: number, courseId: number, rating: number) {
  const existing = db
    .select()
    .from(courseReviews)
    .where(
      and(
        eq(courseReviews.userId, userId),
        eq(courseReviews.courseId, courseId)
      )
    )
    .get();

  if (existing) {
    db.update(courseReviews)
      .set({ rating, createdAt: new Date().toISOString() })
      .where(eq(courseReviews.id, existing.id))
      .run();
    return existing.id;
  }

  const result = db
    .insert(courseReviews)
    .values({ userId, courseId, rating })
    .run();
  return Number(result.lastInsertRowid);
}

export function getUserReview(userId: number, courseId: number) {
  return db
    .select()
    .from(courseReviews)
    .where(
      and(
        eq(courseReviews.userId, userId),
        eq(courseReviews.courseId, courseId)
      )
    )
    .get();
}

export function getCourseRating(courseId: number) {
  const result = db
    .select({
      averageRating: avg(courseReviews.rating),
      reviewCount: count(courseReviews.id),
    })
    .from(courseReviews)
    .where(eq(courseReviews.courseId, courseId))
    .get();

  return {
    averageRating: result?.averageRating ? parseFloat(result.averageRating) : null,
    reviewCount: result?.reviewCount ?? 0,
  };
}

export function getCourseRatings(courseIds: number[]) {
  if (courseIds.length === 0) return new Map<number, { averageRating: number | null; reviewCount: number }>();

  const results = db
    .select({
      courseId: courseReviews.courseId,
      averageRating: avg(courseReviews.rating),
      reviewCount: count(courseReviews.id),
    })
    .from(courseReviews)
    .groupBy(courseReviews.courseId)
    .all();

  const map = new Map<number, { averageRating: number | null; reviewCount: number }>();
  for (const row of results) {
    map.set(row.courseId, {
      averageRating: row.averageRating ? parseFloat(row.averageRating) : null,
      reviewCount: row.reviewCount,
    });
  }
  return map;
}
