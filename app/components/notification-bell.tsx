import { useState, useRef, useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { Bell } from "lucide-react";
import { cn } from "~/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  unreadCount: number;
  notifications: Notification[];
}

function timeAgo(dateString: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({
  unreadCount,
  notifications,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const markReadFetcher = useFetcher();
  const markAllReadFetcher = useFetcher();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      markReadFetcher.submit(
        { notificationId: String(notification.id) },
        { method: "post", action: "/api/notifications/mark-read" }
      );
    }
    setOpen(false);
    navigate(notification.linkUrl);
  }

  function handleMarkAllRead() {
    markAllReadFetcher.submit(
      {},
      { method: "post", action: "/api/notifications/mark-all-read" }
    );
  }

  const optimisticUnread =
    markAllReadFetcher.state !== "idle"
      ? 0
      : markReadFetcher.state !== "idle"
        ? Math.max(0, unreadCount - 1)
        : unreadCount;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Notifications"
      >
        <Bell className="size-4" />
        {optimisticUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {optimisticUnread > 9 ? "9+" : optimisticUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const isOptimisticallyRead =
                  n.isRead ||
                  markAllReadFetcher.state !== "idle" ||
                  (markReadFetcher.state !== "idle" &&
                    markReadFetcher.formData?.get("notificationId") ===
                      String(n.id));

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-accent",
                      !isOptimisticallyRead && "bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!isOptimisticallyRead && (
                        <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <span className="text-sm font-medium">{n.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <span className="text-xs text-muted-foreground/60">
                      {timeAgo(n.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
