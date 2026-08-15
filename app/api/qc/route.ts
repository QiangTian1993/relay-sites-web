import { NextResponse } from "next/server";
import { getAllQCRecords, getQCBySiteId, saveQCRecord, type QCRecord } from "@/lib/qc-store";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QCRecord;
    if (!body.siteId || !body.declaredModel) {
      return NextResponse.json({ success: false, error: "Missing required siteId or declaredModel" }, { status: 400 });
    }

    const recordToSave: QCRecord = {
      ...body,
      source: body.source || "user_probe",
      isInternalFeedback: body.isInternalFeedback ?? true,
      submissionType: body.submissionType || "user_submission",
    };

    const saved = await saveQCRecord(recordToSave);
    return NextResponse.json({ success: true, record: saved });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to save QC record" },
      { status: 500 },
    );
  }
}
