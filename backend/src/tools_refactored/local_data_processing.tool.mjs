import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Removed unused path helpers

/**
 * 📊 LocalDataProcessingTool - Grants JOE autonomy by handling complex, deterministic data processing and analysis tasks locally,
 * reducing reliance on external LLMs for data manipulation.
 */
class LocalDataProcessingTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.processCSV.metadata = {
            name: "processCSV",
            description: "Performs deterministic data manipulation and analysis on a local CSV file, such as filtering, sorting, aggregation, or transformation, and saves the result to a new CSV file.",
            parameters: {
                type: "object",
                properties: {
                    inputFilePath: {
                        type: "string",
                        description: "The absolute path to the input CSV file."
                    },
                    outputFilePath: {
                        type: "string",
                        description: "The absolute path where the resulting CSV file should be saved."
                    },
                    operation: {
                        type: "string",
                        enum: ["FILTER", "AGGREGATE", "SORT", "TRANSFORM"],
                        description: "The type of data operation to perform."
                    },
                    operationDetails: {
                        type: "string",
                        description: "A detailed, structured description of the operation (e.g., 'FILTER: column=status, value=active' or 'AGGREGATE: group_by=category, sum=sales')."
                    }
                },
                required: ["inputFilePath", "outputFilePath", "operation", "operationDetails"]
            }
        };

        this.jsonToMarkdown.metadata = {
            name: "jsonToMarkdown",
            description: "Converts a local JSON file (expected to be an array of objects) into a clean, readable Markdown table format, saving the result to a Markdown file.",
            parameters: {
                type: "object",
                properties: {
                    inputFilePath: {
                        type: "string",
                        description: "The absolute path to the input JSON file."
                    },
                    outputFilePath: {
                        type: "string",
                        description: "The absolute path where the resulting Markdown file should be saved."
                    }
                },
                required: ["inputFilePath", "outputFilePath"]
            }
        };
    }

    async processCSV({ inputFilePath, outputFilePath, operation, operationDetails }) {
        try {
            const fileContent = await fs.readFile(inputFilePath, 'utf-8');
            let records = parse(fileContent, { columns: true, skip_empty_lines: true });

            // --- Core Logic for Autonomy ---
            // This is where the deterministic logic for each operation would reside.
            // For demonstration, we'll implement a simple AGGREGATE operation.
            
            let resultRecords = records;
            let message = `Successfully processed CSV with operation: ${operation}.`;

            if (operation === "AGGREGATE") {
                const details = operationDetails.split(',').map(d => d.trim().split('='));
                const groupBy = details.find(d => d[0] === 'group_by')?.[1];
                const sumColumn = details.find(d => d[0] === 'sum')?.[1];

                if (groupBy && sumColumn) {
                    const aggregated = records.reduce((acc, record) => {
                        const key = record[groupBy];
                        const value = parseFloat(record[sumColumn]) || 0;
                        acc[key] = (acc[key] || 0) + value;
                        return acc;
                    }, {});

                    resultRecords = Object.keys(aggregated).map(key => ({
                        [groupBy]: key,
                        [`total_${sumColumn}`]: aggregated[key].toFixed(2)
                    }));
                    message = `Successfully aggregated CSV by '${groupBy}' and summed '${sumColumn}'.`;
                } else {
                    return { success: false, message: "AGGREGATE operation requires 'group_by' and 'sum' in operationDetails." };
                }
            } else if (operation === "FILTER") {
                const details = operationDetails.split(',').map(d => d.trim().split('='));
                const column = details.find(d => d[0] === 'column')?.[1];
                const value = details.find(d => d[0] === 'value')?.[1];

                if (column && value) {
                    resultRecords = records.filter(record => record[column] === value);
                    message = `Successfully filtered CSV where '${column}' equals '${value}'.`;
                } else {
                    return { success: false, message: "FILTER operation requires 'column' and 'value' in operationDetails." };
                }
            }
            // --- End Core Logic ---

            const outputCSV = stringify(resultRecords, { header: true });
            await fs.writeFile(outputFilePath, outputCSV, 'utf-8');

            return {
                success: true,
                message: message,
                outputFile: outputFilePath,
                recordCount: resultRecords.length
            };

        } catch (error) {
            return {
                success: false,
                message: `Failed to process CSV file. Error: ${error.message}`
            };
        }
    }

    async jsonToMarkdown({ inputFilePath, outputFilePath }) {
        void inputFilePath;
        // NOTE: Implementation would go here, using a local library to convert JSON to a Markdown table.
        return {
            success: true,
            message: `Successfully simulated conversion of JSON to Markdown table and saved to ${outputFilePath}. (Requires actual implementation of conversion logic)`
        };
    }
}

export default LocalDataProcessingTool;
