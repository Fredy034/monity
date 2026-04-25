import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PDFExportOptions {
  filename: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
  marginMm?: number;
}

/**
 * Export an HTML element to PDF
 */
export async function exportElementToPDF(element: HTMLElement, options: PDFExportOptions): Promise<void> {
  const { filename, title, orientation = 'portrait', pageSize = 'a4', marginMm = 10 } = options;

  try {
    // Render HTML to canvas with high quality
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = orientation === 'portrait' ? 190 : 277; // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    });

    let heightLeft = imgHeight;
    let position = marginMm;

    // Add title if provided
    if (title) {
      pdf.setFontSize(18);
      pdf.text(title, marginMm, marginMm);
      position = marginMm + 15;
      heightLeft -= 15;
    }

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', marginMm, position, imgWidth, imgHeight);

    // Handle pagination for long content
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      if (position < 0) break;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', marginMm, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm
    }

    // Download the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('Failed to export PDF');
  }
}

/**
 * Create a new PDF document with custom styling
 */
export function createPDF(orientation: 'portrait' | 'landscape' = 'portrait') {
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  return pdf;
}

/**
 * Export table data to PDF with formatting
 */
export async function exportTableToPDF(
  tableElement: HTMLElement,
  options: PDFExportOptions & { includeFooter?: boolean },
): Promise<void> {
  const { filename, title, orientation = 'portrait', marginMm = 10, includeFooter = true } = options;

  try {
    const pdf = createPDF(orientation);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginMm * 2;

    let yPosition = marginMm;

    // Add title
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, marginMm, yPosition);
      yPosition += 12;
    }

    // Add date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, marginMm, yPosition);
    yPosition += 8;

    // Render table to canvas
    const canvas = await html2canvas(tableElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Calculate available space on first page
    const availableHeight = pageHeight - yPosition - marginMm;

    if (imgHeight <= availableHeight) {
      // Content fits on one page
      pdf.addImage(imgData, 'PNG', marginMm, yPosition, contentWidth, imgHeight);
    } else {
      // Content spans multiple pages
      let heightLeft = imgHeight;
      let pagePosition = yPosition;

      while (heightLeft > 0) {
        if (pagePosition > yPosition) {
          pdf.addPage();
          pagePosition = marginMm;
        }

        pdf.addImage(
          imgData,
          'PNG',
          marginMm,
          pagePosition,
          contentWidth,
          Math.min(heightLeft, pageHeight - marginMm * 2),
        );
        heightLeft -= pageHeight - marginMm * 2;
        pagePosition = marginMm;
      }
    }

    // Add footer
    if (includeFooter) {
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Table PDF export failed:', error);
    throw new Error('Failed to export table to PDF');
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension = 'pdf'): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${timestamp}.${extension}`;
}
