import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TurnoversPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Turnovers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage turnover inspections and photo documentation.
        </p>
      </div>

      <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-gray-900">
          Coming soon
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Turnover management is being built in Phase 3. Set up your properties
          and areas first so you&apos;re ready.
        </p>
      </div>
    </div>
  );
}
