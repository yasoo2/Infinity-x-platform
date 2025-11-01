/**
 * GitHub Tool - أداة GitHub لـ JOEngine AGI
 * 
 * القدرات:
 * - إنشاء/تعديل/حذف فروع (Branches)
 * - إنشاء/تعديل/حذف طلبات سحب (Pull Requests)
 * - إنشاء/تعديل/حذف مشاكل (Issues)
 * - جلب معلومات المستودع
 */

import { BaseTool } from './ToolsSystem.mjs';
import { Octokit } from '@octokit/rest';

export class GitHubTool extends BaseTool {
  constructor() {
    super(
      'github',
      'Interact with GitHub repositories to manage code, issues, and pull requests.',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['get_repo_info', 'create_issue', 'update_issue', 'create_branch', 'create_pull_request'],
          description: 'Action to perform on GitHub.'
        },
        owner: {
          type: 'string',
          required: true,
          description: 'The owner of the repository (e.g., yasoo2).'
        },
        repo: {
          type: 'string',
          required: true,
          description: 'The name of the repository (e.g., Infinity-x-platform).'
        },
        token: {
          type: 'string',
          required: true,
          description: 'GitHub Personal Access Token (PAT) with appropriate scopes.'
        },
        // معاملات خاصة بـ Issues
        issue_title: {
          type: 'string',
          required: false,
          description: 'Title of the issue.'
        },
        issue_body: {
          type: 'string',
          required: false,
          description: 'Body content of the issue.'
        },
        issue_number: {
          type: 'integer',
          required: false,
          description: 'Number of the issue to update.'
        },
        // معاملات خاصة بـ Branches و PRs
        branch_name: {
          type: 'string',
          required: false,
          description: 'Name of the new branch.'
        },
        base_branch: {
          type: 'string',
          required: false,
          description: 'The base branch for the new branch or pull request (e.g., main).'
        },
        head_branch: {
          type: 'string',
          required: false,
          description: 'The head branch for the pull request.'
        },
        pr_title: {
          type: 'string',
          required: false,
          description: 'Title of the pull request.'
        },
        pr_body: {
          type: 'string',
          required: false,
          description: 'Body content of the pull request.'
        }
      }
    );
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);
    const { action, owner, repo, token } = params;

    const octokit = new Octokit({ auth: token });

    try {
      switch (action) {
        case 'get_repo_info':
          return await this.getRepoInfo(octokit, owner, repo);
        case 'create_issue':
          return await this.createIssue(octokit, owner, repo, params);
        case 'update_issue':
          return await this.updateIssue(octokit, owner, repo, params);
        case 'create_branch':
          return await this.createBranch(octokit, owner, repo, params);
        case 'create_pull_request':
          return await this.createPullRequest(octokit, owner, repo, params);
        default:
          throw new Error(`Unknown GitHub action: ${action}`);
      }
    } catch (error) {
      console.error(`GitHub Tool Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * جلب معلومات المستودع
   */
  async getRepoInfo(octokit, owner, repo) {
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      success: true,
      name: data.full_name,
      description: data.description,
      default_branch: data.default_branch,
      stars: data.stargazers_count,
      forks: data.forks_count,
      open_issues: data.open_issues_count
    };
  }

  /**
   * إنشاء مشكلة (Issue)
   */
  async createIssue(octokit, owner, repo, params) {
    const { issue_title, issue_body } = params;
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title: issue_title,
      body: issue_body
    });
    return {
      success: true,
      issue_number: data.number,
      html_url: data.html_url
    };
  }

  /**
   * تحديث مشكلة (Issue)
   */
  async updateIssue(octokit, owner, repo, params) {
    const { issue_number, issue_title, issue_body } = params;
    const { data } = await octokit.issues.update({
      owner,
      repo,
      issue_number,
      title: issue_title,
      body: issue_body
    });
    return {
      success: true,
      issue_number: data.number,
      html_url: data.html_url
    };
  }

  /**
   * إنشاء فرع (Branch)
   */
  async createBranch(octokit, owner, repo, params) {
    const { branch_name, base_branch } = params;

    // 1. جلب SHA لآخر التزام (commit) في الفرع الأساسي
    const { data: baseBranch } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: base_branch || 'main'
    });
    const sha = baseBranch.commit.sha;

    // 2. إنشاء الفرع الجديد
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch_name}`,
      sha
    });

    return {
      success: true,
      branch_name,
      message: `Branch ${branch_name} created successfully from ${base_branch || 'main'}.`
    };
  }

  /**
   * إنشاء طلب سحب (Pull Request)
   */
  async createPullRequest(octokit, owner, repo, params) {
    const { pr_title, pr_body, head_branch, base_branch } = params;
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title: pr_title,
      body: pr_body,
      head: head_branch,
      base: base_branch || 'main'
    });
    return {
      success: true,
      pr_number: data.number,
      html_url: data.html_url
    };
  }
}

export default GitHubTool;
