import { NextResponse } from "next/server";
import { getAllQCRecords, getQCBySiteId } from "@/lib/qc-store";

export const dynamic = "force-dynamic";

// 只读查询端点。写入统一收敛在 /api/detect（真实探针执行后由服务端归档），
// 不提供公开写接口，防止伪造任意站点的质检结论。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");

  if (siteId) {
    const record = await getQCBySiteId(siteId);
    return NextResponse.json({ success: true, record });
  }

  const records = await getAllQCRecords();
  return NextResponse.json({ success: true, records });
}
