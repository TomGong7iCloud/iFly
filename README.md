# iFly

一个以 3D 地球为核心的飞行记录可视化应用：用 Three.js 渲染可交互地球，在地球上展示航班航线与机场标记，并用面板统计航司、机场、机型、里程等多维度数据，同时内置 AI 助手用于对话式管理飞行记录。

## 功能特性

- **3D 地球**：真实光照（昼夜变化）、全亮模式、自动转动，支持鼠标拖拽与缩放
- **航线可视化**：机场标记与航线弧线，可聚焦定位到指定航班
- **飞行历史面板**：航班数、里程、时长，以及机场 / 航司 / 国家 / 机型统计图表（含航司 logo）
- **AI 助手**：对话式记录、编辑、删除飞行记录（当前为占位逻辑，待接入 LLM）
- **数据持久化**：SQLite 存储飞行记录，localStorage 记忆界面偏好

## 技术栈

- 前端：原生 HTML / CSS / JavaScript + [Three.js](https://threejs.org/)（本地 vendor 引入）
- 后端：Python Flask
- 数据库：SQLite

## 快速开始

1. 安装依赖（首次启动时也会自动安装）：

   ```bash
   pip3 install -r requirements.txt
   ```

2. 启动服务器：

   ```bash
   bash start.sh
   ```

3. 打开浏览器访问 <http://localhost:8000>

停止服务：

```bash
bash stop.sh
```

## API 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/flights` | 获取全部飞行记录 |
| POST | `/api/flights` | 新增一条飞行记录 |
| DELETE | `/api/flights/<id>` | 删除指定飞行记录 |

飞行记录字段：`flightNo`、`airline`、`from`、`to`、`fromName`、`toName`、`date`、`aircraft`、`durationMin`、`distance`（其中 `flightNo`、`from`、`to`、`date` 为必填）。

## 目录结构

```
iFly/
├── index.html               # 页面结构
├── css/style.css            # 样式
├── js/
│   ├── app.js               # 面板、统计、助手等前端逻辑
│   └── earth.js             # Three.js 地球渲染
├── assets/
│   ├── earth-blue-marble.jpg # 地球贴图
│   └── vendor/three/         # 本地 Three.js 依赖
├── server.py                # Flask 后端 + SQLite
├── data/flights.db          # SQLite 数据库（自动创建）
├── requirements.txt
└── start.sh / stop.sh       # 启动 / 停止脚本
```