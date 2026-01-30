import { getUncachableGitHubClient } from '../server/github';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function pushToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    const repoName = 'resume-builder';
    
    let repoExists = false;
    try {
      await octokit.repos.get({
        owner: user.login,
        repo: repoName
      });
      repoExists = true;
      console.log(`Repository ${repoName} already exists`);
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }
    
    if (!repoExists) {
      console.log(`Creating repository: ${repoName}`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Resume Builder - A full-stack web application for creating professional resumes',
        private: false,
        auto_init: false
      });
      console.log(`Repository created: https://github.com/${user.login}/${repoName}`);
    }
    
    const remoteUrl = `https://github.com/${user.login}/${repoName}.git`;
    
    try {
      execSync('git remote remove github 2>/dev/null || true', { stdio: 'pipe' });
    } catch (e) {}
    
    console.log(`Adding remote: ${remoteUrl}`);
    execSync(`git remote add github ${remoteUrl}`, { stdio: 'inherit' });
    
    const { data: installation } = await octokit.apps.listInstallationsForAuthenticatedUser();
    
    const token = await getAccessTokenForPush();
    
    const pushUrl = `https://x-access-token:${token}@github.com/${user.login}/${repoName}.git`;
    
    console.log('Pushing to GitHub...');
    execSync(`git push ${pushUrl} HEAD:main --force`, { stdio: 'inherit' });
    
    console.log(`\nSuccess! Your code is now on GitHub:`);
    console.log(`https://github.com/${user.login}/${repoName}`);
    
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    process.exit(1);
  }
}

async function getAccessTokenForPush(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const settings = data.items?.[0]?.settings;
  return settings?.access_token || settings?.oauth?.credentials?.access_token;
}

pushToGitHub();
