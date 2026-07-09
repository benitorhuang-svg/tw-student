# PowerShell 腳本：一鍵部署到 GCP Cloud Run
# 請確保您已安裝 Google Cloud SDK 並已登入 (gcloud auth login)
# 建置與部署目標設定集中在 infra/cloudbuild.yaml。

Write-Host ">>> 授權 Docker 訪問 Artifact Registry..." -ForegroundColor Cyan
gcloud auth configure-docker asia-east1-docker.pkg.dev --quiet

Write-Host ">>> 使用 Cloud Build 設定檔建置映像並部署到 Cloud Run..." -ForegroundColor Cyan
gcloud builds submit --config "infra/cloudbuild.yaml" .

Write-Host ""
Write-Host ">>> Deployment Complete! Your website is now live." -ForegroundColor Green
