/**
 * Tool - Base class for all JOEngine AGI tools
 * 
 * This is the foundational class that all tools (DatabaseTool, DeployTool, etc.) extend from.
 */

export class Tool {
  /**
   * Constructor for the base Tool class
   * @param {string} name - The name of the tool
   * @param {string} description - A brief description of what the tool does
   */
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Execute the tool's main functionality
   * This method should be overridden by subclasses
   * @param {...any} args - Arguments specific to each tool
   * @returns {Promise<any>} - The result of the tool execution
   */
  async execute(...args) {
    throw new Error(`execute() method not implemented for tool: ${this.name}`);
  }

  /**
   * Get tool information
   * @returns {object} - Tool metadata
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description
    };
  }

  /**
   * Validate tool parameters (can be overridden by subclasses)
   * @param {any} params - Parameters to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  validate(params) {
    return true;
  }
}

export default Tool;
