import { eq, sql, and } from "drizzle-orm";
import { db } from "~/db";
import {
  courses,
  purchases,
  enrollments,
  modules,
  lessons,
  lessonProgress,
  quizzes,
  quizAttempts,
  LessonProgressStatus,
} from "~/db/schema";

// ─── Analytics Service ───
// Computes aggregate and per-course analytics for instructors.

export function getAggregateStats({ instructorId }: { instructorId: number }) {
  const instructorCourses = db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .all();

  if (instructorCourses.length === 0) {
    return {
      totalRevenue: 0,
      totalEnrollments: 0,
      averageCompletionRate: 0,
    };
  }

  const courseIds = instructorCourses.map((c) => c.id);

  const totalRevenue =
    db
      .select({ total: sql<number>`coalesce(sum(${purchases.pricePaid}), 0)` })
      .from(purchases)
      .where(
        sql`${purchases.courseId} in (${sql.join(
          courseIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .get()?.total ?? 0;

  const totalEnrollments =
    db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        sql`${enrollments.courseId} in (${sql.join(
          courseIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .get()?.count ?? 0;

  // Average completion rate: for each course, compute (completed enrollments / total enrollments),
  // then average across courses that have at least one enrollment.
  const courseCompletionRates: number[] = [];

  for (const courseId of courseIds) {
    const enrollmentCount =
      db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId))
        .get()?.count ?? 0;

    if (enrollmentCount === 0) continue;

    const totalLessons =
      db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(modules.courseId, courseId))
        .get()?.count ?? 0;

    if (totalLessons === 0) {
      courseCompletionRates.push(0);
      continue;
    }

    // For each enrolled user, compute their completion percentage, then average
    const enrolledUsers = db
      .select({ userId: enrollments.userId })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .all();

    const lessonIds = db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, courseId))
      .all()
      .map((l) => l.id);

    let totalCompletion = 0;
    for (const { userId } of enrolledUsers) {
      const completedCount =
        db
          .select({ count: sql<number>`count(*)` })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, userId),
              sql`${lessonProgress.lessonId} in (${sql.join(
                lessonIds.map((id) => sql`${id}`),
                sql`, `
              )})`,
              eq(lessonProgress.status, LessonProgressStatus.Completed)
            )
          )
          .get()?.count ?? 0;

      totalCompletion += completedCount / totalLessons;
    }

    courseCompletionRates.push(totalCompletion / enrollmentCount);
  }

  const averageCompletionRate =
    courseCompletionRates.length > 0
      ? Math.round(
          (courseCompletionRates.reduce((sum, r) => sum + r, 0) /
            courseCompletionRates.length) *
            100
        )
      : 0;

  return {
    totalRevenue,
    totalEnrollments,
    averageCompletionRate,
  };
}

// ─── Per-Course Stats ───

export function getCourseEnrollmentCount({ courseId }: { courseId: number }) {
  return (
    db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .get()?.count ?? 0
  );
}

export function getCourseCompletionRate({ courseId }: { courseId: number }) {
  const enrollmentCount =
    db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .get()?.count ?? 0;

  if (enrollmentCount === 0) return 0;

  const lessonIds = db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((l) => l.id);

  if (lessonIds.length === 0) return 0;

  const enrolledUsers = db
    .select({ userId: enrollments.userId })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();

  let totalCompletion = 0;
  for (const { userId } of enrolledUsers) {
    const completedCount =
      db
        .select({ count: sql<number>`count(*)` })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            sql`${lessonProgress.lessonId} in (${sql.join(
              lessonIds.map((id) => sql`${id}`),
              sql`, `
            )})`,
            eq(lessonProgress.status, LessonProgressStatus.Completed)
          )
        )
        .get()?.count ?? 0;

    totalCompletion += completedCount / lessonIds.length;
  }

  return Math.round((totalCompletion / enrollmentCount) * 100);
}

export function getCourseQuizPassRate({ courseId }: { courseId: number }) {
  // Find all quizzes for lessons in this course
  const courseQuizIds = db
    .select({ id: quizzes.id })
    .from(quizzes)
    .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((q) => q.id);

  if (courseQuizIds.length === 0) return null;

  const totalAttempts =
    db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .where(
        sql`${quizAttempts.quizId} in (${sql.join(
          courseQuizIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .get()?.count ?? 0;

  if (totalAttempts === 0) return null;

  const passedAttempts =
    db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .where(
        and(
          sql`${quizAttempts.quizId} in (${sql.join(
            courseQuizIds.map((id) => sql`${id}`),
            sql`, `
          )})`,
          eq(quizAttempts.passed, true)
        )
      )
      .get()?.count ?? 0;

  return Math.round((passedAttempts / totalAttempts) * 100);
}

// ─── Revenue Over Time ───

export function getCourseRevenueOverTime({ courseId }: { courseId: number }) {
  const rows = db
    .select({
      month: sql<string>`strftime('%Y-%m', ${purchases.createdAt})`,
      revenue: sql<number>`sum(${purchases.pricePaid})`,
    })
    .from(purchases)
    .where(eq(purchases.courseId, courseId))
    .groupBy(sql`strftime('%Y-%m', ${purchases.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${purchases.createdAt})`)
    .all();

  if (rows.length === 0) return [];

  // Fill in missing months between first and last with zero revenue
  const result: { month: string; revenue: number }[] = [];
  const revenueByMonth = new Map(rows.map((r) => [r.month, r.revenue]));

  const [startYear, startMonth] = rows[0].month.split("-").map(Number);
  const [endYear, endMonth] = rows[rows.length - 1].month
    .split("-")
    .map(Number);

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push({ month: key, revenue: revenueByMonth.get(key) ?? 0 });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return result;
}

// ─── Lesson Dropoff Heatmap ───

export function getLessonDropoffHeatmap({
  instructorId,
}: {
  instructorId: number;
}) {
  const instructorCourses = db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .all();

  if (instructorCourses.length === 0) return [];

  const rows: {
    courseId: number;
    courseTitle: string;
    lessons: { lessonId: number; lessonTitle: string; completionPct: number }[];
  }[] = [];

  for (const course of instructorCourses) {
    // Get lessons ordered by module position, then lesson position
    const courseLessons = db
      .select({
        id: lessons.id,
        title: lessons.title,
        modulePosition: modules.position,
        lessonPosition: lessons.position,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, course.id))
      .orderBy(modules.position, lessons.position)
      .all();

    if (courseLessons.length === 0) continue;

    const enrollmentCount =
      db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.courseId, course.id))
        .get()?.count ?? 0;

    const lessonData = courseLessons.map((lesson) => {
      if (enrollmentCount === 0) {
        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          completionPct: 0,
        };
      }

      const completedCount =
        db
          .select({ count: sql<number>`count(*)` })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.lessonId, lesson.id),
              eq(lessonProgress.status, LessonProgressStatus.Completed)
            )
          )
          .get()?.count ?? 0;

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        completionPct: Math.round((completedCount / enrollmentCount) * 100),
      };
    });

    rows.push({
      courseId: course.id,
      courseTitle: course.title,
      lessons: lessonData,
    });
  }

  return rows;
}
