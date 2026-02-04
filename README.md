# Screen Sharer

一个基于 WebRTC 的屏幕共享小应用，包含前端（Solid + Vite）和后端信令服务器（Deno + Oak）。支持房间模式：房主创建房间并分享屏幕，观看者加入房间观看。支持一对多分享。

## Features
- 房间创建/加入
- 房主一对多屏幕分享
- TURN 服务器配置

## Prerequisites
- Deno 1.40+（用于信令服务器）
- Node.js 18+（用于前端构建/运行）

## Project Structure
- `main.ts`：信令服务器
- `deno.json`：Deno 任务与依赖
- `frontend/`：前端项目（Solid + Vite）

## Quick Start

### 1) 启动信令服务器
```bash
deno task dev
```
默认监听 `http://127.0.0.1:8000`。

### 2) 启动前端
```bash
cd frontend
deno install
deno run dev
```
浏览器打开 `http://localhost:5173`。

## Usage
1. 访问前端页面。
2. 点击“创建房间”，获得房间号（房主）。
3. 观看者输入房间号并加入。
4. 房主点击“共享屏幕”，观看者即可看到画面。
5. 房主停止共享或退出房间后，观看者画面会清空。

## TURN 配置
可在界面中填写 TURN 地址、用户名和密码，用于提升复杂网络环境下的连通性。

## Build
```bash
cd frontend
deno run build
```
构建产物输出到 `frontend/dist`。

## Deployment
- 前端是静态文件，可部署到任何静态托管。
- 后端信令服务器可部署在 Deno Deploy 或任意可运行 Deno 的环境中。
