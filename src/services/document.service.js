const { PDFParse } = require('pdf-parse');

const extractTextFromBuffer = async (file) => {
  if (!file || !file.buffer) {
    return '';
  }

  const mime = file.mimetype || '';
  const name = (file.originalname || '').toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    return parsed.text || '';
  }

  if (
    mime.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    return file.buffer.toString('utf8');
  }

  return '';
};

const extractDocuments = async (files = []) => {
  const results = [];

  for (const file of files) {
    const extractedText = await extractTextFromBuffer(file);
    results.push({
      filename: file.originalname || 'document',
      extractedText: extractedText.trim(),
    });
  }

  return results;
};

module.exports = { extractDocuments, extractTextFromBuffer };
