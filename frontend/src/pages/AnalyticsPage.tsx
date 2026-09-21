import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchAnalytics } from '../api/applications';
import type { AnalyticsSummary } from '../types';
import { STATUS_LABELS, STATUS_ORDER } from '../types';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setData);
  }, []);

  if (!data) {
    return <div className="page-loading">Loading analytics...</div>;
  }

  const statusData = STATUS_ORDER.map((status) => ({
    status: STATUS_LABELS[status],
    count: data.counts_by_status[status],
  }));

  const weeklyData = data.applications_per_week.map((row) => ({
    week: row.week,
    count: row.count,
  }));

  return (
    <div className="analytics-page">
      <h1>Analytics</h1>

      <div className="stat-row">
        <StatCard label="Total applications" value={data.total} />
        <StatCard
          label="Applied to interview"
          value={`${data.conversion_rates.applied_to_interview}%`}
        />
        <StatCard
          label="Interview to offer"
          value={`${data.conversion_rates.interview_to_offer}%`}
        />
      </div>

      <div className="chart-card">
        <h2>Applications by status</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f6df5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Applications per week</h2>
        {weeklyData.length === 0 ? (
          <p className="chart-empty">No applications yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4f6df5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
