import { ImageResponse } from "next/og";
import { iconElement } from "@/lib/icon-render";

export async function GET() {
  return new ImageResponse(iconElement(192), { width: 192, height: 192 });
}
