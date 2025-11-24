/**
 * @file project_factory.tool.mjs
 * @description Tool for creating new projects from templates, refactored for dependency injection.
 * @version 2.0.0
 */

const projectFactoryToolFactory = (dependencies) => {
  const { sandboxManager } = dependencies;

  if (!sandboxManager) {
    throw new Error('SandboxManager dependency is missing for projectFactoryTool.');
  }

  const createProject = async ({ template, modifications }) => {
    try {
      const result = await sandboxManager.createProject(template, modifications);
      return { success: true, path: result.path };
    } catch (error) {
      console.error('Project creation error:', error);
      return { success: false, error: error.message };
    }
  };

  createProject.metadata = {
    name: 'createProject',
    description: 'Creates a new project from a specified template and applies modifications.',
    parameters: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          description: 'The name of the project template to use (e.g., \'react-vite\').',
        },
        modifications: {
          type: 'string',
          description: 'A detailed prompt describing the modifications to apply to the template.',
        },
      },
      required: ['template', 'modifications'],
    },
  };

  // Return the tool functions keyed by their name
  return {
    createProject,
  };
};

export default projectFactoryToolFactory;
