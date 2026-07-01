'use client';

import { useEffect, useMemo, useState } from 'react';
import ScholarshipCard from './ScholarshipCard';
import { isExpired, daysUntil } from '@/lib/data';
import { encodeFilters, decodeFilters, hasFilterParams } from '@/lib/share-url';
import {
  YEAR_OPTIONS,
  IDENTITY_OPTIONS,
  ECONOMIC_OPTIONS,
  SPECIAL_OPTIONS,
} from '@/lib/constants';
import { COUNTIES } from '@/lib/region';
import { loadProfile, saveProfile, clearProfile } from '@/lib/profile-store';
import {
  checkYear,
  checkUnit,
  checkIdentity,
  checkEconomic,
  checkSpecial,
  checkRegion,
  checkGpa,
  checkCombine,
  aggregate,
} from '@/lib/matcher/index.js';

/**
 * 列表瀏覽器：關鍵字搜尋 + 類別篩選 + 內嵌「資格快篩」。
 * 內嵌快篩只就「使用者實際填寫的維度」逐筆比對（未填＝不設限），
 * 復用 matcher 既有的各維度 check 與 aggregate，不改動比對語意。
 * 全部資料載入後於前端篩選（614 筆，量小可行）。
 */
export default function ScholarshipBrowser({ data, categories, colleges = [], deptsByCollege = {} }) {
  // 一般瀏覽篩選
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [hideExpired, setHideExpired] = useState(true);
  const [soonOnly, setSoonOnly] = useState(false); // 只看 7 天內截止
  const [today, setToday] = useState(null);
  const [copied, setCopied] = useState(false);

  // 內嵌快篩條件（皆為選填；未填 = 不設限）
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [identities, setIdentities] = useState([]);
  const [economic, setEconomic] = useState(''); // '' = 不指定
  const [special, setSpecial] = useState([]);
  const [region, setRegion] = useState(''); // 戶籍縣市，'' = 不指定
  const [gpa, setGpa] = useState('');
  const [hasOther, setHasOther] = useState(false);

  const [condOpen, setCondOpen] = useState(false);
  const [matchMode, setMatchMode] = useState('hideNo'); // all | hideNo | onlyYes

  // 掛載後才取「今天」與既有快篩 profile（避免靜態輸出與 client 不一致）
  useEffect(() => {
    setToday(new Date());

    // 網址帶篩選參數（分享連結）優先於本機 profile
    const params = new URLSearchParams(window.location.search);
    if (hasFilterParams(params)) {
      const d = decodeFilters(params);
      if (d.query) setQuery(d.query);
      if (d.category) setCategory(d.category);
      if (d.year) setYear(d.year);
      if (d.college) setCollege(d.college);
      if (d.department) setDepartment(d.department);
      if (d.identities) setIdentities(d.identities);
      if (d.economic) setEconomic(d.economic);
      if (d.special) setSpecial(d.special);
      if (d.region) setRegion(d.region);
      if (d.gpa) setGpa(d.gpa);
      if (d.hasOther) setHasOther(true);
      setCondOpen(true);
      return;
    }

    const p = loadProfile();
    if (p) {
      setYear(p.year || '');
      setCollege(p.college || '');
      setDepartment(p.department || '');
      setIdentities(Array.isArray(p.identities) ? p.identities : []);
      setEconomic(p.economic || '');
      setSpecial(Array.isArray(p.special) ? p.special : []);
      setRegion(p.region || '');
      setGpa(p.gpa == null ? '' : String(p.gpa));
      setHasOther(!!p.hasOtherScholarship);
      setCondOpen(true);
    }
  }, []);

  // 複製目前篩選條件的分享連結
  const copyShareLink = async () => {
    const qs = encodeFilters({
      query,
      category,
      year,
      college,
      department,
      identities,
      economic,
      special,
      region,
      gpa,
      hasOther,
    });
    const url = window.location.origin + window.location.pathname + (qs ? `?${qs}` : '');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('複製此連結分享：', url);
    }
  };

  const gpaNum = gpa === '' ? null : Number(gpa);
  const gpaFilled = gpaNum != null && !Number.isNaN(gpaNum);

  // 是否有任何快篩條件被填寫
  const personalActive =
    !!year ||
    !!college ||
    identities.length > 0 ||
    !!economic ||
    special.length > 0 ||
    !!region ||
    gpaFilled ||
    hasOther;

  // 條件變動就同步存檔，讓詳情頁／重訪保持一致
  useEffect(() => {
    if (!personalActive) {
      clearProfile();
      return;
    }
    saveProfile({
      year,
      college,
      department,
      identities,
      economic: economic || '無',
      special,
      region,
      gpa: gpaFilled ? gpaNum : null,
      hasOtherScholarship: hasOther,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, college, department, identities, economic, special, region, gpa, hasOther, personalActive]);

  // 只就「已填維度」比對，未填維度不納入（aggregate 會自動忽略）
  const matchMap = useMemo(() => {
    if (!personalActive) return null;
    const m = new Map();
    for (const s of data) {
      const e = s.eligibility;
      const checks = {};
      if (year) checks.year = checkYear({ year }, e);
      if (college) checks.unit = checkUnit({ college, department }, e);
      if (identities.length) checks.identity = checkIdentity({ identities }, e);
      if (economic) checks.economic = checkEconomic({ economic }, e);
      if (special.length) checks.special = checkSpecial({ special }, e);
      if (region) checks.region = checkRegion({ region }, e);
      if (gpaFilled) checks.gpa = checkGpa({ gpa: gpaNum }, e);
      if (hasOther) checks.combine = checkCombine({ hasOtherScholarship: true }, e);
      m.set(s.id, aggregate(checks, s).state);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, personalActive, year, college, department, identities, economic, special, region, gpa, hasOther]);

  // 一般瀏覽篩選（搜尋／類別／已截止）
  const browseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false;
      if (category && s.category !== category) return false;
      if (hideExpired && today && isExpired(s.deadline, today)) return false;
      if (soonOnly && today) {
        const d = daysUntil(s.deadline, today);
        if (d == null || d < 0 || d > 7) return false; // 僅保留 7 天內尚未截止者
      }
      return true;
    });
  }, [data, query, category, hideExpired, soonOnly, today]);

  // 在目前瀏覽範圍內的三態統計
  const counts = useMemo(() => {
    if (!matchMap) return null;
    const c = { yes: 0, maybe: 0, no: 0 };
    for (const s of browseFiltered) {
      const st = matchMap.get(s.id);
      if (st === 'yes') c.yes++;
      else if (st === 'maybe') c.maybe++;
      else c.no++;
    }
    return c;
  }, [matchMap, browseFiltered]);

  // 套用快篩顯示模式 + 排序
  const filtered = useMemo(() => {
    let list = browseFiltered;
    if (matchMap) {
      list = list.filter((s) => {
        const st = matchMap.get(s.id);
        if (matchMode === 'onlyYes') return st === 'yes';
        if (matchMode === 'hideNo') return st !== 'no';
        return true;
      });
    }

    if (!today) return list;
    const t = today;
    const upcoming = [];
    const undated = [];
    const expired = [];
    for (const s of list) {
      if (!s.deadline) undated.push(s);
      else if (isExpired(s.deadline, t)) expired.push(s);
      else upcoming.push(s);
    }
    upcoming.sort((a, b) => (a.deadline < b.deadline ? -1 : 1));
    expired.sort((a, b) => (a.deadline > b.deadline ? -1 : 1));
    return [...upcoming, ...undated, ...expired];
  }, [browseFiltered, matchMap, matchMode, today]);

  const toggleIn = (arr, setArr, v) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const resetBrowse = () => {
    setQuery('');
    setCategory('');
    setHideExpired(true);
  };

  const clearCond = () => {
    setYear('');
    setCollege('');
    setDepartment('');
    setIdentities([]);
    setEconomic('');
    setSpecial([]);
    setRegion('');
    setGpa('');
    setHasOther(false);
    clearProfile();
  };

  return (
    <div>
      {/* 篩選列 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋獎學金名稱…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ncku focus:ring-1 focus:ring-ncku"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            類別
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
            >
              <option value="">全部</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            年級
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
            >
              <option value="">全部</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded border-slate-300 text-ncku focus:ring-ncku"
            />
            隱藏已截止
          </label>

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={soonOnly}
              onChange={(e) => setSoonOnly(e.target.checked)}
              className="rounded border-slate-300 text-ncku focus:ring-ncku"
            />
            只看即將截止（7 天內）
          </label>

          <div className="ml-auto flex items-center gap-3">
            <button onClick={copyShareLink} className="text-sm text-ncku hover:underline">
              {copied ? '連結已複製' : '複製篩選連結'}
            </button>
            <button onClick={resetBrowse} className="text-sm text-slate-500 hover:underline">
              清除篩選
            </button>
          </div>
        </div>

        {/* 內嵌資格快篩 */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setCondOpen((o) => !o)}
            aria-expanded={condOpen}
            className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
          >
            <span>
              依我的資格篩選
              <span className="ml-1 font-normal text-slate-400">（選填，符合度直接標在卡片上）</span>
            </span>
            <span className="text-slate-400">{condOpen ? '收合' : '展開'}</span>
          </button>

          {condOpen && (
            <div className="mt-3 space-y-3">
              {/* 學院 / 系所 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-sm text-slate-500">學院/系所</span>
                <select
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    setDepartment('');
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
                >
                  <option value="">不指定學院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {college && (
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
                  >
                    <option value="">整個學院（不指定系所）</option>
                    {(deptsByCollege[college] || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 戶籍縣市（區域條件） */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-sm text-slate-500">戶籍縣市</span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
                >
                  <option value="">不指定</option>
                  {COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">部分獎學金限特定縣市設籍</span>
              </div>

              {/* 身分別 */}
              <ChipRow label="身分別">
                {IDENTITY_OPTIONS.map((id) => (
                  <Toggle
                    key={id}
                    active={identities.includes(id)}
                    onClick={() => toggleIn(identities, setIdentities, id)}
                  >
                    {id}
                  </Toggle>
                ))}
              </ChipRow>

              {/* 經濟身分（單選，再按一次取消） */}
              <ChipRow label="經濟身分">
                {ECONOMIC_OPTIONS.map((ec) => (
                  <Toggle
                    key={ec}
                    active={economic === ec}
                    onClick={() => setEconomic(economic === ec ? '' : ec)}
                  >
                    {ec === '無' ? '無（一般生）' : ec}
                  </Toggle>
                ))}
              </ChipRow>

              {/* 特殊身分 */}
              <ChipRow label="特殊身分">
                {SPECIAL_OPTIONS.map((sp) => (
                  <Toggle
                    key={sp}
                    active={special.includes(sp)}
                    onClick={() => toggleIn(special, setSpecial, sp)}
                  >
                    {sp}
                  </Toggle>
                ))}
              </ChipRow>

              {/* GPA + 兼領 */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  成績（百分制）
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    placeholder="例如 85"
                    className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ncku"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={hasOther}
                    onChange={(e) => setHasOther(e.target.checked)}
                    className="rounded border-slate-300 text-ncku focus:ring-ncku"
                  />
                  我已領其他獎學金（只看可兼領）
                </label>
                {personalActive && (
                  <button onClick={clearCond} className="text-sm text-slate-500 hover:underline">
                    清除我的條件
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                只就你填的項目比對，未填項目不設限；含無法自動判讀的條件一律歸「可能符合」，提醒你人工確認。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 計數 / 三態統計 + 顯示模式 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          共 <span className="font-semibold text-slate-700">{filtered.length}</span> 筆
          {counts && (
            <span className="ml-2 text-xs">
              <span className="text-emerald-700">符合 {counts.yes}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="text-amber-700">可能 {counts.maybe}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="text-rose-600">不符合 {counts.no}</span>
            </span>
          )}
          {!today && <span className="ml-2 text-slate-400">（截止日狀態載入中…）</span>}
        </p>

        {personalActive && (
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs">
            {[
              ['all', '全部'],
              ['hideNo', '隱藏不符合'],
              ['onlyYes', '只看符合'],
            ].map(([mode, label], i) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMatchMode(mode)}
                className={`px-2.5 py-1 ${i > 0 ? 'border-l border-slate-300' : ''} ${
                  matchMode === mode ? 'bg-ncku text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          沒有符合條件的獎學金，試著放寬篩選。
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <ScholarshipCard
              key={s.id}
              scholarship={s}
              today={today}
              matchState={matchMap ? matchMap.get(s.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 一行帶標籤的 chip 群 */
function ChipRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-sm text-slate-500">{label}</span>
      {children}
    </div>
  );
}

/** 圓角可切換 chip */
function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ncku focus-visible:ring-offset-1 ${
        active
          ? 'border-ncku bg-ncku text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-ncku'
      }`}
    >
      {children}
    </button>
  );
}
