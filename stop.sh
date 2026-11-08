#!/bin/bash

# iFly 开发服务器终止脚本

PID_FILE=".server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "没有正在运行的服务器"
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  rm -f "$PID_FILE"
  echo "服务器已终止 (PID: $PID)"
else
  echo "服务器进程不存在，清理 PID 文件"
  rm -f "$PID_FILE"
fi