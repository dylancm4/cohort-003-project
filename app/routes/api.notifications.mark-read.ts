import { data } from "react-router";
import * as v from "valibot";
import type { Route } from "./+types/api.notifications.mark-read";
import { getCurrentUserId } from "~/lib/session";
import { parseFormData } from "~/lib/validation";
import { markAsRead } from "~/services/notificationService";
import { db } from "~/db";
import { notifications } from "~/db/schema";
import { eq } from "drizzle-orm";

const markReadSchema = v.object({
  notificationId: v.pipe(
    v.unknown(),
    v.transform(Number),
    v.integer(),
    v.gtValue(0, "Invalid notification ID")
  ),
});

export async function action({ request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, markReadSchema);

  if (!parsed.success) {
    throw data("Invalid notification ID", { status: 400 });
  }

  const notification = db
    .select()
    .from(notifications)
    .where(eq(notifications.id, parsed.data.notificationId))
    .get();

  if (!notification || notification.recipientUserId !== currentUserId) {
    throw data("Notification not found", { status: 404 });
  }

  markAsRead(parsed.data.notificationId);

  return { ok: true };
}
