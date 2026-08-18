import { swaggerDocument } from './swaggerDoc';

export function getSwaggerHtml(): string {
  const jsonSpec = JSON.stringify(swaggerDocument);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apponext HRMS API Documentation - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #0f172a; font-family: sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #ffffff; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 1400px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
    .custom-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
      padding: 24px 32px;
      margin-bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .custom-header h1 { margin: 0; font-size: 22px; font-weight: 800; tracking-tight: -0.025em; }
    .custom-header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.8; }
    .badge { background: #4f46e5; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="custom-header">
    <div>
      <h1>🚀 Apponext HRMS API Documentation</h1>
      <p>Interactive REST API Explorer & Testing Console</p>
    </div>
    <span class="badge">OpenAPI 3.0</span>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${jsonSpec},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
}
