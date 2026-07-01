import SavedList from '@/components/SavedList';
import { getAllScholarships } from '@/lib/data';

export const metadata = {
  title: '我的收藏',
  description: '你收藏的成大獎助學金，依截止日近者優先，可標記申請進度。資料僅存在本機瀏覽器。',
};

export default function SavedPage() {
  const data = getAllScholarships();
  return (
    <div>
      <section className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">我的收藏</h1>
        <p className="mt-1 text-sm text-slate-500">
          收藏的獎學金會列在這裡，依截止日近者優先。收藏資料僅存在你的瀏覽器，不會上傳。
        </p>
      </section>
      <SavedList data={data} />
    </div>
  );
}
