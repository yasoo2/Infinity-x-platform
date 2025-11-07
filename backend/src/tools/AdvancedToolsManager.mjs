/**
 * AdvancedToolsManager.mjs
 * Manages advanced tools for data processing, analysis, and file handling
 */

import SandboxManager from '../sandbox/SandboxManager.mjs';
import { promises as fs } from 'fs';
import path from 'path';

class AdvancedToolsManager {
  constructor(options = {}) {
    this.sandboxManager = options.sandboxManager || new SandboxManager();
    this.toolsDir = options.toolsDir || path.join(process.cwd(), 'tools');
  }

  /**
   * Process CSV file and return analyzed data
   */
  async processCSV(filePath, options = {}) {
    const pythonCode = `
import pandas as pd
import json

try:
    df = pd.read_csv('${filePath}')
    
    analysis = {
        'rows': len(df),
        'columns': list(df.columns),
        'dtypes': df.dtypes.to_dict(),
        'missing_values': df.isnull().sum().to_dict(),
        'statistics': df.describe().to_dict(),
        'head': df.head(5).to_dict(orient='records')
    }
    
    print(json.dumps(analysis, indent=2, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Process JSON file and validate schema
   */
  async processJSON(filePath, options = {}) {
    const pythonCode = `
import json

try:
    with open('${filePath}', 'r') as f:
        data = json.load(f)
    
    analysis = {
        'valid': True,
        'type': type(data).__name__,
        'size': len(str(data)),
        'keys': list(data.keys()) if isinstance(data, dict) else None,
        'items_count': len(data) if isinstance(data, (list, dict)) else None,
        'sample': str(data)[:500]
    }
    
    print(json.dumps(analysis, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e), 'valid': False}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Generate data visualization (chart)
   */
  async generateChart(data, chartType = 'bar', options = {}) {
    const pythonCode = `
import matplotlib.pyplot as plt
import json

try:
    data = ${JSON.stringify(data)}
    chart_type = '${chartType}'
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    if chart_type == 'bar':
        ax.bar(data['labels'], data['values'])
    elif chart_type == 'line':
        ax.plot(data['labels'], data['values'])
    elif chart_type == 'pie':
        ax.pie(data['values'], labels=data['labels'], autopct='%1.1f%%')
    
    ax.set_title(data.get('title', 'Chart'))
    ax.set_xlabel(data.get('xlabel', 'X'))
    ax.set_ylabel(data.get('ylabel', 'Y'))
    
    plt.savefig('chart.png', dpi=100, bbox_inches='tight')
    print(json.dumps({'success': True, 'file': 'chart.png'}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Process image and extract metadata
   */
  async processImage(imagePath, options = {}) {
    const pythonCode = `
from PIL import Image
import json

try:
    img = Image.open('${imagePath}')
    
    analysis = {
        'format': img.format,
        'size': img.size,
        'width': img.width,
        'height': img.height,
        'mode': img.mode,
        'info': dict(img.info)
    }
    
    print(json.dumps(analysis, indent=2, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Resize image
   */
  async resizeImage(inputPath, outputPath, width, height, options = {}) {
    const pythonCode = `
from PIL import Image
import json

try:
    img = Image.open('${inputPath}')
    resized = img.resize((${width}, ${height}), Image.Resampling.LANCZOS)
    resized.save('${outputPath}')
    
    print(json.dumps({
        'success': True,
        'original_size': img.size,
        'new_size': resized.size,
        'output': '${outputPath}'
    }))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Convert between file formats
   */
  async convertFile(inputPath, outputPath, format, options = {}) {
    const pythonCode = `
import json
import os

try:
    input_ext = os.path.splitext('${inputPath}')[1].lower()
    output_ext = os.path.splitext('${outputPath}')[1].lower()
    
    if input_ext == '.csv' and output_ext == '.json':
        import pandas as pd
        df = pd.read_csv('${inputPath}')
        df.to_json('${outputPath}', orient='records')
    elif input_ext == '.json' and output_ext == '.csv':
        import pandas as pd
        df = pd.read_json('${inputPath}')
        df.to_csv('${outputPath}', index=False)
    elif input_ext in ['.jpg', '.png', '.gif'] and output_ext in ['.jpg', '.png', '.gif']:
        from PIL import Image
        img = Image.open('${inputPath}')
        img.save('${outputPath}')
    else:
        raise ValueError(f'Unsupported conversion: {input_ext} to {output_ext}')
    
    print(json.dumps({'success': True, 'output': '${outputPath}'}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Analyze text data
   */
  async analyzeText(text, options = {}) {
    const pythonCode = `
import json
from collections import Counter

try:
    text = """${text}"""
    
    words = text.lower().split()
    sentences = text.split('.')
    
    analysis = {
        'word_count': len(words),
        'sentence_count': len([s for s in sentences if s.strip()]),
        'char_count': len(text),
        'avg_word_length': sum(len(w) for w in words) / len(words) if words else 0,
        'unique_words': len(set(words)),
        'top_words': dict(Counter(words).most_common(10))
    }
    
    print(json.dumps(analysis, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Perform statistical analysis
   */
  async statisticalAnalysis(data, options = {}) {
    const pythonCode = `
import json
import numpy as np
from scipy import stats

try:
    data = ${JSON.stringify(data)}
    
    analysis = {
        'mean': float(np.mean(data)),
        'median': float(np.median(data)),
        'std_dev': float(np.std(data)),
        'variance': float(np.var(data)),
        'min': float(np.min(data)),
        'max': float(np.max(data)),
        'q1': float(np.percentile(data, 25)),
        'q3': float(np.percentile(data, 75))
    }
    
    print(json.dumps(analysis, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const result = await this.sandboxManager.executePython(pythonCode, options);
    return JSON.parse(result.stdout);
  }

  /**
   * Execute custom Python script
   */
  async executePythonScript(scriptPath, options = {}) {
    const result = await this.sandboxManager.executeShell(`python3 "${scriptPath}"`, options);
    return result;
  }

  /**
   * Execute custom Node.js script
   */
  async executeNodeScript(scriptPath, options = {}) {
    const result = await this.sandboxManager.executeShell(`node "${scriptPath}"`, options);
    return result;
  }

  /**
   * Compress file
   */
  async compressFile(inputPath, outputPath, options = {}) {
    const command = `tar -czf "${outputPath}" "${inputPath}"`;
    const result = await this.sandboxManager.executeShell(command, options);
    return result;
  }

  /**
   * Decompress file
   */
  async decompressFile(inputPath, outputPath, options = {}) {
    const command = `tar -xzf "${inputPath}" -C "${outputPath}"`;
    const result = await this.sandboxManager.executeShell(command, options);
    return result;
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath, options = {}) {
    const command = `stat "${filePath}" && du -h "${filePath}"`;
    const result = await this.sandboxManager.executeShell(command, options);
    return result;
  }
}

export default AdvancedToolsManager;
