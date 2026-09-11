import {
  Reporter,
  FullResult,
  TestCase,
  TestResult,
  Suite,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

interface TestData {
  suite: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}

class HRMSTestReporter implements Reporter {
  private tests: TestData[] = [];
  private suites: Map<string, string> = new Map();
  private reportDir = 'test-results';

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteName = this.getSuiteName(test.parent);
    const testData: TestData = {
      suite: suiteName,
      title: test.title,
      status: result.status as 'passed' | 'failed' | 'skipped',
      duration: result.duration,
    };

    if (result.error) {
      testData.error = result.error.message || String(result.error);
    }

    // Handle screenshots
    if (result.attachments && result.attachments.length > 0) {
      const screenshotAttachment = result.attachments.find((a) => a.contentType === 'image/png');
      if (screenshotAttachment && screenshotAttachment.path) {
        const screenshotPath = screenshotAttachment.path;
        if (fs.existsSync(screenshotPath)) {
          // Read and convert to data URL for embedding in HTML
          const screenshotData = fs.readFileSync(screenshotPath, { encoding: 'base64' });
          testData.screenshot = `data:image/png;base64,${screenshotData}`;
        }
      }
    }

    this.tests.push(testData);
  }

  onEnd(result: FullResult) {
    this.generateReport();
  }

  private getSuiteName(suite: Suite | null): string {
    if (!suite) return 'Unknown';
    if (suite.parent) {
      return this.getSuiteName(suite.parent);
    }
    return suite.title;
  }

  private generateReport() {
    const timestamp = new Date().toLocaleString();
    const stats = this.calculateStats();

    // Group tests by suite
    const groupedTests: { [key: string]: TestData[] } = {};
    for (const test of this.tests) {
      if (!groupedTests[test.suite]) {
        groupedTests[test.suite] = [];
      }
      groupedTests[test.suite].push(test);
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HRMS Test Report - ${timestamp}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header .meta {
            font-size: 14px;
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }

        .stat-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-card.success {
            border-left-color: #28a745;
        }

        .stat-card.success .stat-value {
            color: #28a745;
        }

        .stat-card.danger {
            border-left-color: #dc3545;
        }

        .stat-card.danger .stat-value {
            color: #dc3545;
        }

        .stat-card.warning {
            border-left-color: #ffc107;
        }

        .stat-card.warning .stat-value {
            color: #ffc107;
        }

        .content {
            padding: 30px;
        }

        .suite-section {
            margin-bottom: 30px;
        }

        .suite-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            font-weight: 600;
            font-size: 16px;
            color: #333;
            border: 1px solid #e0e0e0;
            border-bottom: none;
        }

        .test-list {
            border: 1px solid #e0e0e0;
            border-radius: 0 0 8px 8px;
            overflow: hidden;
        }

        .test-item {
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: start;
        }

        .test-item:last-child {
            border-bottom: none;
        }

        .test-item.passed {
            background-color: #f0fdf4;
        }

        .test-item.failed {
            background-color: #fef2f2;
        }

        .test-item.skipped {
            background-color: #fffbf0;
        }

        .test-content {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .status-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-weight: bold;
            font-size: 14px;
        }

        .status-icon.passed {
            background: #28a745;
            color: white;
        }

        .status-icon.failed {
            background: #dc3545;
            color: white;
        }

        .status-icon.skipped {
            background: #ffc107;
            color: white;
        }

        .test-info {
            flex: 1;
        }

        .test-title {
            font-weight: 500;
            color: #333;
            margin-bottom: 5px;
        }

        .test-meta {
            font-size: 12px;
            color: #999;
        }

        .test-error {
            margin-top: 10px;
            padding: 10px;
            background: #fff5f5;
            border-left: 3px solid #dc3545;
            border-radius: 4px;
            font-size: 12px;
            color: #c00;
            font-family: 'Courier New', monospace;
            word-break: break-word;
            max-height: 200px;
            overflow-y: auto;
        }

        .test-screenshot {
            margin-top: 10px;
            border-radius: 4px;
            overflow: hidden;
            max-width: 400px;
        }

        .test-screenshot img {
            width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .test-duration {
            text-align: right;
            font-size: 12px;
            color: #999;
            white-space: nowrap;
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            margin-left: 10px;
        }

        .badge.passed {
            background: #d4edda;
            color: #155724;
        }

        .badge.failed {
            background: #f8d7da;
            color: #721c24;
        }

        .badge.skipped {
            background: #fff3cd;
            color: #856404;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #666;
        }

        .progress-bar {
            width: 100%;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: #28a745;
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .test-item {
                grid-template-columns: 1fr;
            }

            .test-duration {
                text-align: left;
                margin-top: 10px;
            }

            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 HRMS Application Test Report</h1>
            <div class="meta">
                <p>Automated End-to-End Testing Suite</p>
                <p>Generated: ${timestamp}</p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Tests</div>
                <div class="stat-value">${stats.total}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Passed</div>
                <div class="stat-value">${stats.passed}</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">Failed</div>
                <div class="stat-value">${stats.failed}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">Skipped</div>
                <div class="stat-value">${stats.skipped}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Success Rate</div>
                <div class="stat-value">${stats.successRate}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.successRate}%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Duration</div>
                <div class="stat-value">${stats.totalDuration}</div>
            </div>
        </div>

        <div class="content">
    `;

    // Add test suites
    for (const [suiteName, tests] of Object.entries(groupedTests)) {
      const suiteStats = {
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: tests.filter((t) => t.status === 'skipped').length,
      };

      html += `
        <div class="suite-section">
            <div class="suite-header">
                ${suiteName}
                <small style="float: right; font-weight: normal; color: #666;">
                    ✓ ${suiteStats.passed} | ✗ ${suiteStats.failed} | ⊝ ${suiteStats.skipped}
                </small>
            </div>
            <div class="test-list">
      `;

      for (const test of tests) {
        const statusClass = test.status;
        const statusIcon = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '⊝';

        html += `
            <div class="test-item ${statusClass}">
                <div class="test-content">
                    <div class="status-icon ${statusClass}">${statusIcon}</div>
                    <div class="test-info">
                        <div class="test-title">
                            ${this.escapeHtml(test.title)}
                            <span class="badge ${statusClass}">${test.status.toUpperCase()}</span>
                        </div>
                        <div class="test-meta">Duration: ${test.duration}ms</div>
        `;

        if (test.error) {
          html += `<div class="test-error">${this.escapeHtml(test.error)}</div>`;
        }

        if (test.screenshot) {
          html += `
            <div class="test-screenshot">
                <img src="${test.screenshot}" alt="Screenshot for ${this.escapeHtml(test.title)}" />
            </div>
          `;
        }

        html += `
                    </div>
                </div>
                <div class="test-duration">${(test.duration / 1000).toFixed(2)}s</div>
            </div>
        `;
      }

      html += `</div></div>`;
    }

    html += `
        </div>

        <div class="footer">
            <p>✓ Test Report Generated: ${timestamp}</p>
            <p>HRMS Application Testing Suite v1.0</p>
        </div>
    </div>
</body>
</html>
    `;

    // Ensure directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const reportPath = path.join(this.reportDir, 'HRMS-TEST-REPORT.html');
    fs.writeFileSync(reportPath, html);
    console.log(`\n✓ Test report generated: ${reportPath}`);
  }

  private calculateStats() {
    const passed = this.tests.filter((t) => t.status === 'passed').length;
    const failed = this.tests.filter((t) => t.status === 'failed').length;
    const skipped = this.tests.filter((t) => t.status === 'skipped').length;
    const total = this.tests.length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const totalDuration = this.tests.reduce((sum, t) => sum + t.duration, 0);

    return {
      passed,
      failed,
      skipped,
      total,
      successRate,
      totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
    };
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export default HRMSTestReporter;
