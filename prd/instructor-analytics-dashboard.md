# Instructor Analytics Dashboard

> GitHub Issue: https://github.com/ai-hero-dev/cohort-003-project/issues/100

## Problem Statement

Instructors on the Cadence platform have no visibility into how their courses are performing. The existing instructor dashboard only shows basic lesson counts and enrollment numbers per course. Instructors need to understand their revenue, student engagement, completion rates, quiz performance, and where students are dropping off so they can improve their courses and make informed decisions about content.

## Solution

A dedicated analytics dashboard at `/instructor/analytics`, accessible via the sidebar (visible only to instructors). The page provides:

1. **Aggregate summary cards** across all of the instructor's courses (total revenue, total enrollments, average completion rate)
2. **A course selector** to drill into per-course metrics: revenue over time (chart), enrollment count, completion rate, and quiz pass rate
3. **A lesson dropoff heatmap** across all courses, showing lesson-by-lesson completion rates so instructors can spot where students disengage

All metrics are computed on-the-fly from existing database tables (purchases, enrollments, lessonProgress, quizAttempts). No new database tables or background jobs are needed. A charting library (Recharts) will be added for the revenue-over-time chart and the heatmap visualization.

## User Stories

1. As an instructor, I want to see my total lifetime revenue across all courses, so that I can understand my overall earnings at a glance.
2. As an instructor, I want to see my total enrollment count across all courses, so that I know how many students I'm reaching.
3. As an instructor, I want to see my average course completion rate across all courses, so that I can gauge overall student engagement.
4. As an instructor, I want to select a specific course from a dropdown, so that I can view detailed metrics for that course.
5. As an instructor, I want to see a revenue-over-time line chart for a selected course, so that I can understand revenue trends and the impact of promotions or launches.
6. As an instructor, I want to see the total enrollment count for a selected course, so that I know how popular it is.
7. As an instructor, I want to see the completion rate for a selected course, so that I know what percentage of enrolled students finished all lessons.
8. As an instructor, I want to see the overall quiz pass rate for a selected course, so that I can assess whether my assessments are appropriately calibrated.
9. As an instructor, I want to see a lesson dropoff heatmap across all my courses, so that I can visually identify which lessons cause students to stop progressing.
10. As an instructor, I want the heatmap to show each course as a row and each lesson as a column (ordered by position), with color intensity representing the percentage of enrolled students who completed that lesson, so that patterns are immediately visible.
11. As an instructor, I want to access the analytics dashboard from the sidebar, so that I can find it easily without navigating away from my workflow.
12. As an instructor, I want the analytics link to only appear in the sidebar when I'm logged in as an instructor, so that the UI stays clean for other roles.
13. As an instructor, I want the page to be restricted to the Instructor role, so that students and admins cannot view my analytics.
14. As an instructor, I want the aggregate summary cards to update when I publish new courses or get new enrollments, so that the data is always current.
15. As an instructor, I want the revenue chart to show monthly granularity, so that I can spot trends over time.
16. As an instructor, I want the per-course section to clearly label each metric, so that I don't have to guess what a number represents.
17. As an instructor, I want the dropoff heatmap to use a color scale that makes high-completion lessons visually distinct from low-completion lessons, so that problem areas stand out.
18. As an instructor, I want the page to load quickly with all-time data, so that I don't have to wait or paginate through date ranges.
19. As an instructor, I want the course selector to default to my first published course (or show a prompt to select), so that the per-course section is immediately useful.

## Implementation Decisions

### New dependency
- **Recharts** will be added for the revenue-over-time line chart and the lesson dropoff heatmap visualization.

### New route
- `/instructor/analytics` as a new route file, protected by an Instructor role check in the loader.

### New service: analytics service
- A new service file that encapsulates all analytics queries. This is the core new module. It will expose functions for:
  - **Aggregate stats**: total revenue, total enrollments, and average completion rate across all courses for a given instructor.
  - **Per-course revenue over time**: monthly revenue aggregation for a given course, returned as an array suitable for charting.
  - **Per-course enrollment count**: enrollment count for a specific course.
  - **Per-course completion rate**: percentage of enrolled students who have completed all lessons in a course.
  - **Per-course quiz pass rate**: percentage of quiz attempts that passed, aggregated across all quizzes in a course.
  - **Lesson dropoff heatmap data**: for all of an instructor's courses, return a matrix of lesson completion percentages (enrolled students who completed each lesson / total enrolled students per course).
- All functions accept object parameters per project convention.
- All queries run against existing tables (purchases, enrollments, lessonProgress, quizAttempts, courses, modules, lessons) with no schema changes.

### Sidebar modification
- The sidebar component will be updated to conditionally render an "Analytics" link when the current user has the Instructor role.

### UI structure (single page)
- **Top**: Summary cards (total revenue, total enrollments, average completion rate) using existing shadcn Card components.
- **Middle**: Course selector dropdown (shadcn Select) followed by per-course metrics: revenue-over-time Recharts line chart, enrollment count, completion rate, and quiz pass rate displayed as stat cards.
- **Bottom**: Lesson dropoff heatmap (Recharts or custom component) showing all courses, with rows as courses and columns as lessons, color-coded by completion percentage.

### Data loading
- All data is fetched in the route loader using the analytics service. No client-side fetching or background computation needed given the expected data volumes.
- When the user selects a different course in the dropdown, a form submission or URL search param change triggers a new loader call with the selected course ID.

## Testing Decisions

### What makes a good test
Tests should verify the external behavior of the analytics service functions (given known database state, assert correct computed metrics). They should not test internal query structure or implementation details.

### Modules to test
- **Analytics service**: This is the only new service and contains all the computation logic. Tests should:
  - Seed the database with known courses, enrollments, purchases, lesson progress, and quiz attempts
  - Call each analytics function and assert correct aggregated results
  - Cover edge cases: courses with no enrollments, courses with no quizzes, courses with no purchases, partially completed courses

### Prior art
Existing service test files in the codebase follow the pattern of seeding a test database and asserting against service function return values using Vitest.

## Out of Scope

- **Date range filtering**: All metrics are all-time for v1. Time-range filtering may be added later.
- **Admin view**: Admins cannot view this dashboard. A cross-instructor admin analytics view is a separate feature.
- **Per-module completion rates**: Only course-level completion rates are shown, not module-level.
- **Per-question quiz analysis**: Only overall pass rates per course are shown, not per-question difficulty breakdowns.
- **Export/download**: No CSV or PDF export of analytics data.
- **Real-time updates**: Data refreshes on page load only, no WebSocket or polling.
- **Drill-down pages**: No separate detail pages per course or per metric. Everything is on one page.
- **Coupon/team purchase breakdowns**: Revenue is shown as total only, not split by purchase type.

## Further Notes

- The heatmap will need to handle courses with different numbers of lessons gracefully (ragged columns). Courses with many lessons may need horizontal scrolling or truncation.
- Revenue is stored as `pricePaid` in the purchases table and represents gross revenue (no platform fee deductions are modeled in the schema).
- The course selector should only show courses belonging to the current instructor.
- Consider showing a friendly empty state when an instructor has no courses or no data yet.
