import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e4dff",
          borderRadius: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          TC
        </div>
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 52,
            height: 52,
            borderRadius: 999,
            background: "#ffd23f",
            color: "#101828",
            fontSize: 32,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          %
        </div>
      </div>
    ),
    { ...size },
  );
}
