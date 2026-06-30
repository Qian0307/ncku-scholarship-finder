import ScholarshipBrowser from '@/components/ScholarshipBrowser';
import { getAllScholarships, getCategories } from '@/lib/data';
import { COLLEGES, getDeptsByCollege } from '@/lib/ncku-units';

export default function HomePage() {
  const data = getAllScholarships();
  const categories = getCategories();
  const deptsByCollege = getDeptsByCollege();

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">校內外獎助學金一覽</h1>
        <p className="mt-1 text-sm text-slate-500">
          整理自成大獎學金系統共 {data.length} 筆，截止日近者優先。展開下方「依我的資格篩選」即可直接標出符合度。
        </p>
      </section>

      <ScholarshipBrowser
        data={data}
        categories={categories}
        colleges={COLLEGES}
        deptsByCollege={deptsByCollege}
      />
    </div>
  );
}
