import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function generateVoucherPDF(
    element,
    { fileName = "voucher.pdf" } = {}
) {
    if (!element) {
        throw new Error("Voucher element is not available.");
    }

    const canvas = await html2canvas(element, {
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
    });

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    const imageData = canvas.toDataURL("image/png");

    pdf.addImage(
        imageData,
        "PNG",
        0,
        0,
        A4_WIDTH_MM,
        A4_HEIGHT_MM,
        undefined,
        "FAST"
    );

    pdf.save(
        fileName.toLowerCase().endsWith(".pdf")
            ? fileName
            : `${fileName}.pdf`
    );
}