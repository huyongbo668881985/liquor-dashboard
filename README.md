# 酒水经营分析系统 V1

酒水老板经营数据驾驶舱 — 记录直营市场和分销市场经营数据，自动分析销售、毛利、费用和利润。

## 技术栈

- **前端**: Next.js 16 + React 19 + Tailwind CSS 4
- **后端**: Next.js API Routes
- **数据库**: SQLite + Prisma 7 (libsql 适配器)
- **部署**: 单机运行，无需服务器

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npx prisma migrate dev

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 功能模块

### 📊 首页 Dashboard (`/`)
经营总览驾驶舱，包含：
- **直营经营**: 销售金额、已收/应收、成本、毛利、费用、净利润
- **分销经营**: 客户数量、发货金额、成本、毛利、费用、预计利润
- **整体经营**: 直营+分销汇总数据
- **现金情况**: 现金余额、应收、未来支出、现金压力预警

### 🍾 产品管理 (`/products`)
管理酒水产品信息：
- 产品名称、规格、单位、成本价格
- 用于自动计算销售成本和毛利

### 🏪 直营管理 (`/direct`)
- **销售记录**: 记录日期、产品、数量、金额、已收金额，自动计算成本和毛利
- **费用记录**: 记录市场推广、招待、人员、物流等费用

### 🚚 分销管理 (`/distribution`)
- 分销客户列表，显示累计发货、毛利、费用、预计利润
- 点击客户进入详情页

### 分销客户详情 (`/distribution/[id]`)
三个 TAB：
1. **发货记录**: 记录发货明细，自动计算成本和毛利
2. **费用规划**: 规划未来投入（市场推广、人员、赠酒等），支持编辑
3. **实际费用**: 支持现金费用和酒水费用（自动按成本折算）

### 💰 现金流管理 (`/cashflow`)
- 记录资金收入和支出
- 自动计算现金余额和未来现金压力

## 数据流

```
产品 → 成本价格
     ├→ 直营销售 → 自动计算毛利、应收
     ├→ 分销发货 → 自动计算毛利
     └→ 酒水费用 → 自动按成本折算

Dashboard ← 汇总所有数据
```

## 项目结构

```
liquor-dashboard/
├── prisma/
│   ├── schema.prisma    # 数据库模型
│   └── dev.db           # SQLite 数据库文件
├── src/
│   ├── app/
│   │   ├── page.tsx           # 首页 Dashboard
│   │   ├── products/          # 产品管理
│   │   ├── direct/            # 直营管理
│   │   ├── distribution/      # 分销管理
│   │   │   └── [id]/          # 客户详情
│   │   ├── cashflow/          # 现金流
│   │   └── api/               # API 路由
│   ├── components/
│   │   ├── Sidebar.tsx        # 侧边导航
│   │   └── ui.tsx             # 通用组件
│   └── lib/
│       └── prisma.ts          # Prisma 客户端
└── package.json
```

## 后续计划

- 数据导出 (Excel/CSV)
- 数据可视化图表
- 迁移 Supabase (PostgreSQL)

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
