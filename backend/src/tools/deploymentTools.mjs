/**
 * Deployment Tools - أدوات النشر والاستضافة
 * أدوات لنشر المشاريع على منصات مختلفة
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * نشر على Vercel
 */
export async function deployToVercel(projectPath, projectName) {
  try {
    console.log(`🚀 Deploying to Vercel: ${projectName}`);
    
    // إنشاء ملف vercel.json
    const vercelConfig = {
      name: projectName,
      version: 2,
      builds: [
        {
          src: "package.json",
          use: "@vercel/static-build",
          config: { distDir: "dist" }
        }
      ]
    };
    
    await fs.writeFile(
      `${projectPath}/vercel.json`,
      JSON.stringify(vercelConfig, null, 2)
    );
    
    return {
      success: true,
      platform: 'vercel',
      projectName,
      message: 'تم تجهيز المشروع للنشر على Vercel. استخدم: vercel deploy',
      configFile: 'vercel.json'
    };
    
  } catch (error) {
    console.error('Deploy to Vercel error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * نشر على Netlify
 */
export async function deployToNetlify(projectPath, projectName) {
  try {
    console.log(`🚀 Deploying to Netlify: ${projectName}`);
    
    // إنشاء ملف netlify.toml
    const netlifyConfig = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;
    
    await fs.writeFile(`${projectPath}/netlify.toml`, netlifyConfig);
    
    return {
      success: true,
      platform: 'netlify',
      projectName,
      message: 'تم تجهيز المشروع للنشر على Netlify',
      configFile: 'netlify.toml'
    };
    
  } catch (error) {
    console.error('Deploy to Netlify error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * نشر على Cloudflare Pages
 */
export async function deployToCloudflare(projectPath, projectName) {
  try {
    console.log(`🚀 Deploying to Cloudflare Pages: ${projectName}`);
    
    // إنشاء ملف wrangler.toml
    const wranglerConfig = `name = "${projectName}"
compatibility_date = "2023-01-01"

[site]
bucket = "./dist"`;
    
    await fs.writeFile(`${projectPath}/wrangler.toml`, wranglerConfig);
    
    return {
      success: true,
      platform: 'cloudflare',
      projectName,
      message: 'تم تجهيز المشروع للنشر على Cloudflare Pages',
      configFile: 'wrangler.toml'
    };
    
  } catch (error) {
    console.error('Deploy to Cloudflare error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء Dockerfile للنشر
 */
export async function createDockerfile(projectPath, projectType = 'node') {
  try {
    console.log(`🐳 Creating Dockerfile for ${projectType}`);
    
    let dockerfile = '';
    
    if (projectType === 'node') {
      dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]`;
    } else if (projectType === 'react') {
      dockerfile = `FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]`;
    }
    
    await fs.writeFile(`${projectPath}/Dockerfile`, dockerfile);
    
    // إنشاء .dockerignore
    const dockerignore = `node_modules
npm-debug.log
.git
.env
dist`;
    
    await fs.writeFile(`${projectPath}/.dockerignore`, dockerignore);
    
    return {
      success: true,
      projectType,
      message: 'تم إنشاء Dockerfile بنجاح',
      files: ['Dockerfile', '.dockerignore']
    };
    
  } catch (error) {
    console.error('Create Dockerfile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export const deploymentTools = {
  deployToVercel,
  deployToNetlify,
  deployToCloudflare,
  createDockerfile
};
