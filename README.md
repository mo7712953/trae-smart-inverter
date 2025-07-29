# 智能逆变器管理系统 (Smart Inverter Management System)

一个基于Node.js和Express的智能逆变器管理系统，提供多语言支持（中文、英文、阿拉伯语）的Web界面。

## 功能特性

- 📱 响应式设计，支持移动端和桌面端
- 🌍 多语言支持（中文、English、العربية）
- 📊 访问统计和数据分析
- 🖼️ APP界面展示管理
- 📱 移动应用下载链接管理
- 🔐 管理员后台系统
- 📈 实时访问数据统计

## 技术栈

- **后端**: Node.js, Express.js
- **前端**: HTML5, CSS3, JavaScript
- **数据存储**: JSON文件
- **文件上传**: Multer
- **会话管理**: Express-session

## 安装和运行

1. 克隆项目
```bash
git clone https://github.com/mo7712953/trae-smart-inverter.git
cd trae-smart-inverter
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
node server.js
```

4. 访问应用
- 主页: http://localhost:3000
- 管理后台: http://localhost:3000/admin

## 默认管理员账户

- 用户名: `admin`
- 密码: `admin123`

**注意**: 生产环境中请务必修改默认密码！

## 项目结构

```
trae-smart-inverter/
├── server.js              # 主服务器文件
├── package.json           # 项目依赖配置
├── public/                # 静态文件目录
│   ├── index.html         # 主页面
│   ├── admin.html         # 管理后台页面
│   └── uploads/           # 上传文件目录
├── downloadLinks.json     # 下载链接配置
├── screenshots.json       # 截图数据
└── statistics.json        # 访问统计数据
```

## 主要功能

### 1. 多语言支持
- 自动检测浏览器语言
- 支持中文、英文、阿拉伯语切换
- 完整的界面本地化

### 2. 访问统计
- 总访问量统计
- 独立访客统计
- 每日访问数据
- 下载量统计

### 3. 内容管理
- APP截图上传和管理
- 下载链接配置
- 实时数据更新

### 4. 管理后台
- 安全的登录系统
- 数据统计查看
- 内容管理界面

## 配置说明

### 端口配置
默认端口为3000，可在`server.js`中修改：
```javascript
const port = 3000;
```

### 管理员账户
在`server.js`中修改默认管理员账户：
```javascript
const adminCredentials = {
  username: 'admin',
  password: 'admin123'
};
```

## 部署说明

1. 确保服务器已安装Node.js
2. 上传项目文件到服务器
3. 安装依赖: `npm install`
4. 配置端口和域名
5. 启动服务: `node server.js`
6. 配置反向代理（如使用Nginx）

## 许可证

ISC License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！
