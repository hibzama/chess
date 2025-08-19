
'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function OldTaskClaimsPage() {
  useEffect(() => {
    redirect('/admin/tasks');
  }, []);

  return null;
}
