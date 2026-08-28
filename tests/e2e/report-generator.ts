import fs from 'fs';
import path from 'path';

interface TestResult {
  title: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
  error?: string;
  screenshot?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

export class ReportGenerator {
  private testSuites: TestSuite[] = [];
  private startTime: number = Date.now();

  addTestSuite(name: string): void {
    this.testSuites.push({ name, tests: [] });
  }

  addTestResult(
    suiteName: string,
    title: string,
    status: 'PASSED' | 'FAILED' | 'SKIPPED',
    duration: number,
    error?: string,
    screenshot?: string
  ): void {
    const suite = this.testSuites.find((s) => s.name === suiteName);
    if (suite) {
      suite.tests.push({ title, status, duration, error, screenshot });
    }
  }

  private calculateStats() {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;

    for (const suite of this.testSuites) {
      for (const test of suite.tests) {
        totalTests++;
        totalDuration += test.duration;

        if (test.status === 'PASSED') {
          passedTests++;
        } else if (test.status === 'FAILED') {
          failedTests++;
        } else if (test.status === 'SKIPPED') {
          skippedTests++;
        }
      }
    }

    const passPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      passPercentage,
    };
  }

  private generateHTML(): string {
    const stats = this.calculateStats();
    const timestamp = new Date().toLocaleString();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HRMS Application - Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
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

        .header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .stats-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stat-card.passed {
            border-left-color: #28a745;
        }

        .stat-card.failed {
            border-left-color: #dc3545;
        }

        .stat-card.skipped {
            border-left-color: #ffc107;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }

        .stat-card.passed .stat-number {
            color: #28a745;
        }

        .stat-card.failed .stat-number {
            color: #dc3545;
        }

        .stat-card.skipped .stat-number {
            color: #ffc107;
        }

        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .content {
            padding: 30px;
        }

        .test-suite {
            margin-bottom: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }

        .suite-header {
            background: #f8f9fa;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 16px;
            color: #333;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .suite-stats {
            font-size: 12px;
            color: #666;
            font-weight: normal;
        }

        .test-case {
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .test-case:last-child {
            border-bottom: none;
        }

        .test-case.passed {
            background: #f0fdf4;
        }

        .test-case.failed {
            background: #fef2f2;
        }

        .test-case.skipped {
            background: #fffbf0;
        }

        .test-info {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        }

        .test-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .test-status.passed {
            background: #28a745;
        }

        .test-status.failed {
            background: #dc3545;
        }

        .test-status.skipped {
            background: #ffc107;
        }

        .test-title {
            font-weight: 500;
            color: #333;
        }

        .test-title.failed {
            color: #dc3545;
        }

        .test-details {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .test-meta {
            display: flex;
            gap: 20px;
            align-items: center;
            flex-shrink: 0;
        }

        .test-duration {
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
        }

        .screenshot {
            margin-top: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            max-width: 500px;
        }

        .screenshot img {
            width: 100%;
            height: auto;
            display: block;
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
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            border-radius: 4px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }

        .summary-card h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .summary-card p {
            color: #666;
            font-size: 13px;
            line-height: 1.6;
        }

        @media (max-width: 768px) {
            .stats-section {
                grid-template-columns: repeat(2, 1fr);
            }

            .test-case {
                flex-direction: column;
                align-items: flex-start;
            }

            .test-meta {
                width: 100%;
                margin-top: 10px;
            }

            .header h1 {
                font-size: 24px;
            }
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 HRMS Application Test Report</h1>
            <p>Automated End-to-End Test Results</p>
            <p>Generated on ${timestamp}</p>
        </div>

        <div class="stats-section">
            <div class="stat-card">
                <div class="stat-label">Total Tests</div>
                <div class="stat-number">${stats.totalTests}</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-label">Passed</div>
                <div class="stat-number">${stats.passedTests}</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-label">Failed</div>
                <div class="stat-number">${stats.failedTests}</div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-label">Skipped</div>
                <div class="stat-number">${stats.skippedTests}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Success Rate</div>
                <div class="stat-number">${stats.passPercentage}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.passPercentage}%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Duration</div>
                <div class="stat-number">${(stats.totalDuration / 1000).toFixed(1)}s</div>
            </div>
        </div>

        <div class="content">
    `;

    // Add test suites
    for (const suite of this.testSuites) {
      const suiteStats = {
        total: suite.tests.length,
        passed: suite.tests.filter((t) => t.status === 'PASSED').length,
        failed: suite.tests.filter((t) => t.status === 'FAILED').length,
        skipped: suite.tests.filter((t) => t.status === 'SKIPPED').length,
      };

      html += `
        <div class="test-suite">
            <div class="suite-header">
                <span>${suite.name}</span>
                <span class="suite-stats">
                    ${suiteStats.passed} passed, ${suiteStats.failed} failed, ${suiteStats.skipped} skipped
                </span>
            </div>
      `;

      for (const test of suite.tests) {
        const statusClass = test.status.toLowerCase();
        html += `
            <div class="test-case ${statusClass}">
                <div class="test-info">
                    <div class="test-status ${statusClass}"></div>
                    <div>
                        <div class="test-title ${statusClass}">
                            ${test.title}
                            <span class="badge ${statusClass}">${test.status}</span>
                        </div>
                        <div class="test-details">Duration: ${test.duration}ms</div>
        `;

        if (test.error) {
          html += `<div class="test-error">${this.escapeHtml(test.error)}</div>`;
        }

        if (test.screenshot) {
          html += `
            <div class="screenshot">
                <img src="${test.screenshot}" alt="Test screenshot" />
            </div>
          `;
        }

        html += `
                    </div>
                </div>
                <div class="test-meta">
                    <div class="test-duration">${(test.duration / 1000).toFixed(2)}s</div>
                </div>
            </div>
        `;
      }

      html += `</div>`;
    }

    html += `
        </div>

        <div class="footer">
            <p>Test Report Generated: ${timestamp}</p>
            <p>Total Execution Time: ${((Date.now() - this.startTime) / 1000).toFixed(2)} seconds</p>
            <p>HRMS Application Testing Suite v1.0</p>
        </div>
    </div>
</body>
</html>
    `;

    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateReport(outputPath: string): void {
    const html = this.generateHTML();
    const dir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html);
    console.log(`Report generated at: ${outputPath}`);
  }
}

// Export for use in reporter configuration
export default ReportGenerator;
