const projectService = require('../services/project.service');

const createProject = async (req, res) => {
  const project = await projectService.createProject(req.body);

  res.status(201).json({
    success: true,
    data: project,
  });
};

const getProjects = async (req, res) => {
  const projects = await projectService.getProjects();

  res.status(200).json({
    success: true,
    data: projects,
  });
};

const getProjectById = async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);

  res.status(200).json({
    success: true,
    data: project,
  });
};

const updateProject = async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: project,
  });
};

const deleteProject = async (req, res) => {
  await projectService.deleteProject(req.params.id);

  res.status(200).json({
    success: true,
    data: { message: 'Project deleted successfully' },
  });
};

const exportProject = async (req, res) => {
  const exportData = await projectService.exportProject(req.params.id);

  res.status(200).json({
    success: true,
    data: exportData,
  });
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  exportProject,
};
