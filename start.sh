#!/bin/bash

# iFly 开发服务器启动脚本
# 使用 Flask + SQLite 后端，前端资源与数据库 API 由同一服务提供

PORT=8000
PID_FILE=".flask.pid"

cd "$(dirname "$0")"

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

# 检查依赖
if ! python3 -c "import flask, flask_cors" 2>/dev/null; then
  echo "缺少依赖，正在安装 Flask / Flask-CORS ..."
  pip3 install -r requirements.txt
fi

# 启动 Flask 服务器
echo "正在启动 Flask + SQLite 服务器..."
echo "数据库路径: $(pwd)/data/flights.db"
python3 server.py > .flask.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# 等待服务器启动
sleep 1
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "服务器已启动 (PID: $SERVER_PID)"
  echo "访问地址: http://localhost:$PORT"
  echo "日志: tail -f .flask.log"
else
  echo "服务器启动失败"
  cat .flask.log
  rm -f "$PID_FILE"
  exit 1
fi