import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
      <h2 className="text-2xl font-bold mb-2">صفحه پیدا نشد</h2>
      <p className="text-slate-400 mb-4">صفحه مورد نظر شما وجود ندارد.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
