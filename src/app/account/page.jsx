import AccountPanel from '@/components/AccountPanel';

export const metadata = {
  title: '我的帳號',
  description: '登入以跨裝置同步你的收藏與快篩條件。',
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">我的帳號</h1>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        登入後，收藏與快篩條件會跨裝置自動同步。
      </p>
      <AccountPanel />
    </div>
  );
}
