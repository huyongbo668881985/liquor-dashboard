# Supabase 数据库安全修复（2026-10-02）

## 访问方式和根因

本地 `DIRECT_URL` / `DATABASE_URL` 对应 Supabase project ref `sfzpmztijkgfjogfsylp`。
实际数据库连接角色为 `postgres`，具备 BYPASSRLS。唯一数据库客户端在
`src/lib/prisma.ts`，使用 PrismaPg 直连，全部位于服务端。
浏览器页面通过 fetch 调用 Next.js API；首页 Server Component 也在服务端查询。
`src/lib/jxc.ts` 是外部进销存只读接口客户端，API key 仅从服务端环境变量读取。
项目没有 Supabase SDK 初始化、anon/publishable/service_role key、Supabase Auth 或多租户模型。
业务权限是一个通过 AUTH_USERNAME / AUTH_PASSWORD 登录的经营者访问整套数据。

线上 `DistributionGeneralExpense` 没有开启 RLS，Supabase 默认 ACL 又向 anon / authenticated
授予 SELECT、INSERT、UPDATE、DELETE、TRUNCATE、REFERENCES、TRIGGER，所以产生公开访问告警。
其他九张表 RLS 已启用，但每张都有 `WITH CHECK (true)` 的 authenticated INSERT policy；
这与应用独立账号登录无关，属于多余授权。所有十张表都有同样过宽的 ACL。

## 表和操作

| 表 | 修复前 RLS | 应用所需的服务端操作 |
| --- | --- | --- |
| Product | 开启 | SELECT / INSERT / DELETE |
| Distributor | 开启 | SELECT / INSERT / DELETE |
| DirectSale | 开启 | SELECT / INSERT / DELETE |
| DirectPurchase | 开启 | SELECT / INSERT / DELETE |
| DirectExpense | 开启 | SELECT / INSERT / DELETE |
| Shipment | 开启 | SELECT / INSERT / DELETE |
| ExpensePlan | 开启 | SELECT / INSERT / UPDATE / DELETE |
| DistributorExpense | 开启 | SELECT / INSERT / DELETE |
| DistributionGeneralExpense | **未开启** | SELECT / INSERT / DELETE |
| CashFlow | 开启 | SELECT / INSERT / DELETE（含各模块自动同步） |

所有表的 anon / authenticated SELECT、INSERT、UPDATE、DELETE 和额外权限均已撤销。
无需新建允许策略：移除九条旧策略，采用 RLS 默认拒绝。保持已有服务端 postgres
连接和业务事务，未新增 service_role key；高权限仍只存在于服务器数据库环境变量。
服务端角色有全库权限，因此每个业务 Route Handler 必须独立验证签名会话。
所有十一组数据 API 已补校验，首页查询前也校验，不再只依赖 middleware。
middleware 已按 Next.js 16 文档更名为 proxy。
数据库、认证和进销存模块均添加 `server-only`，阻止被误引入客户端 bundle。
写接口拒绝跨站 Origin / Sec-Fetch-Site；CLI 携带有效签名 cookie 可不传 Origin。
AUTH_SECRET 缺失、短于 32 字符或使用旧公开开发值时认证失败关闭；token 必须属于配置账号。

## Migration 与线上状态

`prisma/migrations/20261002000000_lock_down_public_data_api/migration.sql` 已在以上 project ref
提交并完成后置查询验证。扫描所有 public 普通/分区表启用 RLS，撤销全部 public
表、视图、序列和函数的公开权限，撤销 postgres 创建对象的公开默认权限。
原 migration 目录被 Git 忽略，本次解除忽略以保存安全 SQL。
SQL 可重复执行，不增删改业务数据。安全检查在回滚事务中验证 CRUD，使用显式负数 ID，
不推进生产序列，不保留测试记录。

其他环境运行：

```bash
npm run db:security
npm run test:db-security
```

此库此前由 schema / db push 管理，没有 `_prisma_migrations` / baseline。
不要直接执行 migrate deploy 或 reset；将来引入完整 Prisma migration 流程需先建立 baseline。
新建表必须启用 RLS；postgres 的默认授权已收紧，但其他对象创建者（例如 supabase_admin）
仍需检查其默认授权，不能仅靠这次 migration 防护未来新增对象。
无需进入 Dashboard 手工改权限，可刷新 Security Advisor 查看重新计算结果。
本次未调用管理 API 获取 Advisor 最新报告，结论基于数据库 catalog 与真实权限测试。
应用鉴权代码尚需按现有发布流程部署；本地 AUTH_SECRET 满足要求，远端环境变量未直接核验。

