#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TestSummaryGenerator {
  constructor() {
    this.clientDir = path.join(__dirname, 'client');
    this.serverDir = path.join(__dirname, 'server');
  }

  readCoverageReport(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.warn(`Failed to read coverage report: ${filePath}`);
    }
    return null;
  }

  generateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      frontend: {
        coverage: null,
        testResults: null
      },
      backend: {
        coverage: null,
        testResults: null
      },
      e2e: {
        testResults: null
      }
    };

    // Frontend coverage
    const frontendCoveragePath = path.join(this.clientDir, 'coverage/coverage-summary.json');
    summary.frontend.coverage = this.readCoverageReport(frontendCoveragePath);

    // Backend coverage
    const backendCoveragePath = path.join(this.serverDir, 'coverage/coverage-summary.json');
    summary.backend.coverage = this.readCoverageReport(backendCoveragePath);

    // E2E test results
    const e2eResultsPath = path.join(this.clientDir, 'playwright-report/results.json');
    summary.e2e.testResults = this.readCoverageReport(e2eResultsPath);

    return summary;
  }

  generateMarkdownReport(summary) {
    let markdown = `# 测试报告

生成时间: ${new Date(summary.timestamp).toLocaleString('zh-CN')}

## 📊 覆盖率统计

`;

    // Frontend coverage
    if (summary.frontend.coverage && summary.frontend.coverage.total) {
      const total = summary.frontend.coverage.total;
      markdown += `### 前端覆盖率
- **语句覆盖率**: ${total.statements.pct}%
- **分支覆盖率**: ${total.branches.pct}%
- **函数覆盖率**: ${total.functions.pct}%
- **行覆盖率**: ${total.lines.pct}%

`;
    }

    // Backend coverage
    if (summary.backend.coverage && summary.backend.coverage.total) {
      const total = summary.backend.coverage.total;
      markdown += `### 后端覆盖率
- **语句覆盖率**: ${total.statements.pct}%
- **分支覆盖率**: ${total.branches.pct}%
- **函数覆盖率**: ${total.functions.pct}%
- **行覆盖率**: ${total.lines.pct}%

`;
    }

    // Coverage goals
    markdown += `## 🎯 覆盖率目标达成情况

| 类型 | 目标 | 实际 | 状态 |
|------|------|------|------|`;

    if (summary.frontend.coverage && summary.frontend.coverage.total) {
      const frontendLines = summary.frontend.coverage.total.lines.pct;
      const frontendStatus = frontendLines >= 50 ? '✅' : '❌';
      markdown += `
| 前端组件/服务 | ≥50% | ${frontendLines}% | ${frontendStatus} |`;
    }

    if (summary.backend.coverage && summary.backend.coverage.total) {
      const backendLines = summary.backend.coverage.total.lines.pct;
      const backendStatus = backendLines >= 75 ? '✅' : '❌';
      markdown += `
| 后端API | ≥75% | ${backendLines}% | ${backendStatus} |`;
    }

    markdown += `

## 📝 测试建议

### 需要改进的区域`;

    if (summary.frontend.coverage && summary.frontend.coverage.total) {
      const total = summary.frontend.coverage.total;
      if (total.lines.pct < 50) {
        markdown += `
- **前端**: 当前行覆盖率 ${total.lines.pct}%，需要增加到 50% 以上`;
      }
    }

    if (summary.backend.coverage && summary.backend.coverage.total) {
      const total = summary.backend.coverage.total;
      if (total.lines.pct < 75) {
        markdown += `
- **后端**: 当前行覆盖率 ${total.lines.pct}%，需要增加到 75% 以上`;
      }
    }

    markdown += `

### 推荐行动
1. 重点测试业务逻辑关键路径
2. 增加边界条件和错误处理测试
3. 完善集成测试覆盖
4. 定期运行 E2E 测试确保用户流程正常

## 🚀 运行测试

\`\`\`bash
# 运行所有测试
node test-runner.js --install --all

# 仅运行单元测试
node test-runner.js

# 仅运行 E2E 测试
node test-runner.js --e2e
\`\`\`
`;

    return markdown;
  }

  async generate() {
    console.log('🔍 正在生成测试摘要...');

    const summary = this.generateSummary();
    const markdown = this.generateMarkdownReport(summary);

    // Save JSON summary
    const jsonPath = path.join(__dirname, 'test-summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

    // Save Markdown report
    const markdownPath = path.join(__dirname, 'TEST-REPORT.md');
    fs.writeFileSync(markdownPath, markdown);

    console.log('✅ 测试摘要已生成:');
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);

    return { summary, markdown };
  }
}

if (require.main === module) {
  const generator = new TestSummaryGenerator();
  generator.generate().catch(console.error);
}

module.exports = TestSummaryGenerator;