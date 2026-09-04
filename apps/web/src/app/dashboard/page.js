import RecoveryNav from "../../components/recovery/RecoveryNav";
import RecoveryDashboard from "../../components/recovery/RecoveryDashboard";

export default function DashboardPage() {
  return (
    <>
      <RecoveryNav />

      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <RecoveryDashboard />
        </div>
      </main>
    </>
  );
}