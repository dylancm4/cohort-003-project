# Plan: Instructor Analytics Dashboard

> Source PRD: prd/instructor-analytics-dashboard.md (GitHub Issue #100)

## Architectural decisions

Durable decisions that apply across all phases:

- **Route**: `/instructor/analytics` -- new route file declared in `app/routes.ts`, nested under `layout.app.tsx`. Course selection via `?courseId=` search param triggering loader re-runs.
- **Auth**: Loader checks `UserRole.Instructor` and throws 403 otherwise, matching existing instructor route patterns.
- **Schema**: No changes. All queries run against existing tables: `purchases`, `enrollments`, `lessonProgress`, `quizAttempts`, `courses`, `modules`, `lessons`.
- **New service**: `app/services/analyticsService.ts` with companion `analyticsService.test.ts`. All functions accept object parameters per CLAUDE.md convention.
- **New dependency**: `recharts` for the revenue line chart and lesson dropoff heatmap.
- **Sidebar**: Add "Analytics" nav item to `app/components/sidebar.tsx` with `roles: [UserRole.Instructor]`.
- **UI components**: shadcn `Card` for stat cards, shadcn `Select` for course dropdown. Page follows existing layout convention (`mx-auto max-w-7xl p-6 lg:p-8`).

---

## Phase 1: Aggregate Summary Cards + Sidebar Link

**User stories**: 1, 2, 3, 11, 12, 13, 14

### What to build

Add an "Analytics" link to the sidebar that is only visible to instructors. Create the `/instructor/analytics` route with an instructor role check in the loader. Build an analytics service with a function that computes aggregate stats (total revenue, total enrollments, average completion rate) across all of an instructor's courses. Display these three metrics as summary cards at the top of the page. Show a friendly empty state when an instructor has no courses or data.

### Acceptance criteria

- [ ] Sidebar shows "Analytics" link only when the logged-in user has the Instructor role
- [ ] Non-instructor users receive a 403 when navigating to `/instructor/analytics`
- [ ] Summary cards display total lifetime revenue, total enrollment count, and average completion rate
- [ ] Empty state is shown when the instructor has no courses or no enrollments
- [ ] Analytics service aggregate function has tests covering: normal data, no enrollments, no purchases, partially completed courses

---

## Phase 2: Per-Course Metrics with Course Selector

**User stories**: 4, 6, 7, 8, 16, 19

### What to build

Add a course selector dropdown below the summary cards, populated with the instructor's published courses. Default to the first published course (or show a prompt to select if none exist). When a course is selected, display per-course stat cards: enrollment count, completion rate, and quiz pass rate. Course selection changes the URL search param, triggering a loader re-run to fetch the selected course's data.

### Acceptance criteria

- [ ] Course selector dropdown lists only the current instructor's courses
- [ ] Defaults to the first published course on initial page load
- [ ] Selecting a different course updates the URL search param and refreshes per-course metrics
- [ ] Per-course enrollment count, completion rate, and quiz pass rate are displayed as labeled stat cards
- [ ] Analytics service per-course functions have tests covering: normal data, course with no enrollments, course with no quizzes, course with no quiz attempts

---

## Phase 3: Revenue-Over-Time Chart

**User stories**: 5, 15, 18

### What to build

Add Recharts as a dependency. Build an analytics service function that aggregates monthly revenue for a selected course from the purchases table. Render a Recharts line chart in the per-course section showing revenue over time at monthly granularity. The chart should display all-time data and load quickly without pagination.

### Acceptance criteria

- [ ] Recharts is installed and the line chart renders in the per-course section
- [ ] Chart displays monthly revenue data points for the selected course
- [ ] Months with no purchases show as zero-value data points (no gaps in the line)
- [ ] Chart updates when a different course is selected
- [ ] Analytics service monthly revenue function has tests covering: multiple months of data, months with no purchases, course with no purchases at all

---

## Phase 4: Lesson Dropoff Heatmap

**User stories**: 9, 10, 17

### What to build

Build an analytics service function that returns a matrix of lesson completion percentages for all of an instructor's courses: each course is a row, each lesson (ordered by module position then lesson position) is a column, and each cell is the percentage of enrolled students who completed that lesson. Render this as a heatmap at the bottom of the analytics page using a color scale where high-completion lessons are visually distinct from low-completion lessons. Handle courses with different numbers of lessons (ragged columns) gracefully.

### Acceptance criteria

- [ ] Heatmap displays all instructor courses as rows and lessons as columns ordered by position
- [ ] Color intensity represents completion percentage with a clear visual distinction between high and low values
- [ ] Courses with different numbers of lessons render correctly (ragged columns handled)
- [ ] Courses with no enrollments show an appropriate empty/zero state in the heatmap
- [ ] Analytics service heatmap function has tests covering: multiple courses with varying lesson counts, courses with no enrollments, courses with partial completion
