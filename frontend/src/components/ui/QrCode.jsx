import { forwardRef, useEffect, useRef } from "react";
import QRCode from "qrcode";

const QrCode = forwardRef(function QrCode({ value, size = 220 }, forwardedRef) {
  const innerRef = useRef(null);

  useEffect(() => {
    const canvas = innerRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, { width: size, margin: 1 }).catch(() => {});
  }, [value, size]);

  return (
    <canvas
      ref={(el) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      width={size}
      height={size}
    />
  );
});

export default QrCode;
