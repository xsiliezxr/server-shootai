const { getSupabase } = require('../config/supabase');
const projectService = require('./project.service');
const storageService = require('./storage.service');
const llmService = require('./llm.service');
const documentService = require('./document.service');
const { handleSupabaseError } = require('../utils/supabaseHelpers');

const processCreativeDump = async ({
  projectId,
  files,
  freeText,
  documentFiles,
}) => {
  const project = await projectService.findProjectById(projectId);

  const uploadedImages = files?.length
    ? await storageService.uploadImages(files)
    : [];

  const imageRecords = uploadedImages.map((img) => ({
    url: img.url,
    public_id: img.publicId,
    caption: '',
  }));

  const extractedDocs = documentFiles?.length
    ? await documentService.extractDocuments(documentFiles)
    : [];

  const existingImages = (project.creativeDump?.images || []).map((img) => img.url);

  const llmResult = await llmService.extractAestheticTags({
    freeText: freeText || project.creativeDump?.freeText || '',
    imageUrls: [...existingImages, ...imageRecords.map((img) => img.url)],
    documentTexts: extractedDocs.map((d) => d.extractedText),
  });

  const supabase = getSupabase();

  if (imageRecords.length > 0) {
    const { error: imgError } = await supabase.from('project_image').insert(
      imageRecords.map((img) => ({
        project_id: projectId,
        url: img.url,
        public_id: img.public_id,
        caption: img.caption,
      }))
    );
    handleSupabaseError(imgError);
  }

  if (extractedDocs.length > 0) {
    const { error: docError } = await supabase.from('project_document').insert(
      extractedDocs.map((doc) => ({
        project_id: projectId,
        filename: doc.filename,
        extracted_text: doc.extractedText,
      }))
    );
    handleSupabaseError(docError);
  }

  const { error: updateError } = await supabase
    .from('project')
    .update({
      free_text: freeText || project.creativeDump?.freeText || '',
      aesthetic_tags: llmResult.aestheticTags,
      extracted_categories: llmResult.categories,
      status: 'processing',
    })
    .eq('id', projectId);

  handleSupabaseError(updateError);

  const updated = await projectService.findProjectById(projectId);

  return {
    projectId: updated._id,
    creativeDump: updated.creativeDump,
    pipeline: {
      storage: uploadedImages.length > 0 ? 'cloudinary' : 'none',
      llm: llmResult.source,
    },
    raw: llmResult.raw,
  };
};

module.exports = { processCreativeDump };
