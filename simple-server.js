import { createServer } from "http";
import { readFile } from "fs";
import { extname as _extname } from "path";

const PORT = 3000;

const server = createServer((req, res) => {
  console.log(`请求: ${req.url}`);

  // 处理根请求为视频页面
  let filePath = "./public/video/index.html";
  if (req.url !== "/" && req.url !== "/index.html") {
    filePath = "./public" + req.url;
  }

  const extname = _extname(filePath);
  let contentType = "text/html";

  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
      contentType = "image/jpg";
      break;
  }

  readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // 文件不存在
        console.log(`文件不存在: ${filePath}`);
        readFile("./public/video/index.html", (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end("服务器错误");
            return;
          }
          res.writeHead(200, {
            "Content-Type": "text/html",
            // 允许跨域，让小程序可以访问
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
          });
          res.end(content, "utf-8");
        });
      } else {
        res.writeHead(500);
        res.end(`服务器错误: ${err.code}`);
      }
    } else {
      // 成功响应
      res.writeHead(200, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}/`);
  console.log(`视频管理页面访问地址: http://localhost:${PORT}/video/index.html`);
});