## 其他审计结果与限制

- public 没有视图或函数，因此没有 SECURITY DEFINER / RPC 暴露；没有 Storage bucket 或 Storage policy。
- `.env` 被忽略、未被提交（`.env.example` 仅占位符）。Git 历史扫描未发现当前环境密钥值，
  token/service_role/连接串模式命中均为技能文档示例；没有发现实际 Supabase service_role key。
- 生产构建 `.next/static` 未命中当前数据库连接串、认证密码、签名密钥或进销存 key。
  本地未配置 JXC key，无法验证外部进销存线上接口。密钥扫描不能证明仓库之外从未泄漏。
- 该系统是单账号工具，不提供多租户服务。未来增加多个账号/租户必须先设计 user/tenant
  所有权和授权，不能沿用当前整库经营者权限。
- 登录失败限流仍为进程内存，跨实例不共享；未改变现有机制。

## 验证

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm test`：签名、伪造、过期、错误账号和缺失/弱密钥测试通过。
- `npm run test:db-security`：迁移重复执行通过，十表 RLS、100 个 anon/authenticated
  数据操作拒绝、服务端十表 SELECT/INSERT/UPDATE/DELETE 通过并回滚。
- 本地生产服务器：44 个未登录 API 请求拒绝；真实配置账号登录和十个数据库读取 API
  返回成功；跨站写入返回 403。生产数据写入逻辑在数据库事务层验证，未通过 HTTP 录入生产数据。
- 修改文件的 ESLint 与 `git diff --check`：通过。
- 全项目 `npm run lint`：失败于已有未修改页面：五处 set-state-in-effect、分销详情页
  一处 no-explicit-any，另有 hook 依赖及未使用变量警告。本次新增测试的 lint 问题已修复。

## 修改文件

- 新增 `prisma/migrations/20261002000000_lock_down_public_data_api/migration.sql`、
  `scripts/test-db-security.mjs`、`scripts/apply-db-security.mjs`、`tests/auth.test.mjs`、
  `tests/session.test.mjs`、`src/lib/session.ts`、本报告。
- 修改 `src/lib/auth.ts`、`src/lib/prisma.ts`、`src/lib/jxc.ts`、`src/app/(app)/page.tsx`。
- 修改 `src/app/api/` 下 cashflows、direct-dashboard、direct-expenses、direct-purchases、
  direct-sales、distribution-general-expenses、distributor-expenses、distributors、expense-plans、
  products、shipments 的 `route.ts`。
- `src/middleware.ts` 更名并修改为 `src/proxy.ts`。
- 修改 `.gitignore`、`.env.example`、`package.json`、`package-lock.json`、`README.md`。

本地 Node 20.18 低于 Prisma 7.9 的 20.19 最低要求，Prisma CLI 启动出现 ERR_REQUIRE_ESM。
因此提供通过现有 pg 驱动执行保存 SQL 的 `npm run db:security`，不依赖该 CLI；
未来使用 Prisma CLI 前应升级到受支持 Node 版本。

## 兼容性复核

复核发现初版 Origin 与 `request.nextUrl.origin` 直接比较会误拦正常同源写请求：
Next.js 的内部/规范化域名可能与外部请求域名不同。现已按本地 Next.js Server Action
实现比较 Origin 的 host 与 Host / X-Forwarded-Host，增加本地、代理、CLI 和拒绝跨站回归测试。
使用无效业务输入验证真实 POST 返回原有校验的 400，确保请求通过鉴权且不写入生产数据。

逐文件剔除新增鉴权语句后，十一组 API、Prisma/JXC 客户端、首页业务代码与 HEAD 完全一致。
schema、其他页面、组件、登录 UI、Next 配置和定时保活 workflow 均未修改。
实际运行的 DATABASE_URL 对应角色仍有 BYPASSRLS，十表保留服务端 CRUD 权限。
token 签名格式未改，正常配置下旧 cookie 兼容；更换 AUTH_SECRET 或 AUTH_USERNAME 后需重新登录。
未登录 API 从重定向改为 401、跨站写入被拒绝、无效签名密钥无法登录属于预期安全行为变化。
远端 AUTH_SECRET 和外部进销存未直接验证，不能据本地检查保证这两个部署配置正确。
