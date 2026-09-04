import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 14,
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
            top: 2,
            right: 2,
            width: 11,
            height: 11,
            borderRadius: 999,
            background: "#ffd23f",
            color: "#101828",
            fontSize: 8,
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
