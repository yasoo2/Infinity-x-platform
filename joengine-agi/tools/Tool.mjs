/**
 * BaseTool - The base class for all JOEngine AGI tools.
 *
 * This class provides the foundational structure that all tools must extend.
 * It ensures that essential properties like name, description, and parameters
 * are defined by the subclass.
 */
export class BaseTool {
  /**
   * The name of the tool (e.g., 'file_tool').
   * This MUST be overridden by the subclass.
   * @type {string}
   */
  name = '';

  /**
   * A clear, concise description of what the tool does.
   * This MUST be overridden by the subclass.
   * @type {string}
   */
  description = '';

  /**
   * An object defining the parameters the tool accepts.
   * The keys should be parameter names, and the values should be objects
   * describing the parameter (e.g., { type: 'string', description: '...', required: true }).
   * This SHOULD be overridden by the subclass if it accepts parameters.
   * @type {object}
   */
  parameters = {};

  constructor() {
    if (this.constructor === BaseTool) {
      throw new Error('BaseTool is an abstract class and cannot be instantiated directly.');
    }
    if (!this.name) {
      throw new Error(`Tool subclass "${this.constructor.name}" must define a 'name' property.`);
    }
    if (!this.description) {
      throw new Error(`Tool subclass "${this.constructor.name}" must define a 'description' property.`);
    }
  }

  /**
   * Executes the tool's main functionality.
   * This method MUST be overridden by the subclass.
   * @param {object} params - An object containing the parameters for the tool.
   * @returns {Promise<any>} The result of the tool's execution.
   */
  async execute(params) {
    throw new Error(`The 'execute' method must be implemented by the subclass "${this.constructor.name}".`);
  }

  /**
   * Validates the parameters passed to the tool.
   * Can be extended by subclasses for more complex validation.
   * @param {object} params - The parameters to validate.
   * @returns {{isValid: boolean, message: string|null}}
   */
  validate(params) {
    for (const key in this.parameters) {
      if (this.parameters[key].required && (params[key] === undefined || params[key] === null)) {
        return {
          isValid: false,
          message: `Missing required parameter: "${key}" for tool "${this.name}".`,
        };
      }
    }
    return { isValid: true, message: null };
  }
}

export default BaseTool;
