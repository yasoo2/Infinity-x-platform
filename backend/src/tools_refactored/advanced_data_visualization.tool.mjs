import fs from 'fs/promises';

/**
 * 📊 AdvancedDataVisualizationTool - Enables JOE to generate complex data visualizations (charts, graphs) locally from data files.
 * This tool is fully local and uses a rule-based approach to generate visualization code.
 */
class AdvancedDataVisualizationTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.generateChartFromData.metadata = {
            name: "generateChartFromData",
            description: "Generates Python code using Matplotlib/Seaborn to create a specific type of chart from a local CSV or JSON data file.",
            parameters: {
                type: "object",
                properties: {
                    inputFilePath: {
                        type: "string",
                        description: "The absolute path to the data file (CSV or JSON)."
                    },
                    chartType: {
                        type: "string",
                        enum: ["BAR", "LINE", "SCATTER", "HEATMAP"],
                        description: "The type of chart to generate."
                    },
                    outputImagePath: {
                        type: "string",
                        description: "The absolute path where the generated chart image (e.g., .png) should be saved."
                    },
                    xColumn: {
                        type: "string",
                        description: "The name of the column to use for the X-axis."
                    },
                    yColumn: {
                        type: "string",
                        description: "The name of the column to use for the Y-axis."
                    }
                },
                required: ["inputFilePath", "chartType", "outputImagePath", "xColumn", "yColumn"]
            }
        };
    }

    async generateChartFromData({ inputFilePath, chartType, outputImagePath, xColumn, yColumn }) {
        const fileExtension = inputFilePath.endsWith('.csv') ? 'csv' : inputFilePath.endsWith('.json') ? 'json' : 'unknown';
        
        if (fileExtension === 'unknown') {
            return { success: false, message: "Unsupported input file format. Must be CSV or JSON." };
        }

        let chartCode = '';
        let plotFunction = '';

        switch (chartType) {
            case 'BAR':
                plotFunction = `
plt.figure(figsize=(10, 6))
sns.barplot(x='${xColumn}', y='${yColumn}', data=df)
plt.title('Bar Chart of ${yColumn} by ${xColumn}')
`;
                break;
            case 'LINE':
                plotFunction = `
plt.figure(figsize=(12, 6))
sns.lineplot(x='${xColumn}', y='${yColumn}', data=df)
plt.title('Line Chart of ${yColumn} over ${xColumn}')
`;
                break;
            case 'SCATTER':
                plotFunction = `
plt.figure(figsize=(8, 8))
sns.scatterplot(x='${xColumn}', y='${yColumn}', data=df)
plt.title('Scatter Plot of ${yColumn} vs ${xColumn}')
`;
                break;
            case 'HEATMAP':
                plotFunction = `
# Heatmap requires data to be in a matrix/pivot table format.
# Assuming data is already aggregated or needs simple correlation.
correlation_matrix = df[['${xColumn}', '${yColumn}']].corr()
plt.figure(figsize=(6, 6))
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', fmt=".2f")
plt.title('Heatmap (Correlation) of ${xColumn} and ${yColumn}')
`;
                break;
            default:
                return { success: false, message: `Unsupported chart type: ${chartType}` };
        }

        const readDataCode = fileExtension === 'csv' 
            ? `df = pd.read_csv('${inputFilePath}')` 
            : `df = pd.read_json('${inputFilePath}')`;

        chartCode = `
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set a clean style
sns.set_theme(style="whitegrid")

try:
    # 1. Load Data
    ${readDataCode}

    # 2. Generate Plot
    ${plotFunction}

    # 3. Final Touches
    plt.xlabel('${xColumn}')
    plt.ylabel('${yColumn}')
    plt.tight_layout()

    # 4. Save Image
    plt.savefig('${outputImagePath}')
    plt.close()

    print("SUCCESS: Chart generated and saved to ${outputImagePath}")

except Exception as e:
    print(f"FAILURE: An error occurred during chart generation: {e}")
`;

        // In a real scenario, we would save this Python code and execute it via the shell tool.
        // For this tool implementation, we return the code and the execution instruction.
        const pythonScriptPath = outputImagePath.replace(/\.[^/.]+$/, "") + ".py";
        await fs.writeFile(pythonScriptPath, chartCode, 'utf-8');

        return {
            success: true,
            message: `Autonomous visualization code generated and saved to ${pythonScriptPath}. Execute this script using 'python3 ${pythonScriptPath}' to generate the chart image at ${outputImagePath}.`,
            generatedScript: pythonScriptPath,
            outputImage: outputImagePath
        };
    }
}

export default AdvancedDataVisualizationTool;
