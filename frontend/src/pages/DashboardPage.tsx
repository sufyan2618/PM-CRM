import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { queryClient } from "../api/query-client";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { SelectField } from "../components/SelectField";
import { StatCard } from "../components/StatCard";
import { useProfile } from "../hooks/useProfile";
import { useAuthStore } from "../store/auth.store";
import { getErrorMessage } from "../utils/api-error";

const RANGE_OPTIONS = [
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
];

const DUMMY_STATS = {
  week: [
    { label: "Visits", value: "1,284", note: "Up from last week" },
    { label: "New users", value: "86", note: "Sample number" },
    { label: "Tasks done", value: "24", note: "Placeholder" },
  ],
  month: [
    { label: "Visits", value: "8,410", note: "Up from last month" },
    { label: "New users", value: "340", note: "Sample number" },
    { label: "Tasks done", value: "112", note: "Placeholder" },
  ],
  year: [
    { label: "Visits", value: "96,220", note: "Up from last year" },
    { label: "New users", value: "4,180", note: "Sample number" },
    { label: "Tasks done", value: "1,406", note: "Placeholder" },
  ],
};

const ACTIVITIES = [
  "Welcome email was sent",
  "Profile was created",
  "Dashboard preview is ready",
];

export function DashboardPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const storedUser = useAuthStore((state) => state.user);
  const user = profile.data ?? storedUser;
  const [range, setRange] = useState("week");
  const stats = DUMMY_STATS[range as keyof typeof DUMMY_STATS] ?? DUMMY_STATS.week;

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      useAuthStore.getState().clearSession();
      queryClient.setQueryData(["profile"], null);
      navigate("/login", { replace: true });
    },
  });

  if (!user) return null;

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dashboard">
      <header className="topbar">
        <p className="brand brand-dark">Infinity</p>
        <div className="topbar-actions">
          <span className="topbar-email">{user.email}</span>
          <Button type="button" variant="danger" loading={logout.isPending} onClick={() => logout.mutate()}>
            Log out
          </Button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-intro">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>
              Hello, {user.firstName} {user.lastName}
            </h1>
            <p>This page is a sample home. Real numbers can come later.</p>
          </div>
          <SelectField
            label="Time range"
            name="range"
            value={range}
            onChange={setRange}
            options={RANGE_OPTIONS}
          />
        </div>

        {logout.error ? <Alert tone="error" message={getErrorMessage(logout.error)} /> : null}

        <section className="stat-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} note={stat.note} />
          ))}
        </section>

        <section className="panel-grid">
          <article className="panel">
            <h2>Account</h2>
            <dl className="account-list">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{user.isVerified ? "Verified" : "Not verified"}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{joined}</dd>
              </div>
            </dl>
          </article>
          <article className="panel">
            <h2>Recent activity</h2>
            <ul className="activity-list">
              {ACTIVITIES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
