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
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./notificationService";

describe("notificationService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createNotification", () => {
    it("creates a notification with all fields", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Alice enrolled in Test Course",
        "/instructor/1/students"
      );

      expect(notification).toBeDefined();
      expect(notification.recipientUserId).toBe(base.instructor.id);
      expect(notification.type).toBe(schema.NotificationType.Enrollment);
      expect(notification.title).toBe("New Enrollment");
      expect(notification.message).toBe("Alice enrolled in Test Course");
      expect(notification.linkUrl).toBe("/instructor/1/students");
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe("getNotifications", () => {
    it("returns notifications ordered by most recent first", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "First message",
        "/link1"
      );

      // Insert with a later timestamp
      testDb
        .insert(schema.notifications)
        .values({
          recipientUserId: base.instructor.id,
          type: schema.NotificationType.Enrollment,
          title: "Second",
          message: "Second message",
          linkUrl: "/link2",
          createdAt: new Date(Date.now() + 10000).toISOString(),
        })
        .run();

      const results = getNotifications(base.instructor.id, 5, 0);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Second");
      expect(results[1].title).toBe("First");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        createNotification(
          base.instructor.id,
          schema.NotificationType.Enrollment,
          `Notification ${i}`,
          `Message ${i}`,
          `/link${i}`
        );
      }

      const results = getNotifications(base.instructor.id, 3, 0);
      expect(results).toHaveLength(3);
    });

    it("respects offset parameter", () => {
      for (let i = 0; i < 5; i++) {
        testDb
          .insert(schema.notifications)
          .values({
            recipientUserId: base.instructor.id,
            type: schema.NotificationType.Enrollment,
            title: `N${i}`,
            message: `M${i}`,
            linkUrl: `/link${i}`,
            createdAt: new Date(Date.now() + i * 1000).toISOString(),
          })
          .run();
      }

      const results = getNotifications(base.instructor.id, 5, 2);
      expect(results).toHaveLength(3);
    });

    it("returns empty array when user has no notifications", () => {
      const results = getNotifications(base.instructor.id, 5, 0);
      expect(results).toEqual([]);
    });

    it("only returns notifications for the specified user", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "For base",
        "Message",
        "/link"
      );

      createNotification(
        otherInstructor.id,
        schema.NotificationType.Enrollment,
        "For other",
        "Message",
        "/link"
      );

      const baseResults = getNotifications(base.instructor.id, 5, 0);
      const otherResults = getNotifications(otherInstructor.id, 5, 0);

      expect(baseResults).toHaveLength(1);
      expect(baseResults[0].title).toBe("For base");
      expect(otherResults).toHaveLength(1);
      expect(otherResults[0].title).toBe("For other");
    });
  });

  describe("getUnreadCount", () => {
    it("returns 0 when user has no notifications", () => {
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("counts only unread notifications", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Unread 1",
        "Message",
        "/link"
      );

      const n2 = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Read",
        "Message",
        "/link"
      );
      markAsRead(n2.id);

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Unread 2",
        "Message",
        "/link"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(2);
    });

    it("does not count other users' notifications", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification(
        otherInstructor.id,
        schema.NotificationType.Enrollment,
        "Other's notification",
        "Message",
        "/link"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Test",
        "Message",
        "/link"
      );

      expect(notification.isRead).toBe(false);

      const updated = markAsRead(notification.id);
      expect(updated?.isRead).toBe(true);
    });

    it("does not affect other notifications", () => {
      const n1 = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "N1",
        "Message",
        "/link"
      );

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "N2",
        "Message",
        "/link"
      );

      markAsRead(n1.id);

      expect(getUnreadCount(base.instructor.id)).toBe(1);
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read for the user", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "N1",
        "Message",
        "/link"
      );

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "N2",
        "Message",
        "/link"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(2);

      markAllAsRead(base.instructor.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("does not affect other users' notifications", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Base notification",
        "Message",
        "/link"
      );

      createNotification(
        otherInstructor.id,
        schema.NotificationType.Enrollment,
        "Other notification",
        "Message",
        "/link"
      );

      markAllAsRead(base.instructor.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
      expect(getUnreadCount(otherInstructor.id)).toBe(1);
    });
  });
});
