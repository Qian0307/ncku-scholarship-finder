'use client';

import { useEffect, useState } from 'react';
import DeadlineBadge from './DeadlineBadge';

/**
 * 詳情頁用的截止日標籤：掛載後才取「今天」，讓詳情頁也能顯示「剩 X 天／已截止」。
 * SSR/靜態輸出階段 today 為 null（只顯示日期），避免 hydration 不一致。
 */
export default function LiveDeadline({ deadline }) {
  const [today, setToday] = useState(null);
  useEffect(() => setToday(new Date()), []);
  return <DeadlineBadge deadline={deadline} today={today} />;
}
