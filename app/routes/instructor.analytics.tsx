import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/instructor.analytics";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { getCoursesByInstructor } from "~/services/courseService";
import {
  getAggregateStats,
  getCourseEnrollmentCount,
  getCourseCompletionRate,
  getCourseQuizPassRate,
  getCourseRevenueOverTime,
  getLessonDropoffHeatmap,
} from "~/services/analyticsService";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { data, isRouteErrorResponse } from "react-router";
import { UserRole } from "~/db/schema";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export function meta() {
  return [
    { title: "Analytics — Cadence" },
    { name: "description", content: "View your course analytics" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || user.role !== UserRole.Instructor) {
    throw data("Only instructors can access this page.", {
      status: 403,
    });
  }

  const aggregateStats = getAggregateStats({ instructorId: currentUserId });

  const instructorCourses = getCoursesByInstructor(currentUserId);
  const courseList = instructorCourses.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  // Determine selected course from search params
  const url = new URL(request.url);
  const courseIdParam = url.searchParams.get("courseId");
  const selectedCourseId = courseIdParam
    ? Number(courseIdParam)
    : courseList.length > 0
      ? courseList[0].id
      : null;

  // Validate the selected course belongs to this instructor
  const validCourse =
    selectedCourseId !== null &&
    courseList.some((c) => c.id === selectedCourseId);

  let courseStats = null;
  if (validCourse && selectedCourseId !== null) {
    courseStats = {
      courseId: selectedCourseId,
      enrollmentCount: getCourseEnrollmentCount({ courseId: selectedCourseId }),
      completionRate: getCourseCompletionRate({ courseId: selectedCourseId }),
      quizPassRate: getCourseQuizPassRate({ courseId: selectedCourseId }),
      revenueOverTime: getCourseRevenueOverTime({ courseId: selectedCourseId }),
    };
  }

  const heatmapData = getLessonDropoffHeatmap({ instructorId: currentUserId });

  return { aggregateStats, courseList, selectedCourseId, courseStats, heatmapData };
}

function formatRevenue(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function heatmapColor(pct: number) {
  if (pct === 0) return "var(--muted)";
  // Green scale: low completion = light, high completion = dark
  const lightness = 90 - (pct / 100) * 50; // 90% at 0 → 40% at 100
  return `hsl(142, 60%, ${lightness}%)`;
}

export function HydrateFallback() {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export default function InstructorAnalytics({
  loaderData,
}: Route.ComponentProps) {
  const { aggregateStats, courseList, selectedCourseId, courseStats, heatmapData } =
    loaderData;
  const navigate = useNavigate();
  const hasData =
    aggregateStats.totalRevenue > 0 || aggregateStats.totalEnrollments > 0;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track your course performance and student engagement
        </p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No data yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analytics will appear here once you have enrollments or purchases.
          </p>
          <Link to="/instructor" className="mt-4">
            <Button variant="outline">Go to My Courses</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Aggregate Summary Cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-green-100 p-2 dark:bg-green-900/30">
                    <DollarSign className="size-5 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold">
                      {formatRevenue(aggregateStats.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Users className="size-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Enrollments
                    </p>
                    <p className="text-2xl font-bold">
                      {aggregateStats.totalEnrollments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-purple-100 p-2 dark:bg-purple-900/30">
                    <TrendingUp className="size-5 text-purple-700 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Avg Completion Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {aggregateStats.averageCompletionRate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Course Section */}
          {courseList.length > 0 && (
            <div className="mt-10">
              <div className="mb-6 flex items-center gap-4">
                <h2 className="text-xl font-semibold">Course Details</h2>
                <Select
                  value={
                    selectedCourseId !== null
                      ? String(selectedCourseId)
                      : undefined
                  }
                  onValueChange={(value) => {
                    navigate(`/instructor/analytics?courseId=${value}`);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseList.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {courseStats ? (
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/30">
                            <GraduationCap className="size-5 text-blue-700 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Enrollments
                            </p>
                            <p className="text-2xl font-bold">
                              {courseStats.enrollmentCount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-purple-100 p-2 dark:bg-purple-900/30">
                            <TrendingUp className="size-5 text-purple-700 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Completion Rate
                            </p>
                            <p className="text-2xl font-bold">
                              {courseStats.completionRate}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-amber-100 p-2 dark:bg-amber-900/30">
                            <CheckCircle className="size-5 text-amber-700 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Quiz Pass Rate
                            </p>
                            <p className="text-2xl font-bold">
                              {courseStats.quizPassRate !== null
                                ? `${courseStats.quizPassRate}%`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Over Time Chart */}
                  {courseStats.revenueOverTime.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                          Revenue Over Time
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={courseStats.revenueOverTime}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                              />
                              <XAxis
                                dataKey="month"
                                className="text-xs"
                                tick={{ fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                className="text-xs"
                                tick={{ fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value: number) =>
                                  `$${(value / 100).toLocaleString()}`
                                }
                              />
                              <Tooltip
                                formatter={(value) => [
                                  formatRevenue(Number(value)),
                                  "Revenue",
                                ]}
                                labelFormatter={(label) => {
                                  const [y, m] = String(label).split("-");
                                  const date = new Date(
                                    Number(y),
                                    Number(m) - 1
                                  );
                                  return date.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  });
                                }}
                                contentStyle={{
                                  borderRadius: "0.375rem",
                                  border: "1px solid var(--border)",
                                  backgroundColor: "var(--popover)",
                                  color: "var(--popover-foreground)",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "var(--primary)" }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a course to view detailed metrics.
                </p>
              )}
            </div>
          )}

          {/* Lesson Dropoff Heatmap */}
          {heatmapData.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-xl font-semibold">
                Lesson Dropoff Heatmap
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Completion percentage per lesson across all courses. Darker
                cells indicate higher completion.
              </p>
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                            Course
                          </th>
                          {Array.from({
                            length: Math.max(
                              ...heatmapData.map((r) => r.lessons.length)
                            ),
                          }).map((_, i) => (
                            <th
                              key={i}
                              className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
                            >
                              {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row) => (
                          <tr key={row.courseId}>
                            <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                              <span className="block max-w-48 truncate">
                                {row.courseTitle}
                              </span>
                            </td>
                            {row.lessons.map((lesson) => (
                              <td
                                key={lesson.lessonId}
                                className="px-1 py-2 text-center"
                                title={`${lesson.lessonTitle}: ${lesson.completionPct}%`}
                              >
                                <div
                                  className="mx-auto flex size-8 items-center justify-center rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: heatmapColor(
                                      lesson.completionPct
                                    ),
                                    color:
                                      lesson.completionPct > 60
                                        ? "white"
                                        : "inherit",
                                  }}
                                >
                                  {lesson.completionPct}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message =
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message =
        typeof error.data === "string"
          ? error.data
          : "You don't have permission to access this page.";
    } else {
      title = `Error ${error.status}`;
      message =
        typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/instructor">
            <Button variant="outline">My Courses</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
