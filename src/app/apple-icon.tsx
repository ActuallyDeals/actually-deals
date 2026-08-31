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
          background: "#0F172A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            background: "#F8FAFC",
            transform: "rotate(45deg)",
            borderRadius: 10,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            borderRadius: 18,
            background: "#0F172A",
            top: 46,
            right: 50,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 42,
            width: 96,
            height: 12,
            borderRadius: 8,
            background: "#059669",
          }}
        />
      </div>
    ),
    size,
  );
}
