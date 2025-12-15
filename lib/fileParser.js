import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function parseFile(file, fileType) {
  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse based on file type
    if (fileType === 'application/pdf') {
      // Parse PDF
      const data = await pdf(buffer);
      return data.text || 'No text found in PDF';
    } 
    else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Parse DOCX (Word)
      const result = await mammoth.extractRawText({ buffer });
      return result.value || 'No text found in Word document';
    } 
    else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
             fileType === 'application/vnd.ms-excel') {
      // Parse XLSX/XLS (Excel)
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      
      // Extract text from all sheets
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `Sheet: ${sheetName}\n`;
        text += XLSX.utils.sheet_to_csv(sheet);
        text += '\n\n';
      });
      
      return text || 'No data found in Excel file';
    }
    else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('File parsing error:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}
