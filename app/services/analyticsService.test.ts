import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  getAggregateStats,
  getCourseEnrollmentCount,
  getCourseCompletionRate,
  getCourseQuizPassRate,
  getCourseRevenueOverTime,
  getLessonDropoffHeatmap,
} from "./analyticsService";

describe("analyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getAggregateStats", () => {
    it("returns zeros when instructor has no courses", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      const result = getAggregateStats({ instructorId: otherInstructor.id });
      expect(result).toEqual({
        totalRevenue: 0,
        totalEnrollments: 0,
        averageCompletionRate: 0,
      });
    });

    it("returns zeros when courses have no enrollments or purchases", () => {
      const result = getAggregateStats({ instructorId: base.instructor.id });
      expect(result).toEqual({
        totalRevenue: 0,
        totalEnrollments: 0,
        averageCompletionRate: 0,
      });
    });

    it("computes total revenue across all courses", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 4999,
            country: "US",
          },
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 2500,
            country: "IN",
          },
        ])
        .run();

      const result = getAggregateStats({ instructorId: base.instructor.id });
      expect(result.totalRevenue).toBe(7499);
    });

    it("computes total enrollments across all courses", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({
          name: "User 2",
          email: "user2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values([
          { userId: base.user.id, courseId: base.course.id },
          { userId: user2.id, courseId: base.course.id },
        ])
        .run();

      const result = getAggregateStats({ instructorId: base.instructor.id });
      expect(result.totalEnrollments).toBe(2);
    });

    it("computes average completion rate across courses", () => {
      // Create a module and 2 lessons for the base course
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Module 1", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({
          moduleId: mod.id,
          title: "Lesson 1",
          position: 1,
        })
        .returning()
        .get();

      const lesson2 = testDb
        .insert(schema.lessons)
        .values({
          moduleId: mod.id,
          title: "Lesson 2",
          position: 2,
        })
        .returning()
        .get();

      // Enroll one user who completes 1 of 2 lessons (50%)
      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: base.course.id })
        .run();

      testDb
        .insert(schema.lessonProgress)
        .values({
          userId: base.user.id,
          lessonId: lesson1.id,
          status: schema.LessonProgressStatus.Completed,
        })
        .run();

      const result = getAggregateStats({ instructorId: base.instructor.id });
      // One course, one user at 50% → average = 50%
      expect(result.averageCompletionRate).toBe(50);
    });

    it("averages completion rates across multiple courses", () => {
      // Course 1 (base.course): 1 lesson, 1 user, fully completed → 100%
      const mod1 = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod 1", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod1.id, title: "L1", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: base.course.id })
        .run();

      testDb
        .insert(schema.lessonProgress)
        .values({
          userId: base.user.id,
          lessonId: lesson1.id,
          status: schema.LessonProgressStatus.Completed,
        })
        .run();

      // Course 2: 2 lessons, 1 user, 0 completed → 0%
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Second course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const mod2 = testDb
        .insert(schema.modules)
        .values({ courseId: course2.id, title: "Mod 2", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.lessons)
        .values([
          { moduleId: mod2.id, title: "L2a", position: 1 },
          { moduleId: mod2.id, title: "L2b", position: 2 },
        ])
        .run();

      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: course2.id })
        .run();

      const result = getAggregateStats({ instructorId: base.instructor.id });
      // Course 1: 100%, Course 2: 0% → average = 50%
      expect(result.averageCompletionRate).toBe(50);
    });

    it("skips courses with no enrollments when computing completion rate", () => {
      // Course with lessons but no enrollments should not affect the average
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .run();

      // No enrollments → averageCompletionRate should be 0 (no courses with enrollments)
      const result = getAggregateStats({ instructorId: base.instructor.id });
      expect(result.averageCompletionRate).toBe(0);
    });

    it("does not count purchases from other instructors' courses", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Not mine",
          instructorId: otherInstructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: otherCourse.id,
          pricePaid: 9999,
          country: "US",
        })
        .run();

      const result = getAggregateStats({ instructorId: base.instructor.id });
      expect(result.totalRevenue).toBe(0);
    });
  });

  // ─── Per-Course Stats ───

  describe("getCourseEnrollmentCount", () => {
    it("returns 0 when course has no enrollments", () => {
      expect(getCourseEnrollmentCount({ courseId: base.course.id })).toBe(0);
    });

    it("counts enrollments for the course", () => {
      const user2 = testDb
        .insert(schema.users)
        .values({
          name: "User 2",
          email: "user2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values([
          { userId: base.user.id, courseId: base.course.id },
          { userId: user2.id, courseId: base.course.id },
        ])
        .run();

      expect(getCourseEnrollmentCount({ courseId: base.course.id })).toBe(2);
    });

    it("does not count enrollments from other courses", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Other",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: course2.id })
        .run();

      expect(getCourseEnrollmentCount({ courseId: base.course.id })).toBe(0);
    });
  });

  describe("getCourseCompletionRate", () => {
    it("returns 0 when course has no enrollments", () => {
      expect(getCourseCompletionRate({ courseId: base.course.id })).toBe(0);
    });

    it("returns 0 when course has no lessons", () => {
      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: base.course.id })
        .run();

      expect(getCourseCompletionRate({ courseId: base.course.id })).toBe(0);
    });

    it("computes completion rate correctly", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L2", position: 2 })
        .run();

      // User completes 1 of 2 lessons
      testDb
        .insert(schema.enrollments)
        .values({ userId: base.user.id, courseId: base.course.id })
        .run();

      testDb
        .insert(schema.lessonProgress)
        .values({
          userId: base.user.id,
          lessonId: lesson1.id,
          status: schema.LessonProgressStatus.Completed,
        })
        .run();

      expect(getCourseCompletionRate({ courseId: base.course.id })).toBe(50);
    });

    it("averages across multiple enrolled users", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      const user2 = testDb
        .insert(schema.users)
        .values({
          name: "User 2",
          email: "user2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values([
          { userId: base.user.id, courseId: base.course.id },
          { userId: user2.id, courseId: base.course.id },
        ])
        .run();

      // Only user1 completes the lesson
      testDb
        .insert(schema.lessonProgress)
        .values({
          userId: base.user.id,
          lessonId: lesson1.id,
          status: schema.LessonProgressStatus.Completed,
        })
        .run();

      // user1: 100%, user2: 0% → average 50%
      expect(getCourseCompletionRate({ courseId: base.course.id })).toBe(50);
    });
  });

  describe("getCourseQuizPassRate", () => {
    it("returns null when course has no quizzes", () => {
      expect(getCourseQuizPassRate({ courseId: base.course.id })).toBeNull();
    });

    it("returns null when quizzes have no attempts", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const lesson = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.quizzes)
        .values({ lessonId: lesson.id, title: "Quiz 1", passingScore: 0.7 })
        .run();

      expect(getCourseQuizPassRate({ courseId: base.course.id })).toBeNull();
    });

    it("computes pass rate from attempts", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const lesson = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      const quiz = testDb
        .insert(schema.quizzes)
        .values({ lessonId: lesson.id, title: "Quiz 1", passingScore: 0.7 })
        .returning()
        .get();

      testDb
        .insert(schema.quizAttempts)
        .values([
          {
            userId: base.user.id,
            quizId: quiz.id,
            score: 0.8,
            passed: true,
          },
          {
            userId: base.user.id,
            quizId: quiz.id,
            score: 0.5,
            passed: false,
          },
          {
            userId: base.user.id,
            quizId: quiz.id,
            score: 0.9,
            passed: true,
          },
        ])
        .run();

      // 2 passed out of 3 → 67%
      expect(getCourseQuizPassRate({ courseId: base.course.id })).toBe(67);
    });

    it("aggregates across multiple quizzes in the course", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const lesson1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      const lesson2 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L2", position: 2 })
        .returning()
        .get();

      const quiz1 = testDb
        .insert(schema.quizzes)
        .values({ lessonId: lesson1.id, title: "Quiz 1", passingScore: 0.7 })
        .returning()
        .get();

      const quiz2 = testDb
        .insert(schema.quizzes)
        .values({ lessonId: lesson2.id, title: "Quiz 2", passingScore: 0.7 })
        .returning()
        .get();

      testDb
        .insert(schema.quizAttempts)
        .values([
          {
            userId: base.user.id,
            quizId: quiz1.id,
            score: 0.8,
            passed: true,
          },
          {
            userId: base.user.id,
            quizId: quiz2.id,
            score: 0.4,
            passed: false,
          },
        ])
        .run();

      // 1 passed out of 2 → 50%
      expect(getCourseQuizPassRate({ courseId: base.course.id })).toBe(50);
    });
  });

  // ─── Revenue Over Time ───

  describe("getCourseRevenueOverTime", () => {
    it("returns empty array when course has no purchases", () => {
      expect(getCourseRevenueOverTime({ courseId: base.course.id })).toEqual(
        []
      );
    });

    it("returns monthly revenue data points", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 4999,
            country: "US",
            createdAt: "2025-01-15T00:00:00.000Z",
          },
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 2500,
            country: "IN",
            createdAt: "2025-01-20T00:00:00.000Z",
          },
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 4999,
            country: "US",
            createdAt: "2025-03-10T00:00:00.000Z",
          },
        ])
        .run();

      const result = getCourseRevenueOverTime({ courseId: base.course.id });

      expect(result).toEqual([
        { month: "2025-01", revenue: 7499 },
        { month: "2025-02", revenue: 0 },
        { month: "2025-03", revenue: 4999 },
      ]);
    });

    it("fills gaps between months with zero revenue", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 1000,
            country: "US",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 2000,
            country: "US",
            createdAt: "2025-04-01T00:00:00.000Z",
          },
        ])
        .run();

      const result = getCourseRevenueOverTime({ courseId: base.course.id });

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ month: "2025-01", revenue: 1000 });
      expect(result[1]).toEqual({ month: "2025-02", revenue: 0 });
      expect(result[2]).toEqual({ month: "2025-03", revenue: 0 });
      expect(result[3]).toEqual({ month: "2025-04", revenue: 2000 });
    });

    it("does not include purchases from other courses", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Other",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 1000,
            country: "US",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
          {
            userId: base.user.id,
            courseId: course2.id,
            pricePaid: 9999,
            country: "US",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ])
        .run();

      const result = getCourseRevenueOverTime({ courseId: base.course.id });

      expect(result).toEqual([{ month: "2025-01", revenue: 1000 }]);
    });

    it("handles a single purchase month", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 5000,
          country: "US",
          createdAt: "2025-06-15T00:00:00.000Z",
        })
        .run();

      const result = getCourseRevenueOverTime({ courseId: base.course.id });

      expect(result).toEqual([{ month: "2025-06", revenue: 5000 }]);
    });
  });

  // ─── Lesson Dropoff Heatmap ───

  describe("getLessonDropoffHeatmap", () => {
    it("returns empty array when instructor has no courses", () => {
      const other = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      expect(getLessonDropoffHeatmap({ instructorId: other.id })).toEqual([]);
    });

    it("skips courses with no lessons", () => {
      const result = getLessonDropoffHeatmap({
        instructorId: base.instructor.id,
      });
      expect(result).toEqual([]);
    });

    it("returns 0% for all lessons when course has no enrollments", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const l1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      const l2 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L2", position: 2 })
        .returning()
        .get();

      const result = getLessonDropoffHeatmap({
        instructorId: base.instructor.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0].courseTitle).toBe("Test Course");
      expect(result[0].lessons).toEqual([
        { lessonId: l1.id, lessonTitle: "L1", completionPct: 0 },
        { lessonId: l2.id, lessonTitle: "L2", completionPct: 0 },
      ]);
    });

    it("computes completion percentages per lesson", () => {
      const mod = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod", position: 1 })
        .returning()
        .get();

      const l1 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L1", position: 1 })
        .returning()
        .get();

      const l2 = testDb
        .insert(schema.lessons)
        .values({ moduleId: mod.id, title: "L2", position: 2 })
        .returning()
        .get();

      const user2 = testDb
        .insert(schema.users)
        .values({
          name: "User 2",
          email: "user2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values([
          { userId: base.user.id, courseId: base.course.id },
          { userId: user2.id, courseId: base.course.id },
        ])
        .run();

      // Both users complete L1, only user1 completes L2
      testDb
        .insert(schema.lessonProgress)
        .values([
          {
            userId: base.user.id,
            lessonId: l1.id,
            status: schema.LessonProgressStatus.Completed,
          },
          {
            userId: user2.id,
            lessonId: l1.id,
            status: schema.LessonProgressStatus.Completed,
          },
          {
            userId: base.user.id,
            lessonId: l2.id,
            status: schema.LessonProgressStatus.Completed,
          },
        ])
        .run();

      const result = getLessonDropoffHeatmap({
        instructorId: base.instructor.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0].lessons[0].completionPct).toBe(100); // L1: 2/2
      expect(result[0].lessons[1].completionPct).toBe(50); // L2: 1/2
    });

    it("returns rows for multiple courses with different lesson counts", () => {
      // Course 1: 1 lesson
      const mod1 = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod 1", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.lessons)
        .values({ moduleId: mod1.id, title: "C1-L1", position: 1 })
        .run();

      // Course 2: 3 lessons
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Course 2",
          slug: "course-2",
          description: "Second",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const mod2 = testDb
        .insert(schema.modules)
        .values({ courseId: course2.id, title: "Mod 2", position: 1 })
        .returning()
        .get();

      testDb
        .insert(schema.lessons)
        .values([
          { moduleId: mod2.id, title: "C2-L1", position: 1 },
          { moduleId: mod2.id, title: "C2-L2", position: 2 },
          { moduleId: mod2.id, title: "C2-L3", position: 3 },
        ])
        .run();

      const result = getLessonDropoffHeatmap({
        instructorId: base.instructor.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0].lessons).toHaveLength(1);
      expect(result[1].lessons).toHaveLength(3);
    });

    it("orders lessons by module position then lesson position", () => {
      const mod2 = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod 2", position: 2 })
        .returning()
        .get();

      const mod1 = testDb
        .insert(schema.modules)
        .values({ courseId: base.course.id, title: "Mod 1", position: 1 })
        .returning()
        .get();

      // Insert out of order
      testDb
        .insert(schema.lessons)
        .values([
          { moduleId: mod2.id, title: "M2-L1", position: 1 },
          { moduleId: mod1.id, title: "M1-L2", position: 2 },
          { moduleId: mod1.id, title: "M1-L1", position: 1 },
        ])
        .run();

      const result = getLessonDropoffHeatmap({
        instructorId: base.instructor.id,
      });

      expect(result[0].lessons.map((l) => l.lessonTitle)).toEqual([
        "M1-L1",
        "M1-L2",
        "M2-L1",
      ]);
    });
  });
});
