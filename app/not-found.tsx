import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white p-4">
      <h2 className="text-2xl font-bold mb-2">صفحه پیدا نشد</h2>
      <p className="text-sm text-slate-400 mb-6">صفحه مورد نظر شما وجود ندارد یا حذف شده است.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
      >
        بازگشت به چت
      </Link>
    </div>
  );
}
