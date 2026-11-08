#!/bin/bash

# iFly 开发服务器启动脚本

PORT=8000
PID_FILE=".server.pid"

# 检查是否已有服务器在运行
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "服务器已在运行中 (PID: $PID, 端口: $PORT)"
    echo "访问地址: http://localhost:$PORT"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# 启动 Python HTTP 服务器
echo "正在启动开发服务器..."
python3 -m http.server $PORT &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# 等待服务器启动
sleep 0.5
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "服务器已启动 (PID: $SERVER_PID)"
  echo "访问地址: http://localhost:$PORT"
else
  echo "服务器启动失败"
  rm -f "$PID_FILE"
  exit 1
fi