import { eq, and, or, desc } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users, CommentStatus } from "~/db/schema";

export function addComment(userId: number, lessonId: number, content: string) {
  const result = db
    .insert(lessonComments)
    .values({ userId, lessonId, content, status: CommentStatus.Pending })
    .run();
  return Number(result.lastInsertRowid);
}

export function getVisibleComments(lessonId: number, currentUserId: number) {
  return db
    .select({
      id: lessonComments.id,
      content: lessonComments.content,
      status: lessonComments.status,
      createdAt: lessonComments.createdAt,
      userId: lessonComments.userId,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(
      and(
        eq(lessonComments.lessonId, lessonId),
        or(
          eq(lessonComments.status, CommentStatus.Approved),
          eq(lessonComments.userId, currentUserId)
        )
      )
    )
    .orderBy(desc(lessonComments.createdAt))
    .all();
}

export function getAllComments(lessonId: number) {
  return db
    .select({
      id: lessonComments.id,
      content: lessonComments.content,
      status: lessonComments.status,
      createdAt: lessonComments.createdAt,
      userId: lessonComments.userId,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(desc(lessonComments.createdAt))
    .all();
}

export function approveComment(commentId: number) {
  db.update(lessonComments)
    .set({ status: CommentStatus.Approved })
    .where(eq(lessonComments.id, commentId))
    .run();
}

export function deleteComment(commentId: number) {
  db.delete(lessonComments).where(eq(lessonComments.id, commentId)).run();
}

export function getCommentById(commentId: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, commentId))
    .get();
}
