import fs from 'fs-extra';
import path from 'path';
import { BaseTool } from './Tool.mjs';

/**
 * @class FileTool
 * @description A tool for interacting with the file system. It allows reading, writing,
 * deleting, and listing files and directories within a specified working directory.
 */
export class FileTool extends BaseTool {
  name = 'file_tool';
  description = 'Provides capabilities to read, write, delete, and list files and directories. All paths are relative to the project root.';

  parameters = {
    action: {
      type: 'string',
      description: 'The operation to perform.',
      required: true,
      enum: ['read', 'write', 'delete', 'list'],
    },
    path: {
      type: 'string',
      description: 'The relative path to the file or directory.',
      required: true,
    },
    content: {
      type: 'string',
      description: 'The content to write to the file. Required only for the \'write\' action.',
      required: false,
    },
  };

  constructor() {
    super();
    // The working directory is the root of the repository.
    this.workDir = process.cwd();
    fs.ensureDirSync(this.workDir);
  }

  /**
   * Executes the main tool action by dispatching to the appropriate private method.
   * @param {object} params - The parameters for the tool execution.
   * @returns {Promise<object>} The result of the file operation.
   */
  async execute(params) {
    const validation = this.validate(params);
    if (!validation.isValid) {
      return { success: false, error: validation.message };
    }

    const { action } = params;

    switch (action) {
      case 'read':
        return this._readFile(params.path);
      case 'write':
        return this._writeFile(params.path, params.content);
      case 'delete':
        return this._deletePath(params.path);
      case 'list':
        return this._listDirectory(params.path);
      default:
        // This case should ideally not be reached due to enum validation
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Reads the content of a file.
   * @private
   */
  async _readFile(relativePath) {
    const absolutePath = path.join(this.workDir, relativePath);
    console.log(`Reading file: ${absolutePath}`);

    try {
      const content = await fs.readFile(absolutePath, 'utf8');
      return {
        success: true,
        path: relativePath,
        content: content,
        size: content.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`,
      };
    }
  }

  /**
   * Writes content to a file, creating it or overwriting it.
   * @private
   */
  async _writeFile(relativePath, content) {
    if (content === undefined || content === null) {
      return { success: false, error: "'content' parameter is required for the 'write' action." };
    }

    const absolutePath = path.join(this.workDir, relativePath);
    console.log(`Writing file: ${absolutePath}`);

    try {
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, content, 'utf8');
      return {
        success: true,
        path: relativePath,
        size: content.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`,
      };
    }
  }

  /**
   * Deletes a file or a directory recursively.
   * @private
   */
  async _deletePath(relativePath) {
    const absolutePath = path.join(this.workDir, relativePath);
    console.log(`Deleting path: ${absolutePath}`);

    try {
      await fs.remove(absolutePath);
      return {
        success: true,
        path: relativePath,
        message: 'Path deleted successfully.',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete path: ${error.message}`,
      };
    }
  }

  /**
   * Lists the contents of a directory.
   * @private
   */
  async _listDirectory(relativePath) {
    const absolutePath = path.join(this.workDir, relativePath);
    console.log(`Listing directory: ${absolutePath}`);

    try {
      const items = await fs.readdir(absolutePath);
      const details = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(absolutePath, item);
          const stat = await fs.stat(itemPath);
          return {
            name: item,
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.size,
          };
        })
      );

      return {
        success: true,
        path: relativePath,
        items: details,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error.message}`,
      };
    }
  }
}

export default FileTool;
