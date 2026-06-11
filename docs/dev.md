# 1. Khởi động infra
docker compose -f docker-compose.dev.yml up -d

# 2. Copy env
cp apps/backend/.env.example apps/backend/.env

# 3. Chạy migration
cd apps/backend && pnpm prisma:migrate

# 4. Seed demo data
pnpm prisma:seed
# → HR login: hr@demo.com / demo1234

# 5. Dev
pnpm dev  # từ root