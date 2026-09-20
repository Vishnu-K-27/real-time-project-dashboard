import { io, Socket } from "socket.io-client";
import { createContext, useContext, useEffect, useState } from "react";
import { Activity, Notification } from "./api";
import { useAuth } from "./auth";

type Realtime = {
  onlineCount: number | null;
  livePulse: boolean;
  prependActivity: Activity | null;
  unreadBump: number;
  lastNotification: Notification | null;
};

const Ctx = createContext<Realtime>({
  onlineCount: null,
  livePulse: false,
  prependActivity: null,
  unreadBump: 0,
  lastNotification: null,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [livePulse, setLivePulse] = useState(false);
  const [prependActivity, setPrependActivity] = useState<Activity | null>(null);
  const [unreadBump, setUnreadBump] = useState(0);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(import.meta.env.VITE_WS_URL ?? "http://localhost:4000", {
      transports: ["websocket"],
      withCredentials: true,
      upgrade: false,
    });
    socket.on("presence:count", (p: { onlineCount: number }) => setOnlineCount(p.onlineCount));
    socket.on("activity:new", (event: Activity) => {
      setPrependActivity(event);
      setLivePulse(true);
      window.setTimeout(() => setLivePulse(false), 1600);
    });
    socket.on("notification:new", (n: Notification) => {
      setLastNotification(n);
      setUnreadBump((v) => v + 1);
    });
    socket.on("notification:count", (p: { unreadCount: number }) => {
      setUnreadBump(p.unreadCount);
    });
    return () => {
      socket.close();
    };
  }, [user]);

  return (
    <Ctx.Provider value={{ onlineCount, livePulse, prependActivity, unreadBump, lastNotification }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRealtime() {
  return useContext(Ctx);
}
