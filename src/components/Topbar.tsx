// Topbar.tsx
import React, { useEffect, useState } from "react";
import "../css/Topbar.css";
import supabase from "../supabaseClient";
import AnonymousProfilePic from "../assets/anonymous.jpg";

// Doctor profile interface
interface DoctorProfile {
  id?: string;
  full_name: string;
  specialization: string;
  email?: string; // optional since it may come from joined table
  user_id?: string;
  profile_picture_url?: string;
  gender?: string;
}

// Props for Topbar
interface TopbarProps {
  activePage: string;
  onSearchChange?: (query: string) => void;
}

// Notification type
interface Notification {
  id: string;
  doctor_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Topbar: React.FC<TopbarProps> = ({ activePage, onSearchChange }) => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Load notifications
  useEffect(() => {
    if (!doctorProfile?.id) return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("doctor_id", doctorProfile.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    loadNotifications();

    // Real-time subscription
    const channel = supabase
      .channel("realtime-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if ((payload.new as Notification).doctor_id === doctorProfile.id) {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorProfile]);

  const markSingleAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  // Fetch doctor profile
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) return;

      const { data, error } = await supabase
        .from("doctors")
        .select(`
          id,
          full_name,
          specialization,
          gender,
          address,
          phone_number,
          profile_picture_url,
          user_id,
          users (email)
        `)
        .eq("user_id", storedUserId)
        .limit(1);

      if (error) return;

      const doctorData = data?.[0];
      if (!doctorData) return;

      const profilePicture =
        doctorData.profile_picture_url && doctorData.profile_picture_url.startsWith("http")
          ? doctorData.profile_picture_url
          : "/default-avatars.png";

      const doctorEmail = doctorData.users?.[0]?.email ?? "";
      
      setDoctorProfile({
        id: doctorData.id,
        full_name: doctorData.full_name,
        specialization: doctorData.specialization,
        profile_picture_url: profilePicture,
        email: doctorEmail,
        user_id: doctorData.user_id,
      });
    };

    fetchDoctorProfile();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  const displayName = doctorProfile?.full_name || "Doctor";
  const specialization = doctorProfile?.specialization || "Specialization";
  const profileUrl = doctorProfile?.profile_picture_url || AnonymousProfilePic;

  return (
    <div className="topbar-content">
      {activePage === "dashboard" && (
        <div className="topbar-center dashboard">
          <h3>
            Welcome Doctor, <span className="doctor-name">{displayName}</span>{" "}
            <span style={{ fontSize: "14px", color: "gray" }}>
              ({specialization})
            </span>
          </h3>

          <div className="topbar-right">
            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="notif-dot"></span>}
              </button>

              {showNotifications && (
                <div className="notif-dropdown">
                  <h4>Notifications</h4>
                  {notifications.length === 0 && <p className="empty">No new notifications</p>}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notif-item ${notif.is_read ? "" : "unread"}`}
                      onClick={() => markSingleAsRead(notif.id)}
                    >
                      <p>{notif.message}</p>
                      <span className="notif-time">{formatDate(notif.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profile">
              <img
                src={profileUrl || AnonymousProfilePic}
                alt="Profile"
                className="topbar-profile"
                onError={(e) => {
                  e.currentTarget.src = AnonymousProfilePic;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activePage === "patients" && (
        <div className="topbar-center patients">
          <h3>Patients List</h3>
          <div className="search-bar">
            <span className="search-icon">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              placeholder="Search patients..."
              className="search-input"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      )}

      {activePage === "reports" && (
        <div className="topbar-center">
          <h3>Reports Overview</h3>
        </div>
      )}

      {activePage === "settings" && (
        <div className="topbar-center">
          <h3>Settings</h3>
        </div>
      )}
    </div>
  );
};

export default Topbar;
