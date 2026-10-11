import QRCode from "qrcode";
import { verificationUrl } from "@/lib/verification";

/** Server-side QR generation: returns an SVG string pointing to the public verification page. */
export async function certificateQrSvg(certificateId: string, siteUrl: string) {
  return QRCode.toString(verificationUrl(certificateId, siteUrl), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0c1b40", light: "#ffffff00" },
  });
}
