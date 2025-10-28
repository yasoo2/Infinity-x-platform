import http from 'http';

const PORT = process.env.PORT || 8080;

const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Future Systems - Admin X (placeholder)</title>
    <style>
      body {
        background: #02040a;
        color: #00ffc6;
        font-family: system-ui, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .box {
        background: radial-gradient(circle at 20% 20%, rgba(0,255,198,0.15) 0%, rgba(0,0,0,0) 70%);
        border: 1px solid rgba(0,255,198,0.3);
        border-radius: 16px;
        padding: 24px 28px;
        max-width: 320px;
        line-height: 1.4;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,255,198,0.15);
      }
      .title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #fff;
      }
      .hint {
        font-size: 12px;
        color: #6bffff;
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="title">Future Systems :: Admin X Online</div>
      <div class="hint">
        Backend is running.<br/>
        Joe is connected.<br/>
        Admin dashboard UI is coming next...
      </div>
    </div>
  </body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8'
  });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`dashboard-x placeholder running on ${PORT}`);
});