/**
 * GPT-4 Function Calling Definitions for JOE
 */

export const gpt4Functions = [
  {
    name: 'github_scan_repository',
    description: 'Scan and analyze a GitHub repository to get file structure and content',
    parameters: {
      type: 'object',
      properties: {
        repository_name: {
          type: 'string',
          description: 'Name of the repository to scan (e.g., "Infinity-x-platform")'
        }
      },
      required: ['repository_name']
    }
  },
  {
    name: 'github_edit_files',
    description: 'Edit specific files in a GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        repository_name: {
          type: 'string',
          description: 'Name of the repository'
        },
        target_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of file paths to edit'
        },
        search_pattern: {
          type: 'string',
          description: 'Pattern to search for (regex or plain text)'
        },
        replacement: {
          type: 'string',
          description: 'Replacement text'
        },
        commit_message: {
          type: 'string',
          description: 'Commit message in Arabic'
        }
      },
      required: ['repository_name', 'target_files', 'search_pattern', 'replacement', 'commit_message']
    }
  },
  {
    name: 'build_project',
    description: 'Build a complete project (website, store, app) from description',
    parameters: {
      type: 'object',
      properties: {
        project_type: {
          type: 'string',
          enum: ['website', 'store', 'app', 'api'],
          description: 'Type of project to build'
        },
        description: {
          type: 'string',
          description: 'Detailed description of what to build'
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of features to include'
        }
      },
      required: ['project_type', 'description']
    }
  },
  {
    name: 'render_deploy',
    description: 'Deploy or update service on Render',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['deploy', 'update_env', 'get_logs'],
          description: 'Action to perform'
        },
        env_vars: {
          type: 'object',
          description: 'Environment variables to update (for update_env action)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'mongodb_query',
    description: 'Query MongoDB database',
    parameters: {
      type: 'object',
      properties: {
        collection: {
          type: 'string',
          description: 'Collection name to query'
        },
        query: {
          type: 'object',
          description: 'MongoDB query object'
        },
        action: {
          type: 'string',
          enum: ['find', 'count', 'aggregate', 'update', 'delete'],
          description: 'Database action to perform'
        }
      },
      required: ['collection', 'action']
    }
  },
  {
    name: 'system_test',
    description: 'Run system health checks and diagnostics',
    parameters: {
      type: 'object',
      properties: {
        test_type: {
          type: 'string',
          enum: ['health', 'diagnostic', 'integration', 'auto_fix'],
          description: 'Type of test to run'
        }
      },
      required: ['test_type']
    }
  },
  {
    name: 'self_evolve',
    description: 'Analyze own code and implement improvements',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['analyze', 'improve', 'add_feature', 'fix_bug'],
          description: 'Evolution target'
        },
        description: {
          type: 'string',
          description: 'Description of what to improve or add'
        }
      },
      required: ['target']
    }
  }
];

export default gpt4Functions;
