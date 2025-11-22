/**
 * Search Tool - A unified tool for web and local file searching.
 * Provides capabilities to search the internet and the local file system.
 * @version 1.0.0 - ToolManager Compliant
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

// --- Web Search ---

async function searchWeb({ query }) {
  try {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.result').each((i, element) => {
      const title = $(element).find('.result__a').text().trim();
      const snippet = $(element).find('.result__snippet').text().trim();
      let url = $(element).find('.result__url').attr('href');
      if (url) {
        try {
          const urlParams = new URLSearchParams(url.substring(url.indexOf('?')));
          const decodedUrl = decodeURIComponent(urlParams.get('uddg') || url);
          if (decodedUrl.startsWith('http')) {
             results.push({ title, snippet, url: decodedUrl });
          }
        } catch (e) { /* ignore invalid URLs */ }
      }
    });
    return { success: true, query, results: results.slice(0, 8) }; // Return top 8 results
  } catch (error) {
    return { success: false, error: `Web search failed: ${error.message}` };
  }
}
searchWeb.metadata = {
    name: "searchWeb",
    description: "Performs a web search to find up-to-date information, articles, or answers. Returns a list of search results with titles, URLs, and snippets.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query or question." }
        },
        required: ["query"]
    }
};

// --- Local File System Search ---

async function findFiles({ pattern, directory = '.' }) {
  try {
    const files = await glob(pattern, { cwd: directory, nodir: true, dot: true });
    if (files.length === 0) {
        return { success: true, message: `No files found matching "${pattern}" in "${directory}".` };
    }
    return { success: true, files, count: files.length };
  } catch (error) {
    return { success: false, error: `Error finding files: ${error.message}` };
  }
}
findFiles.metadata = {
    name: "findFiles",
    description: "Finds files by name or a glob pattern within a specified directory.",
    parameters: {
        type: "object",
        properties: {
            pattern: { type: "string", description: "The glob pattern to search for (e.g., '*.js', 'package.json', '**/*.test.ts')." },
            directory: { type: "string", description: "The directory to start the search from.", default: "." }
        },
        required: ["pattern"]
    }
};

async function searchInFiles({ query, directory = '.', pattern = '**/*' }) {
  try {
    const files = await glob(pattern, { cwd: directory, nodir: true, dot: true, ignore: ['**/node_modules/**', '**/.git/**'] });
    const results = [];
    const regex = new RegExp(query, 'gi');

    for (const file of files) {
        try {
            const filePath = path.join(directory, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const matchingLines = [];
            
            lines.forEach((line, index) => {
                if (line.match(regex)) {
                    matchingLines.push({ lineNumber: index + 1, content: line.trim() });
                }
            });

            if (matchingLines.length > 0) {
                results.push({ filePath: file, matches: matchingLines });
            }
        } catch (e) {
            // Ignore files that can't be read (e.g., binary files)
        }
    }

    if (results.length === 0) {
        return { success: true, message: `No occurrences of "${query}" found in files matching "${pattern}" under "${directory}".` };
    }

    return { success: true, query, results, count: results.length };
  } catch (error) {
    return { success: false, error: `Error searching in files: ${error.message}` };
  }
}
searchInFiles.metadata = {
    name: "searchInFiles",
    description: "Searches for a text query or pattern within files in a directory. Shows the file and the lines where the query was found.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The text to search for." },
            directory: { type: "string", description: "The directory to search within.", default: "." },
            pattern: { type: "string", description: "A glob pattern to filter which files to search (e.g., '*.js', 'src/**/*.ts').", default: "**/*" }
        },
        required: ["query"]
    }
};


export default { searchWeb, findFiles, searchInFiles };
