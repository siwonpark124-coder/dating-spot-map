import { createClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트. service_role 키는 RLS를 우회하므로
// "use client" 컴포넌트에서 절대 import하면 안 됨 (Server Component/Server Action에서만 사용).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
